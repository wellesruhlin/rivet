"""Shared recipe -> Blender bridge. Run this text in Blender to enable the Maker tab.

Browser and Blender consume the exact same JS recipe mesh, not separate geometry
implementations. The installed Node runtime regenerates the manifest on demand.
"""
import bpy
import json
import os
import shutil
import subprocess
from pathlib import Path
from mathutils import Vector

COLLECTION = 'ref. Parsons | configurable asset'
ROOT = 'Parsons Controls'


def project_path():
    if bpy.data.filepath:
        candidate = Path(bpy.data.filepath).parent.parent
        if (candidate / 'scripts/export-scene.mjs').exists():
            return candidate
    if '__file__' in globals():
        return Path(__file__).resolve().parent.parent
    root = bpy.data.objects.get(ROOT)
    if root and root.get('recipe_path'):
        return Path(root['recipe_path'])
    raise RuntimeError('Keep this .blend in maker-studio/blender, or set recipe_path on Parsons Controls.')


def recipe(config, project=None):
    project = Path(project or project_path())
    node = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
    process = subprocess.run([node, str(project / 'scripts/export-scene.mjs'), '--stdin'],
                             input=json.dumps(config), text=True, capture_output=True,
                             cwd=str(project), timeout=30,
                             creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if process.returncode:
        raise RuntimeError(process.stderr[-1500:])
    return json.loads(process.stdout)


def vector(p):
    # Shared geometry is meters, Y-up. Blender is meters, Z-up.
    return (p[0], -p[2], p[1])


def linear_color(hex_color):
    values = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def make_material(name, spec, project):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = linear_color(spec.get('color', '#ffffff'))
    shader.inputs['Roughness'].default_value = spec.get('roughness', .7)
    shader.inputs['Metallic'].default_value = spec.get('metalness', 0)
    shader.inputs['Specular IOR Level'].default_value = .3
    links.new(shader.outputs['BSDF'], out.inputs['Surface'])
    if spec.get('texture'):
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(project / spec['texture']), check_existing=True)
        tex.image.pack()
        tex.extension = 'MIRROR'
        uvcoords = nodes.new('ShaderNodeTexCoord')
        scale = nodes.new('ShaderNodeVectorMath')
        scale.operation = 'SCALE'
        scale.inputs[3].default_value = spec.get('grainScale', 1)
        links.new(uvcoords.outputs['UV'], scale.inputs[0])
        links.new(scale.outputs['Vector'], tex.inputs['Vector'])
        mix = nodes.new('ShaderNodeMixRGB')
        mix.blend_type = 'MULTIPLY'
        mix.inputs[0].default_value = 1
        mix.inputs[2].default_value = linear_color(spec.get('color', '#ffffff'))
        if spec.get('neutralGrain'):
            gray = nodes.new('ShaderNodeRGBToBW')
            gain = nodes.new('ShaderNodeMath')
            gain.operation = 'MULTIPLY'
            gain.inputs[1].default_value = 2.0
            lower = nodes.new('ShaderNodeMath')
            lower.operation = 'MAXIMUM'
            lower.inputs[1].default_value = .25
            upper = nodes.new('ShaderNodeMath')
            upper.operation = 'MINIMUM'
            upper.inputs[1].default_value = 1.6
            contrast = nodes.new('ShaderNodeMixRGB')
            contrast.inputs[0].default_value = spec.get('grainContrast', 1)
            contrast.inputs[1].default_value = (1,1,1,1)
            links.new(tex.outputs['Color'], gray.inputs[0])
            links.new(gray.outputs[0], gain.inputs[0])
            links.new(gain.outputs[0], lower.inputs[0])
            links.new(lower.outputs[0], upper.inputs[0])
            links.new(upper.outputs[0], contrast.inputs[2])
            links.new(contrast.outputs[0], mix.inputs[1])
        else:
            contrast = nodes.new('ShaderNodeMixRGB')
            contrast.inputs[0].default_value = spec.get('grainContrast', 1)
            contrast.inputs[1].default_value = (1, 1, 1, 1)
            links.new(tex.outputs['Color'], contrast.inputs[2])
            links.new(contrast.outputs[0], mix.inputs[1])
        links.new(mix.outputs[0], shader.inputs['Base Color'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .15
        bump.inputs['Distance'].default_value = spec.get('bumpScale', .00024)
        links.new(tex.outputs['Color'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    material.diffuse_color = linear_color(spec.get('color', '#ffffff'))
    material['finish_note'] = 'Illustrative texture and tint; confirm physical maker sample.'
    return material


def import_scene(data, project=None):
    project = Path(project or project_path())
    collection = bpy.data.collections.get(COLLECTION)
    if not collection:
        collection = bpy.data.collections.new(COLLECTION)
        bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.get(ROOT)
    separation = root.get('separation', 0) if root else 0
    if root is None:
        root = bpy.data.objects.new(ROOT, None)
        collection.objects.link(root)
        root.empty_display_type = 'PLAIN_AXES'
        root.empty_display_size = .18
    for obj in list(collection.objects):
        if obj != root:
            mesh = obj.data if obj.type == 'MESH' else None
            bpy.data.objects.remove(obj, do_unlink=True)
            if mesh and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
    config = data['config']
    for field in ('length', 'width', 'height'):
        root[field + '_in'] = float(config[field])
    root['finish'] = config['finish']
    root['size'] = config['size']
    root['recipe_path'] = str(project)
    root['product_id'] = data['productId']
    root['product_version'] = data['productVersion']
    root['source'] = data['source']
    root['notes'] = '\n'.join(data['notes'])
    root['separation'] = float(separation)
    root.id_properties_ui('separation').update(min=0, max=1, description='Exaggerated construction reveal')
    materials = {key: make_material(data['productId'] + ' | ' + key, spec, project) for key, spec in data['materials'].items()}
    for part in data['parts']:
        source = part['mesh']
        mesh = bpy.data.meshes.new(part['id'])
        mesh.from_pydata([vector(v) for v in source['positions']], [], source['faces'])
        mesh.update()
        uv = mesh.uv_layers.new(name='Shared physical grain UV')
        for polygon, coords in zip(mesh.polygons, source['uvs']):
            polygon.use_smooth = True
            for index, coord in zip(polygon.loop_indices, coords):
                uv.data[index].uv = coord
        if source.get('normals'):
            mesh.normals_split_custom_set_from_vertices([vector(n) for n in source['normals']])
        obj = bpy.data.objects.new(part['id'], mesh)
        collection.objects.link(obj)
        obj.parent = root
        obj.data.materials.append(materials[part['material']])
        obj['part_id'] = part['id']
        obj['role'] = part.get('role', '')
        obj['label'] = part['label']
        obj['confidence'] = part.get('confidence', 'illustrative')
        for axis, amount in enumerate(vector(part.get('explode', [0, 0, 0]))):
            if amount:
                driver = obj.driver_add('location', axis).driver
                var = driver.variables.new()
                var.name = 'separation'
                var.type = 'SINGLE_PROP'
                var.targets[0].id = root
                var.targets[0].data_path = '["separation"]'
                driver.expression = f'separation * {amount:.9f}'
    collection.asset_mark()
    collection.asset_data.description = 'Parametric ' + data['productId'] + '. Shared browser/Blender recipe; public-data estimates, not manufacturing CAD.'
    collection.asset_data.author = 'Maker Studio — independent demonstration'
    for tag in ('Furniture', 'Table', 'Parametric', 'Shared recipe', 'Public-data study'):
        collection.asset_data.tags.new(tag)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1
    bpy.context.view_layer.update()
    return root


FINISHES = [('natural-oak','Natural Oak',''),('whitened-oak','Whitened Oak',''),('nordic-oak','Nordic Oak',''),('sand-oak','Sand Oak',''),('aged-oak','Aged Oak',''),('golden-oak','Golden Oak',''),('espresso-oak','Espresso Oak',''),('blackened-oak','Blackened Oak',''),('natural-walnut','Natural Walnut',''),('bourbon-walnut','Bourbon Walnut',''),('charcoal-walnut','Charcoal Walnut',''),('maple','Maple','')]


class MAKER_Parameters(bpy.types.PropertyGroup):
    length: bpy.props.FloatProperty(name='Length (in)', default=72, min=48, max=120, step=25, precision=2)
    width: bpy.props.FloatProperty(name='Width (in)', default=38, min=28, max=48, step=25, precision=2)
    height: bpy.props.FloatProperty(name='Height (in)', default=30, min=26, max=36, step=25, precision=2)
    finish: bpy.props.EnumProperty(name='Finish', items=FINISHES, default='natural-walnut')


class MAKER_OT_Rebuild(bpy.types.Operator):
    bl_idname = 'maker.rebuild_table'
    bl_label = 'Regenerate from shared recipe'
    bl_options = {'REGISTER', 'UNDO'}
    preset: bpy.props.StringProperty(default='custom')

    def execute(self, context):
        p = context.scene.maker_table
        config = {'size': self.preset, 'finish': p.finish, 'length': p.length, 'width': p.width, 'height': p.height}
        try:
            data = recipe(config)
            import_scene(data)
            sync_controls()
            self.report({'INFO'}, 'Shared recipe regenerated. Custom dimensions remain unconfirmed by the maker.')
            return {'FINISHED'}
        except Exception as error:
            self.report({'ERROR'}, str(error))
            return {'CANCELLED'}


class MAKER_PT_Table(bpy.types.Panel):
    bl_label = 'ref. Parsons | shared product recipe'
    bl_idname = 'MAKER_PT_table'
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Maker'

    def draw(self, context):
        layout = self.layout
        p = context.scene.maker_table
        root = bpy.data.objects.get(ROOT)
        layout.label(text='Independent public-data study', icon='INFO')
        row = layout.row(align=True)
        for size in ('72', '84', '96', '108'):
            row.operator('maker.rebuild_table', text=size + ' in').preset = size
        for field in ('length', 'width', 'height', 'finish'):
            layout.prop(p, field)
        layout.operator('maker.rebuild_table', text='Apply custom dimensions').preset = 'custom'
        layout.operator('maker.import_build', text='Import exported build JSON')
        layout.label(text='Use 0.25 in increments. Preview limits only.')
        if root:
            layout.prop(root, '["separation"]', slider=True, text='Construction reveal')
        layout.label(text='Concealed joinery / bracing are illustrative.')
        layout.label(text='Node.js + maker-studio folder required to edit.')


class MAKER_OT_ImportBuild(bpy.types.Operator):
    bl_idname = 'maker.import_build'
    bl_label = 'Import saved build'
    bl_options = {'REGISTER', 'UNDO'}
    filepath: bpy.props.StringProperty(subtype='FILE_PATH')
    filter_glob: bpy.props.StringProperty(default='*.json', options={'HIDDEN'})

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        try:
            saved = json.loads(Path(self.filepath).read_text(encoding='utf-8'))
            if not saved.get('schemaVersion') or not saved.get('config'):
                raise ValueError('Choose an exported Maker Studio build JSON.')
            import_scene(recipe(saved))
            sync_controls()
            self.report({'INFO'}, 'Saved browser configuration rebuilt in Blender.')
            return {'FINISHED'}
        except Exception as error:
            self.report({'ERROR'}, str(error))
            return {'CANCELLED'}


CLASSES = (MAKER_Parameters, MAKER_OT_Rebuild, MAKER_OT_ImportBuild, MAKER_PT_Table)


def sync_controls():
    root = bpy.data.objects.get(ROOT)
    if root:
        p = bpy.context.scene.maker_table
        for field in ('length', 'width', 'height'):
            setattr(p, field, root[field + '_in'])
        p.finish = root['finish']


def register():
    for cls in reversed(CLASSES):
        old = getattr(bpy.types, cls.__name__, None)
        if old:
            bpy.utils.unregister_class(old)
    if hasattr(bpy.types.Scene, 'maker_table'):
        del bpy.types.Scene.maker_table
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.maker_table = bpy.props.PointerProperty(type=MAKER_Parameters)
    sync_controls()


if __name__ == '__main__':
    register()
