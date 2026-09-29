import {Bookmark, Check, CircleHelp} from 'lucide-react';
import {steps} from '../config.js';
import {assetUrl} from '../art-geometry.js';

export function Header({onHow, onSave}) {
  return (
    <header className="site-header">
      <div className="brand">
        <a href="https://www.on3pskis.com" target="_blank" rel="noreferrer" aria-label="ON3P official website (opens in a new tab)">
          <img src={assetUrl('assets/logo.png')} alt="ON3P" width="88" height="22" />
        </a>
        <span className="brand-rule" aria-hidden="true" />
        <span className="brand-label">Custom Shop</span>
        <span className="concept-tag">Fan concept</span>
      </div>
      <div className="header-actions">
        <button type="button" className="ghost-button" aria-label="How it works" onClick={onHow}>
          <CircleHelp size={16} strokeWidth={1.6} />
          <span className="label-wide">How it works</span>
        </button>
        <button type="button" className="outline-button small" aria-label="Save build" onClick={onSave}>
          <Bookmark size={14} strokeWidth={1.8} />
          <span>Save</span>
        </button>
      </div>
    </header>
  );
}

export function StepNav({step, reviewed, ready, onStep}) {
  return (
    <nav className="step-nav" aria-label="Build steps">
      <ol>
        {steps.map((name, i) => {
          const done = reviewed.includes(i);
          const state = step === i ? 'is-current' : done ? 'is-done' : '';
          return (
            <li key={name}>
              <button type="button" className={state} aria-current={step === i ? 'step' : undefined} disabled={i > 0 && !ready} onClick={() => onStep(i)}>
                <span className="step-number">{String(i + 1).padStart(2, '0')}</span>
                <span className="step-name">{name}</span>
                {done && (
                  <>
                    <Check className="step-check" size={13} strokeWidth={2.4} aria-hidden="true" />
                    <span className="sr-only">(reviewed)</span>
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
