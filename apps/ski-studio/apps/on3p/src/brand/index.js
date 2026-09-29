// ON3P engine plus the helper names the configuration tests have always used.
import {createEngine} from '@ski-studio/configurator/engine';
import pack, {canRipper, catalog, categories, compatibility, estimateWeight, graphicCategory} from './pack.js';

export const engine = createEngine(pack);
export {pack, canRipper, catalog, categories, compatibility, estimateWeight};

export const defaultConfig = engine.defaults();
export const normalizeConfig = engine.normalize;
export const applyConfigChange = engine.apply;
export const shapeReady = engine.ready;
export const rulesFor = config => compatibility.models[config.model];
export const bomLines = engine.bom;
export const totalPrice = config => engine.total(config).amount;
export const encodeConfig = engine.encode;
export const decodeBuild = engine.decode;
export const decodeConfig = text => engine.decode(text).config;
export const buildText = engine.text;
export const invalidateReviews = engine.invalidateReviews;
export const visibleGraphics = (list, search = '', filter = 'All', limit = 12) =>
  list.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase()) && (filter === 'All' || graphicCategory(g) === filter)).slice(0, limit);
