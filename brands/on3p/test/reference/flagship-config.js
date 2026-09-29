import catalog from '../../src/catalog.json' with {type: 'json'};
import compatibility from '../../src/compatibility.json' with {type: 'json'};
import stockArt from '../../src/stock-art.json' with {type: 'json'};
import {bindingAllowed, bindingLabel, bindingPrice, bindingFit, bindingFor} from './flagship-bindings.js';
import {applyConfigurationPatch, invalidateSteps, encodeFields, totalMinor} from './flagship-core.js';

export {catalog, compatibility};
export const stockFor = model => stockArt.models[model] ?? null;

export const steps = ['Shape', 'Graphics', 'Construction', 'Bindings', 'Review'];

const currency = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const preciseCurrency = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
export const money = n => Number.isInteger(n) ? currency.format(n) : preciseCurrency.format(n);
// Signed values with a true minus sign, e.g. mount points (−8.25).
export const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

// Reference prices observed on the public builder. Layups carry their own price below.
// Metal uses the regular $150 upgrade rather than the temporary introductory offer.
export const PRICES = {skis: 1099, sidewall: 50, flex: 50, detune: 25, skinClip: 50};

export const categories = [
  {id: 'Park', description: 'Centered stance. Rails, butters, and park laps.', models: ['mango-90', 'mango-102', 'mango-114', 'oski-102']},
  {id: 'Freestyle', description: 'A balanced stance. The whole mountain is your playground.', models: ['jeffrey-92', 'jeffrey-98', 'jeffrey-106', 'jeffrey-112', 'jeffrey-118', 'jeffrey-124']},
  {id: 'Freeride', description: 'A forward stance. Drive turns, charge chop, chase snow.', models: ['woodsman-92', 'woodsman-100', 'woodsman-108', 'billy-goat-102', 'billy-goat-108', 'billy-goat-114', 'billy-goat-118', 'cease-and-desist']},
  {id: 'Touring', description: 'Earn your turns. Five touring shapes, starting with Tour layup.', models: ['woodsman-100', 'woodsman-108', 'billy-goat-102', 'billy-goat-108', 'billy-goat-114']},
];

export const familyOf = m => (m.handle === 'oski-102' ? 'Oski' : m.handle === 'cease-and-desist' ? 'Cease & Desist' : m.family);

export const layups = [
  {id: 'Stock', price: 0, tag: 'The ON3P feel', description: 'Full bamboo. Maximum durability and damping.', tradeoff: 'The heaviest non-metal option, with a thick base and edges built for repeated seasons.', core: '100% bamboo', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: 'Baseline'},
  {id: 'LITE', price: 100, tag: 'Lighter resort laps', description: 'Full bamboo, with a thinner base and edges.', tradeoff: 'A softer feel and less weight, with some durability and stability traded away.', core: '100% bamboo', base: '1.4 mm', edge: '2.2 × 2.0 mm', weight: '100–150 g lighter / ski'},
  {id: '50/50', price: 150, tag: 'Resort to skintrack', description: 'A bamboo / paulownia core. Stock-thickness base and edges.', tradeoff: 'Balances uphill weight and downhill performance. Less resistant to big impacts than full bamboo.', core: 'Bamboo / paulownia', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '175–225 g lighter / ski'},
  {id: 'Tour', price: 150, tag: 'Earn your turns', description: 'Hybrid core, lighter base and edges.', tradeoff: 'The lightest layup gives up stability in variable snow and some impact protection.', core: 'Bamboo / paulownia', base: '1.4 mm', edge: '2.2 × 2.0 mm', weight: '325–400 g lighter / ski'},
  {id: 'Leaf Spring', price: 150, tag: 'Power underfoot', description: 'Bamboo and Scalium metal through the running length.', tradeoff: 'More damping and support underfoot while retaining playful tips and tails. Adds weight.', core: 'Bamboo + Scalium', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '75–100 g heavier / ski'},
  {id: 'Torsion Bar', price: 150, tag: 'Stay on the gas', description: 'Bamboo and Scalium extending into the rocker.', tradeoff: 'More edge hold and stability, with less playfulness at lower speeds. Adds weight.', core: 'Bamboo + Scalium', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '75–100 g heavier / ski'},
];

export const flexOptions = [
  {id: 'Double Soft', hint: 'Maximum playfulness; gives up the most landing support and stability.'},
  {id: 'Soft', hint: 'Easier to bend and butter; less support at high speeds.'},
  {id: 'Stock', hint: 'The flex designed for this model.'},
  {id: 'Stiff', hint: 'More support at speed and on landings; less low-speed playfulness.'},
];

