import {ArrowRight, ArrowUpRight, Download, Minus, Pencil, Plus} from 'lucide-react';
import {PairPreview, formatWeight} from '@rivet/configurator';
import {money, product} from '../../catalog/index.js';
import {engine} from '../../configurator/index.js';
import {Cover} from '../Cards.jsx';
import {bagCount, bagTotals, removeItem, setQuantity, useStore} from '../store.js';
import {toast} from '../toast.jsx';

function download(config) {
  const blob = new Blob([engine.text(config)], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Praxis-${engine.context(config).model.name.replaceAll(' ', '-')}-${config.length}cm-custom-build.txt`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CustomItem({item, index}) {
  const {config} = item;
  const ctx = engine.context(config);
  const lines = engine.bom(config);
  const value = key => lines.find(line => line.key === key)?.value;
  const {amount, quote} = engine.total(config);
  const weight = engine.weight(config);
  const missing = engine.missingForOrder(config);
  return (
    <article className="px-bag-item is-custom">
      <a className="px-bag-media cfg-theme" href={`#/custom?item=${item.key}`} aria-label={`Edit your custom ${ctx.model.name}`}>
        <PairPreview engine={engine} config={config} className="px-bag-pair" />
      </a>
      <div className="px-bag-body">
        <p className="px-eyebrow">Custom build</p>
        <h2>
          <a href={`#/custom?item=${item.key}`}>{ctx.model.name}</a>
        </h2>
        <p className="px-bag-meta">{[`${config.length} cm`, value('graphic'), value('top'), `Flex ${value('flex')}`, `${value('core')} core`, config.width !== 'standard' && value('width'), config.molding === 'custom' && value('molding')].filter(Boolean).join(' · ')}</p>
        {config.binding && <p className="px-bag-meta">With {value('binding')} bindings (+{money(lines.find(line => line.key === 'binding').price)})</p>}
        {weight && <p className="px-bag-meta">Estimated ski weight {formatWeight(weight).text}</p>}
        {missing.length > 0 && <p className="px-bag-warning">Before ordering: {missing.map(m => m.label).join(', ')}.</p>}
        <div className="px-bag-actions">
          <a className="px-quiet-button" href={`#/custom?item=${item.key}`}>
            <Pencil size={14} aria-hidden="true" /> Edit build
          </a>
          <button type="button" className="px-quiet-button" onClick={() => download(config)}>
            <Download size={14} aria-hidden="true" /> Build sheet
          </button>
          <button
            type="button"
            className="px-quiet-button"
            onClick={() => {
              removeItem(index);
              toast('Custom build removed from your bag.');
            }}
          >
            Remove <span className="px-sr-only">{ctx.model.name} custom build</span>
          </button>
        </div>
      </div>
      <div className="px-bag-price">
        <strong>{money(amount)}</strong>
        {quote && (
          <small>
            + {money(quote[0])}–{money(quote[1])} quote
          </small>
        )}
        <a className="px-text-link" href={ctx.model.url} target="_blank" rel="noreferrer">
          Order at Praxis <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function StockItem({item, index}) {
  const p = product(item.id);
  return (
    <article className="px-bag-item">
      <a className="px-bag-media is-stock" href={`#/skis/${p.id}`} aria-label={p.name}>
        <Cover p={p} />
      </a>
      <div className="px-bag-body">
        <p className="px-eyebrow">Stock ski</p>
        <h2>
          <a href={`#/skis/${p.id}`}>{p.name}</a>
        </h2>
        <p className="px-bag-meta">
          {item.size} cm · {p.veneer}
        </p>
        <div className="px-quantity" role="group" aria-label={`${p.name} quantity`}>
          <button type="button" aria-label="Decrease quantity" disabled={item.qty <= 1} onClick={() => setQuantity(index, item.qty - 1)}>
            <Minus size={14} />
          </button>
          <span aria-live="polite">{item.qty}</span>
          <button type="button" aria-label="Increase quantity" disabled={item.qty >= 10} onClick={() => setQuantity(index, item.qty + 1)}>
            <Plus size={14} />
          </button>
        </div>
        <div className="px-bag-actions">
          <button
            type="button"
            className="px-quiet-button"
            onClick={() => {
              removeItem(index);
              toast('Ski removed from your bag.');
            }}
          >
            Remove <span className="px-sr-only">{p.name}</span>
          </button>
        </div>
      </div>
      <div className="px-bag-price">
        <strong>{p.priceFrom ? 'From ' : ''}{money(p.price * item.qty)}</strong>
        <a className="px-text-link" href={p.source} target="_blank" rel="noreferrer">
          View at Praxis <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default function Bag() {
  const {bag} = useStore();
  const count = bagCount(bag);
  const {amount, quote} = bagTotals(bag);
  const hasCustom = bag.some(item => item.type === 'custom');
  return (
    <div className="px-shell">
      <header className="px-page-intro">
        <div>
          <p className="px-eyebrow">Ready for a closer look</p>
          <h1>
            Your bag <span className="px-count">({count})</span>
          </h1>
        </div>
        <p>A place to keep your picks and custom builds while you decide.</p>
      </header>
      {bag.length ? (
        <div className="px-bag">
          <div className="px-bag-items">
            {bag.map((item, index) => (item.type === 'custom' ? <CustomItem key={item.key} item={item} index={index} /> : <StockItem key={`${item.id}-${item.size}`} item={item} index={index} />))}
          </div>
          <aside className="px-bag-summary" aria-label="Summary">
            <p className="px-eyebrow">Your selection</p>
            <div className="px-total-row">
              <span>Estimated total</span>
              <strong>{money(amount)}</strong>
            </div>
            {quote && (
              <p className="px-bag-quote">
                Plus custom molding, quoted by Praxis at {money(quote[0])}–{money(quote[1])}.
              </p>
            )}
            <p className="px-fine">USD. Praxis confirms price, availability, shipping, tax and lead time.</p>
            <div className="px-preview-message">
              <strong>Saved on this device.</strong>
              <p>
                This concept doesn’t take orders or payment. To buy, open each ski at Praxis{hasCustom ? ', and share your build sheet when you order a custom pair' : ''}. Your selection doesn’t transfer automatically.
              </p>
            </div>
            <a className="px-button is-wide" href="https://www.praxisskis.com/all-standard-edition-skis/" target="_blank" rel="noreferrer">
              Visit the Praxis store <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a className="px-text-link" href="#/skis">
              Keep exploring <ArrowRight size={15} aria-hidden="true" />
            </a>
          </aside>
        </div>
      ) : (
        <div className="px-empty px-bag-empty">
          <h2>A mountain of possibilities.</h2>
          <p>Your bag is empty. Start with a stock shape, or build your own.</p>
          <div className="px-actions">
            <a className="px-button" href="#/skis">
              Explore stock skis <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a className="px-button is-outline" href="#/custom">
              Build a custom pair
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
