"""Blender adapter. Imports the canonical JS mesh unchanged except axis rotation.
blender --background --factory-startup --python scripts/blender_build.py
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]

def materials(handle):
    texture=bpy.data.images.load(str(ROOT/'reference'/f'{handle}-composite.png'),check_existing=True)
    texture.pack()
    specs=[('Topsheet',(.7,.75,.7,1),.4,0),('Base',(.18,.2,.2,1),.65,0),('Sidewall',(.78,.8,.72,1),.5,0),('Steel',(.65,.72,.75,1),.25,.85)]
    mats=[]
    for label,color,rough,metal in specs:
        mat=bpy.data.materials.new(handle+' / '+label);mat.use_nodes=True
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color
        bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
        if label in ['Topsheet','Base']:
            node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=texture
            mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
        if label=='Topsheet':
            bs.inputs['Coat Weight'].default_value=.24;bs.inputs['Coat Roughness'].default_value=.3
        mats.append(mat)
    return mats

def import_mesh(payload,name,collection,mats=None):
    mesh=bpy.data.meshes.new(name)
    # Browser X/Y/Z -> Blender X/-Z/Y. This rotation makes glTF export roundtrip
    # back into the exact canonical X-across, Y-up, +Z-nose convention.
    mesh.from_pydata([(x,-z,y) for x,y,z in payload['positions']],[],payload['faces']);mesh.update()
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
    for mat in mats or materials(payload['definition']['model']):mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name='Artwork')
    for poly,mat,corners in zip(mesh.polygons,payload['materials'],payload['uvs']):
        poly.material_index=mat;poly.use_smooth=True
        for index,xy in zip(poly.loop_indices,corners):uv.data[index].uv=xy
    for k,v in payload['definition'].items():obj[k]=v
    obj['source_url']=payload['source']['url'];obj['source_notes']=json.dumps(payload['source']['warnings'])
    obj['generator']='ON3P shared geometry.mjs / v1'
    obj['regeneration']='Run scripts/blender_controls.py once, then use the ON3P Geometry sidebar panel.'
    obj.asset_mark();obj.asset_data.description='Image-derived ON3P ski. Published widths; estimated rocker/thickness. Regenerate with accompanying shared kernel.'
    return obj

def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def main():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    out=ROOT/'blender';out.mkdir(exist_ok=True)
    library=json.loads((ROOT/'data/on3p.json').read_text(encoding='utf-8'))
    scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.length_unit='MILLIMETERS'
    results=[];all_objects=[]
    for index,model in enumerate(library['models']):
        coll=bpy.data.collections.new(model['name']+' / 186 cm');scene.collection.children.link(coll);coll.asset_mark()
        coll.asset_data.description='Parametric reconstruction from public ON3P data. Original image and confidence notes included.'
        pair=[];mats=materials(model['handle'])
        for side in ['left','right']:
            payload=json.loads((ROOT/'meshes'/f'{model["handle"]}-186-{side}.json').read_text())
            obj=import_mesh(payload,model['name']+' / '+side,coll,mats);obj.location.x=.11 if side=='left' else -.11
            pair.append(obj);all_objects.append(obj)
            err=max(abs(a-b) for v,src in zip(obj.data.vertices,payload['positions']) for a,b in zip((v.co.x,v.co.z,-v.co.y),src))
            assert err<1e-7,err
            results.append({'object':obj.name,'vertices':len(obj.data.vertices),'faces':len(obj.data.polygons),'canonicalMaxErrorMeters':err})
        bpy.ops.object.select_all(action='DESELECT')
        for obj in pair:obj.select_set(True)
        bpy.context.view_layer.objects.active=pair[0]
        bpy.ops.export_scene.gltf(filepath=str(out/f'{model["handle"]}-186.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
        for obj in pair:obj.location.x+=index*.55
    # Pack source definition and regeneration instructions in the actual library.
    text=bpy.data.texts.new('ON3P_GEOMETRY_README');text.write('Source and recipe: '+str(ROOT)+'\nRun scripts/blender_controls.py in the Text Editor to enable dimension controls.\nThe shared JavaScript generator requires Node.js.\nChanging object custom properties alone does not regenerate a mesh.\nWidths/lengths are published; profile and thickness are estimates from images.\n')
    definition=bpy.data.texts.new('ON3P_SOURCE_DATA.json');definition.write(json.dumps(library,indent=2))
    scene.world.color=(.12,.12,.12)
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.17,.19,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    for loc,power,size in [((1,-1,2.5),240,2),((-1,0,1.6),190,2),((0,2,1.5),150,1.5)]:
        light=bpy.data.lights.new('Softbox','AREA');light.energy=power;light.shape='RECTANGLE';light.size=size;light.size_y=2.4
        obj=bpy.data.objects.new('Softbox',light);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,0))
    cam_data=bpy.data.cameras.new('Study camera');cam=bpy.data.objects.new('Study camera',cam_data);scene.collection.objects.link(cam);cam.location=(1.0,1.35,2.8);aim(cam,(0,0,.02));cam_data.type='ORTHO';cam_data.ortho_scale=2.45;scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    for obj in all_objects[2:]:obj.hide_render=True
    scene.render.filepath=str(ROOT/'preview-blender.png');bpy.ops.render.render(write_still=True)
    for obj in all_objects[2:]:obj.hide_render=False
    bpy.ops.object.select_all(action='DESELECT');all_objects[0].select_set(True);bpy.context.view_layer.objects.active=all_objects[0]
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'on3p-ski-library.blend'))
    (ROOT/'data/blender-verification.json').write_text(json.dumps({'passed':True,'objects':results,'axes':'Blender X across, -Y nose, +Z up; glTF X across, Y up, +Z nose','packedTextures':True},indent=2))
    print('ON3P library and three GLBs saved:',out)

if __name__=='__main__':main()
