// Praxis brand pack for the shared configurator engine.
//
// Options, prices and lengths come from Praxis's public custom-order pages
// (data/custom-catalog.json). Outlines are traced from Praxis's shape drawings
// (data/outlines.json); dimensions, rocker and weight from its spec charts.
import {formatMoney, formatWeight} from '@ski-studio/configurator/engine';
import catalog from './data/custom-catalog.json' with {type: 'json'};
import outlines from './data/outlines.json' with {type: 'json'};
import {describedDimensions, specAt} from '../catalog/specs.js';
import {bindingCatalog, bindingFit, bindingFor, bindingLabel, bindingSpecs, bindingVariants, CATALOG_NOTE, modelNote} from './bindings.js';
import {praxisShape} from './geometry.js';
import {createModel3d} from './model3d.js';

export {catalog};

const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const asset = path => `${base}${path.replace(/^\//, '')}`;

export const BASE_PRICE = catalog.models[0].price;
export const DEFAULT_GRAPHIC = catalog.graphics.find(g => g.name === 'Tahoe Pier').id;
const LB_PER_OZ = 1 / 16;
const MAX_LENGTH_MM = 2000;

export const categories = [
  {id: 'carving', label: 'Carving', description: 'Firm snow, long arcs and clean edges.', models: ['snd', '9-d']},
  {id: 'all-mountain', label: 'All mountain', description: 'One pair for the whole resort, every day.', models: ['9d8', 'mvp-94', 'slugger', 'mvp-108', 'piste-jib', 'concept']},
  {id: 'freeride', label: 'Freeride', description: 'Big lines, variable snow and speed.', models: ['gpo', 'frd', 'frs', 'rx', 'jedi-mind-sticks', 'quixote', 'gpo-jr']},
  {id: 'powder', label: 'Powder', description: 'Float, slash and surf the deep days.', models: ['protest', 'bps', 'powderboard', 'ullr']},
  {id: 'touring', label: 'Touring', description: 'Light builds for the skin track.', models: ['bc', 'exp', 'yeti']},
];

// Short introductions, paraphrased from each model's Praxis page.
const summaries = {
  '9-d': 'A modern carver drawn from the 9D8 and Slice-N-Dice: 90 mm underfoot, quick to tip on edge and calm at speed.',
  '9d8': 'A classic all-mountain shape with subtle tip rocker: floaty in soft snow, smooth and predictable on hardpack.',
  bc: 'Praxis’s original backcountry ski: an ultralight carbon build with a smooth, modest tip rocker that has become a resort favorite too.',
  bps: 'Buck’s Powder Slarver: the biggest dimensions in the lineup, with rocker and compound camber for deep days that end on groomers.',
  concept: 'A Tri-Cut sidecut with three contact points, paired with compound camber and a slow-rise tip for any terrain.',
  exp: 'An expedition ski with a broad tip and pin-tail taper that make steep, variable snow feel easy on long trips.',
  frd: 'A traditional freeride shape with a flat, square tail, full camber and a slow-rise tip. Fast and composed on long, steep lines.',
  frs: 'Grown from the +10 MVP that won a Freeride World Tour stop, a broad rocker–camber–rocker platform for competition terrain.',
  gpo: 'Praxis’s signature freeride ski: a tapered, rockered tip and a relatively short radius make it playful as well as powerful.',
  'gpo-jr': 'A downsized GPO with gradual rocker and a shorter sidecut, for smaller skiers and developing freeriders.',
  'jedi-mind-sticks': 'Jedidiah Kravitz’s mid-fat freeride ski, just under 115 mm, with stage-two rocker for float, carve and air.',
  'mvp-94': 'A 94 mm resort ski with a quick radius and long, low tip and tail rise for crud, bumps and corduroy alike.',
  'mvp-108': 'The refined MVP: a tighter radius, more camber and smoother rocker lines for a true all-mountain ski.',
  'piste-jib': 'A playful everyday ski with full-length sidecut, slow-rise rocker and camber underfoot, at home in the park and on piste.',
  powderboard: 'A full reverse sidecut and continuous-curve rocker for slashing and buttering the deepest snow.',
  protest: 'A hybrid powder ski with a five-point sidecut and stage-two rocker: pivots in deep snow, still holds on groomers.',
  quixote: 'Drew Tabke’s offset-taper freeride ski, with left- and right-specific outlines for a balanced two-footed platform.',
  rx: 'A 116 mm big-mountain ski with a long sidecut and slight tail rocker that many call their one-ski quiver.',
  slugger: 'A 102 mm daily driver with a Heavy Hitter core: carves the groomer, handles chop and still floats.',
  snd: 'The Slice-N-Dice: a GS-inspired carver whose progressive sidecut tightens the harder you drive the tip.',
  ullr: 'A surf-inspired shape with a spoon-shaped, reverse-sidecut tip for slashing powder and busting through chop.',
  yeti: 'A lighter, slimmer sibling to the BC, with a slight oscillation in the sidecut for grip on firm, icy snow.',
};

