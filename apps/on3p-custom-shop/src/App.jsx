import {useEffect, useReducer, useRef, useState} from 'react';
import {Check, Info, X} from 'lucide-react';
import {Header, StepNav} from './components/Header.jsx';
import Stage from './components/ModelStage.jsx';
import BuildBar from './components/BuildBar.jsx';
import Dialogs from './components/Dialogs.jsx';
import ShapePanel from './panels/ShapePanel.jsx';
import GraphicsPanel from './panels/GraphicsPanel.jsx';
import ConstructionPanel from './panels/ConstructionPanel.jsx';
import ReviewPanel from './panels/ReviewPanel.jsx';
import BindingsPanel from './panels/BindingsPanel.jsx';
import {bindingFor} from './bindings.js';
import {buildReducer, initialBuild, nextGraphicField, retainedBuildConfig} from './build-state.js';
import {applyConfigChange, buildText, decodeBuild, defaultConfig, encodeConfig, getModel, money, normalizeConfig, invalidateReviews, shapeReady, steps, totalPrice} from './config.js';

const SAVE_KEY = 'on3p-fan-build-v1';
const LINK_PREFIX = '#build=';

function loadFromLocation() {
  try {
    return location.hash.startsWith(LINK_PREFIX) ? initialBuild(decodeBuild(location.hash.slice(LINK_PREFIX.length))) : initialBuild();
  } catch {
    return initialBuild();
  }
}

// A pair that a link or saved build carried but that no longer passes the fit screen
// stays on the skis as a visual test, as it does after a shape edit.
const carriedBinding = (id, config) => id && !config.binding && bindingFor(id) ? String(id) : null;
const linkedBinding = () => location.hash.startsWith(LINK_PREFIX) ? new URLSearchParams(location.hash.slice(LINK_PREFIX.length)).get('binding') : null;

const readSave = () => {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
};

const isLocalHost = () => ['localhost', '127.0.0.1'].includes(location.hostname);

