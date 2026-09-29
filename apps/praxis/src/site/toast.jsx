import {useEffect, useSyncExternalStore} from 'react';
import {Check, X} from 'lucide-react';

let message = '';
let timer;
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener());

export function toast(text) {
  message = text;
  clearTimeout(timer);
  timer = setTimeout(() => {
    message = '';
    emit();
  }, 5200);
  emit();
}

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function Toast() {
  const text = useSyncExternalStore(subscribe, () => message);
  useEffect(() => () => clearTimeout(timer), []);
  return (
    <div className="px-toast-region" role="status" aria-live="polite">
      {text && (
        <div className="px-toast">
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>{text}</span>
          <button
            type="button"
            className="px-icon-button"
            aria-label="Dismiss notification"
            onClick={() => {
              message = '';
              emit();
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
