// The Proteus layup for the exploded Inside view, from "Inside a Proteus Snowboard" and the
// Stiffness Guide on proteussnowboards.com/technology (observed September 25, 2026):
//
// - PiO2 textured topsheet; a full sheet of biaxial glass on top, with triaxial patches from
//   underfoot to the effective edge; the bottom sheet's glass set by the build.
// - Calculated carbon: high-modulus reinforcements at angles, binding to effective edge.
// - Thru-Stitch: Kevlar thread sewn through the glass and the core.
// - The patented Adjustable Camber mechanism at the center of the board, one screw per end.
// - Hybrid core: continuous poplar planks under the bindings and along the sidewalls,
//   paulownia everywhere else; UHMWPE tipfill; polyurethane sidewalls.
// - VDS rubber, full-wrap steel edges and a one-piece ISO 7500 sintered base.
//
// Proteus doesn't publish the mechanism's internals. The housing, the two tension members
// in their sleeves and every thickness, width and position here are illustrative.
import {across, halfWidth, rail, strip} from '@arc/ski-geometry';
import {ESTIMATES} from './specs.js';
import {hardwareStations, planform} from './geometry.js';

export const CONSTRUCTION_SOURCE = 'https://www.proteussnowboards.com/technology/';
const STRIPS = 15;
const POPLAR = new Set([0, 1, 6, 7, 8, 13, 14]);   // sidewall planks and the insert planks
const GLASS_MM = {'12 oz biax glass': .3, '18 oz biax glass': .45, '19 oz triax glass': .5};
const kindOf = glass => (glass.includes('triax') ? 'triax' : 'biax');

