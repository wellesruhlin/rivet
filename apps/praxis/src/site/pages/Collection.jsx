import {useState} from 'react';
import {ArrowRight, ChevronDown} from 'lucide-react';
import {RadioGroup} from '@rivet/configurator';
import {products, terrains} from '@rivet/brand-praxis/catalog';
import {StockCard} from '../Cards.jsx';
import {replaceQuery} from '../router.js';

const SORTS = [
  ['featured', 'Featured'],
  ['price-low', 'Price: low to high'],
  ['price-high', 'Price: high to low'],
  ['name', 'Name: A–Z'],
];

export default function Collection({query}) {
  const [terrain, setTerrain] = useState(() => (terrains.includes(query.get('terrain')) ? query.get('terrain') : 'All'));
  const [sort, setSort] = useState(() => (SORTS.some(([id]) => id === query.get('sort')) ? query.get('sort') : 'featured'));
  const update = (nextTerrain, nextSort) => {
    setTerrain(nextTerrain);
    setSort(nextSort);
    replaceQuery('/skis', {...(nextTerrain !== 'All' ? {terrain: nextTerrain} : {}), ...(nextSort !== 'featured' ? {sort: nextSort} : {})});
  };

  const list = products.filter(p => terrain === 'All' || p.terrain.includes(terrain));
  if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="px-shell">
      <header className="px-page-intro">
        <div>
          <p className="px-eyebrow">The stock collection</p>
          <h1>Find your line.</h1>
        </div>
        <p>From the first chair to the far side of the ridge: fourteen shapes, each built for a purpose, most with a real wood veneer top.</p>
      </header>

      <div className="px-toolbar">
        <RadioGroup
          label="Terrain"
          className="px-pills"
          options={['All', ...terrains].map(t => ({value: t, label: t === 'All' ? 'All skis' : t}))}
          value={terrain}
          onChange={t => update(t, sort)}
        />
        <label className="px-select">
          <span className="px-eyebrow">Sort</span>
          <select value={sort} onChange={e => update(terrain, e.target.value)}>
            {SORTS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
      </div>
      <p className="px-results-meta" aria-live="polite">
        <span>
          {list.length} {list.length === 1 ? 'ski' : 'skis'}
          {terrain !== 'All' && ` · ${terrain}`}
        </span>
        <span>Compare up to three</span>
      </p>

      {list.length ? (
        <div className="px-grid px-grid-3">
          {list.map(p => (
            <StockCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="px-empty">
          <h2>No skis found</h2>
          <button type="button" className="px-button is-outline" onClick={() => update('All', sort)}>
            Clear filters
          </button>
        </div>
      )}
      <p className="px-note">Standard builds and catalog lengths. Current availability and pricing are confirmed by Praxis.</p>

      <section className="px-band">
        <div>
          <p className="px-eyebrow">Want something different?</p>
          <h2>Any shape, your way.</h2>
          <p>Thirteen of these shapes, and nine more, come as custom builds with your choice of wood, artwork, flex and core.</p>
        </div>
        <a className="px-button is-outline" href="#/custom">
          Build a custom pair <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>
    </div>
  );
}
