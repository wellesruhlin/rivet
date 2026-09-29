import {useState} from 'react';
import {ArrowRight, ArrowUpRight, Check} from 'lucide-react';
import {RadioGroup, Technical} from '@rivet/configurator';
import {chartFor, photoUrl, priceLabel, products, specAt, summary} from '@rivet/brand-praxis/catalog';
import {engine} from '@rivet/brand-praxis';
import {Cover, StockCard} from '../Cards.jsx';
import {addStock} from '../store.js';
import {toast} from '../toast.jsx';

const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const flexLabel = flex => (flex === 'Length dependent' ? 'Varies by length' : flex === 'See Praxis' ? 'See the Praxis listing' : `#${flex} of 5`);

function Gallery({p}) {
  const views = [{kind: 'studio'}, ...p.photos.map(file => ({kind: 'photo', file}))];
  const [index, setIndex] = useState(0);
  const view = views[index];
  return (
    <div className="px-gallery">
      <figure className={`px-gallery-main is-${view.kind}`}>
        {view.kind === 'studio' ? <Cover p={p} eager /> : <img src={photoUrl(view.file)} alt={`${p.name}, original Praxis photograph ${index}`} />}
        <figcaption>{view.kind === 'studio' ? `${p.veneer} · original photograph on the studio floor` : `${p.veneer} · original photograph`}</figcaption>
      </figure>
      <div className="px-gallery-thumbs" role="radiogroup" aria-label={`${p.name} photographs`}>
        {views.map((v, i) => (
          <button key={v.kind + (v.file ?? '')} type="button" role="radio" aria-checked={i === index} aria-label={i === 0 ? 'Studio view' : `Photograph ${i}`} className={`is-${v.kind}`} onClick={() => setIndex(i)}>
            {v.kind === 'studio' ? <Cover p={p} /> : <img src={photoUrl(v.file)} alt="" loading="lazy" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpecTable({p, length}) {
  const chart = chartFor(p.id);
  if (!chart) return null;
  const rows = chart.lengths.map(l => specAt(p.id, l));
  return (
    <div className="px-table-scroll">
      <table className="px-table">
        <caption className="px-sr-only">{p.name} specifications by length</caption>
        <thead>
          <tr>
            <th scope="col">Length</th>
            <th scope="col">Tip / waist / tail</th>
            <th scope="col">Radius</th>
            <th scope="col">Sidecut</th>
            <th scope="col">Rocker tip / tail</th>
            <th scope="col">Camber</th>
            <th scope="col">Boot center</th>
            <th scope="col">Weight / pair</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.length} className={row.length === length ? 'is-current' : ''}>
              <th scope="row">{row.length} cm</th>
              <td>
                {row.tip} / {row.waist} / {row.tail}
              </td>
              <td>{row.radius} m</td>
              <td>{row.sidecut} cm</td>
              <td>
                {row.tipRocker} / {row.tailRocker} cm
              </td>
              <td>{row.camber} mm</td>
              <td>{signed(row.boot)} cm</td>
              <td>{row.weight} lb</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Product({p}) {
  const [length, setLength] = useState(null);
  const [added, setAdded] = useState(false);
  const chart = chartFor(p.id);
  const info = summary(p.id);
  const drawnLength = length && chart?.lengths.includes(length) ? length : chart?.lengths[Math.floor((chart.lengths.length - 1) / 2)];
  const technicalConfig = p.custom && drawnLength ? engine.normalize({model: p.custom, length: drawnLength, top: 'nylon', graphic: 'none'}) : null;
  const geometry = technicalConfig && engine.pack.specs.geometry(technicalConfig, engine.context(technicalConfig));
  const row = length ? specAt(p.id, length) : null;
  const related = products.filter(x => x.id !== p.id && x.terrain.some(t => p.terrain.includes(t))).slice(0, 3);

  const add = event => {
    event.preventDefault();
    if (!length) {
      toast('Choose a length first.');
      return;
    }
    try {
      addStock(p.id, length);
      toast(`${p.name} · ${length} cm added to your bag.`);
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div className="px-shell">
      <nav className="px-breadcrumbs" aria-label="Breadcrumb">
        <a href="#/skis">Stock skis</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.name}</span>
      </nav>

      <section className="px-product">
        <Gallery p={p} />
        <div className="px-product-info">
          <p className="px-eyebrow">{p.terrain.join(' · ')}</p>
          <div className="px-product-title">
            <h1>{p.name}</h1>
            <span className="px-product-price">
              {priceLabel(p)} <small>USD</small>
            </span>
          </div>
          <p className="px-product-tagline">{p.tagline}</p>
          <p className="px-product-description">{p.description}</p>
          <ul className="px-facts">
            <li>Handcrafted in Tahoe</li>
            <li>{p.veneer}</li>
            {info?.dims && <li>{info.dims} mm</li>}
            {p.preorder && <li className="is-accent">Preorder</li>}
          </ul>

          <form className="px-buy" onSubmit={add}>
            <fieldset>
              <legend>
                Length <span>cm</span>
              </legend>
              <RadioGroup label="Length in centimeters" className="px-length-row" options={p.lengths.map(l => ({value: l, label: l}))} value={length} onChange={setLength} />
            </fieldset>
            <p className="px-length-detail" aria-live="polite">
              {row
                ? `${row.tip}-${row.waist}-${row.tail} mm · ${row.radius} m radius · ${row.weight} lb per pair`
                : length
                  ? 'Praxis hasn’t published dimensions for this length.'
                  : 'Catalog lengths; Praxis confirms availability.'}
            </p>
            <div className="px-buy-actions">
              <button type="submit" className="px-button is-wide">
                {added ? (
                  <>
                    Added to your bag <Check size={17} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Add to bag <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
              {p.custom && (
                <a className="px-button is-outline is-wide" href={`#/custom?model=${p.custom}${length ? `&length=${length}` : ''}`}>
                  Build it your way
                </a>
              )}
            </div>
            <p className="px-fine">Concept bag: saved on this device. Nothing is ordered or charged here.</p>
          </form>
          <a className="px-text-link" href={p.source} target="_blank" rel="noreferrer">
            {p.preorder ? 'View the preorder' : 'Check availability'} at praxisskis.com <ArrowUpRight size={14} aria-hidden="true" />
          </a>

          <div className="px-accordion">
            <details open>
              <summary>The build</summary>
              <dl className="px-spec-list">
                <div>
                  <dt>Core</dt>
                  <dd>{p.core}</dd>
                </div>
                <div>
                  <dt>Flex</dt>
                  <dd>{flexLabel(p.flex)}</dd>
                </div>
                <div>
                  <dt>Profile</dt>
                  <dd>{p.profile}</dd>
                </div>
                {info && (
                  <div>
                    <dt>Radius</dt>
                    <dd>{info.radius} m</dd>
                  </div>
                )}
                <div>
                  <dt>Top</dt>
                  <dd>{p.veneer}</dd>
                </div>
              </dl>
            </details>
            <details>
              <summary>A note on natural wood</summary>
              <p>Real veneer varies in grain and color. Photographs show the finish; the grain on your pair will be its own. Confirm the current build on the Praxis listing.</p>
            </details>
            <details>
              <summary>Shipping &amp; warranty</summary>
              <p>
                Praxis confirms shipping and lead time when you order, and lists a one-year warranty against manufacturing defects. <a href="#/support">More about support</a>.
              </p>
            </details>
          </div>
        </div>
      </section>

      {geometry && (
        <section className="px-section px-specs" aria-labelledby="px-specs-title">
          <div className="px-section-head">
            <div>
              <p className="px-eyebrow">Specifications · {drawnLength} cm shown</p>
              <h2 id="px-specs-title">The shape, drawn to scale.</h2>
            </div>
            <a className="px-text-link" href={chart.chart} target="_blank" rel="noreferrer">
              Praxis {chart.year} spec chart <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <div className="px-technical-panel cfg-theme">
            <Technical geometry={geometry} />
          </div>
          <SpecTable p={p} length={length} />
          <p className="px-note">Outline traced from Praxis’s shape drawing; dimensions, rocker and weight from its spec chart. Heights in the profile are exaggerated for legibility.</p>
        </section>
      )}

      <section className="px-section">
        <div className="px-section-head">
          <h2>Keep exploring</h2>
          <a className="px-text-link" href="#/skis">
            All stock skis <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="px-grid px-grid-3">
          {related.map(x => (
            <StockCard key={x.id} p={x} />
          ))}
        </div>
      </section>
    </div>
  );
}
