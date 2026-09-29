import bpy, json, runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/on3p-ski-construction.blend'))
collections=[c for c in bpy.data.collections if c.name.startswith('Inside /')]
assert len(collections)==6
results=[]
for collection in collections:
    control=next(o for o in collection.objects if 'separation' in o)
    top=next(o for o in collection.objects if o.get('layer_id')=='topsheet')
    bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
    assert abs(top.location.z)<1e-7
    bpy.context.scene.frame_set(55);bpy.context.view_layer.update()
    assert abs(top.location.z-.176)<1e-7
    assert collection.asset_data is not None
    assert all(len(o.data.uv_layers)==1 for o in collection.objects if o.type=='MESH')
    results.append({'layup':control['layup'],'animatedTopSeparationMeters':top.location.z,'layerCount':sum(o.type=='MESH' for o in collection.objects)})
runpy.run_path(str(ROOT/'scripts/blender_controls.py'),run_name='__main__')
s=bpy.context.scene;s.on3p_model='woodsman-108';s.on3p_length='181';s.on3p_inside=True;s.on3p_layup='Tour';s.on3p_separation=.5
assert bpy.ops.on3p.generate()=={'FINISHED'}
collection=bpy.data.collections['ON3P Parametric Preview'];root=next(o for o in collection.objects if 'separation' in o)
assert root['layup']=='Tour' and root['lengthMm']==1810 and root['model']=='woodsman-108'
s.on3p_separation=.8;bpy.context.view_layer.update()
top=next(o for o in collection.objects if o.get('layer_id')=='topsheet')
assert abs(top.location.z-.176*.8)<1e-7
assert any(o.get('material_role')=='paulownia' for o in collection.objects)
assert any(o.get('material_role')=='mounting' for o in collection.objects)
assert not any(o.get('material_role')=='scalium' for o in collection.objects)
report={'passed':True,'savedAssets':results,'regeneratedModel':'Woodsman 108 / 181 cm / Tour','liveSeparationControl':True,'nonDestructiveVerification':True}
(ROOT/'data/construction-blender-check.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
