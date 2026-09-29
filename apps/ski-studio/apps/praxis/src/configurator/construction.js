// The Praxis layup for the exploded Inside view, from Praxis's construction and
// custom-order pages (praxisskis.com/ski/construction/, observed September 25, 2026):
//
// - Cores of hard maple, ash, aspen and paulownia. Ash and maple frame the center and the
//   perimeter; maple forms a solid block under the binding for screw retention; aspen
//   (Enduro) or paulownia (Ultra Light) fills the rest; Heavy Hitter uses only maple and
//   ash. Cores are bookmatched in pairs.
// - 19, 22 or 26 oz stitched tri-axial fiberglass; carbon replaces some of the glass on
//   carbon cores and comes with Ultra Light.
// - Rubber Dampening System: rubber over the edges, full sheets in the tip and tail with
//   UHMW tip spacers, and a perforated sheet in the binding zone.
// - UHMW sidewalls pre-bonded to the core and machined round.
// - Extra-thick 4001 sintered base; oversized steel edges that wrap 360°.
//
// Materials and their placement follow those descriptions. Laminate thicknesses, strip
// widths, zone lengths and the separation distances are illustrative.
import {across, halfWidth, mountU, rail, strip} from '@ski-studio/configurator/studio3d/construction';
import {ESTIMATES} from './geometry.js';

export const CONSTRUCTION_SOURCE = 'https://www.praxisskis.com/ski/construction/';
const STRIPS = 13;
const SPACER = .035;          // tip and tail spacer length, fraction of the ski
const BINDING_ZONE = .12;     // half-length of the maple block and perforated rubber

// Wood for strip i of 13 (0 and 12 are the perimeter, 6 the center), in or out of the binding zone.
function woodFor(family, i, inZone) {
  if (i === 0 || i === STRIPS - 1 || i === 6) return 'ash';
  if (inZone && i >= 3 && i <= 9) return 'maple';
  if (family === 'heavy-hitter') return i % 2 ? 'maple' : 'ash';
  if (family === 'ultra-light') return 'paulownia';
  return 'aspen';
}

export function praxisStack(mesh, {family, carbon, veneer}) {
  const {definition} = mesh;
  const base = definition.baseMm ?? ESTIMATES.baseMm;
  const carbonMm = carbon ? .25 : 0;
  const lowerGlass = [base, base + .55];
  const floor = lowerGlass[1] + carbonMm;
  const ceiling = s => Math.max(floor + .6, s.thicknessMm - 1.12 - carbonMm);
  const topTop = s => s.thicknessMm, topBottom = s => s.thicknessMm - (veneer ? .6 : .4);
  const m = mountU(definition);
  const zone = [m - BINDING_ZONE, m + BINDING_ZONE];
  const stack = [];
  const add = (layer, key) => stack.push({...layer, key});

  add({id: 'topsheet', material: 'topsheet', artwork: 'top', bounds: across(.45), bottom: topBottom, top: topTop, explode: [0, .182, 0]}, 'topsheet');
  add({id: 'upper-glass', material: 'triax', bounds: across(), bottom: s => ceiling(s) + carbonMm, top: topBottom, explode: [0, .14, 0]}, 'glass');
  if (carbon) add({id: 'upper-carbon', material: 'carbon', bounds: across(1), bottom: ceiling, top: s => ceiling(s) + carbonMm, explode: [0, .118, 0]}, 'carbon');
  // Rubber Dampening System: binding-zone sheet, tip and tail sheets, rubber over the edges.
  add({id: 'rds-binding', material: 'perforated', bounds: across(3), bottom: ceiling, top: s => ceiling(s) + .18, start: zone[0], end: zone[1], explode: [0, .098, 0]}, 'rds');
  add({id: 'rds-tip', material: 'rubber', bounds: across(1.5), bottom: ceiling, top: s => ceiling(s) + .2, start: 0, end: .1, explode: [0, .098, 0]}, 'rds');
  add({id: 'rds-tail', material: 'rubber', bounds: across(1.5), bottom: ceiling, top: s => ceiling(s) + .2, start: .92, end: 1, explode: [0, .098, 0]}, 'rds');
  // Core strips, each split where the maple binding block begins and ends.
  for (let i = 0; i < STRIPS; i++) {
    const cuts = [SPACER, ...(i >= 3 && i <= 9 ? zone : []), 1 - SPACER];
    for (let c = 0; c < cuts.length - 1; c++) {
      const inZone = cuts[c] >= zone[0] - 1e-9 && cuts[c + 1] <= zone[1] + 1e-9;
      add({id: `core-${i}-${c}`, material: woodFor(family, i, inZone), bounds: strip(i, STRIPS), bottom: () => floor, top: ceiling, start: cuts[c], end: cuts[c + 1], explode: [0, .028, 0], vary: i}, 'core');
    }
  }
  for (const [id, start, end] of [['spacer-tip', 0, SPACER], ['spacer-tail', 1 - SPACER, 1]]) {
    add({id, material: 'uhmw', bounds: across(3), bottom: () => floor, top: ceiling, start, end, explode: [0, .028, 0]}, 'spacers');
  }
  for (const side of [-1, 1]) {
    add({id: `sidewall-${side}`, material: 'sidewall', bounds: rail(side, .1, 2.9), bottom: () => base + .2, top: s => s.thicknessMm - .45, explode: [side * .068, .016, 0]}, 'sidewall');
    add({id: `rds-edge-${side}`, material: 'rubber', bounds: rail(side, .9, 3), bottom: () => ESTIMATES.edgeHeightMm - .15, top: () => ESTIMATES.edgeHeightMm + .05, explode: [side * .014, -.041, 0]}, 'rds');
    add({id: `edge-${side}`, material: 'steel', bounds: rail(side, 0, definition.steelWidthMm ?? ESTIMATES.edgeWidthMm), bottom: () => 0, top: () => definition.steelHeightMm ?? ESTIMATES.edgeHeightMm, explode: [side * .013, -.07, 0]}, 'edges');
  }
  if (carbon) add({id: 'lower-carbon', material: 'carbon', bounds: across(1), bottom: () => lowerGlass[1], top: () => floor, explode: [0, -.008, 0]}, 'carbon');
  add({id: 'lower-glass', material: 'triax', bounds: across(), bottom: () => lowerGlass[0], top: () => lowerGlass[1], explode: [0, -.024, 0]}, 'glass');
  add({id: 'base', material: 'base', artwork: 'base', bounds: s => [-halfWidth(s, definition.steelWidthMm ?? 2.5), halfWidth(s, definition.steelWidthMm ?? 2.5)], bottom: () => 0, top: () => base, explode: [0, -.07, 0]}, 'base');
  return stack;
}

