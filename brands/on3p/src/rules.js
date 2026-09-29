// ON3P catalog rules, framework-free: what can be combined, what it costs and why an
// option is unavailable. Observed on ON3P's public builder; see PRODUCT-RELATIONSHIPS.md.
import catalog from './catalog.json' with {type: 'json'};
import compatibility from './compatibility.json' with {type: 'json'};
import stockArt from './stock-art.json' with {type: 'json'};

export {catalog, compatibility, stockArt};
export const stockFor = model => stockArt.models[model] ?? null;

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

// Weight deltas are ON3P's published per-ski ranges relative to the Stock layup.
export const layups = [
  {id: 'Stock', price: 0, tag: 'The ON3P feel', description: 'Full bamboo. Maximum durability and damping.', tradeoff: 'The heaviest non-metal option, with a thick base and edges built for repeated seasons.', core: '100% bamboo', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: 'Baseline', weightDelta: [0, 0]},
  {id: 'LITE', price: 100, tag: 'Lighter resort laps', description: 'Full bamboo, with a thinner base and edges.', tradeoff: 'A softer feel and less weight, with some durability and stability traded away.', core: '100% bamboo', base: '1.4 mm', edge: '2.2 × 2.0 mm', weight: '100–150 g lighter / ski', weightDelta: [-150, -100]},
  {id: '50/50', price: 150, tag: 'Resort to skintrack', description: 'A bamboo / paulownia core. Stock-thickness base and edges.', tradeoff: 'Balances uphill weight and downhill performance. Less resistant to big impacts than full bamboo.', core: 'Bamboo / paulownia', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '175–225 g lighter / ski', weightDelta: [-225, -175]},
  {id: 'Tour', price: 150, tag: 'Earn your turns', description: 'Hybrid core, lighter base and edges.', tradeoff: 'The lightest layup gives up stability in variable snow and some impact protection.', core: 'Bamboo / paulownia', base: '1.4 mm', edge: '2.2 × 2.0 mm', weight: '325–400 g lighter / ski', weightDelta: [-400, -325]},
  {id: 'Leaf Spring', price: 150, tag: 'Power underfoot', description: 'Bamboo and Scalium metal through the running length.', tradeoff: 'More damping and support underfoot while retaining playful tips and tails. Adds weight.', core: 'Bamboo + Scalium', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '75–100 g heavier / ski', weightDelta: [75, 100]},
  {id: 'Torsion Bar', price: 150, tag: 'Stay on the gas', description: 'Bamboo and Scalium extending into the rocker.', tradeoff: 'More edge hold and stability, with less playfulness at lower speeds. Adds weight.', core: 'Bamboo + Scalium', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '75–100 g heavier / ski', weightDelta: [75, 100]},
];

export const flexOptions = [
  {id: 'Double Soft', hint: 'Maximum playfulness; gives up the most landing support and stability.'},
  {id: 'Soft', hint: 'Easier to bend and butter; less support at high speeds.'},
  {id: 'Stock', hint: 'The flex designed for this model.'},
  {id: 'Stiff', hint: 'More support at speed and on landings; less low-speed playfulness.'},
];

export const sidewalls = [['Black', '#151515'], ['White', '#ffffff'], ['Blue', '#235aba'], ['Green', '#3b9645'], ['Purple', '#773bb0'], ['Red', '#d63237'], ['Pink', '#f380be'], ['Orange', '#f5812b'], ['Yellow', '#efe333']];
export const sidewallColor = name => sidewalls.find(([id]) => id === name)?.[1] ?? '#151515';

export const sidewallPrice = name => (name === 'Black' ? 0 : PRICES.sidewall);
export const flexPrice = flex => (flex === 'Stock' ? 0 : PRICES.flex);

// The neutral artwork a build shows until a model's stock artwork applies.
export const DEFAULT_ART = {top: 'ANSWER-498eru', base: 'CHOICE-46j9hl'};

const modelsByHandle = new Map(catalog.models.map(m => [m.handle, m]));
const topsById = new Map(catalog.tops.map(g => [g.id, g]));
const basesById = new Map(catalog.bases.map(g => [g.id, g]));

export const modelByHandle = handle => modelsByHandle.get(handle);
export const getModel = c => modelsByHandle.get(c.model);
export const waistFor = c => getModel(c)?.lengths.find(size => size.length_cm === c.length)?.waist_mm;
export const topById = id => topsById.get(id);
export const baseById = id => basesById.get(id);
export const getTop = c => topsById.get(c.top);
export const getBase = c => basesById.get(c.base);
export const rulesFor = c => compatibility.models[c.model];
export const canRipper = (model, length) => !!model && !!compatibility.models[model.handle]?.ripperLengths.includes(length);

export function rockerReason(c) {
  const r = rulesFor(c);
  if (!r) return 'Choose a model and length first.';
  if (!r.verified) return 'Custom rocker for Mango 114 needs ON3P confirmation.';
  if (!r.ripperLengths.length) return `${getModel(c).name} uses Signature rocker only.`;
  if (!c.length) return 'Choose a length first.';
  return `Ripper is offered at ${r.ripperLengths.join(', ')} cm for this model.`;
}

// Why an option is unavailable for the current build, or '' when it can be chosen.
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

export const artworkPrice = (key, id) => compatibility.prices[key === 'top' ? 'tops' : 'bases'][id] || 0;

// Stock artwork follows the model: an untouched stock preset is replaced by the next
// model's, while deliberately chosen artwork travels with the build. Explicit values in
// an edit or link always win. Touring starts every newly chosen shape with Tour layup.
export function prepareSkiChange(previous, patch, requested) {
  let next = {...requested};
  // A new category clears the model and length, even ones sent in the same edit.
  if (patch.category && patch.category !== previous.category) next = {...next, model: '', length: null};
  const previousStock = stockFor(previous.model);
  const nextStock = stockFor(next.model);
  if (next.model !== previous.model && nextStock) {
    for (const field of ['top', 'base']) {
      if (!Object.hasOwn(patch, field) && previous[field] === (previousStock?.[field] ?? DEFAULT_ART[field])) next[field] = nextStock[field];
    }
  }
  // Clearing a category carries untouched stock art back to the neutral defaults, so
  // choosing the next category's model can apply its own stock preset.
  if (previous.model && !next.model) {
    for (const field of ['top', 'base']) if (!Object.hasOwn(patch, field) && previous[field] === previousStock?.[field]) next[field] = DEFAULT_ART[field];
  }
  if (patch.model && patch.model !== previous.model && next.category === 'Touring') next.layup = 'Tour';
  return next;
}

const colorNames = new Set(['Onyx', 'Ivory', 'Oxblood', 'Petrol', 'Violet', 'Scarlet', 'Spruce', 'Cobalt', 'Fuschia', 'Tangerine', 'Acid', 'Turquoise', 'Pink', 'Teal', 'Yellow', 'Orange', 'Green', 'Purple', 'Black', 'White']);
export const graphicCategory = g => (g.name.startsWith('Blackout') ? 'Blackout' : colorNames.has(g.name) || g.name.startsWith('Flo-') ? 'Color' : g.name.startsWith('Wood ') ? 'Wood' : 'Graphic');
export const finishFor = graphic => (graphic?.name.startsWith('Wood ') ? 'wood' : 'textured');
