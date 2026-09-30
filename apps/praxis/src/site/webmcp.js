// Optional, feature-detected browser tools (WebMCP) for agents that browse the site.
// They read the catalog, open pages and stage the device-local bag; nothing can purchase.
import {product, products, search} from '@arc/brand-praxis/catalog';
import {addStock} from './store.js';

export function registerBrowserTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  addEventListener('pagehide', () => lifecycle.abort(), {once: true});
  const register = tool => {
    try {
      context.registerTool(tool, {signal: lifecycle.signal});
    } catch (error) {
      console.info('Optional browser tools unavailable:', error.message);
    }
  };
  register({
    name: 'praxis_catalog',
    title: 'Explore the Praxis ski catalog',
    description: 'Read snapshot prices and catalog lengths. This is not live inventory.',
    inputSchema: {type: 'object', properties: {query: {type: 'string'}}, additionalProperties: false},
    annotations: {readOnlyHint: true},
    execute({query = ''} = {}) {
      if (typeof query !== 'string') throw new Error('Query must be text.');
      return (query ? search(query) : products).map(({id, name, price, lengths, terrain, source}) => ({id, name, price, lengths, terrain, source}));
    },
  });
  register({
    name: 'praxis_view_ski',
    title: 'Open a ski detail page',
    description: 'Navigate to a catalog ski. Does not add to the bag or purchase.',
    inputSchema: {type: 'object', properties: {id: {type: 'string'}}, required: ['id'], additionalProperties: false},
    annotations: {readOnlyHint: true},
    execute({id}) {
      if (!product(id)) throw new Error('Unknown ski.');
      location.hash = `/skis/${id}`;
      return {view: id};
    },
  });
  register({
    name: 'praxis_stage_demo_bag',
    title: 'Add a ski to the demo bag',
    description: 'Stage a catalog ski and length in the device-local bag. Does not reserve inventory, transfer a real cart, order or pay.',
    inputSchema: {type: 'object', properties: {id: {type: 'string'}, length: {type: 'integer'}}, required: ['id', 'length'], additionalProperties: false},
    execute: ({id, length}) => addStock(id, length),
  });
}