const CORE_ABOUT = {
  enduro: 'Ash frames the center and the perimeter, a maple block sits under the binding for screw retention, and aspen fills the rest.',
  'heavy-hitter': 'Only the dense hardwoods: maple and ash throughout, with the maple block under the binding. Damp and powerful; the weight adds up on wide skis.',
  'ultra-light': 'Paulownia replaces aspen, with the maple and ash kept to the frame and the binding zone. Among the lightest skis made.',
};

/** The legend for the Inside view, in stack order (top to bottom). */
export function praxisLayers({core, coreLabel, woods, carbon, veneer, veneerName}) {
  return [
    veneer
      ? {key: 'topsheet', name: `${veneerName} veneer top`, spec: 'Artwork stained into real wood', about: 'A real wood veneer sheet with the artwork digitally stained in; white areas stay bare grain. It saves 4–8 oz per pair over nylon.', color: '#b77a4f'}
      : {key: 'topsheet', name: 'Printed nylon top', spec: 'Your artwork, printed', about: 'The standard top: artwork printed on nylon for full, vibrant color.', color: '#5a534a'},
    {key: 'glass', name: 'Tri-axial fiberglass', spec: '19, 22 or 26 oz · above and below the core', about: 'Stitched rather than woven, in three directions, to steady flex and torsion for edge hold. Praxis chooses the weight by model and flex.', color: '#b7c2b8'},
    carbon
      ? {key: 'carbon', name: 'Carbon fiber', spec: 'Replaces some of the glass', about: 'Stiffer for its weight and quicker to spring back: about 3 oz lighter per ski at the same flex, and livelier.', color: '#34363a'}
      : {key: 'carbon', name: 'No carbon', spec: `${coreLabel} is glass only`, about: 'Carbon is an option on most models (Enduro Carbon, Heavy Carbon) and comes with the Ultra Light core.', color: '#34363a', empty: true},
    {key: 'rds', name: 'Rubber Dampening System', spec: 'Edges, tip and tail, binding zone', about: 'Rubber over the edges, full sheets in the tip and tail, and a perforated sheet under the binding: stronger bonds, better screw retention and a quieter ride. Placement is illustrative.', color: '#5c5f63'},
    {key: 'core', name: `${coreLabel} core`, spec: woods, about: `${CORE_ABOUT[core] ?? CORE_ABOUT.enduro} Each pair is bookmatched: cut in sequence from one block and milled together.`, color: '#d8b98a'},
    {key: 'spacers', name: 'Tip and tail spacers', spec: 'UHMW bumpers', about: 'Plastic spacers close the core at the tip and tail; with the rubber sheets they form an impact-resistant bumper. Length is illustrative.', color: '#8b8f93'},
    {key: 'sidewall', name: 'UHMW sidewalls', spec: 'Pre-bonded · machined round', about: 'Pressed onto the core before the final layup, then machined round so the edge can take hits without chipping the top. Pulled out here so the core shows.', color: '#232324'},
    {key: 'base', name: '4001 sintered base', spec: 'Extra-thick sintered UHMW', about: 'Fast, durable and quick to take wax. Praxis calls it extra thick; the thickness shown is an estimate.', color: '#2d2e30'},
    {key: 'edges', name: 'Steel edges', spec: 'Oversized · wrap 360°', about: 'Edges run all the way around the ski, shaped to the tip and tail for impact resistance. The section size shown is an estimate.', color: '#c6cbcf'},
  ];
}