export const cores = {
  enduro: {family: 'enduro', carbon: false, woods: 'Ash, maple and aspen', layup: 'Fiberglass', description: 'Ash through the center and perimeter, maple under the binding and aspen elsewhere. Praxis’s most used blend of strength, weight and damping.'},
  'enduro-carbon': {family: 'enduro', carbon: true, woods: 'Ash, maple and aspen', layup: 'Fiberglass and carbon', description: 'The Enduro woods with carbon replacing some fiberglass: about 3 oz lighter per ski at the same flex, and livelier.'},
  'heavy-hitter': {family: 'heavy-hitter', carbon: false, woods: 'Maple and ash', layup: 'Fiberglass', description: 'Only the dense hardwoods. Damp, powerful and stable; the extra weight adds up on wide skis.'},
  'heavy-hitter-carbon': {family: 'heavy-hitter', carbon: true, woods: 'Maple and ash', layup: 'Fiberglass and carbon', description: 'Maple and ash with carbon in the layup: about 3 oz lighter per ski than Heavy Hitter at the same flex.'},
  'ultra-light-carbon': {family: 'ultra-light', carbon: true, woods: 'Paulownia, with maple and ash underfoot', layup: 'Fiberglass and carbon', description: 'Mostly paulownia, with maple and ash only in the binding zone. Among the lightest skis made; the natural touring build.'},
};
const WEIGHT_RANK = {'ultra-light': 0, enduro: 1, 'heavy-hitter': 2};

export const flexGuide = [
  {flex: 1, label: 'Soft', riders: 'Under 125 lb'},
  {flex: 2, label: '', riders: '75–175 lb'},
  {flex: 3, label: '', riders: '125–225 lb'},
  {flex: 4, label: '', riders: '150–250 lb'},
  {flex: 5, label: 'Stiff', riders: '150 lb and up'},
];

const modelsById = new Map(catalog.models.map(m => [m.id, {...m, summary: summaries[m.id]}]));
const graphicsById = new Map([...catalog.graphics, ...catalog.signatureGraphics].map(g => [g.id, g]));
const veneersById = new Map(catalog.veneers.map(v => [v.id, v]));
export const modelById = id => modelsById.get(id);
export const graphicById = id => graphicsById.get(id);
export const categoryOf = modelId => categories.find(c => c.models.includes(modelId));
export const standardFlexFor = (model, length) => model?.standardFlexByLength?.[length] ?? model?.standardFlex;
const graphicsFor = model => [...catalog.graphics, ...catalog.signatureGraphics.filter(g => g.models.includes(model?.id))];

// Published dimensions at a length, or the model's described dimensions.
function dimensions(modelId, length) {
  const spec = specAt(modelId, length);
  if (spec) return {tip: spec.tip, waist: spec.waist, tail: spec.tail, published: true};
  return {...describedDimensions[modelId], published: false};
}

const WIDTH_OFFSET = {standard: 0, wider: 10, narrower: -10};

// A traced outline widened or narrowed by an even offset along the body.
// Tips and tails keep their shape, as Praxis describes the ±10 mm option.
function offsetProfile(profile, widthMm, offsetMm) {
  if (!offsetMm) return profile;
  const newWidth = widthMm + offsetMm;
  const move = ([v, x], side) => {
    const ramp = Math.min(1, v / 0.06, (1 - v) / 0.06);
    const fromCenter = (x - 0.5) * widthMm + side * (offsetMm / 2) * Math.max(0, ramp);
    return [v, 0.5 + fromCenter / newWidth];
  };
  return {left: profile.left.map(p => move(p, -1)), right: profile.right.map(p => move(p, 1))};
}

function context(config) {
  const model = modelsById.get(config.model);
  const outline = model ? outlines[model.id] : null;
  const length = model?.lengths.some(l => l.value === config.length) ? config.length : null;
  const offset = WIDTH_OFFSET[config.width] ?? 0;
  const spec = model && length ? specAt(model.id, length) : null;
  const dims = model ? dimensions(model.id, length) : {};
  const baseLength = length ?? model?.lengths.at(-1)?.value ?? 180;
  // Widest point from published dimensions, else from the drawing's true proportions.
  const widestMm = dims.tip && dims.tail ? Math.max(dims.tip, dims.tail) : outline ? outline.aspect * baseLength * 10 : 130;
  return {
    model,
    category: categories.find(c => c.id === config.category),
    lengths: model?.lengths.map(l => l.value) ?? [],
    spec,
    dims,
    outline,
    widestMm,
    offset,
    standardFlex: standardFlexFor(model, length),
    standardCore: model?.standardCore,
  };
}