export const sidewalls = [['Black', '#151515'], ['White', '#ffffff'], ['Blue', '#235aba'], ['Green', '#3b9645'], ['Purple', '#773bb0'], ['Red', '#d63237'], ['Pink', '#f380be'], ['Orange', '#f5812b'], ['Yellow', '#efe333']];

export const sidewallPrice = name => (name === 'Black' ? 0 : PRICES.sidewall);
export const flexPrice = flex => (flex === 'Stock' ? 0 : PRICES.flex);
export const skinClipPrice = c => (c.skinClip && rulesFor(c)?.skinClip !== 'included' ? PRICES.skinClip : 0);

export const defaultConfig = {category: '', model: '', length: null, rocker: 'Signature', top: 'ANSWER-498eru', base: 'CHOICE-46j9hl', sidewall: 'Black', layup: 'Stock', flex: 'Stock', detune: false, skinClip: false, binding: ''};

const modelsByHandle = new Map(catalog.models.map(m => [m.handle, m]));
const topsById = new Map(catalog.tops.map(g => [g.id, g]));
const basesById = new Map(catalog.bases.map(g => [g.id, g]));

export const modelByHandle = handle => modelsByHandle.get(handle);
export const getModel = c => modelsByHandle.get(c.model);
export const waistFor = c => getModel(c)?.lengths.find(size => size.length_cm === c.length)?.waist_mm;
export const getTop = c => topsById.get(c.top);
export const getBase = c => basesById.get(c.base);
export const rulesFor = c => compatibility.models[c.model];
export const shapeReady = c => !!c.category && !!getModel(c) && rulesFor(c).lengths.includes(c.length);
export const canRipper = (model, length) => !!model && !!compatibility.models[model.handle]?.ripperLengths.includes(length);

export function rockerReason(c) {
  const r = rulesFor(c);
  if (!r) return 'Choose a model and length first.';
  if (!r.verified) return 'Custom rocker for Mango 114 needs ON3P confirmation.';
  if (!r.ripperLengths.length) return `${getModel(c).name} uses Signature rocker only.`;
  if (!c.length) return 'Choose a length first.';
  return `Ripper is offered at ${r.ripperLengths.join(', ')} cm for this model.`;
}

// Returns why an option is unavailable for the current build, or '' when it can be chosen.
export function optionReason(c, field, value) {
  const r = rulesFor(c);
  if (!r) return 'Choose your shape first.';
  const custom = (field === 'layup' && value !== 'Stock') || (field === 'flex' && value !== 'Stock') || field === 'detune' || field === 'skinClip';
  if (!r.verified && custom) return 'Custom construction for Mango 114 needs ON3P confirmation.';
  if (field === 'layup' && !r.layups.includes(value)) return `${value} is not offered for ${getModel(c).name}.`;
  if (field === 'flex' && !r.flex[c.layup]?.includes(value)) return `${c.layup} requires Stock flex.`;
  if (field === 'detune' && !r.detune) return `${getModel(c).name} uses All mountain tune only.`;
  if (field === 'skinClip' && r.skinClip === 'included') return 'Skin clip is standard on Billy Goat 108, at no extra cost.';
  if (field === 'skinClip' && r.skinClip === 'unavailable') return `Skin clips are not offered for ${getModel(c).name}.`;
  return '';
}

// Every entry point (edits, saved builds, and links) uses this same dependency order.
export function normalizeConfig(input = {}) {
  const c = {...defaultConfig};
  const stock = stockFor(input.model);
  c.top = topsById.has(input.top) ? input.top : stock?.top ?? c.top;
  c.base = basesById.has(input.base) ? input.base : stock?.base ?? c.base;
  if (sidewalls.some(([name]) => name === input.sidewall)) c.sidewall = input.sidewall;
  const model = getModel(input);
  const requestedCategory = categories.find(g => g.id === input.category);
  c.category = requestedCategory?.id || (model ? categories.find(g => g.models.includes(model.handle)).id : '');
  if (model && categories.find(g => g.id === c.category)?.models.includes(model.handle)) c.model = model.handle;
  const r = rulesFor(c);
  c.length = r?.lengths.includes(Number(input.length)) ? Number(input.length) : null;
  c.rocker = input.rocker === 'Ripper' && canRipper(getModel(c), c.length) ? 'Ripper' : 'Signature';
  c.layup = r?.layups.includes(input.layup) ? input.layup : 'Stock';
  c.flex = r?.flex[c.layup]?.includes(input.flex) ? input.flex : 'Stock';
  c.detune = !!r?.detune && input.detune === true;
  c.skinClip = r?.skinClip === 'included' || (r?.skinClip === 'optional' && input.skinClip === true);
  c.binding = bindingAllowed(input.binding, waistFor(c)) ? String(input.binding) : '';
  return c;
}

