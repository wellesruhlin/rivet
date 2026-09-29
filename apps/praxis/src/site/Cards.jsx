import {ArrowRight, Check, Plus} from 'lucide-react';
import {cover, priceLabel, waistOf} from '@rivet/brand-praxis/catalog';
import {toggleCompare, useStore} from './store.js';
import {toast} from './toast.jsx';

// A stock ski on the studio floor: the original photograph with only its white
// background removed. `tips` covers rise from the bottom edge (no full-length photo).
export function Cover({p, className = '', eager = false}) {
  const {src, kind} = cover(p.id);
  return (
    <span className={`px-cover is-${kind} ${className}`}>
      <img src={src} alt={`${p.name}, ${p.veneer} top`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </span>
  );
}

export function StockCard({p, compare = true}) {
  const {compare: selected} = useStore();
  const chosen = selected.includes(p.id);
  const waist = waistOf(p);
  const onCompare = () => {
    const result = toggleCompare(p.id);
    if (result === 'full') toast('Compare up to three skis. Remove one to add another.');
  };
  return (
    <article className="px-card">
      <a className="px-card-media" href={`#/skis/${p.id}`} aria-label={`${p.name}, ${priceLabel(p)}`}>
        <Cover p={p} />
        {p.preorder && <span className="px-badge">Preorder</span>}
        <span className="px-card-arrow" aria-hidden="true">
          <ArrowRight size={16} strokeWidth={1.8} />
        </span>
      </a>
      <div className="px-card-info">
        <div>
          <h3>
            <a href={`#/skis/${p.id}`}>{p.name}</a>
          </h3>
          <p>{[p.terrain[0], waist && `${waist} mm`, p.veneer].filter(Boolean).join(' · ')}</p>
        </div>
        <span className="px-card-price">{priceLabel(p)}</span>
      </div>
      {compare && (
        <button type="button" className={`px-compare-toggle ${chosen ? 'is-on' : ''}`} aria-pressed={chosen} onClick={onCompare}>
          <span aria-hidden="true">{chosen ? <Check size={12} strokeWidth={2.6} /> : <Plus size={12} strokeWidth={2.2} />}</span>
          Compare <span className="px-sr-only">{p.name}</span>
        </button>
      )}
    </article>
  );
}
