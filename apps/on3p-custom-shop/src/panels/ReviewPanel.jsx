import {ArrowUpRight, Download, Link2} from 'lucide-react';
import {getBase, getModel, getTop, money, priceLines, totalPrice, waistFor} from '../config.js';
import {PanelHead} from '../components/Controls.jsx';
import ArtSwatch from '../components/ArtSwatch.jsx';
import {bindingFit, bindingFor, bindingLabel} from '../bindings.js';
import HandoffRequest from '../components/HandoffRequest.jsx';

function ReviewBlock({title, onEdit, children}) {
  return (
    <section className="review-block">
      <div className="review-head">
        <h3 className="overline">{title}</h3>
        <button type="button" className="text-button" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

const Rows = ({rows}) => (
  <dl className="review-rows">
    {rows.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

export default function ReviewPanel({config, previewBinding, setStep, download, share}) {
  const visual = bindingFor(previewBinding);
  const model = getModel(config);
  const top = getTop(config);
  const base = getBase(config);
  return (
    <>
      <PanelHead index={4} title="Review">
        Every choice in one place. Nothing is ordered from this concept.
      </PanelHead>

      <ReviewBlock title="Shape" onEdit={() => setStep(0)}>
        <p className="review-model">{model.name}</p>
        <p className="review-meta">
          {config.length} cm · {config.rocker} rocker · {config.category}
        </p>
      </ReviewBlock>

      <ReviewBlock title="Look" onEdit={() => setStep(1)}>
        <div className="review-art">
          {[
            ['Topsheet', top, 'top'],
            ['Base', base, 'base'],
          ].map(([label, graphic, kind]) => (
            <figure key={label}>
              <ArtSwatch graphic={graphic} kind={kind} className="review-swatch" />
              <figcaption>
                <span>{label}</span>
                {graphic.name}
              </figcaption>
            </figure>
          ))}
        </div>
        <Rows rows={[['Sidewalls', config.sidewall]]} />
      </ReviewBlock>

      <ReviewBlock title="Build" onEdit={() => setStep(2)}>
        <Rows
          rows={[
            ['Layup', config.layup],
            ['Flex', config.flex],
            ['Edge tune', config.detune ? 'Park detune' : 'All mountain'],
            ['Tail', config.skinClip ? 'Skin clip' : 'Stock tail'],
          ]}
        />
      </ReviewBlock>

      <ReviewBlock title="Bindings" onEdit={() => setStep(3)}>
        {visual
          ? <>
            <Rows rows={[['Visual test', bindingLabel(previewBinding)]]} />
            <p className="fine">Shown on your skis but not in your total: {visual.available ? bindingFit(visual, waistFor(config)).text : `${visual.color} / ${visual.brake} mm is listed unavailable.`} Your binding choice stays in saved builds, shared links and downloads as a visual selection.</p>
          </>
          : <>
            <Rows rows={[[config.binding ? 'Binding pair' : 'Setup', bindingLabel(config.binding)]]} />
            {config.binding && <p className="fine">{bindingFor(config.binding).product.bootCompatibility}. Mounting and final fit are a shop service, not part of this estimate.</p>}
          </>}
      </ReviewBlock>

      <section className="price-card" aria-label="Price breakdown">
        {priceLines(config).map(line => line.key === 'binding' && visual
          ? <div key={line.label} className="price-line">
            <span>{bindingLabel(previewBinding)} · visual test</span>
            <span>Not in total</span>
          </div>
          : <div key={line.label} className="price-line">
            <span>{line.label}</span>
            <span>{line.price ? money(line.price) : 'Included'}</span>
          </div>)}
        <div className="price-total">
          <span>Reference total</span>
          <strong>{money(totalPrice(config))}</strong>
        </div>
        <p className="fine">Includes selected binding pairs. Excludes promotional discounts, mounting, tax and shipping. This is an independent fan concept; no order is placed.</p>
      </section>

      <HandoffRequest config={config} previewBinding={previewBinding}/>
      <div className="review-actions">
        <button type="button" className="outline-button" onClick={share}>
          <Link2 size={15} strokeWidth={1.8} /> Copy build link
        </button>
        <button type="button" className="outline-button" onClick={download}>
          <Download size={15} strokeWidth={1.8} /> Download build sheet
        </button>
      </div>
      <a className="row-link" href="https://www.on3pskis.com/products/custom-skis" target="_blank" rel="noreferrer">
        <span>
          <strong>Ready for the real thing?</strong> Explore customs at ON3P
        </span>
        <ArrowUpRight size={18} strokeWidth={1.6} />
      </a>
    </>
  );
}
