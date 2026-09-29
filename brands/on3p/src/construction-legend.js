import {sidewallColor} from './rules.js';

// Legend dot colors, one per layer group; the sidewall dot shows the chosen color.
const DOTS = {topsheet: '#739493', composite: '#b7c2b8', binding: '#e8e5ce', insert: '#b0bdb5', core: '#d1a257', rubber: '#565a5e', base: '#898c8d', edges: '#c6cbcf'};

// Descriptions for the exploded construction view, in stack order (top to bottom).
// Keys match LAYER_KEYS in geometry/construction.js. Wording follows ON3P's
// layup descriptions (config.js) and the construction generator's published details;
// internal thicknesses and placements in the 3D view remain illustrative.
export function constructionLayers(recipe, {layup, sidewall}) {
  const insert = recipe.metal
    ? layup === 'Leaf Spring'
      ? {name: 'Scalium insert · Leaf Spring', spec: 'Scalium through the running length', about: 'Metal support under your feet adds damping and power, while the tip and tail stay bamboo and playful. Adds 75–100 g per ski.'}
      : {name: 'Scalium insert · Torsion Bar', spec: 'Narrow Scalium bar into the rocker', about: 'The metal reaches into the tip and tail for more edge hold and stability at speed, trading some low-speed playfulness. Adds 75–100 g per ski.'}
    : recipe.hybrid
      ? {name: 'Bamboo mounting plate', spec: 'Solid bamboo plate underfoot', about: 'The lighter hybrid core gets a solid bamboo plate right where the binding screws go, for screw retention.'}
      : {name: 'No insert', spec: `${layup} is full bamboo`, about: 'No metal or mounting plate in this layup; the full bamboo core carries the binding. Choose Leaf Spring or Torsion Bar to add Scalium.', empty: true};
  return withDots([
    {key: 'topsheet', ...(recipe.wood
      ? {name: 'Wood cover', spec: 'Wood veneer · satin finish', about: 'A real wood cover in place of a printed graphic, sealed with a satin finish.'}
      : {name: 'Textured topsheet', spec: 'ISOSPORT 8210 · Pi19 texture', about: 'The outer skin that carries your graphic. The Pi19 texture resists scratches and chips and sheds snow.'})},
    {key: 'composite', name: '2800 hybrid composite', spec: 'Fiberglass + carbon · above and below the core', about: 'Glass-and-carbon laminate on both faces of the core. With the core, it sets the flex, torsional grip and rebound.'},
    {key: 'binding', name: 'Binding reinforcement', spec: 'Full-width fiberglass · 45/45 + chopped mat', about: 'Extra glass through the mount zone spreads binding loads and gives the screws more to hold.'},
    {key: 'insert', ...insert},
    {key: 'core', ...(recipe.hybrid
      ? {name: 'Hybrid wood core', spec: 'Bamboo / paulownia', about: 'Bamboo stringers (the darker strips) with light paulownia between them: bamboo where strength matters, paulownia to cut weight for climbing.'}
      : {name: 'Bamboo core', spec: 'Vertically laminated bamboo', about: 'Strips of vertically laminated bamboo run tip to tail. Bamboo is the core of the ON3P feel: durable, damp and lively.'})},
    {key: 'sidewall', name: 'UHMW sidewalls', spec: `${sidewall} · full length, full height`, about: 'Ultra-high-molecular-weight polyethylene on each side absorbs impacts and seals the core. Pulled out here so the core shows.'},
    {key: 'rubber', name: 'VDS bonding rubber', spec: 'Three strips along each side', about: 'Thin rubber laid along the edges quiets vibration and helps the steel bond into the laminate. Placement is estimated.'},
    {key: 'base', name: `${recipe.baseMm} mm sintered base`, spec: 'Durasurf 4001 · your base graphic', about: `Sintered polyethylene holds wax, so it runs fast and wears well.${recipe.light ? ' This layup uses the thinner 1.4 mm base to save weight.' : ''}`},
    {key: 'edges', name: 'Steel edges', spec: `${recipe.edgeWidthMm} × ${recipe.edgeHeightMm} mm · HRC 48`, about: `Hardened steel wraps the base for grip on hard snow.${recipe.light ? ' The slimmer 2.2 × 2.0 mm edge saves weight.' : ' Stock-size edges for repeated seasons.'}`},
  ], sidewall);
}

const withDots = (entries, sidewall) => entries.map(entry => ({...entry, color: entry.key === 'sidewall' ? sidewallColor(sidewall) : DOTS[entry.key]}));
