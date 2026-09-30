import {useEffect, useRef, useState} from 'react';
import {ArrowRight, ArrowUpRight, Menu, Search, X} from 'lucide-react';
import {money, priceLabel, product, search} from '@arc/brand-praxis/catalog';
import {categories, modelById} from '@arc/brand-praxis/pack';
import {bagCount, clearCompare, useStore} from './store.js';

export const NAV = [
  ['/skis', 'Stock skis'],
  ['/custom', 'Build custom'],
  ['/materials', 'Wood & finish'],
  ['/workshop', 'Workshop'],
];

export function Wordmark() {
  return (
    <a className="px-wordmark" href="#/" aria-label="Praxis home">
      Praxis
    </a>
  );
}

export function Header({path, onSearch, onMenu}) {
  const {bag} = useStore();
  const count = bagCount(bag);
  const active = to => path === to || path.startsWith(`${to}/`);
  return (
    <header className="px-header">
      <div className="px-header-inner">
        <Wordmark />
        <nav className="px-nav" aria-label="Main">
          {NAV.map(([to, label]) => (
            <a key={to} href={`#${to}`} className={active(to) ? 'is-active' : ''} aria-current={active(to) ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <div className="px-utilities">
          <button type="button" className="px-utility" aria-label="Search" onClick={onSearch}>
            <Search size={17} strokeWidth={1.7} aria-hidden="true" />
            <span className="px-utility-label">Search</span>
          </button>
          <a className={`px-utility px-bag-link ${count ? 'has-items' : ''}`} href="#/bag" aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <span>Bag</span>
            <span className="px-bag-count">{count}</span>
          </a>
          <button type="button" className="px-utility px-menu-toggle" aria-label="Open menu" onClick={onMenu}>
            <Menu size={20} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="px-footer">
      <div className="px-shell px-footer-grid">
        <div className="px-footer-brand">
          <Wordmark />
          <p>
            Independent minds.
            <br />
            Handcrafted skis.
            <br />
            Incline Village, North Lake Tahoe.
          </p>
        </div>
        <nav className="px-footer-links" aria-label="Explore">
          <p className="px-eyebrow">Explore</p>
          <a href="#/skis">Stock skis</a>
          <a href="#/custom">Build custom</a>
          <a href="#/materials">Wood &amp; finish</a>
          <a href="#/workshop">Our workshop</a>
        </nav>
        <nav className="px-footer-links" aria-label="Good to know">
          <p className="px-eyebrow">Good to know</p>
          <a href="#/support">Help &amp; sizing</a>
          <a href="https://www.praxisskis.com/ski-bindings/" target="_blank" rel="noreferrer">
            Bindings <ArrowUpRight size={13} aria-hidden="true" />
          </a>
          <a href="https://www.praxisskis.com/gear/" target="_blank" rel="noreferrer">
            Gear <ArrowUpRight size={13} aria-hidden="true" />
          </a>
          <a href="https://www.praxisskis.com/foil-sports/" target="_blank" rel="noreferrer">
            Foils <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </nav>
      </div>
      <div className="px-shell px-footer-bottom">
        <span>Independent concept, made in appreciation of Praxis. Not affiliated with or endorsed by Praxis.</span>
        <span>Catalog snapshot · September 2026 · USD</span>
      </div>
    </footer>
  );
}

function useModal(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);
  const props = {
    ref,
    onCancel: event => {
      event.preventDefault();
      onClose();
    },
    onClick: event => {
      if (event.target === ref.current) onClose();
    },
  };
  return props;
}

export function SearchDialog({open, onClose}) {
  const [query, setQuery] = useState('');
  const dialog = useModal(open, onClose);
  const input = useRef(null);
  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  const results = search(query);
  const q = query.trim().toLowerCase();
  const customMatches = q ? categories.flatMap(c => c.models).filter(id => modelById(id).name.toLowerCase().includes(q)) : [];
  return (
    <dialog className="px-dialog px-search-dialog" aria-labelledby="px-search-title" {...dialog}>
      <div className="px-dialog-head">
        <h2 id="px-search-title">Find your ski</h2>
        <button type="button" className="px-icon-button" aria-label="Close search" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <label className="px-search-field">
        <Search size={18} strokeWidth={1.7} aria-hidden="true" />
        <span className="px-sr-only">Search by model, terrain or wood</span>
        <input ref={input} type="search" placeholder="Model, terrain or wood" autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <p className="px-search-count" aria-live="polite">
        {q ? `${results.length} stock ${results.length === 1 ? 'ski' : 'skis'}${customMatches.length ? ` · ${customMatches.length} custom` : ''}` : 'The stock collection'}
      </p>
      <div className="px-search-results">
        {results.map(p => (
          <a key={p.id} className="px-search-result" href={`#/skis/${p.id}`} onClick={onClose}>
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.terrain[0]} · {p.veneer}
              </small>
            </span>
            <span>
              {priceLabel(p)} <ArrowRight size={15} aria-hidden="true" />
            </span>
          </a>
        ))}
        {customMatches.map(id => (
          <a key={`custom-${id}`} className="px-search-result" href={`#/custom?model=${id}`} onClick={onClose}>
            <span>
              <strong>{modelById(id).name} custom</strong>
              <small>Build it in the configurator</small>
            </span>
            <span>
              From {money(modelById(id).price)} <ArrowRight size={15} aria-hidden="true" />
            </span>
          </a>
        ))}
        {q && !results.length && !customMatches.length && (
          <div className="px-search-empty">
            <h3>No skis found</h3>
            <p>Try “powder”, “GPO” or “cherry”.</p>
            <button type="button" className="px-text-link" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

export function MenuDialog({open, onClose}) {
  const dialog = useModal(open, onClose);
  return (
    <dialog className="px-dialog px-menu-dialog" aria-label="Menu" {...dialog}>
      <div className="px-dialog-head">
        <Wordmark />
        <button type="button" className="px-icon-button" aria-label="Close menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <nav className="px-menu-nav" aria-label="Menu">
        {[...NAV, ['/support', 'Help & sizing'], ['/bag', 'Your bag']].map(([to, label]) => (
          <a key={to} href={`#${to}`} onClick={onClose}>
            {label} <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
        ))}
      </nav>
      <p className="px-eyebrow">Handcrafted in Tahoe</p>
    </dialog>
  );
}

export function CompareBar({path}) {
  const {compare} = useStore();
  if (!compare.length || path === '/compare' || path === '/custom') return null;
  return (
    <aside className="px-compare-bar" aria-label="Ski comparison">
      <span>
        <span className="px-eyebrow">Compare · {compare.length} / 3</span>
        <strong>{compare.map(id => product(id).name).join(' · ')}</strong>
      </span>
      <div>
        <button type="button" className="px-quiet-button" onClick={clearCompare}>
          Clear
        </button>
        <a className="px-button is-small" href="#/compare">
          Compare <ArrowRight size={15} aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
}
