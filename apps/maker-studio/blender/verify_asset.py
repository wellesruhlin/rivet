"""Reopen verification; run after loading ref-parsons-parametric.blend."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

project = Path(bpy.data.filepath).parent.parent
script = bpy.data.texts['START HERE — Maker controls.py'].as_string()
scope = {'__name__':'__main__'}
exec(compile(script, 'embedded_maker_controls.py', 'exec'), scope)
assert len(bpy.data.collections[scope['COLLECTION']].objects) == 14
assert bpy.context.scene.maker_table.finish == 'natural-walnut'
assert all(image.packed_file for image in bpy.data.images if image.source == 'FILE' and image.name.endswith('.png'))
assert bpy.ops.maker.import_build(filepath=str(project / 'reference/example-custom-build.json')) == {'FINISHED'}
assert bpy.data.objects[scope['ROOT']]['length_in'] == 84.25
p = bpy.context.scene.maker_table
p.length, p.width, p.height, p.finish = 84.25, 40, 31, 'blackened-oak'
assert bpy.ops.maker.rebuild_table(preset='custom') == {'FINISHED'}
root = bpy.data.objects[scope['ROOT']]
assert root['length_in'] == 84.25 and root['finish'] == 'blackened-oak'
assert bpy.ops.maker.rebuild_table(preset='72') == {'FINISHED'}
assert root['length_in'] == 72 and root['width_in'] == 38 and root['height_in'] == 30
p.finish = 'natural-walnut'
bpy.ops.maker.rebuild_table(preset='72')
print('REOPEN_VERIFIED: embedded controls, browser build import, custom regeneration, standard reset, packed textures.')
# Rendering is scratch QA only. Do not resave the user-facing asset after QA.
bpy.context.scene.render.resolution_percentage = 60
bpy.context.scene.render.filepath = str(project / 'blender/preview.png')
bpy.ops.render.render(write_still=True)
