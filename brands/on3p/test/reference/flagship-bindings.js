import bindingCatalog from '../../src/bindings-catalog.json' with {type: 'json'};

export {bindingCatalog};
const variants = new Map(bindingCatalog.products.flatMap(product => product.variants.map(variant => [variant.id, {...variant, product}])));
export const bindingFor = id => variants.get(String(id)) ?? null;
export const bindingLabel = id => {
  const binding = bindingFor(id);
  return binding ? `${binding.product.name} · ${binding.color} · ${binding.brake} mm` : 'Skis only';
};
export function bindingFit(binding, waist) {
  if (!binding || !Number.isFinite(waist)) return {ok: false, text: 'Choose your model and length first.'};
  if (binding.brake < waist) return {ok: false, text: `${binding.brake} mm brakes are narrower than this ${waist} mm ski. Fit needs ON3P confirmation.`};
  if (binding.brake > waist + 15) return {ok: false, text: `${binding.brake} mm brakes are more than 15 mm wider than this ski. Choose a closer width.`};
  return {ok: true, text: `${binding.brake} mm brake / ${waist} mm waist. Passes our width screen; final boot and brake fit need a shop check.`};
}
export const bindingPrice = id => bindingFor(id)?.price ?? 0;
export const bindingAllowed = (id, waist) => {
  const binding = bindingFor(id);
  return !!binding?.available && bindingFit(binding, waist).ok;
};

// A visual mount point only: reference 320 mm boot sole, not a drilling layout.
export function bindingPlacement(mesh) {
  const z = mesh.definition.mountMm / 1000;
  const u = .5 - z * 1000 / mesh.definition.lengthMm;
  const section = mesh.sections.reduce((a, b) => Math.abs(a.u - u) < Math.abs(b.u - u) ? a : b);
  return {x: 0, y: (section.heightMm + section.thicknessMm) / 1000 - .009, z};
}
