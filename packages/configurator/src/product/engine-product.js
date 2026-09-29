// A configurator engine as an order-side product: the same normalization, dependency
// rules and build sheet the customer saw become the product's validation, change and
// price contract. Every brand pack gets quoting, snapshots and maker handoff this way.
import {defineProduct} from './index.mjs';

/**
 * @param engine  createEngine(pack)
 * @param options {id, version, title, source, observed, notice, currency?, scene?, validate?}
 */
export function engineProduct(engine, {id, version, title, source, observed, notice, currency = engine.pack.currency ?? 'USD', scene, validate = () => []}) {
  const lines = config => engine.bom(config).map(line => ({id: line.key, label: line.label, amountMinor: Math.round(line.price * 100), quantity: 1}));
  return defineProduct({
    id,
    version: String(version),
    title,
    defaults: engine.defaults(),
    normalize: engine.normalize,
    prepare: engine.prepare,
    validate,
    price: config => ({currency, status: engine.ready(config) ? 'reference' : 'incomplete', source, observed, lines: lines(config), notice}),
    describe: config => engine.bom(config).map(line => ({label: line.label, value: line.value})),
    scene,
  });
}
