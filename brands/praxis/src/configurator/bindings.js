// Praxis's LOOK Pivot 2.0 and CAST Freetour bindings (data/bindings-catalog.json, built
// by scripts/import-bindings.mjs from praxisskis.com/ski-bindings/).
import bindingCatalog from './data/bindings-catalog.json' with {type: 'json'};

export {bindingCatalog};
const variants = new Map(bindingCatalog.products.flatMap(product => product.variants.map(variant => [variant.id, {...variant, product}])));
export const bindingVariants = [...variants.values()];
export const bindingFor = id => variants.get(String(id)) ?? null;
export const bindingLabel = id => {
  const binding = bindingFor(id);
  return binding ? `${binding.product.name} · ${binding.color} · ${binding.brake} mm` : 'Skis only';
};
export const bindingPrice = id => bindingFor(id)?.price ?? 0;

const observedDate = new Date(`${bindingCatalog.observed}T12:00:00Z`).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
export const CATALOG_NOTE = `Faded options aren't orderable for this ski. Catalog checked ${observedDate}; availability can change.`;

/**
 * Conservative clearance screen: the brake at least as wide as the waist and no more than
 * 15 mm wider. `waist` is {mm, published}; an unpublished waist is estimated from the drawing.
 */
export function bindingFit(binding, waist) {
  if (!binding || !Number.isFinite(waist?.mm)) return {ok: false, text: 'Choose your model and length first.'};
  const ski = waist.published ? `this ${waist.mm} mm ski` : `this ski (about ${waist.mm} mm, estimated from Praxis’s drawing)`;
  if (binding.brake < waist.mm) return {ok: false, text: `${binding.brake} mm brakes are narrower than ${ski}. Fit needs Praxis to confirm.`};
  if (binding.brake > waist.mm + 15) return {ok: false, text: `${binding.brake} mm brakes are more than 15 mm wider than ${ski}. Choose a closer width.`};
  return {ok: true, text: `${binding.brake} mm brake / ${waist.published ? '' : '~'}${waist.mm} mm waist. Passes our width screen; final boot and brake fit need a shop check.`};
}
export const bindingAllowed = (id, waist) => {
  const binding = bindingFor(id);
  return !!binding?.available && bindingFit(binding, waist).ok;
};

// The 3D study is a LOOK Pivot 15; the paint follows the chosen colorway.
const COLORWAYS = {'Black Metal': 'Black', 'Orange Metal': 'Orange', 'Blue Steel': 'Blue', 'Super Edition': 'Super Edition', 'White / Black': 'White', Purple: 'Purple', 'Black Metal Raw': 'Raw'};
export const colorwayFor = color => COLORWAYS[color] ?? 'Black';
const shortName = product => product.name.replace(/^LOOK /, '').replace(/^CAST /, '');

export function bindingCaption(binding) {
  const {product} = binding;
  if (product.model === 'study') return `Pivot 15 · ${binding.color}`;
  if (product.model === 'alpine-mode') return `${shortName(product)} · Pivot 15 model, alpine mode`;
  return `${shortName(product)} · Pivot 15 model as stand-in`;
}

export function modelNote(product) {
  if (product.model === 'study') return 'The Blender study shows an approximate Pivot 15 at the ski’s boot center with a 320 mm reference boot sole. It does not confirm boot or brake fit.';
  if (product.model === 'alpine-mode') return 'The skis show the Blender Pivot 15 in alpine mode, in this colorway. CAST’s pin-tech touring toe and AFD plates are not modeled.';
  return `The skis show the Blender Pivot 15 as a stand-in for the ${shortName(product)}: same Pivot 2.0 layout and colorway, but the parts differ.`;
}

export function bindingSpecs(product) {
  return [
    ['Release', product.din ? `DIN ${product.din}` : `DIN up to ${product.rating}`],
    ['Boot soles', product.bootCompatibility],
    ...(product.weight ? [['Weight', `${product.weight.alpine.toLocaleString()} g alpine / ${product.weight.touring.toLocaleString()} g touring, per Praxis`]] : []),
    ...(product.touring ? [['Touring', 'Swaps to a pin-tech toe to climb (CAST Freetour)']] : []),
  ];
}
