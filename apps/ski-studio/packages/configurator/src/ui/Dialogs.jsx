import {useEffect, useRef} from 'react';
import {Check, Download, Link2, RotateCcw, X} from 'lucide-react';

export function Dialog({title, wide = false, close, children}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="cfg-dialog-title"
      className={`cfg-dialog ${wide ? 'is-wide' : ''}`}
      onCancel={event => {
        event.preventDefault();
        close();
      }}
      onClick={event => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="cfg-dialog-head">
        <h2 id="cfg-dialog-title">{title}</h2>
        <button type="button" className="cfg-icon-button" aria-label="Close dialog" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <div className="cfg-dialog-body">{children}</div>
    </dialog>
  );
}

// Built-in save dialogs plus brand guides ({title, wide, render}).
export default function Dialogs({type, close, engine, config, guides, save, restore, hasSave, share, download}) {
  if (!type) return null;
  const model = engine.context(config).model;
  if (type === 'save')
    return (
      <Dialog title="Keep your build" close={close}>
        <p>Keep this setup on this device, or take a copy with you.</p>
        <div className="cfg-save-actions">
          <button type="button" className="cfg-primary-button" onClick={save}>
            Save on this device <Check size={17} />
          </button>
          {hasSave && (
            <button type="button" className="cfg-outline-button" onClick={restore}>
              <RotateCcw size={15} strokeWidth={1.8} /> Restore last saved build
            </button>
          )}
          <button type="button" className="cfg-outline-button" onClick={share}>
            <Link2 size={15} strokeWidth={1.8} /> Copy build link
          </button>
          <button type="button" className="cfg-outline-button" onClick={download}>
            <Download size={15} strokeWidth={1.8} /> Download build sheet
          </button>
        </div>
        <p className="cfg-fine">{engine.pack.copy.linkNote ?? 'A build link includes your ski choices only.'} A localhost link works on this device until the concept is hosted.</p>
      </Dialog>
    );
  if (type === 'saved')
    return (
      <Dialog title="Build saved" close={close}>
        <div className="cfg-saved-mark">
          <Check size={28} strokeWidth={2} />
        </div>
        <p>Your {model && config.model ? model.name : 'draft'} build is saved on this device. You can restore it from Save.</p>
        <button type="button" className="cfg-primary-button" onClick={close}>
          {engine.pack.copy.backLabel ?? 'Back to your skis'}
        </button>
      </Dialog>
    );
  const guide = guides?.[type];
  if (!guide) return null;
  const ctx = engine.context(config);
  return (
    <Dialog title={typeof guide.title === 'function' ? guide.title(config, ctx) : guide.title} wide={guide.wide} close={close}>
      {guide.render({engine, config, ctx, close})}
    </Dialog>
  );
}
