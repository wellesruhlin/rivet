"""Read-only export verification, followed by an in-memory panel regeneration test."""
import bpy, json, runpy
from pathlib import Path
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1]
results=[]
for handle in ['jeffrey-106','woodsman-108','jeffrey-112']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'blender'/f'{handle}-186.glb'))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert len(objects)==2
    for obj in objects:
        assert len(obj.data.materials)==4
        assert len(obj.data.uv_layers)>=1
        # glTF material seams split vertices. Check all imported local coordinates
        # against the same rotated canonical source, without requiring vertex order.
        side='left' if 'left' in obj.name.lower() else 'right'
        source=json.loads((ROOT/'meshes'/f'{handle}-186-{side}.json').read_text())
        tree=KDTree(len(source['positions']))
        for index,(x,y,z) in enumerate(source['positions']):tree.insert((x,-z,y),index)
        tree.balance()
        distances=[tree.find(v.co)[2] for v in obj.data.vertices]
        assert max(distances)<1e-6,(handle,max(distances))
        reverse=KDTree(len(obj.data.vertices))
        for index,v in enumerate(obj.data.vertices):reverse.insert(v.co,index)
        reverse.balance()
        assert max(reverse.find((x,-z,y))[2] for x,y,z in source['positions'])<1e-6
        results.append({'model':handle,'side':side,'canonicalVertexSetMatches':True,'maxErrorMeters':max(distances),'materialSlots':4,'uvLayers':len(obj.data.uv_layers)})
bpy.ops.wm.read_factory_settings(use_empty=True)
runpy.run_path(str(ROOT/'scripts/blender_controls.py'),run_name='__main__')
assert bpy.ops.on3p.generate()=={'FINISHED'}
coll=bpy.data.collections['ON3P Parametric Preview'];assert len(coll.objects)==2
bpy.context.scene.on3p_custom=True;bpy.context.scene.on3p_waistMm=112
assert bpy.ops.on3p.generate()=={'FINISHED'}
assert len(coll.objects)==2
assert all(o['waistMm']==112 for o in coll.objects)
(ROOT/'data/export-verification.json').write_text(json.dumps({'passed':True,'glbRoundTrips':results,'blenderPanelRegenerates':True,'changedWaistMm':112},indent=2))
print('PASS: three GLB pair roundtrips and Blender panel dimension regeneration')
