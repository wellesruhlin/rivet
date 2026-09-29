// ON3P in the shared 3D studio: the traced shapes, native print textures, factory-label
// detail, layup layers and the Pivot binding, with the flagship configurator's wording.
import {CROPS, PAIR_LEFTS, SKI_LENGTH, SKI_WIDTH, assetUrl, cropLayer, printArt} from './art.js';
import {baseById, finishFor, layups, sidewallColor, topById} from './rules.js';
import {bindingFor} from './bindings.js';
import {configuredShape} from './geometry/configured.js';
import {constructionRecipe, on3pStack} from './geometry/construction.js';
import {constructionLayers} from './construction-legend.js';
import {createPrintDetails, factoryName, loadPrintFonts} from './print-detail.js';

// Each ski's texture is its own print area at native pixels: SKI_WIDTH × SKI_LENGTH of the
// original canvas, on the studio's dark ground.
const GROUND = '#0d0e10';
const pairLayers = (graphic, kind) => {
  const [left, right] = PAIR_LEFTS[kind];
  const layers = skiLeft => [{fill: GROUND}, cropLayer(printArt(graphic), CROPS.stage[kind], skiLeft)];
  return {left: layers(left), right: layers(right)};
};

export const model3d = {
  bindingModel: assetUrl('models/look-pivot-15.glb'),

  shape: config => configuredShape(config),

  surfaces(config) {
    const top = topById(config.top), base = baseById(config.base);
    return {
      key: `${config.top}|${config.base}`,
      top: pairLayers(top, 'top'),
      base: pairLayers(base, 'base'),
      finish: finishFor(top),
      sidewall: sidewallColor(config.sidewall),
      canvas: {widthMm: SKI_WIDTH, lengthMm: SKI_LENGTH, size: [SKI_WIDTH, SKI_LENGTH]},
    };
  },

  // Twelve 2027 designs carry a factory label and a specification label underfoot; they are
  // redrawn as sharp lettering over the artwork.
  details(config, ctx) {
    const top = topById(config.top);
    if (!factoryName(top.id) || !ctx.model) return null;
    const spec = ctx.spec;
    const print = {id: top.id, model: ctx.model.name, length: `${config.length} CM`, rocker: config.rocker,
      dimensions: spec ? `${spec.tip_mm} / ${spec.waist_mm} / ${spec.tail_mm} MM` : ''};
    return {
      key: JSON.stringify(print),
      src: printArt(top),
      ready: loadPrintFonts,
      paint: (image, {maxTextureSize}) => createPrintDetails(image, top.id, print, maxTextureSize),
    };
  },

  construction(config) {
    const wood = finishFor(topById(config.top)) === 'wood';
    const recipe = constructionRecipe(config.layup, wood);
    return {
      key: `${config.layup}|${wood}`,
      veneer: wood,
      stack: mesh => on3pStack(mesh.definition, recipe),
      legend: constructionLayers(recipe, {layup: config.layup, sidewall: config.sidewall}),
    };
  },

  binding(id) {
    const variant = bindingFor(id);
    if (!variant) return null;
    // The Pivot 13's composite toe is not modeled; it mounts the Pivot 15 model in black.
    const standIn = variant.product.id === 'pivot-13';
    return {key: variant.id, colorway: standIn ? 'Black' : variant.color, caption: standIn ? 'Pivot 13 · Pivot 15 model as stand-in' : `Pivot 15 · ${variant.color}`};
  },

  heading(config, ctx, {cameraView, sample, lengthChosen}) {
    if (sample || !ctx.model) return {eyebrow: '', title: 'Custom Skis', lines: [], finish: null};
    const layup = layups.find(option => option.id === config.layup);
    const lines = cameraView === 'construction'
      ? [`${layup.id} layup`, `${layup.description} ${layup.tradeoff}`]
      : [ctx.model.description, lengthChosen ? null : `${config.length} cm preview · choose your length`];
    const finish = cameraView === 'back' ? `${baseById(config.base).name} base` : cameraView === 'sidewall' ? `${config.sidewall} sidewalls` : null;
    return {eyebrow: config.category, title: ctx.model.name, lines, finish};
  },

  techSpecs(config, ctx) {
    const spec = ctx.spec;
    if (!spec) return null;
    return [
      ['Length', `${config.length} cm`],
      ['Sidecut', `${spec.tip_mm} / ${spec.waist_mm} / ${spec.tail_mm} mm`],
      ['Turn radius', `${spec.turn_radius_m} m`],
      ['Effective edge', `${spec.effective_edge_mm} mm`],
      ['Mount from center', `${spec.mount_from_center_cm} cm`],
      ['Stock weight', `${spec.weight_g.toLocaleString()} g / ski`],
    ];
  },
};