const labels = {model: 'Model', length: 'Length', rocker: 'Rocker', layup: 'Layup', flex: 'Flex', detune: 'Edge tune', skinClip: 'Tail'};
const formatValue = (field, value) => {
  if (field === 'length') return value ? `${value} cm` : 'Choose a length';
  if (field === 'model') return modelsByHandle.get(value)?.name || 'Choose a model';
  if (field === 'detune') return value ? 'Park detune' : 'All mountain';
  if (field === 'skinClip') return value ? 'Skin clip' : 'Stock tail';
  return value;
};

// Applies a customer edit and explains every dependent choice that had to change.
export function prepareSkiChange(previous, patch) {
  let requested = {...previous, ...patch};
  if (patch.category && patch.category !== previous.category) requested = {...requested, model: '', length: null};
  const previousStock = stockFor(previous.model);
  const nextStock = stockFor(requested.model);
  // Defaults follow the model; a deliberately different graphic travels with
  // the customer's build. Explicit values from an edit/link always win.
  if (requested.model !== previous.model && nextStock) {
    for (const field of ['top', 'base']) {
      if (!Object.hasOwn(patch, field) && previous[field] === (previousStock?.[field] ?? defaultConfig[field])) requested[field] = nextStock[field];
    }
  }
  // Clearing a category carries untouched stock art back to neutral defaults,
  // so choosing the next category's model can apply its own stock preset.
  if (previous.model && !requested.model) {
    for (const field of ['top', 'base']) if (!Object.hasOwn(patch, field) && previous[field] === previousStock?.[field]) requested[field] = defaultConfig[field];
  }
  if (patch.model && patch.model !== previous.model && requested.category === 'Touring') requested.layup = 'Tour';
  return requested;
}

export function applyConfigChange(previous, patch) {
  const config = applyConfigurationPatch({previous, patch, normalize: normalizeConfig, prepare: prepareSkiChange});
  const changes = [];
  if (previous.binding && !config.binding && patch.binding !== '') {
    const binding = bindingFor(previous.binding);
    const reason = binding && !binding.available ? 'That variant was unavailable in the latest catalog snapshot.' : binding ? bindingFit(binding, waistFor(config)).text : 'This binding is no longer in the catalog.';
    changes.push({field: 'binding', text: `Bindings are no longer in your total. ${reason}${binding ? ' The pair stays on your skis as a visual test.' : ''}`});
  } else if (!previous.binding && config.binding && ['model', 'length', 'category'].some(field => Object.hasOwn(patch, field))) {
    // A pair carried through a shape edit joins the total once it fits; the price moves, so say so.
    const binding = bindingFor(config.binding);
    changes.push({field: 'binding', text: `Bindings added to your total (+${money(binding.price)}). ${bindingFit(binding, waistFor(config)).text}`});
  }
  for (const field of Object.keys(labels)) {
    if (previous[field] === config[field] || Object.hasOwn(patch, field)) continue;
    if ((field === 'model' && !previous.model) || (field === 'length' && !previous.length)) continue;
    if (field === 'length' && config.length === null) {
      changes.push({field, text: `${previous.length} cm cleared. Choose an available length for your new shape.`});
    } else if (field === 'model') {
      changes.push({field, text: 'Choose a model in your new category.'});
    } else {
      const reason = field === 'rocker' ? rockerReason(config) : field === 'layup' && config.layup === 'Tour' ? 'Touring starts with Tour layup.' : optionReason(config, field, previous[field]);
      changes.push({field, text: `${labels[field]}: ${formatValue(field, previous[field])} → ${formatValue(field, config[field])}. ${reason}`});
    }
  }
  return {config, changes};
}

export const artworkPrice = (key, id) => compatibility.prices[key === 'top' ? 'tops' : 'bases'][id] || 0;

