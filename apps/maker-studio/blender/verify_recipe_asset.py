"""Verify a real browser-saved recipe/build round trip through Blender."""
import bpy
import json
import importlib.util
from pathlib import Path
from mathutils import Vector
project=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('recipe_controls',project/'blender/recipe_controls.py')
bridge=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
bridge.register()
result=bpy.ops.recipe.import_json(filepath=str(project/'reference/example-bistro-recipe.json'))
assert result=={'FINISHED'}
result=bpy.ops.recipe.import_json(filepath=str(project/'reference/example-bistro-build.json'))
assert result=={'FINISHED'}
snapshot=json.loads((project/'reference/example-bistro-build.json').read_text())
data=bridge.manifest(snapshot['config'])
root=bpy.data.objects[bridge.ROOT]
assert root['product_id']==snapshot['productId']
assert root['product_version']==snapshot['productVersion']
assert root['length_in']==42.25 and root['height_in']==30
assert root['finish']=='walnut' and root['base_finish']=='matte-black'
coord=bridge.bridge_module().vector
error=0
for part in data['parts']:
    obj=bpy.data.objects[part['id']]
    for vertex,expected in zip(obj.data.vertices,part['mesh']['positions']):
        error=max(error,(vertex.co-Vector(coord(expected))).length)
assert error<1e-6
# An old-version build must fail without changing the current model.
wrong={**snapshot,'productVersion':'does-not-exist'}
path=project.parent.parent/'work/product-studio/wrong-version-build.json'
path.write_text(json.dumps(wrong))
try:
    result=bpy.ops.recipe.import_json(filepath=str(path))
    assert result=={'CANCELLED'}
except RuntimeError as e:
    assert 'matching product recipe/version' in str(e)
assert bpy.data.objects[bridge.ROOT]['length_in']==42.25
report={'browserBuildId':snapshot['id'],'productId':root['product_id'],'version':root['product_version'],'dimensionsIn':[root['length_in'],root['width_in'],root['height_in']],'finish':root['finish'],'baseFinish':root['base_finish'],'maxVertexErrorMeters':error,'mismatchedVersionRejected':True}
(project/'blender/browser-roundtrip-verification.json').write_text(json.dumps(report,indent=2))
print('BROWSER_BLENDER_ROUNDTRIP '+json.dumps(report))

