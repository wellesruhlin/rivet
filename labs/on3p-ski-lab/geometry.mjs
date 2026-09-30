// The lab's canonical mesh: meters, X across, Y up, +Z nose; input dimensions in mm.
// The kernel lives in @arc/ski-geometry and is shared with the Arc configurators and
// Fall Line. Blender consumes the exported vertices/faces/UVs; it never recreates the shape.
// In the browser the lab page maps @arc/ski-geometry with an import map (see index.html).
import {generateTracedMesh} from '@arc/ski-geometry/traced';
export {sample, resolve, widthAt, heightAt, thicknessAt, TRACED_SURFACES as SURFACES} from '@arc/ski-geometry/traced';

export const generateMesh = (model, d, {segments = 360, side = 0} = {}) => generateTracedMesh(model, d, {segments, side});
