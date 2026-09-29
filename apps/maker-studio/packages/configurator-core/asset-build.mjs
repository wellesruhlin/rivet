// Immutable physical product releases complement commercial createSnapshot().
// Product adapters validate selections; price, inventory and timestamps stay out
// of this payload so a retail update cannot alter an owned or saved object.
export const ASSET_BUILD_SCHEMA = 'maker/resolved-asset-build@1';
const plain = value => value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 200;

export function canonicalAssetJSON(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalAssetJSON).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalAssetJSON(value[key])}`).join(',')}}`;
  throw new TypeError('Asset builds contain only finite JSON values; preserve unknown properties as null.');
}

export async function assetDigest(value) {
  const bytes = new TextEncoder().encode(canonicalAssetJSON(value));
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}

const relativeResource = path => typeof path === 'string' && path.length <= 500
  && !/[:\\?#%\u0000-\u001f]/.test(path) && !path.startsWith('/')
  && path.split('/').every(part => part && part !== '.' && part !== '..');
function inspect(payload) {
  if (payload.schema !== ASSET_BUILD_SCHEMA || !id(payload.productId) || !id(payload.productVersion) || !id(payload.resolverRevision))
    throw new TypeError('Asset build requires supported schema, product, product version and resolver revision.');
  if (!plain(payload.selection) || !plain(payload.properties) || !Array.isArray(payload.components) || !payload.components.length || !Array.isArray(payload.resources))
    throw new TypeError('Asset build requires selection, physical properties, components and resources.');
  const componentIds = new Set();
  for (const component of payload.components) {
    if (!plain(component) || !id(component.id) || !id(component.revision) || !sha(component.sourceSha256) || componentIds.has(component.id))
      throw new TypeError('Every component requires a unique identity, revision and source digest.');
    componentIds.add(component.id);
  }
  const resourcePaths = new Set();
  for (const resource of payload.resources) {
    if (!plain(resource) || !relativeResource(resource.path) || !id(resource.mimeType) || !sha(resource.sha256)
      || !Number.isSafeInteger(resource.bytes) || resource.bytes < 0 || resourcePaths.has(resource.path))
      throw new TypeError('Resources require unique portable relative paths, byte counts, MIME types and SHA-256 digests.');
    resourcePaths.add(resource.path);
  }
  canonicalAssetJSON(payload);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export async function createAssetBuild({product, resolverRevision, selection, components, resources, properties = {}}) {
  const payload = structuredClone({schema: ASSET_BUILD_SCHEMA, productId: product.id,
    productVersion: String(product.version), resolverRevision, selection, components, resources, properties});
  inspect(payload);
  return freeze({...payload, contentSha256: await assetDigest(payload)});
}

export async function readAssetBuild(input, {productId, supportedRevisions} = {}) {
  const build = typeof input === 'string' ? JSON.parse(input) : structuredClone(input);
  if (!plain(build)) throw new TypeError('Asset build must be an object.');
  const {contentSha256, ...payload} = build;
  inspect(payload);
  if (!sha(contentSha256) || await assetDigest(payload) !== contentSha256) throw new Error('Asset build content digest does not match.');
  if (productId && payload.productId !== productId) throw new Error('Asset build belongs to a different product.');
  if (supportedRevisions && !supportedRevisions.includes(payload.resolverRevision)) throw new Error('This saved asset resolver revision is unsupported; it has not been upgraded.');
  return freeze(build);
}
