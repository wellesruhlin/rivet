import {useEffect, useRef} from 'react';
import {ArrowLeft, ArrowRight, Check, ChevronRight, ChevronUp, X} from 'lucide-react';
import {bomLines, getModel, money, steps, totalPrice} from '../config.js';
import {bindingLabel} from '../bindings.js';

function BuildSheet({config, previewBinding, reviewed, ready, onEdit, onClose, sheetRef}) {
  // A visual-test binding shows on the skis but is not orderable, so it carries no price.
  const lines = bomLines(config).map(line => line.key === 'binding' && previewBinding ? {...line, value: `${bindingLabel(previewBinding)} · visual test`, visual: true} : line);
  const total = totalPrice(config);
  return (
    <section id="build-sheet" className="build-sheet" aria-labelledby="build-sheet-title" tabIndex={-1} ref={sheetRef}>
      <div className="sheet-head">
        <div>
          <p className="overline">One pair · your configuration</p>
          <h2 id="build-sheet-title">Build sheet</h2>
        </div>
        <p className="sheet-progress">
          <span className="progress-track" aria-hidden="true">
            {steps.slice(0, -1).map((_, i) => (
              <span key={i} className={reviewed.includes(i) ? 'is-done' : ''} />
            ))}
          </span>
          {reviewed.length} of {steps.length - 1} sections reviewed
        </p>
        <button type="button" className="icon-button" aria-label="Close build sheet" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="sheet-columns">
        {steps.slice(0, -1).map((name, step) => {
          const done = reviewed.includes(step);
          return (
            <section className="sheet-group" key={name} aria-label={name}>
              <div className="sheet-group-head">
                <h3>{name}</h3>
                <span className={`status-chip ${done ? 'is-done' : ''}`}>
                  {done && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                  {done ? 'Reviewed' : step === 0 && !ready ? 'Choose your shape' : 'To review'}
                </span>
              </div>
              <dl>
                {lines
                  .filter(line => line.step === step)
                  .map(line => (
                    <div key={line.key} className={line.pending ? 'is-pending' : ''}>
                      <dt>{line.label}</dt>
                      <dd>
                        <button type="button" disabled={step > 0 && !ready} onClick={() => onEdit(step, line.key)} aria-label={`Edit ${line.label.toLowerCase()}: ${line.value}`}>
                          {line.value}
                          <ChevronRight size={14} aria-hidden="true" />
                        </button>
                        <span className="sheet-price">{line.pending ? '—' : line.visual ? 'Not in total' : line.price ? money(line.price) : 'Included'}</span>
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          );
        })}
      </div>
      <div className="sheet-foot">
        <p>Starting artwork and stock construction are included defaults until you review them. Prices exclude promotions, mounting, tax and shipping. Independent fan concept; no orders are placed.</p>
        <div className="sheet-total">
          <span>{ready ? 'Reference total' : 'Starting estimate'}</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
    </section>
  );
}

export default function BuildBar({config, previewBinding, step, reviewed, ready, open, setOpen, onEdit, onNext, onBack, pendingGraphic, graphicField}) {
  const model = getModel(config);
  const total = totalPrice(config);
  const toggleRef = useRef(null);
  const priceRef = useRef(null);
  const sheetRef = useRef(null);

  const close = () => {
    setOpen(false);
    (toggleRef.current?.getClientRects().length ? toggleRef : priceRef).current?.focus({preventScroll: true});
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

  const next = steps[step + 1];
  const graphicsLabel = pendingGraphic === 'base'
    ? graphicField === 'base' ? 'Use this base' : 'Pick a base'
    : graphicField === 'sidewall' ? `Use ${config.sidewall.toLowerCase()} sidewalls` : 'Pick a sidewall';
  const missingShape = !config.category ? 'Choose ski style' : !config.model ? 'Choose a model' : 'Choose a length';
  const label = !ready ? missingShape : step === 1 && pendingGraphic ? graphicsLabel : step === steps.length - 1 ? 'Save your build' : `Continue to ${next}`;
  const shortLabel = !ready ? missingShape : step === 1 && pendingGraphic ? graphicsLabel : step === steps.length - 1 ? 'Save build' : next;

  return (
    <>
      {open && <div className="sheet-scrim" onClick={close} aria-hidden="true" />}
      <footer className={`build-bar ${open ? 'is-open' : ''}`}>
        {open && <BuildSheet config={config} previewBinding={previewBinding} reviewed={reviewed} ready={ready} onEdit={onEdit} onClose={close} sheetRef={sheetRef} />}
        <button ref={toggleRef} type="button" className="bar-summary" aria-expanded={open} aria-controls="build-sheet" onClick={() => setOpen(o => !o)}>
          <span className="overline">
            Build sheet
            <span className="bar-progress">{reviewed.length} / {steps.length - 1} reviewed</span>
            <ChevronUp size={14} className="bar-chevron" aria-hidden="true" />
          </span>
          <span className="bar-model">
            {model ? config.length ? `${config.length} cm` : 'Select your length' : 'Choose your shape'}
            {model && config.length && <span> · {config.rocker} rocker</span>}
          </span>
        </button>
        <button ref={priceRef} type="button" className="bar-price" aria-expanded={open} aria-controls="build-sheet" onClick={() => setOpen(o => !o)}>
          <span className="bar-amount">{money(total)}</span>
          <span className="bar-caption">
            {ready ? 'Reference total' : 'Starting estimate'}
            <span className="bar-caption-long"> · USD</span>
            <ChevronUp size={13} className="bar-chevron mobile-only" aria-hidden="true" />
          </span>
          <span className="sr-only">. Show build sheet.</span>
        </button>
        <div className="bar-actions">
          {step > 0 && (
            <button type="button" className="icon-button round" aria-label="Previous step" onClick={onBack}>
              <ArrowLeft size={18} strokeWidth={1.8} />
            </button>
          )}
          <button type="button" className="primary-button" disabled={!ready} onClick={onNext} aria-label={label}>
            <span className="cta-long">{label}</span>
            <span className="cta-short" aria-hidden="true">
              {shortLabel}
            </span>
            <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  );
}
