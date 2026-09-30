import {formatMoney} from '@arc/configurator/engine';
import {products} from './products.js';
import {stockCovers} from './covers.js';
import {chartFor, specAt} from './specs.js';

export {products, specAt, chartFor};

const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const asset = path => `${base}${path}`;

// Whole dollars print without cents; binding prices such as $499.95 keep them.
export const money = n => formatMoney(n, 'USD');
export const priceLabel = p => `${p.priceFrom ? 'From ' : ''}${money(p.price)}`;

export const terrains = ['All mountain', 'Powder', 'Touring', 'Carving'];
const byId = new Map(products.map(p => [p.id, p]));
export const product = id => byId.get(id);

export const photoUrl = file => asset(`photos/${file}`);
export const cover = id => ({src: asset(`art/stock/${id}.webp`), kind: stockCovers[id]?.kind ?? 'full'});
export const detailUrl = name => asset(`art/details/${name}.webp`);

// A model's published chart summarized across its lengths.
export function summary(id) {
  const chart = chartFor(id);
  if (!chart) return null;
  const rows = chart.lengths.map(length => specAt(id, length));
  const range = field => {
    const values = rows.map(row => row[field]);
    const [min, max] = [Math.min(...values), Math.max(...values)];
    return min === max ? `${min}` : `${min}–${max}`;
  };
  const constant = ['tip', 'waist', 'tail'].every(field => new Set(rows.map(row => row[field])).size === 1);
  return {
    dims: constant ? `${rows[0].tip}-${rows[0].waist}-${rows[0].tail}` : null,
    dimsRange: constant ? `${rows[0].tip} / ${rows[0].waist} / ${rows[0].tail}` : `${range('tip')} / ${range('waist')} / ${range('tail')}`,
    waist: range('waist'),
    radius: range('radius'),
    weight: range('weight'),
    lengths: chart.lengths,
    year: chart.year,
  };
}

// The waist a card should show: published chart, else the catalog's own figure.
export const waistOf = p => summary(p.id)?.waist ?? p.waist ?? null;

export function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(p => [p.name, p.terrain.join(' '), p.veneer, p.tagline, p.description, p.core].join(' ').toLowerCase().includes(q));
}
