// Device-local bag and comparison, shared by every page through useSyncExternalStore.
// Stock items keep the original concept's storage key and shape; custom builds are
// stored as validated configurations so they can be edited again later.
import {useSyncExternalStore} from 'react';
import {product} from '../catalog/index.js';
import {engine} from '../configurator/index.js';

const BAG_KEY = 'praxis-demo-bag';
const COMPARE_KEY = 'praxis-compare';
const MAX_QTY = 10;
const MAX_COMPARE = 3;

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

function validBag(items) {
  if (!Array.isArray(items)) return [];
  return items.flatMap(item => {
    if (item?.type === 'custom') {
      const config = engine.normalize(item.config ?? {});
      return engine.ready(config) ? [{type: 'custom', key: String(item.key), config, addedAt: item.addedAt}] : [];
    }
    const p = product(item?.id);
    return p && p.lengths.includes(item.size) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= MAX_QTY ? [{id: item.id, size: item.size, qty: item.qty}] : [];
  });
}

let state = {
  bag: validBag(read(BAG_KEY, [])),
  compare: (() => {
    const ids = read(COMPARE_KEY, []);
    return Array.isArray(ids) ? [...new Set(ids.filter(id => product(id)))].slice(0, MAX_COMPARE) : [];
  })(),
  storageFailed: false,
};
const listeners = new Set();

function set(next) {
  state = {...state, ...next};
  try {
    if ('bag' in next) localStorage.setItem(BAG_KEY, JSON.stringify(state.bag));
    if ('compare' in next) localStorage.setItem(COMPARE_KEY, JSON.stringify(state.compare));
  } catch {
    state = {...state, storageFailed: true};
  }
  listeners.forEach(listener => listener());
}

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const useStore = () => useSyncExternalStore(subscribe, () => state);

export const bagCount = bag => bag.reduce((n, item) => n + (item.type === 'custom' ? 1 : item.qty), 0);

export function addStock(id, size) {
  const p = product(id);
  if (!p || !p.lengths.includes(Number(size))) throw new Error('Choose one of the listed lengths.');
  const found = state.bag.find(item => item.id === id && item.size === Number(size));
  if (found && found.qty >= MAX_QTY) throw new Error('The demo bag allows up to 10 pairs per length.');
  set({bag: found ? state.bag.map(item => (item === found ? {...item, qty: item.qty + 1} : item)) : [...state.bag, {id, size: Number(size), qty: 1}]});
  return {model: p.name, length: Number(size)};
}

export function addCustom(config) {
  const key = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  set({bag: [...state.bag, {type: 'custom', key, config: engine.normalize(config), addedAt: new Date().toISOString()}]});
  return key;
}

export const updateCustom = (key, config) => set({bag: state.bag.map(item => (item.type === 'custom' && item.key === key ? {...item, config: engine.normalize(config)} : item))});
export const customItem = key => state.bag.find(item => item.type === 'custom' && item.key === key);

export const setQuantity = (index, qty) => set({bag: state.bag.map((item, i) => (i === index ? {...item, qty: Math.min(MAX_QTY, Math.max(1, qty))} : item))});
export const removeItem = index => set({bag: state.bag.filter((_, i) => i !== index)});

export function toggleCompare(id) {
  if (!product(id)) return 'unknown';
  if (state.compare.includes(id)) {
    set({compare: state.compare.filter(x => x !== id)});
    return 'removed';
  }
  if (state.compare.length >= MAX_COMPARE) return 'full';
  set({compare: [...state.compare, id]});
  return 'added';
}
export const clearCompare = () => set({compare: []});

// Estimated totals: stock prices plus custom reference prices and quote ranges.
export function bagTotals(bag) {
  let amount = 0;
  let quote = null;
  for (const item of bag) {
    if (item.type === 'custom') {
      const total = engine.total(item.config);
      amount += total.amount;
      if (total.quote) quote = [(quote?.[0] ?? 0) + total.quote[0], (quote?.[1] ?? 0) + total.quote[1]];
    } else amount += product(item.id).price * item.qty;
  }
  return {amount, quote};
}
