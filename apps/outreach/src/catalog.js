// The makers in the outreach review, each a brand pack under brands/, in hub order.
import {brand as folsom} from '@rivet/brand-folsom';
import {brand as meier} from '@rivet/brand-meier';
import {brand as grass} from '@rivet/brand-grass-sticks';
export {colors,title} from '@rivet/brand-grass-sticks';
// Brand artwork is served at brands/<id>/ from each pack's public folder (vite.config.js).
export const asset=path=>`${import.meta.env?.BASE_URL||'./'}brands/${path}`;
export const brands={folsom,meier,grass};
export const observed='2026-09-26';
