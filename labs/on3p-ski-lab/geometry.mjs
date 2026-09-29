// The lab's canonical mesh: meters, X across, Y up, +Z nose; input dimensions in mm.
// The kernel lives in @rivet/ski-geometry and is shared with the Rivet configurators and
// Fall Line. Blender consumes the exported vertices/faces/UVs; it never recreates the shape.
// In the browser the lab page maps @rivet/ski-geometry with an import map (see index.html).
import {generateTracedMesh} from '@rivet/ski-geometry/traced';
export {sample, resolve, widthAt, heightAt, thicknessAt, TRACED_SURFACES as SURFACES} from '@rivet/ski-geometry/traced';

export const generateMesh = (model, d, {segments = 360, side = 0} = {}) => generateTracedMesh(model, d, {segments, side});