const lengthLabel = (model, value) => model?.lengths.find(l => l.value === value)?.label ?? String(value);
const topLabel = value => (value === 'nylon' ? 'Printed nylon' : `${veneersById.get(value)?.name ?? 'Wood'} veneer`);

// ---------------------------------------------------------------------------
// Weight: Praxis's published pair weight for the standard edition, adjusted only
// by amounts Praxis states. Changes it describes without a figure bound the range.
export function estimateWeight(config, ctx) {
  if (!ctx.spec) return null;
  const items = [];
  const chosen = cores[config.core];
  const standard = cores[ctx.standardCore];
  if (chosen && standard && config.core !== ctx.standardCore) {
    if (chosen.family === standard.family) {
      const carbon = (6 * LB_PER_OZ) * (chosen.carbon ? -1 : 1);
      items.push({label: chosen.carbon ? 'Carbon layup (about 3 oz per ski)' : 'Without carbon (about 3 oz per ski)', min: carbon, max: carbon});
    } else {
      items.push({label: `${modelsById.get(config.model).cores.find(c => c.value === config.core)?.label} core`, direction: Math.sign(WEIGHT_RANK[chosen.family] - WEIGHT_RANK[standard.family]) || 1});
    }
  }
  if (config.top && config.top !== 'nylon') items.push({label: 'Wood veneer top (4–8 oz per pair)', min: -8 * LB_PER_OZ, max: -4 * LB_PER_OZ});
  if (ctx.standardFlex && Number(config.flex) !== ctx.standardFlex) items.push({label: Number(config.flex) < ctx.standardFlex ? 'Softer flex' : 'Stiffer flex', direction: Math.sign(Number(config.flex) - ctx.standardFlex)});
  if (ctx.offset) items.push({label: ctx.offset > 0 ? '10 mm wider' : '10 mm narrower', direction: Math.sign(ctx.offset)});
  return {
    unit: 'lb',
    per: 'pair',
    digits: 1,
    base: {value: ctx.spec.weight, label: `Published weight, ${config.length} cm standard edition${ctx.spec.weightNote ? ` (${ctx.spec.weightNote.toLowerCase()})` : ''}`},
    items,
  };
}

// ---------------------------------------------------------------------------

const steps = [
  {id: 'shape', label: 'Shape', title: 'Shape', intro: 'Twenty-two Praxis shapes, grouped by the way you ski. Start there, then choose a model and length.', link: {href: 'https://www.praxisskis.com/pages/customer-service/contact-us.html', strong: 'Between two shapes?', text: 'Talk it through with Praxis'}},
  {id: 'look', label: 'Look', title: 'Look', intro: 'Print on nylon, or stain the art into real wood veneer and let the grain show through.'},
  {id: 'build', label: 'Build', title: 'Build', intro: 'Flex, core and shape adjustments. Every change shows its price and what it does to weight.', footnote: 'Reference prices from Praxis’s custom-order pages. Custom molding is quoted by Praxis after a conversation.'},
  {id: 'bindings', label: 'Bindings', title: 'Bindings', intro: 'A pair of LOOK bindings, or just the skis. Your call.'},
  {id: 'rider', label: 'Rider', title: 'Rider', intro: 'Praxis uses this to confirm the build fits you. Ability is required to order; the rest helps.'},
  {id: 'review', label: 'Review', title: 'Review', intro: 'Every choice in one place. Adding it to your bag saves the build; Praxis confirms it before anything is made.', link: {href: 'https://www.praxisskis.com/custom-order-skis/', strong: 'Ready to order?', text: 'Continue at praxisskis.com'}},
];
const stepIndex = id => steps.findIndex(step => step.id === id);

// The ski's waist for the brake screen: published (or described) when Praxis gives it,
// otherwise estimated from the traced drawing and labelled as such.
export function waistFor(config, ctx) {
  if (!ctx.model || !ctx.lengths.includes(config.length)) return null;
  if (ctx.dims.waist) return {mm: ctx.dims.waist + ctx.offset, published: true};
  const shape = praxisShape(ctx.model, config.length, {offsetMm: ctx.offset});
  return shape ? {mm: Math.round(shape.waistMm), published: false} : null;
}
const bindingReason = (value, config, ctx) => {
  const binding = bindingFor(value);
  if (!binding) return 'This binding is no longer in the catalog.';
  if (!binding.available) return 'That color and brake width is listed unavailable.';
  const fit = bindingFit(binding, waistFor(config, ctx));
  return fit.ok ? '' : fit.text;
};
const bindingRemoved = (previousId, config, ctx) => {
  const binding = bindingFor(previousId);
  return `Bindings are no longer in your total. ${bindingReason(previousId, config, ctx)}${binding ? ' The pair stays on your skis as a visual test.' : ''}`;
};

