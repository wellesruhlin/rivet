import {useId, useRef} from 'react';
import {Check, Info} from 'lucide-react';

const STEP_KEYS = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1};

// Roving-focus radio behavior for any markup: arrow keys move and select,
// disabled options are skipped, and only one option is in the tab order.
export function useRadioGroup(options, value, onChange) {
  const refs = useRef([]);
  const enabled = options.flatMap((option, i) => (option.disabled ? [] : [i]));
  const checked = options.findIndex(option => option.value === value && !option.disabled);
  const tabStop = checked >= 0 ? checked : enabled[0];

  const onKeyDown = (event, index) => {
    if (!(event.key in STEP_KEYS) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const position = enabled.indexOf(index);
    const nextPosition =
      event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (position + STEP_KEYS[event.key] + enabled.length) % enabled.length;
    const next = enabled[nextPosition];
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return index => ({
    ref: element => {
      refs.current[index] = element;
    },
    type: 'button',
    role: 'radio',
    'aria-checked': options[index].value === value,
    tabIndex: index === tabStop ? 0 : -1,
    disabled: options[index].disabled,
    onClick: () => onChange(options[index].value),
    onKeyDown: event => onKeyDown(event, index),
  });
}

export function RadioGroup({label, labelledBy, options, value, onChange, className = '', itemClassName = '', render}) {
  const radio = useRadioGroup(options, value, onChange);
  return (
    <div role="radiogroup" aria-label={label} aria-labelledby={labelledBy} className={className}>
      {options.map((option, i) => (
        <button key={String(option.value)} {...radio(i)} className={[itemClassName, option.className].filter(Boolean).join(' ')} aria-describedby={option.describedBy}>
          {render ? render(option, option.value === value) : option.label}
        </button>
      ))}
    </div>
  );
}

// A labelled section of the options panel with an optional action on the right.
export function Field({label, action, children, className = ''}) {
  const id = useId();
  return (
    <section className={`cfg-field ${className}`} role="group" aria-labelledby={id}>
      <div className="cfg-field-head">
        <h3 id={id} className="cfg-overline">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export const CheckMark = ({size = 12}) => (
  <span className="cfg-check" aria-hidden="true">
    <Check size={size} strokeWidth={2.5} />
  </span>
);

export const RadioDot = ({checked}) => <span className="cfg-radio-dot">{checked && <Check size={12} strokeWidth={3} />}</span>;

export function Note({children, tone = 'caution'}) {
  return (
    <div className={`cfg-note cfg-note-${tone}`}>
      <Info size={16} strokeWidth={1.8} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