export function proteusStack(mesh, {size, build, stopper}) {
  const {definition} = mesh;
  const L = definition.lengthMm;
  const plan = planform(size);
  const hardware = hardwareStations(size);
  const base = ESTIMATES.baseMm;
  const bottomGlass = [base, base + GLASS_MM[build.bottom]];
  const floor = bottomGlass[1];
  const topsheet = s => s.thicknessMm - .45;
  const topGlass = s => topsheet(s) - GLASS_MM[build.top];
  const carbonTop = s => topGlass(s), carbonBottom = s => topGlass(s) - .22;
  const ceiling = s => Math.max(floor + .8, carbonBottom(s) - .5);   // under the triax patches
  const tipfill = 70 / L;
  const housing = [.5 - 55 / L, .5 + 55 / L];
  const stack = [];
  const add = (layer, key) => stack.push({...layer, key});
  const u = mm => .5 - mm / L;   // mm from the center, toward the nose when positive

  if (stopper) {
    add({id: 'snow-stopper', material: 'urethane', bounds: () => [-11, 11], bottom: s => s.thicknessMm - .2, top: s => s.thicknessMm + 2.4, start: u(11), end: u(-11), explode: [0, .228, 0]}, 'mechanism');
  }
  add({id: 'topsheet', material: 'topsheet', artwork: 'top', bounds: across(.45), bottom: topsheet, top: s => s.thicknessMm, explode: [0, .19, 0]}, 'topsheet');
  // Thru-Stitch: rows of Kevlar thread through the glass (drawn on its upper face).
  [-.3, -.15, 0, .15, .3].forEach((f, i) => {
    add({id: `kevlar-${i}`, material: 'kevlar', bounds: s => {const x = f * 2 * halfWidth(s, 6); return [x - .45, x + .45];}, bottom: s => topsheet(s) - .02, top: s => topsheet(s) + .1, start: plan.uc, end: 1 - plan.uc, explode: [0, .158, 0]}, 'kevlar');
  });
  add({id: 'top-glass', material: kindOf(build.top), bounds: across(), bottom: topGlass, top: topsheet, explode: [0, .142, 0]}, 'glass');
  // Carbon from each binding out to the rails at the ends of the effective edge.
  for (const [end, from, to] of [['nose', hardware.inserts[0], plan.uc], ['tail', hardware.inserts[1], 1 - plan.uc]]) {
    for (const side of [-1, 1]) {
      add({
        id: `carbon-${end}-${side}`, material: 'carbon',
        bounds: s => {
          const t = Math.max(0, Math.min(1, (s.u - from) / (to - from)));
          const x = side * (14 + t * (halfWidth(s, 4) - 30));
          return [x - 7, x + 7];
        },
        bottom: carbonBottom, top: carbonTop, start: Math.min(from, to), end: Math.max(from, to), explode: [0, .124, 0],
      }, 'carbon');
    }
  }
  // Triaxial patches from underfoot to the effective edge.
  add({id: 'triax-nose', material: 'triax', bounds: across(4), bottom: ceiling, top: carbonBottom, start: plan.uc, end: hardware.inserts[0] + 40 / L, explode: [0, .106, 0]}, 'triax');
  add({id: 'triax-tail', material: 'triax', bounds: across(4), bottom: ceiling, top: carbonBottom, start: hardware.inserts[1] - 40 / L, end: 1 - plan.uc, explode: [0, .106, 0]}, 'triax');
  // Adjustable Camber: the housing at the center, a screw for each end, and the tension
  // members running in sleeves low in the core to the ends of the effective edge.
  add({id: 'housing', material: 'casing', bounds: () => [-24, 24], bottom: () => floor, top: s => ceiling(s) + .3, start: housing[0], end: housing[1], explode: [0, .072, 0]}, 'mechanism');
  add({id: 'screw-nose', material: 'steel', bounds: () => [-3.2, 3.2], bottom: () => floor + 1.6, top: () => floor + 5, start: u(46), end: u(10), explode: [0, .09, 0]}, 'mechanism');
  add({id: 'screw-tail', material: 'steel', bounds: () => [-3.2, 3.2], bottom: () => floor + 1.6, top: () => floor + 5, start: u(-10), end: u(-46), explode: [0, .09, 0]}, 'mechanism');
  for (const [end, start, stop] of [['nose', plan.uc + 20 / L, housing[0]], ['tail', housing[1], 1 - plan.uc - 20 / L]]) {
    add({id: `sleeve-${end}`, material: 'sleeve', bounds: () => [-4.2, 4.2], bottom: () => floor + .15, top: () => floor + 2.6, start, end: stop, explode: [0, .046, 0]}, 'mechanism');
    add({id: `tension-${end}`, material: 'casing', bounds: () => [-1.6, 1.6], bottom: () => floor + .75, top: () => floor + 2, start, end: stop, explode: [0, .056, 0]}, 'mechanism');
  }
  // Core planks, cut around the housing where they cross it.
  for (let i = 0; i < STRIPS; i++) {
    const through = i >= 5 && i <= 9;
    const cuts = [tipfill, ...(through ? housing : []), 1 - tipfill];
    for (let c = 0; c < cuts.length - 1; c++) {
      if (through && c === 1) continue;
      add({id: `core-${i}-${c}`, material: POPLAR.has(i) ? 'poplar' : 'paulownia', bounds: strip(i, STRIPS, 4), bottom: () => floor, top: ceiling, start: cuts[c], end: cuts[c + 1], explode: [0, .026, 0], vary: i}, 'core');
    }
  }
  for (const [id, start, end] of [['tipfill-nose', 0, tipfill], ['tipfill-tail', 1 - tipfill, 1]]) {
    add({id, material: 'tipfill', bounds: across(4), bottom: () => floor, top: ceiling, start, end, explode: [0, .026, 0]}, 'core');
  }
  for (const side of [-1, 1]) {
    add({id: `sidewall-${side}`, material: 'sidewall', bounds: rail(side, .1, 3.9), bottom: () => base + .2, top: s => s.thicknessMm - .45, explode: [side * .082, .016, 0]}, 'sidewall');
    add({id: `vds-${side}`, material: 'rubber', bounds: rail(side, .9, 4), bottom: () => ESTIMATES.edgeHeightMm - .15, top: () => ESTIMATES.edgeHeightMm + .1, explode: [side * .016, -.04, 0]}, 'edges');
    add({id: `edge-${side}`, material: 'steel', bounds: rail(side, 0, ESTIMATES.edgeWidthMm), bottom: () => 0, top: () => ESTIMATES.edgeHeightMm, explode: [side * .015, -.07, 0]}, 'edges');
  }
  add({id: 'bottom-glass', material: kindOf(build.bottom), bounds: across(), bottom: () => bottomGlass[0], top: () => bottomGlass[1], explode: [0, -.022, 0]}, 'glass');
  add({id: 'base', material: 'base', artwork: 'base', bounds: s => [-halfWidth(s, ESTIMATES.edgeWidthMm), halfWidth(s, ESTIMATES.edgeWidthMm)], bottom: () => 0, top: () => base, explode: [0, -.07, 0]}, 'base');
  return stack;
}

