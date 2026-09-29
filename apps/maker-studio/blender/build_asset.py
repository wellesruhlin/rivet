"""Run with Blender --background --python blender/build_asset.py."""
import bpy
import importlib.util
import json
from pathlib import Path
from mathutils import Vector

project = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('maker_controls', project / 'blender/maker_controls.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
data = bridge.recipe({}, project)
root = bridge.import_scene(data, project)
bridge.register()

# Embed a manual-run controls script; never require global auto-execution settings.
text = bpy.data.texts.new('START HERE — Maker controls.py')
text.write((project / 'blender/maker_controls.py').read_text(encoding='utf-8'))
info = bpy.data.texts.new('README — ref. Parsons')
info.write('Select START HERE — Maker controls.py in the Text Editor and press Run Script.\nThen open the 3D viewport sidebar (N), Maker tab.\nThe mesh uses the exact same JS product recipe as the browser.\nSet standard sizes or quarter-inch custom dimensions, then regenerate.\nConstruction reveal is the root separation property, 0 to 1.\nTextures are packed; editing needs Node.js and this project folder.\nPublic dimensions are referenced; internal construction and grain are illustrative.\nThis is independent and not endorsed by ref. Not manufacturing CAD.\n')

# Readable opening viewpoint; product only in the asset collection.
studio = bpy.data.collections.new('Studio — excluded from asset')
bpy.context.scene.collection.children.link(studio)
def link(obj):
    studio.objects.link(obj)
    return obj
cam = link(bpy.data.objects.new('Studio Camera', bpy.data.cameras.new('Studio Camera')))
cam.location = (-2.4, -3.2, 2.1)
cam.rotation_euler = (Vector((0, 0, .4)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 3
bpy.context.scene.camera = cam
for name, location, power, size in [('Large softbox',(-1.5,-2.5,4),500,4),('Rim',(1,2,3),350,3)]:
    light = bpy.data.lights.new(name,'AREA')
    light.energy, light.shape, light.size = power,'DISK',size
    obj = link(bpy.data.objects.new(name,light))
    obj.location = location
    obj.rotation_euler = (Vector((0,0,.4))-obj.location).to_track_quat('-Z','Y').to_euler()
scene = bpy.context.scene
scene.world.color = (.18,.18,.18)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = -.65
scene.render.film_transparent = True
for obj in bpy.context.selected_objects:
    obj.select_set(False)
root.select_set(True)
bpy.context.view_layer.objects.active = root
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_distance = 3.1
            space.region_3d.view_location = (0,0,.38)
            space.region_3d.view_rotation = cam.rotation_euler.to_quaternion()
            space.shading.type = 'MATERIAL'

# Verify coordinate/UV parity with the browser manifest before writing assets.
def verify(manifest):
    errors = []
    vertices = 0
    for part in manifest['parts']:
        obj = bpy.data.objects[part['id']]
        assert len(obj.data.vertices) == len(part['mesh']['positions'])
        for vertex, expected in zip(obj.data.vertices, part['mesh']['positions']):
            errors.append((vertex.co - Vector(bridge.vector(expected))).length)
            vertices += 1
        assert len(obj.data.polygons) == len(part['mesh']['faces'])
    assert max(errors) < 1e-6, max(errors)
    return {'parts':len(manifest['parts']),'vertices':vertices,'maxVertexErrorMeters':max(errors)}

report = {'default':verify(data)}
custom = bridge.recipe({'size':'custom','length':84.25,'width':40,'height':31,'finish':'blackened-oak'}, project)
bridge.import_scene(custom, project)
report['custom'] = verify(custom)
root['separation'] = 1
root.update_tag()
bpy.context.view_layer.update()
assert abs(bpy.data.objects['top-field'].evaluated_get(bpy.context.evaluated_depsgraph_get()).location.z - .28) < 1e-6
report['constructionDriver'] = True
root['separation'] = 0
bridge.import_scene(data, project)
bridge.sync_controls()
asset_path = project / 'blender/ref-parsons-parametric.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(asset_path))
for obj in bpy.context.selected_objects:
    obj.select_set(False)
for obj in bpy.data.collections[bridge.COLLECTION].objects:
    obj.select_set(True)
# glTF needs a tangent-space normal map; a grayscale Blender bump connection
# must not be exported as if it were one. Keep the native .blend bump shader.
for material in bpy.data.materials:
    if material.use_nodes and material.name.startswith(('Parsons |', 'ref-parsons |')):
        for node in material.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                for link in list(node.inputs['Normal'].links):
                    material.node_tree.links.remove(link)
bpy.ops.export_scene.gltf(filepath=str(project / 'blender/ref-parsons-72-walnut.glb'),export_format='GLB',use_selection=True,export_animations=False)
(project / 'blender/verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('MAKER_ASSET_VERIFIED ' + json.dumps(report))
