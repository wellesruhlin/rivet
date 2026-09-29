// This package is dependency-free: the browser, HTTP service and asset tools use
// the same contract. Product knowledge belongs in adapters, never in this module.
export class ConfigurationError extends Error {
  constructor(issues) { super(issues.map(i => i.message).join(' ')); this.name = 'ConfigurationError'; this.issues = issues; }
}
const issue = (field, message) => ({field, message});
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function applyConfigurationPatch({previous, patch, normalize, prepare = (before, update) => ({...before, ...update})}) {
  if (!plain(previous) || !plain(patch)) throw new ConfigurationError([issue('configuration', 'Configuration must be an object.')]);
  return normalize(prepare(previous, patch));
}
export const invalidateSteps = (before, after, reviewed, stepFields) => reviewed.filter(step => !stepFields[step]?.some(key => before[key] !== after[key]));
export const encodeFields = fields => new URLSearchParams(Object.entries(fields).map(([key, value]) => [key, String(value ?? '')])).toString();
export function totalMinor(lines) {
  let total = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.amountMinor)) throw new TypeError('Prices must use integer minor units.');
    total += line.amountMinor;
    if (!Number.isSafeInteger(total)) throw new RangeError('Price exceeds safe range.');
  }
  return total;
}
export function formatMoney(amountMinor, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {style:'currency', currency, maximumFractionDigits: amountMinor % 100 ? 2 : 0}).format(amountMinor / 100);
}
export function defineProduct(adapter) {
  for (const key of ['id', 'version', 'defaults', 'normalize', 'validate', 'price', 'describe']) if (!adapter[key]) throw new TypeError(`Product adapter requires ${key}.`);
  const keys = new Set(Object.keys(adapter.defaults));
  function normalize(input = {}) {
    if (!plain(input)) throw new ConfigurationError([issue('configuration', 'Configuration must be an object.')]);
    const unknown = Object.keys(input).filter(key => !keys.has(key));
    if (unknown.length) throw new ConfigurationError(unknown.map(key => issue(key, `Unknown option: ${key}.`)));
    // Adapters own dependent defaults (for example, model-specific stock art).
    // Pre-filling defaults here erases the distinction between omitted and chosen.
    const config = adapter.normalize({...input});
    const issues = adapter.validate(config);
    if (issues.length) throw new ConfigurationError(issues);
    return config;
  }
  const product = {
    id: adapter.id, version: String(adapter.version), title: adapter.title || adapter.id,
    defaults: Object.freeze({...adapter.defaults}), normalize,
    change(previous, patch) {
      if (!plain(patch)) throw new ConfigurationError([issue('configuration', 'Changes must be an object.')]);
      const unknown = Object.keys(patch).filter(key => !keys.has(key));
      if (unknown.length) throw new ConfigurationError(unknown.map(key => issue(key, `Unknown option: ${key}.`)));
      const config = applyConfigurationPatch({previous, patch, normalize, prepare: adapter.prepare});
      return {config, changes: Object.keys(config).filter(key => previous[key] !== config[key]).map(field => ({field, before: previous[field], after: config[field]}))};
    },
    evaluate(input) {
      const config = normalize(input);
      const price = adapter.price(config);
      if (!['reference', 'requires-quote', 'incomplete'].includes(price.status)) throw new TypeError('Unsupported price status.');
      if (!/^[A-Z]{3}$/.test(price.currency)) throw new TypeError('Currency must use an ISO code.');
      const quote = {...price, totalMinor: price.status === 'reference' ? totalMinor(price.lines) : null};
      return {productId: adapter.id, productVersion: String(adapter.version), config, quote, specification: adapter.describe(config)};
    },
    scene(input) {
      if (!adapter.scene) throw new Error('This product has no scene adapter.');
      return adapter.scene(normalize(input));
    },
  };
  return Object.freeze(product);
}
export function encodeConfiguration(product, input) {
  return new URLSearchParams({product: product.id, v: product.version, config: JSON.stringify(product.normalize(input))}).toString();
}
export function decodeConfiguration(product, encoded) {
  if (typeof encoded !== 'string' || encoded.length > 16000) throw new ConfigurationError([issue('link', 'This build link is invalid or too large.')]);
  const params = new URLSearchParams(encoded);
  if (params.get('product') !== product.id || params.get('v') !== product.version) throw new ConfigurationError([issue('link', 'This build belongs to a different product or catalog version.')]);
  try { return product.normalize(JSON.parse(params.get('config'))); }
  catch (error) { if (error instanceof ConfigurationError) throw error; throw new ConfigurationError([issue('link', 'This build link could not be read.')]); }
}
export function createSnapshot(product, input, {id, createdAt = new Date().toISOString()} = {}) {
  if (!id) throw new TypeError('Snapshot requires an identifier.');
  return {schemaVersion: 1, id, createdAt, purpose: 'independent-demo-build', ...structuredClone(product.evaluate(input)), orderPlaced: false};
}