function AdjustmentNotice({adjustments, onDismiss}) {
  return (
    <div className="adjustment" role="status">
      <div className="adjustment-head">
        <Info size={16} strokeWidth={1.8} aria-hidden="true" />
        <strong>Your build was adjusted</strong>
        <button type="button" className="icon-button" aria-label="Dismiss build adjustments" onClick={onDismiss}>
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

export default function App() {
  const [build, dispatch] = useReducer(buildReducer, undefined, loadFromLocation);
  const {config, step, reviewed, adjustments, view, field, graphicsConfirmed} = build;
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('configure');
  const [previewBinding, setPreviewBinding] = useState(() => carriedBinding(linkedBinding(), build.config));
  const [hasSave, setHasSave] = useState(() => !!readSave());
  const panel = useRef(null);
  const preview = useRef(null);
  const shownStep = useRef(`${step}-${field}`);
  const ready = shapeReady(config);
  const model = getModel(config);
  const total = totalPrice(config);

  // The binding choice travels with the build. After a shape edit it is re-checked: it
  // stays in the price if still orderable, otherwise it stays on the skis as a visual test.
  const update = patch => {
    const shape = ['model', 'length', 'category'].some(field => Object.hasOwn(patch, field));
    const choice = previewBinding || config.binding;
    if (!shape || !choice || Object.hasOwn(patch, 'binding')) {dispatch({type: 'patch', patch}); return;}
    const carried = {...patch, binding: choice};
    const next = applyConfigChange(config, carried).config;
    dispatch({type: 'patch', patch: carried});
    setPreviewBinding(next.binding ? null : choice);
  };
  const setView = next => dispatch({type: 'view', view: next});
  const goTo = (next, target = '') => {
    if (next > 0 && !ready) return;
    dispatch({type: 'goto', step: next, field: target});
    setSheetOpen(false);
    setMobilePane('configure');
  };
  const advance = () => {
    if (step === steps.length - 1) {
      setModal('save');
      return;
    }
    dispatch({type: 'advance'});
    setSheetOpen(false);
    setMobilePane('configure');
  };

  // Each step starts at the top of its panel, including the mobile configuration pane.
  // Compares against the last shown step rather than a first-run flag, which StrictMode's
  // double-invoked effects would defeat.
  useEffect(() => {
    const key = `${step}-${field}`;
    if (shownStep.current === key) return;
    shownStep.current = key;
    if (panel.current) panel.current.scrollTop = 0;
    setMobilePane('configure');
    panel.current?.focus({preventScroll: true});
  }, [step, field]);

  useEffect(() => {
    const onHash = () => {
      if (!location.hash.startsWith(LINK_PREFIX)) return;
      const loaded = decodeBuild(location.hash.slice(LINK_PREFIX.length));
      dispatch({type: 'load', ...loaded});
      setPreviewBinding(carriedBinding(linkedBinding(), loaded.config));
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  const save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({version: 5, config: retainedBuildConfig(config, previewBinding), reviewed, graphicsConfirmed}));
      setHasSave(true);
      setModal('saved');
    } catch {
      setNotice('Device storage is unavailable. Download the build sheet instead.');
    }
  };

  const restore = () => {
    try {
      const raw = readSave();
      if (!raw) {
        setNotice('No saved build on this device yet.');
        return;
      }
      const stored = JSON.parse(raw);
      const before = stored.config || stored;
      const after = normalizeConfig(before);
      const savedReviews = Array.isArray(stored.reviewed) ? stored.reviewed.filter(x => Number.isInteger(x) && x >= 0 && x < steps.length - 1) : [];
      dispatch({
        type: 'load',
        config: after,
        reviewed: invalidateReviews(before, after, savedReviews),
        graphicsConfirmed: (Array.isArray(stored.graphicsConfirmed) ? stored.graphicsConfirmed : savedReviews.includes(1) ? ['base', 'sidewall'] : []).filter(field => before[field] === after[field]),
        changes: applyConfigChange({...defaultConfig, ...before}, {}).changes,
      });
      setModal(null);
      setPreviewBinding(carriedBinding(before.binding, after));
      setNotice(JSON.stringify(before) !== JSON.stringify(after) ? 'Build restored and revalidated against current rules. Please review your shape and construction.' : 'Your saved build is back.');
    } catch {
      setNotice('This saved build could not be restored.');
    }
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}${LINK_PREFIX}${encodeConfig(retainedBuildConfig(config, previewBinding))}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(isLocalHost() ? 'Build link copied. This local preview link works on this device.' : 'Build link copied. Every choice travels with it.');
    } catch {
      setNotice('Clipboard unavailable. The build is now in the address bar; copy that URL.');
    }
    history.replaceState(null, '', url);
  };

  const download = () => {
    const blob = new Blob([buildText(config, {previewBinding})], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ON3P-${model?.name.replaceAll(' ', '-') || 'draft'}-${config.length || 'unsized'}cm-build.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Build sheet downloaded. No order has been placed.');
  };

  const galleryMode = field === 'base' ? 'Base' : field === 'sidewall' ? 'Sidewalls' : 'Topsheet';

  return (
    <div className="app">
      <a className="skip-link" href="#options" onClick={() => {setMobilePane('configure'); requestAnimationFrame(() => panel.current?.focus({preventScroll: true}));}}>
        Skip to configuration
      </a>
      <Header onHow={() => setModal('how')} onSave={() => setModal('save')} />
      <StepNav step={step} reviewed={reviewed} ready={ready} onStep={goTo} />
      <div className="mobile-workspace-switch" role="group" aria-label="Workspace">
        <button type="button" aria-pressed={mobilePane === 'configure'} aria-controls="options" onClick={() => setMobilePane('configure')}>Configure <span>{steps[step]}</span></button>
        <button type="button" aria-pressed={mobilePane === 'preview'} aria-controls="ski-preview" onClick={() => setMobilePane('preview')}>Preview <span>your skis</span></button>
      </div>
      <main className="workspace" data-mobile-pane={mobilePane}>
        <Stage config={config} view={view} onView={setView} previewRef={preview} previewBinding={previewBinding} onRemoveBinding={() => {update({binding: ''}); setPreviewBinding(null);}} />
        <section id="options" className="options" ref={panel} tabIndex={-1} aria-label={`${steps[step]} options`}>
          {adjustments.length > 0 && <AdjustmentNotice adjustments={adjustments} onDismiss={() => dispatch({type: 'dismissAdjustments'})} />}
          <div className="panel" key={`${step}-${field}`}>
            {step === 0 && <ShapePanel config={config} update={update} openModal={setModal} />}
            {step === 1 && <GraphicsPanel config={config} update={update} onView={setView} initialMode={galleryMode} confirmed={graphicsConfirmed} onMode={next => goTo(1, next)} />}
            {step === 2 && <ConstructionPanel config={config} update={update} openModal={setModal} onView={setView} />}
            {step === 3 && <BindingsPanel config={config} update={update} previewBinding={previewBinding} onPreview={id => {setPreviewBinding(id); if (id) setView('Bindings');}} onRemove={() => {update({binding: ''}); setPreviewBinding(null);}} onView={setView} />}
            {step === 4 && <ReviewPanel config={config} previewBinding={previewBinding} setStep={goTo} download={download} share={share} />}
          </div>
        </section>
      </main>

      <BuildBar
        config={config}
        previewBinding={previewBinding}
        step={step}
        reviewed={reviewed}
        ready={ready}
        open={sheetOpen}
        setOpen={setSheetOpen}
        onEdit={goTo}
        onNext={advance}
        pendingGraphic={nextGraphicField(build)}
        graphicField={field}
        onBack={() => goTo(step - 1)}
      />
      <p className="sr-only" aria-live="polite">
        {ready ? `Reference total ${money(total)}` : ''}
      </p>

      <Dialogs type={modal} close={() => setModal(null)} config={config} save={save} restore={restore} hasSave={hasSave} share={share} download={download} />
      {notice && (
        <div className="toast" role="status">
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