const groups = [
  {
    id: 'category',
    type: 'category',
    step: 'shape',
    label: 'Category',
    bom: false,
    explain: false,
    resets: ['model', 'length'],
    options: () => categories.map(c => ({value: c.id, label: c.label, description: c.description, meta: `${c.models.length} ${c.models.length === 1 ? 'shape' : 'shapes'}`})),
    default: (config, ctx, input = {}) => categoryOf(input.model)?.id ?? '',
    ui: {field: 'The way you ski', collapse: true, summaryLabel: 'The way you ski'},
  },
  {
    id: 'model',
    type: 'model',
    step: 'shape',
    label: 'Model',
    bomLabel: 'Custom pair',
    required: true,
    options: (config, ctx) => (ctx.category?.models ?? []).map(id => ({value: id, label: modelsById.get(id).name})),
    format: value => modelsById.get(value)?.name ?? 'Choose your model',
    price: () => BASE_PRICE,
    ui: {
      field: 'Your model',
      visible: config => !!config.category,
      selectLabel: (config, ctx) => `${ctx.category.label} model`,
      placeholder: (config, ctx) => `Choose a ${ctx.category.label.toLowerCase()} model`,
      description: (config, ctx) => ctx.model?.summary,
      action: {label: 'Specifications', guide: 'specs', visible: config => !!config.model},
    },
  },
  {
    id: 'length',
    type: 'length',
    step: 'shape',
    label: 'Length',
    required: true,
    options: (config, ctx) => (ctx.model?.lengths ?? []).map(l => ({value: l.value, label: l.label})),
    format: (value, config, ctx) => (value ? `${lengthLabel(ctx.model, value)} cm` : 'Choose your length'),
    ui: {
      field: 'Length · cm',
      visible: config => !!config.model,
      action: {label: 'Sizing help', guide: 'size'},
      hint: (config, ctx) => [
        !config.length && 'Select a length to continue. We never choose one for you.',
        ctx.model?.lengths.some(l => l.junior) && 'Jr lengths are the youth MVP.',
        config.length && !ctx.spec && 'Praxis hasn’t published dimensions or weight for this length.',
      ].filter(Boolean),
      note: (config, ctx) => (config.model === 'quixote' ? {tone: 'quiet', text: 'The Quixote’s left and right skis have mirrored, foot-specific outlines. Praxis’s shape drawing shows one outline, so the preview mirrors it.'} : null),
    },
  },
  {
    id: 'top',
    type: 'choice',
    step: 'look',
    label: 'Top',
    options: () => [
      {value: 'nylon', label: 'Printed nylon', short: 'Nylon', color: 'linear-gradient(135deg, #3a3631, #1c1a17)', caption: 'Vivid print on the standard topsheet'},
      ...catalog.veneers.map(v => ({value: v.id, label: `${v.name} veneer`, short: v.name, image: asset(`art/veneers/${v.id}.webp`), caption: 'Artwork stained into real wood'})),
    ],
    default: () => 'nylon',
    price: value => (value === 'nylon' ? 0 : veneersById.get(value)?.price ?? 0),
    format: value => topLabel(value),
    ui: {
      display: 'swatches',
      swatchSize: 'large',
      field: 'Top material',
      selectionLabel: 'Top material',
      action: {label: 'About veneer', guide: 'veneer'},
      bodyCopy: config => (config.top === 'nylon' ? 'The standard top: artwork printed on nylon for full, vibrant color.' : 'Artwork is digitally stained into a real veneer sheet. White areas stay bare wood, and no two sheets are alike. Veneer also saves 4–8 oz per pair.'),
    },
  },
  {
    id: 'graphic',
    type: 'gallery',
    step: 'look',
    label: 'Artwork',
    options: (config, ctx) => [{value: 'none', label: 'No artwork', extra: true}, ...graphicsFor(ctx.model).map(g => ({value: g.id, label: g.name, signature: !!g.models}))],
    default: () => DEFAULT_GRAPHIC,
    format: value => (value === 'none' ? 'No artwork' : graphicsById.get(value)?.name ?? ''),
    ui: {
      view: 'Topsheet',
      selectionLabel: 'Selected artwork',
      filters: (config, ctx) => (graphicsFor(ctx.model).some(g => g.models) ? ['All', 'Signature'] : ['All']),
      filterOf: item => (item.signature ? 'Signature' : 'Library'),
      hint: config => [
        config.graphic === 'none' && config.top === 'nylon' && 'No artwork on nylon: Praxis will confirm how a plain top is finished.',
        config.graphic === 'none' && config.top !== 'nylon' && 'Pure veneer: the grain is the graphic.',
        'Library artwork is included. Praxis can also print your own artwork; ask them about custom graphics.',
      ].filter(Boolean),
    },
  },
  {
    id: 'flex',
    type: 'choice',
    step: 'build',
    label: 'Flex',
    options: (config, ctx) => flexGuide.map(f => ({value: String(f.flex), label: `#${f.flex}${f.flex === ctx.standardFlex ? ' · Std' : ''}`})),
    default: (config, ctx) => String(ctx.standardFlex ?? 4),
    format: (value, config, ctx) => `#${value}${Number(value) === ctx.standardFlex ? ' (standard)' : ''}`,
    ui: {
      display: 'segmented',
      field: 'Flex · #1 soft to #5 stiff',
      action: {label: 'Flex guide', guide: 'flex'},
      hint: (config, ctx) => {
        const guide = flexGuide[Number(config.flex) - 1];
        const standard = ctx.standardFlex ? ` #${ctx.standardFlex} is standard for the ${ctx.model.name}${config.length ? ` at ${config.length} cm` : ''}.` : '';
        return `#${config.flex}: Praxis’s guideline is ${guide.riders}.${standard} Softer skis are lighter and easier at low speed; stiffer skis hold at speed.`;
      },
    },
  },
  {
    id: 'core',
    type: 'choice',
    step: 'build',
    label: 'Core',
    options: (config, ctx) =>
      (ctx.model?.cores ?? []).map(c => ({
        value: c.value,
        label: c.label.replace(/^Ultra light/, 'Ultra Light'),
        badge: c.value === ctx.standardCore ? 'Standard' : undefined,
        tag: cores[c.value].woods,
        description: cores[c.value].description,
        specs: [
          ['Woods', cores[c.value].woods],
          ['Layup', cores[c.value].layup],
        ],
      })),
    default: (config, ctx) => ctx.standardCore ?? 'enduro',
    price: (value, config, ctx) => ctx.model?.cores.find(c => c.value === value)?.price ?? 0,
    format: (value, config, ctx) => ctx.model?.cores.find(c => c.value === value)?.label.replace(/^Ultra light/, 'Ultra Light') ?? '',
    ui: {display: 'compact', action: {label: 'Compare cores', guide: 'cores'}},
  },
  {
    id: 'width',
    type: 'choice',
    step: 'build',
    label: 'Width',
    options: () => [
      {value: 'standard', label: 'Standard', text: 'The shape as designed'},
      {value: 'wider', label: '10 mm wider', text: 'All widths +10 mm, 1 cm longer'},
      {value: 'narrower', label: '10 mm narrower', text: 'All widths −10 mm, 1 cm shorter'},
    ],
    default: () => 'standard',
    price: value => catalog.widths.find(w => w.value === value)?.price ?? 0,
    format: value => ({standard: 'Standard width', wider: '+10 mm wider', narrower: '−10 mm narrower'})[value],
    ui: {
      display: 'cards',
      fold: 'Width and profile',
      field: 'Width adjustment',
      hint: (config, ctx) => {
        if (config.width === 'standard' || !config.length) return 'Praxis can rebuild any shape 10 mm wider or narrower, with the length changing by 1 cm.';
        const d = ctx.dims;
        const sign = ctx.offset > 0 ? 1 : -1;
        const dims = d.tip ? ` (${d.tip + ctx.offset}-${d.waist + ctx.offset}-${d.tail + ctx.offset} mm)` : '';
        return `Your ${config.length} cm ${ctx.model.name} becomes ${config.length + sign} cm${dims}. The preview shows the new outline.`;
      },
    },
  },
  {
    id: 'molding',
    type: 'choice',
    step: 'build',
    label: 'Profile',
    options: () => [
      {value: 'standard', label: 'Standard molding', text: 'The model’s own camber and rocker'},
      {value: 'custom', label: 'Custom molding', text: 'Your own camber, rocker or tip rise'},
    ],
    default: () => 'standard',
    price: value => (value === 'custom' ? {quote: catalog.molding.find(m => m.value === 'custom').quote} : 0),
    format: value => (value === 'custom' ? 'Custom camber and rocker' : 'Standard molding'),
    ui: {
      display: 'cards',
      fold: 'Width and profile',
      field: 'Camber and rocker',
      hint: config => (config.molding === 'custom' ? 'Praxis quotes custom molding at $200–$500 after discussing the profile you want.' : ''),
    },
  },
  {
    // One choice: skis only, or one binding pair. Pairs that fail the brake screen or are
    // listed unavailable fall back to skis only in the build; the Configurator keeps them
    // on the skis as a labelled visual test.
    id: 'binding',
    type: 'binding',
    step: 'bindings',
    label: 'Bindings',
    bomLabel: 'Bindings',
    options: () => bindingVariants.map(v => ({value: v.id, label: bindingLabel(v.id)})),
    reason: bindingReason,
    default: () => '',
    price: value => bindingFor(value)?.price ?? 0,
    format: value => bindingLabel(value),
    ui: {
      carryOn: ['category', 'model', 'length', 'width'],
      intro: 'Choose a binding to mount it on your skis. Orderable pairs add to your total; others can still be tried on as a visual test.',
      products: () =>
        bindingCatalog.products.map(p => ({
          id: p.id,
          name: p.name,
          meta: `${p.din ? `DIN ${p.din}` : `DIN up to ${p.rating}`} · ${formatMoney(p.variants[0].price)} / pair${p.touring ? ' · touring' : ''}`,
          image: asset(p.variants[0].image),
          preferred: p.variants.find(v => v.brake === 115)?.id,
          variants: p.variants.map(v => ({value: v.id, color: v.color, brake: v.brake, price: v.price, image: asset(v.image), available: v.available})),
        })),
      fit: (variant, config, ctx) => bindingFit(variant, waistFor(config, ctx)),
      waist: (config, ctx) => waistFor(config, ctx)?.mm ?? null,
      details: (product, variant) => {
        const binding = bindingFor(variant.value);
        return {
          photo: {src: asset(binding.image), alt: `${binding.product.name} in ${binding.color}`, credit: 'Praxis product photograph'},
          specs: bindingSpecs(binding.product),
          note: modelNote(binding.product),
          link: {href: binding.source, label: 'Check this binding at Praxis'},
        };
      },
      catalogNote: CATALOG_NOTE,
      footnotes: () => ['Final mounting, boot compatibility and release settings need a qualified shop. No DIN setting is calculated here. Mounting is not included.'],
      more: {
        summary: 'Other bindings at Praxis',
        text: 'Praxis also sells LOOK SPX, the CAST Freetour upgrade kit and touring bindings from other brands. They aren’t modeled in 3D, so they aren’t offered here.',
        href: 'https://www.praxisskis.com/ski-bindings/',
        linkLabel: 'See every binding at Praxis',
      },
      notices: {
        removed: bindingRemoved,
        added: (id, config, ctx) => `Bindings added to your total (+${formatMoney(bindingFor(id).price)}). ${bindingFit(bindingFor(id), waistFor(config, ctx)).text}`,
      },
      reviewNote: (config, ctx, preview) => {
        if (preview) return `Shown on your skis but not in your total: ${bindingReason(preview, config, ctx)} Downloads, saved builds, shared links and the bag list skis only.`;
        if (config.binding) return `${bindingFor(config.binding).product.bootCompatibility}. Mounting and final fit are a shop service, not part of this estimate.`;
        return '';
      },
    },
  },
  {
    id: 'ability',
    type: 'choice',
    step: 'rider',
    label: 'Ability',
    options: () => catalog.ability.map(a => ({value: a.value, label: a.label.replace(/\s*\(Level \d\)/, ''), text: a.label.match(/Level \d/)?.[0] ?? 'Beyond level 3'})),
    format: value => catalog.ability.find(a => a.value === value)?.label ?? 'Not chosen',
    line: value => ({info: true, pending: !value}),
    ui: {display: 'cards', field: 'Skier ability · required to order'},
  },
  {id: 'heightWeight', type: 'text', step: 'rider', label: 'Height and weight', maxLength: 80, share: false, ui: {fieldGroup: 'Tell Praxis about you', placeholder: 'e.g. 5′11″, 175 lb', reviewLabel: 'Height / weight'}},
  {id: 'where', type: 'text', step: 'rider', label: 'Where you ski', maxLength: 300, share: false, ui: {fieldGroup: 'Tell Praxis about you', multiline: true, placeholder: 'Resorts, backcountry zones and trips', reviewLabel: 'Where you ski'}},
  {id: 'style', type: 'text', step: 'rider', label: 'Style and preferences', maxLength: 500, share: false, ui: {fieldGroup: 'Tell Praxis about you', multiline: true, placeholder: 'How you like to ski, and what this pair is for', reviewLabel: 'Style'}},
];