// The build sheet is the single source for the total, the review breakdown and the export.
export function bomLines(c) {
  const model = getModel(c);
  return [
    {key: 'model', label: 'Ski pair', value: model?.name || 'Choose your model', price: PRICES.skis, step: 0, pending: !model},
    {key: 'length', label: 'Length', value: c.length ? `${c.length} cm` : 'Choose your length', price: 0, step: 0, pending: !c.length},
    {key: 'rocker', label: 'Rocker', value: c.rocker, price: 0, step: 0, pending: !shapeReady(c)},
    {key: 'top', label: 'Topsheet', value: getTop(c).name, price: artworkPrice('top', c.top), step: 1},
    {key: 'base', label: 'Base', value: getBase(c).name, price: artworkPrice('base', c.base), step: 1},
    {key: 'sidewall', label: 'Sidewalls', value: c.sidewall, price: sidewallPrice(c.sidewall), step: 1},
    {key: 'layup', label: 'Layup', value: c.layup, price: layups.find(l => l.id === c.layup).price, step: 2},
    {key: 'flex', label: 'Flex', value: c.flex, price: flexPrice(c.flex), step: 2},
    {key: 'detune', label: 'Edge tune', value: c.detune ? 'Park detune' : 'All mountain', price: c.detune ? PRICES.detune : 0, step: 2},
    {key: 'skinClip', label: 'Tail', value: c.skinClip ? 'Skin clip' : 'Stock tail', price: skinClipPrice(c), step: 2},
    {key: 'binding', label: 'Bindings', value: bindingLabel(c.binding), price: bindingPrice(c.binding), step: 3},
  ];
}

export const priceLines = c =>
  bomLines(c)
    .filter(l => !['length', 'rocker'].includes(l.key))
    .map(l => ({key: l.key, label: l.key === 'model' ? 'Custom skis' : l.key === 'skinClip' || (l.key === 'binding' && !c.binding) ? l.value : `${l.value} ${l.label.toLowerCase()}`, price: l.price}));

export const totalPrice = c => totalMinor(bomLines(c).map(line => ({amountMinor: Math.round(line.price * 100)}))) / 100;

export const stepFields = [['category', 'model', 'length', 'rocker'], ['top', 'base', 'sidewall'], ['layup', 'flex', 'detune', 'skinClip'], ['binding']];
export const invalidateReviews = (before, after, reviewed) => invalidateSteps(before, after, reviewed, stepFields);

export const encodeConfig = encodeFields;
export function decodeBuild(s) {
  const data = Object.fromEntries(new URLSearchParams(s));
  data.detune = data.detune === 'true';
  data.skinClip = data.skinClip === 'true';
  data.length = Number(data.length) || null;
  return applyConfigChange({...defaultConfig, ...data, top: data.top ?? stockFor(data.model)?.top ?? defaultConfig.top, base: data.base ?? stockFor(data.model)?.base ?? defaultConfig.base}, {});
}
export const decodeConfig = s => decodeBuild(s).config;

const colorNames = new Set(['Onyx', 'Ivory', 'Oxblood', 'Petrol', 'Violet', 'Scarlet', 'Spruce', 'Cobalt', 'Fuschia', 'Tangerine', 'Acid', 'Turquoise', 'Pink', 'Teal', 'Yellow', 'Orange', 'Green', 'Purple', 'Black', 'White']);
export const graphicCategory = g => (g.name.startsWith('Blackout') ? 'Blackout' : colorNames.has(g.name) || g.name.startsWith('Flo-') ? 'Color' : g.name.startsWith('Wood ') ? 'Wood' : 'Graphic');
export const filterGraphics = (list, search = '', filter = 'All') => {
  const query = search.trim().toLowerCase();
  return list.filter(g => g.name.toLowerCase().includes(query) && (filter === 'All' || graphicCategory(g) === filter));
};
export const visibleGraphics = (list, search = '', filter = 'All', limit = 12) => filterGraphics(list, search, filter).slice(0, limit);

export function buildText(c, {previewBinding = null} = {}) {
  const lines = bomLines(c).map(l => `${l.label}: ${l.value} — ${l.price ? money(l.price) : 'Included'}`);
  const visual = previewBinding && bindingFor(previewBinding);
  if (previewBinding && !visual) throw new Error('Selected binding is not in this catalog.');
  if (visual) lines.push(`Saved visual binding selection: ${bindingLabel(previewBinding)} (variant ${previewBinding}) — not in reference total; availability and fit require review.`);
  return `ON3P CUSTOM SHOP — FAN CONCEPT

Category: ${c.category || 'Not selected'}
${lines.join('\n')}

Reference total: ${money(totalPrice(c))}
${shapeReady(c) ? '' : 'Incomplete draft: choose a model and length.\n'}
Independent fan prototype. No order has been placed. Price includes selected binding pairs and excludes promotional discounts, mounting, shipping and tax. Binding availability is a snapshot; final boot/brake fit and release settings require a qualified shop. Metal uses its regular $150 upgrade price. Compatibility follows a public catalog snapshot; Mango 114 custom construction is held for confirmation. Artwork preview is illustrative.
Source: ${compatibility.source}
Specification revision ${catalog.specVersion}; compatibility observed ${compatibility.observed}.
`;
}
