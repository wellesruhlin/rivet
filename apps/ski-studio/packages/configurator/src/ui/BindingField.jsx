import {useRef, useState} from 'react';
import {ArrowUpRight, Check, ChevronDown} from 'lucide-react';
import {RadioGroup} from './Controls.jsx';

// One choice for the whole step: skis only, or one binding model. Choosing a model
// mounts it on the skis at once. A variant that passes the pack's rules (listed
// available and inside the brake-width screen) joins the build and the price; any other
// variant still mounts as a labelled visual test that adds no cost and is not saved.
//
// The binding group supplies: options (every variant), reason (why a variant can't be
// ordered for this ski) and ui.products / ui.fit / ui.waist / ui.details / ui.footnotes.
export default function BindingField({engine, group, config, ctx, update, onView, binding}) {
  const ui = group.ui;
  const products = ui.products(config, ctx);
  const variants = new Map(products.flatMap(product => product.variants.map(variant => [variant.value, {...variant, product}])));
  const chosenId = binding.preview || config[group.id];
  const variant = variants.get(chosenId) ?? null;
  const product = variant?.product ?? null;
  const inBuild = !!variant && !binding.preview;
  const waist = ui.waist(config, ctx);
  const [recent, setRecent] = useState({});
  const [changingModel, setChangingModel] = useState(false);
  const summaryRef = useRef(null);
  const orderable = v => !!v && !engine.reason(group, v.value, config, ctx);
  const fits = v => ui.fit(v, config, ctx).ok;
  const defaultFor = p => recent[p.id] ?? p.variants.find(orderable)?.value ?? p.variants.find(fits)?.value ?? p.preferred ?? p.variants[0].value;

  const apply = id => {
    const next = variants.get(id);
    setRecent(current => ({...current, [next.product.id]: id}));
    if (orderable(next)) {
      update({[group.id]: id});
      binding.setPreview(null);
    } else {
      update({[group.id]: ''});
      binding.setPreview(id);
    }
    onView('Bindings');
  };
  const choose = value => {
    if (value === 'none') binding.remove();
    else apply(defaultFor(products.find(p => p.id === value)));
    setChangingModel(false);
    if (value !== 'none') requestAnimationFrame(() => summaryRef.current?.focus({preventScroll: true}));
  };
  const select = (field, value) => {
    const other = field === 'color' ? 'brake' : 'color';
    const next = product.variants.find(v => v[field] === value && v[other] === variant[other]) ?? product.variants.find(v => v[field] === value);
    apply(next.value);
  };

  const options = [{value: 'none', label: 'Skis only'}, ...products.map(p => ({value: p.id, label: p.name, product: p}))];
  const colors = product ? [...new Set(product.variants.map(v => v.color))] : [];
  const brakes = product ? [...new Set(product.variants.map(v => v.brake))] : [];
  const combo = (color, brake) => product.variants.find(v => v.color === color && v.brake === brake);
  const fit = variant ? ui.fit(variant, config, ctx) : null;
  const orderableHere = product ? product.variants.filter(orderable) : [];
  const fittingBrakes = brakes.filter(brake => ui.fit({brake}, config, ctx).ok);
  const details = variant ? ui.details?.(product, variant, config, ctx) : null;
  const money = engine.money;

  return (
    <div className="cfg-binding-field">
      {product && !changingModel ? (
        <button ref={summaryRef} type="button" className="cfg-choice-summary" aria-expanded={false} onClick={() => setChangingModel(true)}>
          <span>
            <small>Binding model</small>
            <strong>{product.name}</strong>
          </span>
          <span className="cfg-summary-change">
            Change <ChevronDown size={15} aria-hidden="true" />
          </span>
        </button>
      ) : (
        <RadioGroup
          label="Bindings"
          className="cfg-binding-models"
          itemClassName="cfg-binding-model"
          value={product?.id ?? 'none'}
          options={options}
          onChange={choose}
          render={(option, checked) =>
            option.value === 'none' ? (
              <>
                <span className="cfg-binding-none" aria-hidden="true" />
                <span>
                  <strong>Skis only</strong>
                  <small>Bring your own bindings · no added cost</small>
                </span>
                {checked && <Check size={15} aria-hidden="true" />}
              </>
            ) : (
              <>
                <img src={option.product.image} alt="" />
                <span>
                  <strong>{option.product.name}</strong>
                  <small>{option.product.meta}</small>
                </span>
                {checked && <Check size={15} aria-hidden="true" />}
              </>
            )
          }
        />
      )}
      {!product && ui.intro && <p className="cfg-hint">{ui.intro}</p>}
      {product && (
        <>
          <div className="cfg-binding-label">
            <h3>Color</h3>
            <span>{variant.color}</span>
          </div>
          <RadioGroup
            label="Binding color"
            className="cfg-binding-chips"
            itemClassName="cfg-binding-chip"
            value={variant.color}
            options={colors.map(value => ({value, label: value, className: orderable(combo(value, variant.brake)) ? '' : 'is-unorderable'}))}
            onChange={value => select('color', value)}
          />
          <div className="cfg-binding-label">
            <h3>Brake width</h3>
            {waist ? <span>Your ski: {waist} mm</span> : <span>Choose a length to check fit</span>}
          </div>
          <RadioGroup
            label="Binding brake width"
            className="cfg-binding-chips"
            itemClassName="cfg-binding-chip"
            value={variant.brake}
            options={brakes.map(value => ({value, label: `${value} mm`, className: orderable(combo(variant.color, value)) ? '' : 'is-unorderable'}))}
            onChange={value => select('brake', value)}
          />
          <div className={`cfg-binding-fit ${inBuild ? 'is-fit' : ''}`} role="status">
            <strong>
              {inBuild
                ? `In your build · ${variant.color} / ${variant.brake} mm · +${money(variant.price)}`
                : `Visual test only · ${variant.color} / ${variant.brake} mm is not in your total`}
            </strong>
            {!inBuild && !variant.available && <p>This color and brake width is listed unavailable.</p>}
            <p>{fit.text}</p>
            {!inBuild && waist && (
              <p>
                {orderableHere.length
                  ? `Orderable for this ski: ${orderableHere.map(v => `${v.color} / ${v.brake} mm`).join(', ')}.`
                  : fittingBrakes.length
                    ? `A ${waist} mm ski needs the ${fittingBrakes.join(' or ')} mm brake, which isn't listed available in any color right now.`
                    : `No listed brake fits a ${waist} mm ski, so this pair can't join your build.`}
              </p>
            )}
            {ui.catalogNote && <small>{ui.catalogNote}</small>}
          </div>
          {details && (
            <details className="cfg-choice-details">
              <summary>Product photo & specifications</summary>
              {details.photo && (
                <div className="cfg-binding-photo">
                  <img src={details.photo.src} alt={details.photo.alt} />
                  {details.photo.credit && <span>{details.photo.credit}</span>}
                </div>
              )}
              {details.specs?.length > 0 && (
                <dl className="cfg-binding-specs">
                  {details.specs.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {details.note && <p className="cfg-hint">{details.note}</p>}
              {details.link && (
                <a className="cfg-row-link" href={details.link.href} target="_blank" rel="noreferrer">
                  <span>{details.link.label}</span>
                  <ArrowUpRight size={16} strokeWidth={1.6} />
                </a>
              )}
            </details>
          )}
        </>
      )}
      {(ui.footnotes?.(config, ctx) ?? []).map((text, i) => (
        <p key={i} className="cfg-fine">
          {text}
        </p>
      ))}
      {ui.more && (
        <details className="cfg-choice-details">
          <summary>{ui.more.summary}</summary>
          <p className="cfg-hint">
            {ui.more.text}{' '}
            {ui.more.href && (
              <a href={ui.more.href} target="_blank" rel="noreferrer">
                {ui.more.linkLabel ?? 'See them at the maker'}
              </a>
            )}
          </p>
        </details>
      )}
    </div>
  );
}
