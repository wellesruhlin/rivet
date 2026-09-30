import {ArrowRight} from 'lucide-react';
import {priceLabel, product, summary} from '@arc/brand-praxis/catalog';
import {Cover} from '../Cards.jsx';
import {toggleCompare, useStore} from '../store.js';

const ROWS = [
  ['Price', p => priceLabel(p)],
  ['Terrain', p => p.terrain.join(' · ')],
  ['Tip / waist / tail', p => (summary(p.id) ? `${summary(p.id).dimsRange} mm` : p.waist ? `${p.waist} mm waist` : 'Not published')],
  ['Turn radius', p => (summary(p.id) ? `${summary(p.id).radius} m` : 'Not published')],
  ['Weight / pair', p => (summary(p.id) ? `${summary(p.id).weight} lb` : 'Not published')],
  ['Lengths', p => `${p.lengths.join(' · ')} cm`],
  ['Core', p => p.core],
  ['Top', p => p.veneer],
  ['Profile', p => p.profile],
];

export default function Compare() {
  const {compare} = useStore();
  const selected = compare.map(product);
  return (
    <div className="px-shell">
      <header className="px-page-intro">
        <div>
          <p className="px-eyebrow">Side by side</p>
          <h1>Different shapes. Your kind of skiing.</h1>
        </div>
        <p>Compare the standard builds using Praxis’s published charts, then open a ski for every length.</p>
      </header>
      {selected.length ? (
        <div className="px-table-scroll">
          <table className="px-table px-compare-table">
            <caption className="px-sr-only">Ski comparison</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="px-sr-only">Specification</span>
                </th>
                {selected.map(p => (
                  <th key={p.id} scope="col">
                    <a className="px-compare-media" href={`#/skis/${p.id}`}>
                      <Cover p={p} />
                    </a>
                    <a className="px-compare-name" href={`#/skis/${p.id}`}>
                      {p.name}
                    </a>
                    <button type="button" className="px-quiet-button" onClick={() => toggleCompare(p.id)}>
                      Remove <span className="px-sr-only">{p.name}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {selected.map(p => (
                    <td key={p.id}>{value(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-empty">
          <h2>Nothing to compare yet</h2>
          <p>Choose up to three skis from the collection to see them side by side.</p>
        </div>
      )}
      <div className="px-section">
        <a className="px-button is-outline" href="#/skis">
          {selected.length ? 'Choose another ski' : 'Explore stock skis'} <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
