import {lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {Bookmark, Check, CircleHelp, Info, X} from 'lucide-react';
import {createSessionReducer, initialSession, nextConfirmation} from '../engine/session.js';
import Stage from './Stage.jsx';
import {StepPanel, ReviewPanel} from './Panels.jsx';
import BuildBar from './BuildBar.jsx';
import Dialogs from './Dialogs.jsx';
import {reducedMotion} from './Controls.jsx';

// The 3D studio (three.js) loads only for packs that describe their skis in 3D.
const Studio3D = lazy(() => import('../studio3d/Studio3D.jsx'));
const mobileLayout = () => window.matchMedia('(max-width: 900px)').matches;

// A binding a shared link or saved build carried but that no longer passes the pack's
// rules stays on the skis as a visual test, as it does after a shape edit.
function carriedBinding(engine, group, id, config) {
  if (!group || !id || config[group.id]) return null;
  return engine.options(group, config).some(option => option.value === String(id)) ? String(id) : null;
}
const linkedValue = (encoded, id) => {
  try {
    return encoded ? new URLSearchParams(encoded).get(id) : null;
  } catch {
    return null;
  }
};

export function StepNav({engine, step, reviewed, ready, onStep}) {
  return (
    <nav className="cfg-step-nav" aria-label="Build steps">
      <ol>
        {engine.steps.map((s, i) => {
          const done = reviewed.includes(i);
          return (
            <li key={s.id}>
              <button type="button" className={step === i ? 'is-current' : done ? 'is-done' : ''} aria-current={step === i ? 'step' : undefined} disabled={i > 0 && !ready} onClick={() => onStep(i)}>
                <span className="cfg-step-number">{String(i + 1).padStart(2, '0')}</span>
                <span className="cfg-step-name">{s.label}</span>
                {done && (
                  <>
                    <Check className="cfg-step-check" size={13} strokeWidth={2.4} aria-hidden="true" />
                    <span className="cfg-sr-only">(reviewed)</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AdjustmentNotice({adjustments, onDismiss}) {
  return (
    <div className="cfg-adjustment" role="status">
      <div className="cfg-adjustment-head">
        <Info size={16} strokeWidth={1.8} aria-hidden="true" />
        <strong>Your build was adjusted</strong>
        <button type="button" className="cfg-icon-button" aria-label="Dismiss build adjustments" onClick={onDismiss}>
          <X size={15} />
        </button>
      </div>
      <ul>
        {adjustments.map((change, i) => (
          <li key={`${change.field}-${i}`}>{change.text}</li>
        ))}
      </ul>
    </div>
  );
}

const readStorage = key => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * A complete configurator for one brand pack.
 * @param engine   createEngine(pack)
 * @param guides   brand dialogs: {id: {title, wide, render}}
 * @param link     {read(): string|null, url(encoded): string, listen?(cb): unsubscribe}
 * @param header   optional (nav, actions) => element; defaults to a compact top bar
 * @param finalAction optional {label, run(config, {engine, notify, goTo})} replacing "Save your build"
 * @param initial  optional {config, changes, step}
 */
export default function Configurator({engine, guides = {}, link, header, finalAction, initial, storageKey, onChange}) {
  const reducer = useMemo(() => createSessionReducer(engine), [engine]);
  const [session, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const encoded = link?.read();
      if (encoded) return initialSession(engine, engine.decode(encoded));
    } catch {
      // Fall through to a fresh build.
    }
    return {...initialSession(engine, initial ?? {}), step: initial?.step ?? 0};
  });
  const {config, step, reviewed, adjustments, view, field, confirmed} = session;
  // A visual-test binding: shown on the skis, never in the price, saves or links.
  const bindingGroup = useMemo(() => engine.groups.find(group => group.type === 'binding') ?? null, [engine]);
  const [previewBinding, setPreviewBinding] = useState(() => carriedBinding(engine, bindingGroup, linkedValue(link?.read?.(), bindingGroup?.id), config));
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasSave, setHasSave] = useState(() => !!readStorage(storageKey));
  const panel = useRef(null);
  const shownStep = useRef(`${step}-${field}`);
  const ready = engine.ready(config);
  const last = engine.steps.length - 1;
  const {amount} = engine.total(config);
  const {stage, Stage: BrandStage} = engine.pack;
  const display = useMemo(() => (config.model ? config : {...config, model: stage.sampleModel}), [config, stage.sampleModel]);

  // The binding choice travels with the build. After an edit that changes the ski's
  // dimensions it is re-checked: it stays in the price while it still passes the pack's
  // rules; otherwise it stays on the skis as a visual test, with a note either way.
  const update = patch => {
    if (!bindingGroup) return dispatch({type: 'patch', patch});
    const id = bindingGroup.id;
    const shape = (bindingGroup.ui?.carryOn ?? []).some(key => Object.hasOwn(patch, key));
    const choice = previewBinding || config[id];
    if (!shape || !choice || Object.hasOwn(patch, id)) return dispatch({type: 'patch', patch});
    const carried = {...patch, [id]: choice};
    const next = engine.apply(config, carried).config;
    const nextCtx = engine.context(next);
    const notices = bindingGroup.ui?.notices;
    const notes = [];
    if (config[id] && !next[id] && notices?.removed) notes.push({field: id, text: notices.removed(config[id], next, nextCtx)});
    if (!config[id] && next[id] && notices?.added) notes.push({field: id, text: notices.added(next[id], next, nextCtx)});
    dispatch({type: 'patch', patch: carried, notes});
    setPreviewBinding(next[id] ? null : choice);
  };
  // A visual-test binding travels with saves, links and downloads as a selection that is
  // re-checked on load; it is never priced.
  const retained = current => (bindingGroup && previewBinding && !current[bindingGroup.id] ? {...current, [bindingGroup.id]: previewBinding} : current);
  const removeBinding = () => {
    if (bindingGroup) dispatch({type: 'patch', patch: {[bindingGroup.id]: ''}});
    setPreviewBinding(null);
  };
  const setView = next => dispatch({type: 'view', view: next});
  const goTo = (next, target = '') => {
    if (next > 0 && !ready) return;
    dispatch({type: 'goto', step: next, field: target});
    setSheetOpen(false);
  };
  const advance = () => {
    if (step === last) {
      if (finalAction) finalAction.run(config, {engine, notify: setNotice, goTo: next => dispatch({type: 'goto', step: next})});
      else setModal('save');
      return;
    }
    dispatch({type: 'advance'});
    setSheetOpen(false);
  };

  useEffect(() => onChange?.(session), [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each step starts at the top of its panel; on phones the panel is brought into view.
  // Compares against the last shown step because StrictMode double-invokes effects.
  useEffect(() => {
    const key = `${step}-${field}`;
    if (shownStep.current === key) return;
    shownStep.current = key;
    if (panel.current) panel.current.scrollTop = 0;
    if (mobileLayout()) panel.current?.scrollIntoView({block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth'});
  }, [step, field]);

  useEffect(() => {
    if (!link?.listen) return undefined;
    return link.listen(encoded => {
      if (!encoded) return;
      const loaded = engine.decode(encoded);
      dispatch({type: 'load', ...loaded});
      setPreviewBinding(carriedBinding(engine, bindingGroup, linkedValue(encoded, bindingGroup?.id), loaded.config));
    });
  }, [link, engine, bindingGroup]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({version: 3, reviewVersion: engine.pack.reviewVersion, config: retained(config), reviewed, confirmed}));
      setHasSave(true);
      setModal('saved');
    } catch {
      setNotice('Device storage is unavailable. Download the build sheet instead.');
    }
  };

  const restore = () => {
    try {
      const raw = readStorage(storageKey);
      if (!raw) {
        setNotice('No saved build on this device yet.');
        return;
      }
      const stored = JSON.parse(raw);
      const before = stored.config || stored;
      const after = engine.normalize(before);
      const savedReviews = (!engine.pack.reviewVersion || stored.reviewVersion === engine.pack.reviewVersion) && Array.isArray(stored.reviewed) ? stored.reviewed.filter(x => Number.isInteger(x) && x >= 0 && x < last) : [];
      // Confirmations survive only for choices the current rules left unchanged. Saves from
      // before confirmations were stored count a reviewed step as confirmed.
      const confirmStep = engine.steps.findIndex(s => s.id === engine.pack.confirm?.step);
      const savedConfirmed = Array.isArray(stored.confirmed) ? stored.confirmed : Array.isArray(stored.graphicsConfirmed) ? stored.graphicsConfirmed : confirmStep >= 0 && savedReviews.includes(confirmStep) ? engine.pack.confirm.fields : [];
      dispatch({
        type: 'load',
        config: after,
        reviewed: engine.invalidateReviews(before, after, savedReviews),
        confirmed: savedConfirmed.filter(key => before[key] === after[key]),
        changes: engine.apply({...engine.defaults(), ...before}, {}).changes,
      });
      setModal(null);
      setPreviewBinding(carriedBinding(engine, bindingGroup, bindingGroup && before[bindingGroup.id], after));
      setNotice(JSON.stringify(before) !== JSON.stringify(after) ? 'Build restored and revalidated against current rules. Please review your choices.' : 'Your saved build is back.');
    } catch {
      setNotice('This saved build could not be restored.');
    }
  };

  const share = async () => {
    const encoded = engine.encode(retained(config));
    const url = link?.url(encoded) ?? `${location.origin}${location.pathname}#build=${encoded}`;
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    try {
      await navigator.clipboard.writeText(url);
      setNotice(local ? 'Build link copied. This local preview link works on this device.' : 'Build link copied. Every choice travels with it.');
    } catch {
      setNotice('Clipboard unavailable. The build is now in the address bar; copy that URL.');
    }
    history.replaceState(null, '', url);
  };

  const download = () => {
    const blob = new Blob([engine.text(config, {previewBinding})], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const model = engine.context(config).model;
    anchor.href = url;
    anchor.download = engine.pack.fileName?.(config, engine.context(config)) ?? `${engine.pack.name}-${config.model ? model.name.replaceAll(' ', '-') : 'draft'}-${config.length || 'unsized'}cm-build.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Build sheet downloaded. No order has been placed.');
  };

  const nav = <StepNav engine={engine} step={step} reviewed={reviewed} ready={ready} onStep={goTo} />;
  const actions = (
    <div className="cfg-header-actions">
      {guides.how && (
        <button type="button" className="cfg-ghost-button" aria-label="How it works" onClick={() => setModal('how')}>
          <CircleHelp size={16} strokeWidth={1.6} />
          <span className="cfg-label-wide">How it works</span>
        </button>
      )}
      <button type="button" className="cfg-outline-button is-small" onClick={() => setModal('save')}>
        <Bookmark size={14} strokeWidth={1.8} />
        <span>Save</span>
      </button>
    </div>
  );

  return (
    <div className="cfg-root" data-brand={engine.pack.id}>
      <a className="cfg-skip-link" href="#cfg-options" onClick={event => {event.preventDefault(); panel.current?.focus(); panel.current?.scrollIntoView({block: 'start'});}}>
        Skip to configuration
      </a>
      {header ? (
        header(nav, actions)
      ) : (
        <div className="cfg-topbar">
          {nav}
          {actions}
        </div>
      )}

      <main className="cfg-workspace">
        {BrandStage ? <BrandStage engine={engine} config={config} view={view} onView={setView} /> : engine.pack.model3d ? (
          <Suspense fallback={<div className="cfg-3d-loading" role="status">{engine.pack.copy.loading ?? 'Loading your skis…'}</div>}>
            <Studio3D engine={engine} config={config} view={view} onView={setView} previewBinding={previewBinding} onRemoveBinding={removeBinding} />
          </Suspense>
        ) : (
          <Stage engine={engine} config={config} view={view} onView={setView} />
        )}
        <section id="cfg-options" className="cfg-options" ref={panel} tabIndex={-1} aria-label={`${engine.steps[step].label} options`}>
          {adjustments.length > 0 && <AdjustmentNotice adjustments={adjustments} onDismiss={() => dispatch({type: 'dismissAdjustments'})} />}
          <div className="cfg-panel" key={`${step}-${field}`}>
            {step < last ? (
              <StepPanel engine={engine} index={step} config={config} field={field} update={update} onView={setView} onField={next => dispatch({type: 'goto', step, field: next})} openGuide={setModal} display={display} binding={{preview: previewBinding, setPreview: setPreviewBinding, remove: removeBinding}} />
            ) : (
              <ReviewPanel engine={engine} config={config} setStep={goTo} share={share} download={download} display={display} previewBinding={previewBinding} notify={setNotice} />
            )}
          </div>
        </section>
      </main>

      <BuildBar
        engine={engine}
        config={config}
        step={step}
        reviewed={reviewed}
        ready={ready}
        open={sheetOpen}
        setOpen={setSheetOpen}
        onEdit={goTo}
        onNext={advance}
        onBack={() => goTo(step - 1)}
        finalLabel={finalAction?.label ?? 'Save your build'}
        previewBinding={previewBinding}
        pendingConfirm={nextConfirmation(engine, session)}
        field={field}
      />
      <p className="cfg-sr-only" aria-live="polite">
        {ready ? `${engine.pack.copy.totalLabel ?? 'Reference total'} ${engine.money(amount)}` : ''}
      </p>

      <Dialogs type={modal} close={() => setModal(null)} engine={engine} config={config} guides={guides} save={save} restore={restore} hasSave={hasSave} share={share} download={download} />
      {notice && (
        <div className="cfg-toast" role="status">
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" className="cfg-icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
