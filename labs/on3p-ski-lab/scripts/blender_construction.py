"""Shared construction adapter; builds editable, asset-marked layered skis.
Run with Blender --background --factory-startup --python scripts/blender_construction.py.
"""
import bpy, json, subprocess, shutil, importlib.util
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('on3p_shell', ROOT/'scripts/blender_build.py')
adapter = importlib.util.module_from_spec(spec); spec.loader.exec_module(adapter)
LAYUPS = ['Stock', 'LITE', '50/50', 'Tour', 'Leaf Spring', 'Torsion Bar']

def payload(handle='jeffrey-106', length=186, layup='Stock', overrides=None):
    node = shutil.which('node') or r'C:\Program Files\nodejs\node.exe'
    result = subprocess.run([node, str(ROOT/'scripts/resolve-construction.mjs')], input=json.dumps({'handle':handle,'length':length,'layup':layup,'overrides':overrides or {}}), capture_output=True, text=True, check=True, creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    return json.loads(result.stdout)

def materials(handle):
    exterior = adapter.materials(handle)
    mats = dict(zip(['topsheet','base','sidewall','steel'], exterior))
    for name, color, rough, metal in [('bamboo',(.60,.36,.12,1),.78,0),('paulownia',(.78,.67,.43,1),.84,0),('mounting',(.48,.25,.08,1),.78,0),('composite',(.30,.36,.34,1),.74,0),('binding',(.70,.68,.55,1),.9,0),('rubber',(.025,.028,.03,1),.94,0),('scalium',(.53,.62,.58,1),.34,.55)]:
        mat = bpy.data.materials.new('Construction / '+name); mat.use_nodes = True
        bs = mat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = color
        bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
        if name in ['bamboo','paulownia','mounting','composite','binding']:
            tex = mat.node_tree.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 75
            tex.inputs['Detail'].default_value = 2
            bump = mat.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .13; bump.inputs['Distance'].default_value = .0001
            mat.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']); mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        mats[name] = mat
    return mats

def add_study(data, collection, handle, name=None, exploded=1):
    interior = data['interior']; recipe = interior['recipe']; mats = materials(handle)
    root = bpy.data.objects.new(name or f'ON3P / {recipe["layup"]} / Reveal control', None); collection.objects.link(root)
    root['separation'] = exploded
    root.id_properties_ui('separation').update(min=0, max=1, description='0 assembled; 1 exaggerated layer reveal')
    root['layup'] = recipe['layup']; root['source_url'] = interior['source']; root['measurement_note'] = interior['note']
    for key,value in interior['definition'].items():root[key]=value
    root['on3p_generated_preview'] = True
    objects = []
    for layer in interior['layers']:
        mesh = bpy.data.meshes.new(layer['id']); mesh.from_pydata([(x,-z,y) for x,y,z in layer['positions']],[],layer['faces']); mesh.update()
        obj = bpy.data.objects.new(layer['label']+' / '+layer['id'],mesh); collection.objects.link(obj); obj.parent = root
        mesh.materials.append(mats[layer['material']]); uv = mesh.uv_layers.new(name='Surface')
        if layer['material'] in ['topsheet','base']: mesh.materials.append(mats['rubber'] if layer['material']=='base' else mats['binding'])
        for polygon, corners in zip(mesh.polygons,layer['uvs']):
            for index, xy in zip(polygon.loop_indices,corners): uv.data[index].uv = xy
            if layer['material'] in ['topsheet','base']:
                printed=polygon.index < len(mesh.polygons)-2 and polygon.index%4==(0 if layer['material']=='base' else 2)
                polygon.material_index=0 if printed else 1
        x,y,z = layer['explode']; offset = [x,-z,y]
        for axis, distance in enumerate(offset):
            driver = obj.driver_add('location',axis).driver; driver.type='SCRIPTED'
            var=driver.variables.new();var.name='reveal';var.type='SINGLE_PROP';var.targets[0].id=root;var.targets[0].data_path='["separation"]'
            driver.expression=f'reveal * {distance!r}'
        obj['layer_id']=layer['id'];obj['material_role']=layer['material'];obj['detail']=layer['detail'];obj['confidence']=layer['confidence'];obj['on3p_generated_preview']=True
        objects.append(obj)
    return root, objects

def main():
    # New deliverable: never overwrite the existing exterior-only library.
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/on3p-ski-library.blend'))
    scene=bpy.context.scene
    for obj in scene.objects: obj.hide_render=True; obj.hide_set(True)
    results=[]; first=None
    for i,layup in enumerate(LAYUPS):
        data=payload(layup=layup)
        collection=bpy.data.collections.new('Inside / Jeffrey 106 / '+layup);scene.collection.children.link(collection);collection.asset_mark()
        collection.asset_data.description='Parametric ON3P construction. Materials sourced; internal dimensions illustrative. Separation property controls exploded view.'
        root,objects=add_study(data,collection,'jeffrey-106');root.location.x=i*.35
        root['separation']=0;root.keyframe_insert(data_path='["separation"]',frame=1)
        root['separation']=1;root.keyframe_insert(data_path='["separation"]',frame=55)
        if first is None:first=root
        for obj,layer in zip(objects,data['interior']['layers']):
            error=max(abs(a-b) for v,src in zip(obj.data.vertices,layer['positions']) for a,b in zip((v.co.x,v.co.z,-v.co.y),src))
            assert error < 1e-7
        results.append({'layup':layup,'layers':len(objects),'sharedGeometry':True,'vertices':sum(len(obj.data.vertices) for obj in objects)})
        if i:
            for obj in objects: obj.hide_render=True
    scene.frame_end=85;scene.frame_set(55)
    for name,text in [('ON3P_CONSTRUCTION_README', 'Select a Reveal control empty and change separation 0–1, or scrub frames 1–55. Six 186 cm Jeffrey 106 layups are asset-marked collections. Regenerate any supported model/size/layup with scripts/blender_controls.py. Internal dimensions and placement are illustrative, not factory CAD. Source: https://www.on3pskis.com/products/custom-skis'),('ON3P_CONSTRUCTION_RECIPE',json.dumps({'source':'https://www.on3pskis.com/products/custom-skis','layups':LAYUPS,'verified':results},indent=2)),('ON3P_CONSTRUCTION_GENERATOR.mjs',(ROOT/'construction.mjs').read_text(encoding='utf-8'))]:
        block=bpy.data.texts.get(name) or bpy.data.texts.new(name);block.clear();block.write(text)
    for loc,power,size in [((1,-1,2.5),220,2),((-1,0,1.6),170,2),((0,2,1.5),130,1.5)]:
        light=bpy.data.lights.new('Construction softbox','AREA');light.energy=power;light.shape='RECTANGLE';light.size=size;light.size_y=2.4
        obj=bpy.data.objects.new('Construction softbox',light);scene.collection.objects.link(obj);obj.location=loc;adapter.aim(obj,(0,0,.06))
    cam_data=bpy.data.cameras.new('Construction camera');cam=bpy.data.objects.new('Construction camera',cam_data);scene.collection.objects.link(cam);cam.location=(2.5,-.7,1.7);adapter.aim(cam,(0,0,.07));cam_data.type='ORTHO';cam_data.ortho_scale=2.35;scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=1500;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.filepath=str(ROOT/'preview-construction.png');bpy.ops.render.render(write_still=True)
    for collection in bpy.data.collections:
        if collection.name.startswith('Inside /'):
            for obj in collection.objects: obj.hide_render=False
    bpy.ops.object.select_all(action='DESELECT');first.select_set(True);bpy.context.view_layer.objects.active=first
    # Start the library focused on the first construction, with ordinary viewport lighting.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_distance=2.6;area.spaces.active.region_3d.view_location=(0,0,.08)
                area.spaces.active.shading.type='MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/on3p-ski-construction.blend'))
    (ROOT/'data/construction-verification.json').write_text(json.dumps({'passed':True,'layups':results,'source':'https://www.on3pskis.com/products/custom-skis','note':'Layer coordinates verified against shared JavaScript generator; materials and exact internal placement remain illustrative.'},indent=2))
    print('Saved six construction assets and reveal animation.')

if __name__=='__main__':main()
