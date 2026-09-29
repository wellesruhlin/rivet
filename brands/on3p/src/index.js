// The ON3P brand on the shared engine: the engine itself plus the rule names Maker
// Studio, the art scripts and the tests import. Node-safe (no JSX, no DOM at import time).
import {createEngine} from '@rivet/configurator/engine';
import pack from './pack.js';

export const engine = createEngine(pack);
export {pack};
export * from './rules.js';
export {bindingCatalog, bindingFor, bindingLabel, bindingFit, bindingPrice, bindingAllowed} from './bindings.js';
export {estimateWeight} from './pack.js';

export const defaultConfig = engine.defaults();
export const normalizeConfig = engine.normalize;
export const applyConfigChange = engine.apply;
export const shapeReady = engine.ready;
export const bomLines = engine.bom;
export const totalPrice = config => engine.total(config).amount;
export const buildText = engine.text;
export const encodeConfig = engine.encode;
export const decodeConfig = text => engine.decode(text).config;
export const invalidateReviews = engine.invalidateReviews;
export {filterGraphics, visibleGraphics} from './gallery.js';
export const decodeBuild = engine.decode;
