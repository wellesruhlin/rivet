import {useRef, useState} from 'react';
import {ArrowUpRight, Check, ChevronDown} from 'lucide-react';
import {bindingAllowed, bindingCatalog, bindingFit, bindingFor} from '../bindings.js';
import {money, waistFor} from '../config.js';
import {assetUrl} from '../art-geometry.js';
import {PanelHead, RadioGroup} from '../components/Controls.jsx';

// One choice for the whole step: skis only, or one binding model. Choosing a model
// mounts it on the skis at once. An orderable variant (listed available and inside our
// brake-width screen) joins the build and the price; any other variant still mounts as
// a labelled visual test that adds no cost and is not saved.
export default function BindingsPanel({config, update, previewBinding, onPreview, onRemove, onView}) {
  const waist = waistFor(config);
  const variant = bindingFor(previewBinding || config.binding);
  const product = variant?.product ?? null;
  const inBuild = !!variant && !previewBinding;
  const [recent, setRecent] = useState({});
  const [changingModel, setChangingModel] = useState(false);
  const selectedModel = useRef(null);
  const orderable = v => bindingAllowed(v.id, waist);
  const defaultFor = p => recent[p.id]
    ?? p.variants.find(orderable)?.id
    ?? p.variants.find(v => bindingFit(v, waist).ok)?.id
    ?? p.variants.find(v => v.brake === 115 && v.color === 'Black')?.id
    ?? p.variants[0].id;
  const apply = id => {
    const next = bindingFor(id);
    setRecent(current => ({...current, [next.product.id]: id}));
    if (orderable(next)) {update({binding: id}); onPreview(null);}
    else {update({binding: ''}); onPreview(id);}
    onView('Bindings');
  };
  const choose = value => {
    value === 'none' ? onRemove() : apply(defaultFor(bindingCatalog.products.find(p => p.id === value)));
    setChangingModel(false);
    if (value !== 'none') requestAnimationFrame(() => selectedModel.current?.focus({preventScroll: true}));
  };
  const select = (field, value) => {
    const other = field === 'color' ? 'brake' : 'color';
    const next = product.variants.find(v => v[field] === value && v[other] === variant[other]) ?? product.variants.find(v => v[field] === value);
    apply(next.id);
  };
  const fit = variant ? bindingFit(variant, waist) : null;
  const options = [{value: 'none', label: 'Skis only'}, ...bindingCatalog.products.map(p => ({value: p.id, label: p.name, product: p}))];
  const colors = product ? [...new Set(product.variants.map(v => v.color))] : [];
  const brakes = product ? [...new Set(product.variants.map(v => v.brake))] : [];
  const combo = (color, brake) => product.variants.find(v => v.color === color && v.brake === brake);
  const orderableHere = product ? product.variants.filter(orderable) : [];
  const fitting = brakes.filter(brake => bindingFit({brake}, waist).ok);
  return <div className="bindings-panel">
    <PanelHead index={3} title="Bindings">A pair of bindings, or just the skis. Your call.</PanelHead>
    <div className="binding-choices">
    {product && !changingModel ? <button ref={selectedModel} type="button" className="choice-summary" onClick={() => setChangingModel(true)} aria-expanded={false}>
      <span><small>Binding model</small><strong>{product.name.replace('LOOK ', '')}</strong></span><span className="summary-change">Change <ChevronDown size={15} /></span>
    </button> : <RadioGroup label="Bindings" className="binding-models" itemClassName="binding-model" value={product?.id ?? 'none'} options={options} onChange={choose}
      render={(option, checked) => option.value === 'none'
        ? <><span className="binding-model-none" aria-hidden="true" /><span><strong>Skis only</strong><small>Bring your own bindings · no added cost</small></span>{checked && <Check size={15} />}</>
        : <><img src={assetUrl(option.product.variants[0].image)} alt="" /><span><strong>{option.product.name.replace('LOOK ', '')}</strong><small>DIN {option.product.din} · {money(option.product.variants[0].price)} / pair</small></span>{checked && <Check size={15} />}</>} />}
    {!product && <p className="binding-preview-note">Choose a binding to mount it on your skis. Orderable pairs add to your total; others can still be tried on as a visual test.</p>}
    {product && <>
      <div className="binding-option-label"><h3>Color</h3><span>{variant.color}</span></div>
      <RadioGroup label="Binding color" className="binding-colors" itemClassName="binding-color" value={variant.color}
        options={colors.map(value => ({value, label: value, className: orderable(combo(value, variant.brake) ?? {}) ? '' : 'is-unorderable'}))} onChange={value => select('color', value)} />
      <div className="binding-option-label"><h3>Brake width</h3><span>Your ski: {waist} mm</span></div>
      <RadioGroup label="Binding brake width" className="binding-brakes" itemClassName="binding-brake" value={variant.brake}
        options={brakes.map(value => ({value, label: `${value} mm`, className: orderable(combo(variant.color, value) ?? {}) ? '' : 'is-unorderable'}))} onChange={value => select('brake', value)} />
    </>}
    </div>
    {product && <>
      <div className={`binding-fit ${inBuild ? 'is-fit' : ''}`} role="status">
        <strong>{inBuild ? `In your build · ${variant.color} / ${variant.brake} mm · +${money(variant.price)}` : `Visual test only · ${variant.color} / ${variant.brake} mm is not in your total`}</strong>
        {!inBuild && !variant.available && <p>This color and brake width is listed unavailable.</p>}
        <p>{fit.text}</p>
        {!inBuild && <p>{orderableHere.length
          ? `Orderable for this ski: ${orderableHere.map(v => `${v.color} / ${v.brake} mm`).join(', ')}.`
          : fitting.length
            ? `A ${waist} mm ski needs the ${fitting.join(' or ')} mm brake, which isn't listed available in any color right now.`
            : `No listed brake fits a ${waist} mm ski, so this pair can't join your build.`}</p>}
        <small>Faded options aren't orderable for this ski. Catalog checked September 24, 2026; availability can change.</small>
      </div>
      <details className="choice-details"><summary>Product photo & specifications</summary>
      <div className="binding-product-image"><img src={assetUrl(variant.image)} alt={`${product.name} in ${variant.color}`} /><span>ON3P product photograph</span></div>
      <dl className="binding-specs"><div><dt>Toe</dt><dd>{product.toe}</dd></div><div><dt>Boot soles</dt><dd>{product.bootCompatibility}</dd></div></dl>
      <p className="binding-preview-note">{product.id === 'pivot-15'
        ? 'The Blender model shows an approximate Pivot 15 at the ski’s reference mount point with a 320 mm boot sole. It does not confirm boot or brake fit.'
        : 'The Pivot 13’s composite toe has not been modeled yet, so the skis show the Pivot 15 model in black as a stand-in.'}</p>
      <a className="row-link" href={product.source} target="_blank" rel="noreferrer">Check this binding at ON3P <ArrowUpRight size={16} /></a>
      </details>
    </>}
    <p className="fine">Final mounting, boot compatibility and release settings need a qualified shop. No DIN setting is calculated here. Mounting and package discounts are not included.</p>
    <details className="choice-details"><summary>Replacement brake accessory</summary><p>ON3P also lists a <a href={bindingCatalog.accessory.source} target="_blank" rel="noreferrer">Pivot 1.0 replacement brake</a>. It is an accessory, not an additional binding model or a verified 2.0 conversion.</p></details>
  </div>;
}