// Graphics, veneer and outline for the stage, the gallery and the drawing.
const skiShape = (config, ctx) => {
  const lengthMm = ((config.length ?? ctx.lengths.at(-1) ?? 180) + Math.sign(ctx.offset)) * 10;
  const width = ctx.widestMm + ctx.offset;
  const profile = offsetProfile(ctx.outline.profile, ctx.widestMm, ctx.offset);
  return {width, length: lengthMm, gap: width * 0.34, profile};
};

function topLayers(config, ctx, graphicId, shape) {
  const art = graphicId && graphicId !== 'none' ? asset(`art/graphics/${graphicId}.webp`) : null;
  const veneer = config.top && config.top !== 'nylon' ? config.top : null;
  const full = {x: 0, y: 0, width: shape.width, height: shape.length};
  const side = half => [
    ...(veneer ? [{href: asset(`art/veneers/${veneer}-${half}.webp`), ...full}] : [{fill: '#24211d'}]),
    ...(art ? [{href: art, ...full, blend: veneer ? 'multiply' : undefined}] : []),
  ];
  return {left: side('l'), right: side('r')};
}

// Where the tip, waist and tail widths sit along a traced outline.
function widthMarks(profile) {
  const widths = profile.left.map(([v, x], i) => [v, profile.right[i][1] - x]);
  const within = (from, to) => widths.filter(([v]) => v >= from && v <= to);
  const max = list => list.reduce((best, item) => (item[1] > best[1] ? item : best));
  const min = list => list.reduce((best, item) => (item[1] < best[1] ? item : best));
  return {tip: max(within(0.04, 0.4))[0], waist: min(within(0.3, 0.7))[0], tail: max(within(0.6, 0.97))[0]};
}

