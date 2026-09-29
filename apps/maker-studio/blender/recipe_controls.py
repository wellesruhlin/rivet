"""Data-driven recipe controls. Run manually from Blender's Text Editor."""
import bpy
import json
import importlib.util
import subprocess
import shutil
from pathlib import Path

ROOT = 'Product Recipe Controls'
RECIPE_TEXT = 'product-recipe.json'
COLLECTION = 'Maker | recipe asset'

def project_path():
    candidate = Path(bpy.data.filepath).parent.parent if bpy.data.filepath else Path(__file__).resolve().parent.parent
    if not (candidate / 'scripts/export-scene.mjs').exists():
        raise RuntimeError('Keep this asset in maker-studio/blender alongside its project.')
    return candidate

def recipe_data():
    return json.loads(bpy.data.texts[RECIPE_TEXT].as_string())

def bridge_module():
    path = project_path() / 'blender/maker_controls.py'
    spec = importlib.util.spec_from_file_location('maker_bridge', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.ROOT, module.COLLECTION = ROOT, COLLECTION
    return module

def manifest(config=None):
    project = project_path()
    node = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
    process = subprocess.run([node, str(project / 'scripts/export-scene.mjs'), '--stdin'],
        input=json.dumps({'recipe':recipe_data(), 'config':config or {}}), text=True,
        capture_output=True, cwd=str(project), timeout=30,
        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if process.returncode:
        raise RuntimeError(process.stderr[-1500:])
    return json.loads(process.stdout)

def rebuild(config=None):
    data = manifest(config)
    root = bridge_module().import_scene(data, project_path())
    root['base_finish'] = data['config']['baseFinish']
    root['template'] = recipe_data()['template']
    sync()
    return data

ENUM_CACHE = {}
def options(key):
    def callback(self, context):
        values = [(f['id'], f['name'], '') for f in recipe_data()[key]]
        if ENUM_CACHE.get(key) != values:
            ENUM_CACHE[key] = values
        return ENUM_CACHE[key]
    return callback

class RECIPE_Parameters(bpy.types.PropertyGroup):
    length: bpy.props.FloatProperty(name='Length / diameter (in)', default=36, min=12, max=160, precision=2)
    width: bpy.props.FloatProperty(name='Width (in)', default=36, min=12, max=72, precision=2)
    height: bpy.props.FloatProperty(name='Height (in)', default=29, min=12, max=60, precision=2)
    finish: bpy.props.EnumProperty(name='Top finish', items=options('finishes'))
    base_finish: bpy.props.EnumProperty(name='Base finish', items=options('baseFinishes'))

class RECIPE_OT_Rebuild(bpy.types.Operator):
    bl_idname = 'recipe.rebuild'
    bl_label = 'Regenerate from product recipe'
    bl_options = {'REGISTER', 'UNDO'}
    preset: bpy.props.StringProperty(default='custom')
    def execute(self, context):
        p = context.scene.product_recipe
        try:
            rebuild({'size':self.preset, 'length':p.length, 'width':p.width, 'height':p.height, 'finish':p.finish, 'baseFinish':p.base_finish})
            self.report({'INFO'}, 'Rebuilt from the same recipe as the browser.')
            return {'FINISHED'}
        except Exception as error:
            self.report({'ERROR'}, str(error))
            return {'CANCELLED'}

class RECIPE_OT_Import(bpy.types.Operator):
    bl_idname = 'recipe.import_json'
    bl_label = 'Import recipe or saved build'
    bl_options = {'REGISTER', 'UNDO'}
    filepath: bpy.props.StringProperty(subtype='FILE_PATH')
    filter_glob: bpy.props.StringProperty(default='*.json', options={'HIDDEN'})
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}
    def execute(self, context):
        old = bpy.data.texts[RECIPE_TEXT].as_string()
        try:
            data = json.loads(Path(self.filepath).read_text(encoding='utf-8'))
            if data.get('template') and data.get('geometry'):
                text = bpy.data.texts[RECIPE_TEXT]
                text.clear()
                text.write(json.dumps(data))
                rebuild()
            else:
                recipe = recipe_data()
                if data.get('productId') != recipe['id'] or data.get('productVersion') != str(recipe['version']):
                    raise ValueError('Import the matching product recipe/version before its saved build.')
                rebuild(data['config'])
            self.report({'INFO'}, 'Recipe/build imported; source and accuracy notes retained.')
            return {'FINISHED'}
        except Exception as error:
            text = bpy.data.texts[RECIPE_TEXT]
            text.clear()
            text.write(old)
            self.report({'ERROR'}, str(error))
            return {'CANCELLED'}

class RECIPE_PT_Editor(bpy.types.Panel):
    bl_label = 'Product Studio | shared recipe'
    bl_idname = 'RECIPE_PT_editor'
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Maker'
    def draw(self, context):
        r, layout, p = recipe_data(), self.layout, context.scene.product_recipe
        layout.label(text=r['maker']+' / '+r['title'])
        layout.label(text='Independent public-data study', icon='INFO')
        row = layout.row(align=True)
        for size in r['sizes']:
            row.operator('recipe.rebuild', text=str(size['length'])+' in').preset = size['id']
        for field in ('length','height','finish','base_finish'):
            layout.prop(p, field)
        if r['template'] == 'parsons':
            layout.prop(p, 'width')
        layout.operator('recipe.rebuild', text='Apply custom dimensions')
        layout.operator('recipe.import_json')
        root = bpy.data.objects.get(ROOT)
        if root:
            layout.prop(root, '["separation"]', slider=True, text='Construction reveal')
        layout.label(text='Quarter-inch increments. Estimates need confirmation.')
        layout.label(text='Recipe JSON is embedded. Node.js + project required to edit.')

CLASSES = (RECIPE_Parameters, RECIPE_OT_Rebuild, RECIPE_OT_Import, RECIPE_PT_Editor)
def sync():
    root = bpy.data.objects.get(ROOT)
    if root and hasattr(bpy.context.scene, 'product_recipe'):
        p = bpy.context.scene.product_recipe
        for field in ('length','width','height'):
            setattr(p, field, root[field+'_in'])
        p.finish = root['finish']
        p.base_finish = root.get('base_finish',recipe_data()['defaults']['baseFinish'])
def register():
    for cls in reversed(CLASSES):
        old = getattr(bpy.types, cls.__name__, None)
        if old: bpy.utils.unregister_class(old)
    if hasattr(bpy.types.Scene, 'product_recipe'): del bpy.types.Scene.product_recipe
    for cls in CLASSES: bpy.utils.register_class(cls)
    bpy.types.Scene.product_recipe = bpy.props.PointerProperty(type=RECIPE_Parameters)
    sync()
if __name__ == '__main__': register()

