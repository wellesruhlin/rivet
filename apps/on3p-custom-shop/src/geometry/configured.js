import references from './on3p.json' with {type: 'json'};
import {resolve, sample, generateTracedMesh as generateMesh} from '@rivet/ski-geometry/traced';

const models = new Map(references.models.map(model => [model.handle, model]));
export const supportedModels = references.models.map(model => model.name);

// This is a family-level estimate, not a traced custom Ripper mold. ON3P's
// Jeffrey 92 description publishes these relative changes from Signature:
// https://www.on3pskis.com/products/jeffrey-92 (checked 2026-09-24).
export function ripperEstimate(profile) {
  const [a, b] = profile.contactU;
  const extra = (b - a) * .1;
  const remaining = a + 1 - b;
  const na = a - extra * a / remaining;
  const nb = b + extra * (1 - b) / remaining;
  const heightMm = profile.heightMm.map((_, i, values) => {
    const u = i / (values.length - 1);
    const oldU = u < na ? u * a / na : u > nb ? b + (u - nb) * (1 - b) / (1 - nb) : a + (u - na) * (b - a) / (nb - na);
    return sample(profile.heightMm, oldU) * (u < na || u > nb ? .85 : 1.25);
  });
  return {...profile, contactU: [na, nb], heightMm, tipRiseMm: profile.tipRiseMm * .85, tailRiseMm: profile.tailRiseMm * .85, camberMm: profile.camberMm * 1.25};
}

export function configuredGeometry(config) {
  const source = models.get(config.model);
  if (!source || !source.lengths.some(size => size.length_cm === config.length)) return null;
  const light = config.layup === 'LITE' || config.layup === 'Tour';
  const model = {
    ...source,
    profile: config.rocker === 'Ripper' ? ripperEstimate(source.profile) : source.profile,
    construction: {...source.construction, baseThicknessMm: light ? 1.4 : 1.8, steelWidthMm: light ? 2.2 : 2.5, steelHeightMm: light ? 2 : 2.5},
  };
  return {model, definition: resolve(model, config.length), rocker: config.rocker === 'Ripper' ? 'Ripper estimate' : source.rocker};
}

// Preserve the configurator's print-canvas registration. A constant horizontal
// scale clips artwork to the physical outline instead of stretching every row
// to the edge. Top and base have opposite handedness when viewed nose-up.
export function configuredMesh(resolved) {
  const mesh = generateMesh(resolved.model, resolved.definition);
  const fullWidth = Math.max(resolved.definition.tipMm, resolved.definition.tailMm);
  mesh.uvs = mesh.faces.map((face, fi) => face.map(id => {
    const section = mesh.sections[Math.floor(id / mesh.ringSize)];
    if (!section) return [.5, .5];
    const x = mesh.positions[id][0] * 1000 / fullWidth;
    return [.5 + (mesh.materials[fi] === 1 ? x : -x), 1 - section.u];
  }));
  return mesh;
}