// The shared 3D studio: Praxis shapes, veneer and artwork, layup and bindings.
const artLine = config => (config.graphic === 'none' ? topLabel(config.top) : `${graphicsById.get(config.graphic)?.name} on ${config.top === 'nylon' ? 'nylon' : veneersById.get(config.top)?.name.toLowerCase()}`);
const model3d = createModel3d({
  asset,
  graphicById: id => graphicsById.get(id),
  veneerById: id => veneersById.get(id),
  cores,
  estimateWeight,
  lengthLabel,
  artLine,
});

const pack = {
  id: 'praxis',
  name: 'Praxis',
  currency: 'USD',
  steps,
  groups,
  context,
  // Flex and core follow the model's standard until the customer picks something else.
  beforeNormalize: (previous, patch, requested) => {
    if (!(patch.model || patch.length || patch.category)) return requested;
    const before = context(previous);
    const next = {...requested};
    const untouched = (value, standard) => !before.model || String(standard) === String(value);
    if (untouched(previous.flex, before.standardFlex) && !Object.hasOwn(patch, 'flex')) next.flex = undefined;
    if (untouched(previous.core, before.standardCore) && !Object.hasOwn(patch, 'core')) next.core = undefined;
    return next;
  },
  explain: (group, previous, config, ctx) => {
    if (group.id === 'flex' && Number(config.flex) === ctx.standardFlex) return `Flex: #${previous.flex} → #${config.flex}, the standard flex for the ${ctx.model.name}${config.length ? ` at ${config.length} cm` : ''}.`;
    if (group.id === 'core' && config.core === ctx.standardCore) {
      const label = value => (modelsById.get(previous.model) ?? ctx.model)?.cores.find(c => c.value === value)?.label ?? value;
      return `Core: ${label(previous.core)} → ${label(config.core)}, the standard core for the ${ctx.model.name}.`;
    }
    if (group.id === 'binding') return bindingRemoved(previous.binding, config, ctx);
    if (group.id === 'graphic') {
      const art = graphicsById.get(previous.graphic);
      if (art?.models) return `Artwork: ${art.name} is the ${modelsById.get(art.models[0]).name}’s signature graphic, so the build returned to ${graphicsById.get(config.graphic)?.name ?? 'the default artwork'}.`;
    }
    return '';
  },
  ready: (config, ctx) => !!config.category && !!ctx.model && ctx.lengths.includes(config.length),
  orderRequirements: config => (config.ability ? [] : [{label: 'choose your skier ability', step: stepIndex('rider')}]),
  weight: estimateWeight,
  // Each step opens the 3D view that shows what it changes.
  viewForField: (field, step) => {
    if (field === 'binding' || steps[step]?.id === 'bindings') return 'Bindings';
    if (field === 'width') return 'Topsheet';
    if (field === 'molding') return 'Technical';
    if (['flex', 'core'].includes(field) || steps[step]?.id === 'build') return 'Construction';
    return 'Topsheet';
  },
  copy: {
    exportTitle: 'PRAXIS CUSTOM SKIS — BUILD SHEET (INDEPENDENT CONCEPT)',
    totalLabel: 'Reference total',
    incompleteDraft: 'Incomplete draft: choose a model and length.',
    exportNotes: [
      'Independent concept. No order has been placed. Praxis confirms every custom build, its price and lead time before it is made. Prices exclude shipping and tax. Custom molding is quoted by Praxis.',
      'Weight starts from Praxis’s published standard-edition weight and adds only the changes Praxis quantifies (veneer 4–8 oz per pair; carbon about 3 oz per ski). Other changes are described, not estimated.',
      'Bindings use Praxis’s listed pair prices and exclude mounting; a pair shown only as a visual test is not part of this build.',
      `Source: ${catalog.source} (observed ${catalog.observed}).`,
    ],
    sheetEyebrow: 'One custom pair · your configuration',
    sheetNote: 'Starting artwork, standard flex and standard core are included defaults until you review them. Prices exclude shipping and tax. Praxis confirms every custom build before it is made.',
    priceNote: 'Reference prices from Praxis’s custom-order pages. Excludes shipping and tax; Praxis confirms the final price and lead time.',
    emptyBuild: 'Your custom pair',
  },
  exportHeader: (config, ctx) => [`Category: ${ctx.category?.label ?? 'Not selected'}`],
  review: {
    heroMeta: (config, ctx) => `${lengthLabel(ctx.model, config.length)} cm · ${ctx.category.label}`,
    priceKeys: ['model', 'top', 'core', 'width', 'molding', 'binding'],
    priceLabel: line => (line.key === 'model' ? 'Custom skis' : line.key === 'top' ? line.value : line.key === 'core' ? `${line.value} core` : line.value),
    weightLabel: 'Estimated weight',
  },
  stage: {
    sampleModel: 'gpo',
    preferredLength: 182,
    maxLength: 201,
    origin: 'Handcrafted in Tahoe',
    family: model => model.name,
    category: (config, ctx) => ctx.category?.label ?? '',
    detail: (config, ctx, face, lengthChosen) => [
      lengthChosen ? `${lengthLabel(ctx.model, config.length)} cm` : null,
      artLine(config),
    ].filter(Boolean),
    sampleText: (config, ctx) => `Shown: ${ctx.model.name} with ${graphicsById.get(config.graphic)?.name ?? 'library artwork'}. Start with the way you ski.`,
    hints: {art: 'Illustrative preview · traced Praxis outline', technical: 'Published dimensions · heights exaggerated'},
  },
  model3d,
  art: {
    faces: ['Topsheet'],
    zoomLevels: [1, 1.4],
    shape: (config, ctx) => skiShape(config, ctx),
    surface: (config, face, ctx) => {
      const shape = skiShape(config, ctx);
      return {...topLayers(config, ctx, config.graphic, shape), base: '#12100e', edge: {color: '#0c0b0a', width: shape.width * 0.03}};
    },
    swatch: (item, groupId, config, ctx) => topLayers(config, ctx, item.value, skiShape(config, ctx)),
  },
  specs: {
    readout: (config, ctx, weight, lengthChosen) => {
      const d = ctx.dims;
      if (!lengthChosen) {
        return [
          ...(d.waist ? [['Waist', d.waist, 'mm']] : []),
          ['Lengths', `${Math.min(...ctx.lengths)}–${Math.max(...ctx.lengths)}`, 'cm'],
        ];
      }
      const o = ctx.offset;
      return [
        ...(d.tip ? [['Tip · waist · tail', `${d.tip + o} · ${d.waist + o} · ${d.tail + o}`, 'mm']] : d.waist ? [['Waist', d.waist + o, 'mm']] : []),
        ...(ctx.spec ? [['Turn radius', ctx.spec.radius, 'm']] : []),
        ...(weight?.value ? [[ctx.spec && estimateWeight(config, ctx).items.length ? 'Est. weight' : 'Weight', weight.value, 'lb / pair']] : [['Weight', 'Not published', '']]),
      ];
    },
    geometry: (config, ctx) => {
      if (!ctx.model || !config.length) return null;
      const shape = skiShape(config, ctx);
      const spec = ctx.spec;
      const d = ctx.dims;
      const o = ctx.offset;
      const weight = estimateWeight(config, ctx);
      return {
        name: ctx.model.name,
        length_mm: shape.length,
        maxLength_mm: MAX_LENGTH_MM,
        width_mm: shape.width,
        tip_mm: d.tip && d.tip + o,
        waist_mm: d.waist && d.waist + o,
        tail_mm: d.tail && d.tail + o,
        outline: shape.profile,
        marks: widthMarks(shape.profile),
        mount_cm: spec?.boot,
        mountLabel: 'Boot center',
        profile: spec
          ? {kind: 'measured', tipRocker_mm: spec.tipRocker * 10, tailRocker_mm: spec.tailRocker * 10, tipHeight_mm: spec.tipHeight * 10, tailHeight_mm: spec.tailHeight * 10, camber_mm: spec.camber}
          : {kind: 'schematic', rocker: 'Signature', contact_mm: shape.length * 0.72},
        profileLabel: config.molding === 'custom' ? 'standard shown; custom to be agreed' : spec ? `${spec.camber} mm camber` : 'schematic',
        contactLabel: spec ? `Camber contact ${spec.contact} cm` : 'Profile not published',
        edge: '#0c0b0a',
        art: {width: shape.width, length: shape.length, layers: topLayers(config, ctx, config.graphic, shape).left},
        stats: spec
          ? [
              ['Turn radius', `${spec.radius} m`],
              ['Sidecut length', `${spec.sidecut} cm`],
              ['Weight', formatWeight(weight).text],
            ]
          : [['Dimensions', d.waist ? `${d.waist + o} mm waist` : 'Not published']],
        caption: spec ? `Outline traced from Praxis’s drawing · profile from the ${spec.year} spec chart · heights exaggerated` : 'Outline traced from Praxis’s drawing · Praxis hasn’t published a spec chart for this model',
      };
    },
  },
};

export default pack;
