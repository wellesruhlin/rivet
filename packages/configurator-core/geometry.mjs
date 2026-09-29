// Serializable Y-up, meter-based mesh contract; no Three.js or Blender dependency.
export function boxMesh(size, center = [0,0,0], {grain = 'x', offset = 0} = {}) {
  const [x,y,z] = size.map(n => n / 2);
  const positions = [[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].map(p => p.map((v,i) => v+center[i]));
  const faces = [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];
  // Physical texture coordinates keep grain scale stable when dimensions change.
  const uvs = faces.map((face, fi) => face.map(i => {
    const p = positions[i];
    if (grain === 'y') return [(fi < 2 ? p[0] : p[2]) / .32 + offset, p[1] / 1.5];
    if (grain === 'z') return [(fi >= 4 ? p[0] : p[1]) / .32 + offset, p[2] / 1.5];
    return [(fi >= 4 ? p[2] : p[1]) / .32 + offset, p[0] / 1.5];
  }));
  return {positions, faces, uvs};
}
export function inspectScene(scene) {
  const ids = new Set();
  for (const part of scene.parts) {
    if (ids.has(part.id)) throw new Error(`Duplicate part ${part.id}`); ids.add(part.id);
    if (!part.mesh.positions.every(p => p.length===3 && p.every(Number.isFinite))) throw new Error(`Invalid vertices: ${part.id}`);
    if (!part.mesh.faces.every(face => face.length>=3 && face.every(i => Number.isInteger(i) && i>=0 && i<part.mesh.positions.length))) throw new Error(`Invalid faces: ${part.id}`);
    if (part.mesh.uvs.length !== part.mesh.faces.length || !part.mesh.uvs.every((uv,i) => uv.length===part.mesh.faces[i].length && uv.every(p=>p.length===2 && p.every(Number.isFinite)))) throw new Error(`Invalid UVs: ${part.id}`);
  }
  return {parts: ids.size, vertices: scene.parts.reduce((sum,p)=>sum+p.mesh.positions.length,0)};
}

export function beveledBoxMesh(size, center=[0,0,0], {radius=.0008,grain='x',offset=0}={}) {
  const basic=boxMesh(size,[0,0,0],{grain,offset});
  const half=size.map(v=>v/2), r=Math.min(radius,...half.map(v=>v*.4));
  const positions=[],faces=[],uvs=[],normals=[];
  for(let fi=0;fi<basic.faces.length;fi++) {
    const [a,b,,d]=basic.faces[fi].map(i=>basic.positions[i]);
    const ulen=Math.hypot(...b.map((v,i)=>v-a[i])),vlen=Math.hypot(...d.map((v,i)=>v-a[i]));
    const us=[0,r/ulen,1-r/ulen,1],vs=[0,r/vlen,1-r/vlen,1],start=positions.length;
    for(const v of vs)for(const u of us) {
      const raw=a.map((n,i)=>n+(b[i]-n)*u+(d[i]-n)*v);
      const inner=raw.map((n,i)=>Math.max(-half[i]+r,Math.min(half[i]-r,n)));
      const delta=raw.map((n,i)=>n-inner[i]),len=Math.hypot(...delta);
      const normal=delta.map(n=>n/len);normals.push(normal);
      positions.push(inner.map((n,i)=>n+normal[i]*r+center[i]));
    }
    for(let v=0;v<3;v++)for(let u=0;u<3;u++) {
      const k=start+v*4+u,face=[k,k+1,k+5,k+4];faces.push(face);
      uvs.push(face.map(i=>{const p=positions[i]; if(grain==='y')return [(fi<2?p[0]:p[2])/.32+offset,p[1]/1.5];if(grain==='z')return [(fi>=4?p[0]:p[1])/.32+offset,p[2]/1.5];return [(fi>=4?p[2]:p[1])/.32+offset,p[0]/1.5];}));
    }
  }
  return {positions,faces,uvs,normals};
}
