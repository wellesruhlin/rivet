import {useEffect, useRef} from 'react';
import {ArrowLeft, ArrowRight, Check, ChevronRight, ChevronUp, X} from 'lucide-react';

function BuildSheet({engine, config, reviewed, ready, onEdit, onClose, sheetRef, previewBinding}) {
  // A visual-test binding shows on the skis but carries no price.
  const lines = engine.bom(config).map(line =>
    previewBinding && engine.group(line.key)?.type === 'binding' ? {...line, value: `${engine.format(line.key, previewBinding, config)} · visual test`, visual: true} : line,
  );
  const {amount, quote} = engine.total(config);
  const steps = engine.steps.slice(0, -1);
  const lineSteps = steps.map((step, index) => ({step, index, lines: lines.filter(line => line.step === index)})).filter(s => s.lines.length);
  return (
    <section id="cfg-build-sheet" className="cfg-build-sheet" aria-labelledby="cfg-build-sheet-title" tabIndex={-1} ref={sheetRef}>
      <div className="cfg-sheet-head">
        <div>
          <p className="cfg-overline">{engine.pack.copy.sheetEyebrow ?? 'One pair · your configuration'}</p>
          <h2 id="cfg-build-sheet-title">Build sheet</h2>
        </div>
        <p className="cfg-sheet-progress">
          <span className="cfg-progress-track" aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} className={reviewed.includes(i) ? 'is-done' : ''} />
            ))}
          </span>
          {reviewed.length} of {steps.length} sections reviewed
        </p>
        <button type="button" className="cfg-icon-button" aria-label="Close build sheet" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="cfg-sheet-columns" style={{'--columns': lineSteps.length}}>
        {lineSteps.map(({step, index, lines: stepLines}) => {
          const done = reviewed.includes(index);
          return (
            <section className="cfg-sheet-group" key={step.id} aria-label={step.label}>
              <div className="cfg-sheet-group-head">
                <h3>{step.label}</h3>
                <span className={`cfg-status-chip ${done ? 'is-done' : ''}`}>
                  {done && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                  {done ? 'Reviewed' : index === 0 && !ready ? engine.pack.copy.firstStep?.chip ?? 'Choose your shape' : 'To review'}
                </span>
              </div>
              <dl>
                {stepLines.map(line => (
                  <div key={line.key} className={line.pending ? 'is-pending' : ''}>
                    <dt>{line.label}</dt>
                    <dd>
                      <button type="button" disabled={index > 0 && !ready} onClick={() => onEdit(index, line.key)} aria-label={`Edit ${line.label.toLowerCase()}: ${line.value}`}>
                        {line.value}
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                      <span className="cfg-sheet-price">
                        {line.visual ? 'Not in total' : line.info ? '' : line.pending ? '—' : line.quote ? 'Quote' : line.price ? engine.money(line.price) : 'Included'}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
      <div className="cfg-sheet-foot">
        <p>{engine.pack.copy.sheetNote}</p>
        <div className="cfg-sheet-total">
          <span>{ready ? engine.pack.copy.totalLabel ?? 'Reference total' : 'Starting estimate'}</span>
          <strong>
            {engine.money(amount)}
            {quote && <small> + quote</small>}
          </strong>
        </div>
      </div>
    </section>
  );
}

export default function BuildBar({engine, config, step, reviewed, ready, open, setOpen, onEdit, onNext, onBack, finalLabel, previewBinding, pendingConfirm, field}) {
  const model = engine.context(config).model;
  // The length (or a pack's size group, `ui.size`) shown next to the model name.
  const lengthGroup = engine.groups.find(group => group.type === 'length' || group.ui?.size);
  const {amount, quote} = engine.total(config);
  const toggleRef = useRef(null);
  const sheetRef = useRef(null);
  const last = engine.steps.length - 1;

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    sheetRef.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') close();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = engine.steps[step + 1]?.label;
  const first = engine.pack.copy.firstStep ?? {};
  // Labels may depend on the build (what is still missing); a pack's confirmation step
  // names the choice being confirmed ("Use this base").
  const copy = (value, fallback) => (typeof value === 'function' ? value(config) : value) ?? fallback;
  const confirm = engine.pack.confirm;
  const confirming = ready && pendingConfirm && engine.steps[step]?.id === confirm?.step ? confirm.label(pendingConfirm, field, config) : null;
  const label = !ready ? copy(first.cta, 'Select your shape') : confirming ?? (step === last ? finalLabel : `Continue to ${next}`);
  const shortLabel = !ready ? copy(first.short, 'Select shape') : confirming ?? (step === last ? finalLabel : next);
  const length = lengthGroup && config[lengthGroup.id];
  const lengthText = engine.pack.review?.barMeta?.(config, engine.context(config)) ?? (length ? lengthGroup.ui?.barLabel?.(length, config) ?? `${length} cm` : first.missing ?? 'select a length');

  return (
    <>
      {open && <div className="cfg-sheet-scrim" onClick={close} aria-hidden="true" />}
      <footer className={`cfg-build-bar ${open ? 'is-open' : ''}`}>
        {open && <BuildSheet engine={engine} config={config} reviewed={reviewed} ready={ready} onEdit={onEdit} onClose={close} sheetRef={sheetRef} previewBinding={previewBinding} />}
        <button ref={toggleRef} type="button" className="cfg-bar-summary" aria-expanded={open} aria-controls="cfg-build-sheet" onClick={() => setOpen(o => !o)}>
          <span className="cfg-overline">
            Build sheet
            <span className="cfg-bar-progress">
              {reviewed.length} / {last} reviewed
            </span>
            <ChevronUp size={14} className="cfg-bar-chevron" aria-hidden="true" />
          </span>
          <span className="cfg-bar-model">
            {model && config.model ? model.name : engine.pack.copy.emptyBuild ?? 'Your next pair'}
            {config.model && lengthText && <span>{` · ${lengthText}`}</span>}
          </span>
        </button>
        <button type="button" className="cfg-bar-price" aria-expanded={open} aria-controls="cfg-build-sheet" onClick={() => setOpen(o => !o)}>
          <span className="cfg-bar-amount">
            {engine.money(amount)}
            {quote && <small>+ quote</small>}
          </span>
          <span className="cfg-bar-caption">
            {ready ? engine.pack.copy.totalLabel ?? 'Reference total' : 'Starting estimate'}
            <span className="cfg-bar-caption-long"> · {engine.pack.currency ?? 'USD'}</span>
            <ChevronUp size={13} className="cfg-bar-chevron cfg-mobile-only" aria-hidden="true" />
          </span>
          <span className="cfg-sr-only">. Show build sheet.</span>
        </button>
        <div className="cfg-bar-actions">
          {step > 0 && (
            <button type="button" className="cfg-icon-button is-round" aria-label="Previous step" onClick={onBack}>
              <ArrowLeft size={18} strokeWidth={1.8} />
            </button>
          )}
          <button type="button" className="cfg-primary-button" disabled={!ready} onClick={onNext} aria-label={label}>
            <span className="cfg-cta-long">{label}</span>
            <span className="cfg-cta-short" aria-hidden="true">
              {shortLabel}
            </span>
            <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  );
}
