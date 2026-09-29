"""Build and verify the second-maker asset from the exact browser recipe."""
import bpy
import json
import importlib.util
from pathlib import Path
from mathutils import Vector

project = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('recipe_controls',project/'blender/recipe_controls.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
recipe = next(r for r in json.loads((project/'packages/product-recipes/seeds.json').read_text()) if r['id']=='vft-bistro-round')
bpy.data.texts.new(bridge.RECIPE_TEXT).write(json.dumps(recipe,indent=2))
bpy.data.texts.new('START HERE — Product recipe controls.py').write((project/'blender/recipe_controls.py').read_text(encoding='utf-8'))
bpy.data.texts.new('README — Product Studio').write('Run START HERE manually in the Text Editor, then open the Maker sidebar (N).\nThis asset embeds the exact recipe JSON used by the web configurator.\nUse preset sizes or custom dimensions and top/base finish choices, then Regenerate.\nImport an exported recipe JSON first, then its matching build JSON.\nSeparation on Product Recipe Controls reveals the construction.\nMeasured outline: published 24/36 inch diameter. Height/pedestal: public-photo estimates.\nConcealed plate and internals are illustrative. No maker approval. Not manufacturing CAD.\nKeep the .blend in maker-studio/blender. Node.js and this project are needed to edit.\nTextures are packed; viewing does not require downloads.\n')
bridge.register()
data = bridge.rebuild()
coord = bridge.bridge_module().vector
def verify(manifest):
    max_error = 0
    vertices = 0
    for part in manifest['parts']:
        obj = bpy.data.objects[part['id']]
        assert len(obj.data.vertices)==len(part['mesh']['positions'])
        for v, point in zip(obj.data.vertices,part['mesh']['positions']):
            max_error=max(max_error,(v.co-Vector(coord(point))).length)
            vertices+=1
        assert len(obj.data.polygons)==len(part['mesh']['faces'])
        for polygon, expected in zip(obj.data.polygons,part['mesh']['uvs']):
            for i, uv in zip(polygon.loop_indices,expected):
                assert (obj.data.uv_layers.active.data[i].uv-Vector(uv)).length<1e-6
    assert max_error<1e-6
    return {'parts':len(manifest['parts']),'vertices':vertices,'maxVertexErrorMeters':max_error,'uvParity':True}
report={'default':verify(data)}
custom=bridge.rebuild({'size':'custom','length':40.25,'height':30,'finish':'walnut','baseFinish':'oxblood-red'})
report['custom']=verify(custom)
root=bpy.data.objects[bridge.ROOT]
root['separation']=1
root.update_tag()
bpy.context.view_layer.update()
assert abs(bpy.data.objects['round-top'].evaluated_get(bpy.context.evaluated_depsgraph_get()).location.z-.22)<1e-6
report['constructionDriver']=True
root['separation']=0
data=bridge.rebuild()
report['recipeVersion']=recipe['version']
report['productId']=recipe['id']
(project/'blender/vft-bistro-recipe.json').write_text(json.dumps(recipe,indent=2),encoding='utf-8')
(project/'blender/vft-bistro-scene.json').write_text(json.dumps(data),encoding='utf-8')
studio=bpy.data.collections.new('Studio — excluded from asset')
bpy.context.scene.collection.children.link(studio)
def link(obj):
    studio.objects.link(obj)
    return obj
cam=link(bpy.data.objects.new('Camera',bpy.data.cameras.new('Camera')))
cam.location=(-1.4,-2.3,1.5)
cam.rotation_euler=(Vector((0,0,.38))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=1.55
scene=bpy.context.scene
scene.camera=cam
for name,location,power,size in [('Softbox',(-2,-2,3),180,3),('Rim',(1,2,3),200,2)]:
    light=bpy.data.lights.new(name,'AREA')
    light.energy,light.shape,light.size=power,'DISK',size
    obj=link(bpy.data.objects.new(name,light))
    obj.location=location
    obj.rotation_euler=(Vector((0,0,.35))-obj.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.18,.18,.18)
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=1000
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=-.5
scene.render.film_transparent=True
for obj in bpy.context.selected_objects: obj.select_set(False)
root.select_set(True)
bpy.context.view_layer.objects.active=root
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.region_3d.view_distance=1.8
            space.region_3d.view_location=(0,0,.36)
            space.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
            space.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(project/'blender/vft-bistro-parametric.blend'))
scene.render.filepath=str(project/'blender/vft-bistro-preview.png')
bpy.ops.render.render(write_still=True)
(project/'blender/vft-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('RECIPE_ASSET_VERIFIED '+json.dumps(report))