/** The legend for the Inside view, in stack order (top to bottom). */
export function proteusLayers({build, stopper, custom}) {
  const glass = build.top === build.bottom ? `${build.top.replace(' glass', '')}, top and bottom` : `${build.top.replace(' glass', '')} top · ${build.bottom.replace(' glass', '')} bottom`;
  return [
    {key: 'topsheet', name: 'PiO2 textured topsheet', spec: custom ? 'Your artwork, printed' : 'Your design, printed', about: 'Proteus prints every design, and custom art, on a textured PiO2 topsheet.', color: '#8a8f99'},
    {key: 'kevlar', name: 'Thru-Stitch Kevlar', spec: 'Sewn through glass and core', about: 'High-tenacity Kevlar thread stitched through the fiberglass and all the way through the core, a NASA-developed technique Proteus says makes the laminate several times stronger against delamination. Rows shown are illustrative.', color: '#d4a93c'},
    {key: 'glass', name: `${build.label} build glass`, spec: glass, about: `Full fiberglass sheets above and below the core, in the ${build.label} build’s weights. Glass weight, placement and fiber orientation are what separate the four builds.`, color: '#b9c3bd'},
    {key: 'carbon', name: 'Calculated carbon', spec: 'High modulus · binding to edge', about: 'Carbon reinforcements set at angles work in tension to add torsional rigidity and carry energy from each binding to the effective edge. Angles and widths shown are illustrative.', color: '#34363a'},
    {key: 'triax', name: '19 oz triax reinforcement', spec: 'Underfoot to the effective edge', about: 'Triaxial glass patches from underfoot out to the ends of the effective edge, for pop, durability and torsional stiffness where it counts. Every build has them.', color: '#9fb0a8'},
    {key: 'mechanism', name: 'Adjustable Camber', spec: stopper ? 'Patented mechanism · Snow Stopper fitted' : 'Patented · one screw per end', about: `A screw at the center sets each end: turning it with the included wrench pulls the nose or the tail up or down, from full camber to full rocker. Proteus doesn’t publish the internals; the housing, screws and tension members in sleeves drawn here are illustrative.${stopper ? ' The Snow Stopper, a tethered urethane plug, keeps snow out of the port.' : ''}`, color: '#a9afb5'},
    {key: 'core', name: 'Hybrid ultralight core', spec: 'Poplar, paulownia · UHMWPE tips', about: 'Continuous poplar planks under the bindings and along the sidewalls, ultralight paulownia everywhere else, and UHMWPE tipfill (over twice the impact strength of ABS) at the nose and tail.', color: '#d8c49a'},
    {key: 'sidewall', name: 'Polyurethane sidewalls', spec: 'Shock absorbing', about: 'Sidewalls that soak up vibration, chatter and heavy rail impacts, so the board doesn’t delaminate over time. Pulled out here so the core shows.', color: '#232428'},
    {key: 'base', name: 'ISO 7500 sintered base', spec: 'One piece', about: 'Among the fastest bases available, with better wax retention than extruded bases. One piece, so an impact can’t pop out a separate section, and a P-Tex candle handles repairs.', color: '#2d2e30'},
    {key: 'edges', name: 'Full-wrap edges · VDS rubber', spec: 'Traction points underfoot', about: 'Hardened steel with a polished, sharp finish wraps the whole board, with traction points underfoot for grip. Thin vulcanized rubber over the edges takes side impacts and chatter. Sizes shown are estimates.', color: '#c6cbcf'},
  ];
}
