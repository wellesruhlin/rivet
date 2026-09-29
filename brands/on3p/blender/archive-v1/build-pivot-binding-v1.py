"""Blender-authored visual study. Not a mounting template or engineering model.
Run: blender --background --python scripts/build-pivot-binding.py
Exports the selected binding meshes as GLB, plus an editable studio .blend.
Coordinates: millimeters in helpers; Blender -Y points toward the ski nose.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'blender'
OUT.mkdir(exist_ok=True)
(ROOT / 'public/models').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene['description'] = 'LOOK Pivot 2.0 15 GW visual study from ON3P product photography. Approximate geometry, 320 mm reference boot sole. Not factory CAD; not for mounting or release setup.'
scene['reference'] = 'https://www.on3pskis.com/products/look-pivot-2-0-15-gw'
parts = []

def material(name, color, metal=0, rough=.35):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m

paint = material('Pivot_Paint', (.025,.27,.46), .72,.27)
black = material('Pivot_Polymer', (.018,.022,.027), .05,.4)
rubber = material('Pivot_Rubber', (.007,.009,.011), 0,.66)
chrome = material('Pivot_Steel', (.49,.55,.59), .9,.22)
alloy = material('Pivot_Aluminum', (.32,.37,.4), .85,.34)
white = material('Pivot_AFD', (.88,.9,.84), .05,.27)
ink = material('Pivot_Ink', (.96,.97,.94), 0,.6)
glass = material('Pivot_DIN_window', (.055,.078,.086), .25,.17)

def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Machined edge radii', 'BEVEL'); mod.width = bevel / 1000; mod.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if obj.type == 'MESH':
        for poly in obj.data.polygons: poly.use_smooth = True
        mod = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL'); mod.keep_sharp = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.append(obj)
    return obj

def box(name, center, size, mat, radius=2, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=Vector(center)/1000)
    o=bpy.context.object; o.dimensions=Vector(size)/1000
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler = rotation
    return finish(o,name,mat,radius)

def cylinder(name, center, radius, depth, mat, axis='Z', vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius/1000, depth=depth/1000, location=Vector(center)/1000)
    o=bpy.context.object
    if axis=='X': o.rotation_euler[1]=math.pi/2
    if axis=='Y': o.rotation_euler[0]=math.pi/2
    return finish(o,name,mat,.7)

def tube(name, coords, radius, mat):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'; curve.resolution_u=12
    curve.bevel_depth=radius/1000; curve.bevel_resolution=3
    spline=curve.splines.new('POLY'); spline.points.add(len(coords)-1)
    for p,co in zip(spline.points,coords): p.co=(*[v/1000 for v in co],1)
    o=bpy.data.objects.new(name,curve); scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,mat)

def wedge(name, sections, mat):
    # Each cross section is (y, halfwidth, bottom, top).
    vertices=[]
    for y,w,b,t in sections: vertices.extend([(-w,y,b),(w,y,b),(w,y,t),(-w,y,t)])
    faces=[(3,2,1,0)]
    for i in range(len(sections)-1):
        for j in range(4): faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    k=(len(sections)-1)*4; faces.append((k,k+1,k+2,k+3))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata([Vector(v)/1000 for v in vertices],[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); scene.collection.objects.link(o)
    return finish(o,name,mat,2)

def screw(name, pos, radius=3, axis='Z'):
    cylinder(name,pos,radius,1.6,chrome,axis)
    if axis=='Z':
        box(name+' slot A',(pos[0],pos[1],pos[2]+.9),(radius*1.45,.8,.2),black,.05)
        box(name+' slot B',(pos[0],pos[1],pos[2]+.9),(.8,radius*1.45,.2),black,.05)
    elif axis=='X': box(name+' slot',(pos[0]+(.9 if pos[0]>0 else -.9),pos[1],pos[2]),(.2,radius*1.4,1),black,.05)

def label(name, text, center, size, rotation=(0,0,0)):
    bpy.ops.object.text_add(location=Vector(center)/1000, rotation=rotation)
    o=bpy.context.object; o.data.body=text; o.data.align_x='CENTER'; o.data.align_y='CENTER'; o.data.size=size/1000; o.data.extrude=.03/1000
    bpy.ops.object.convert(target='MESH')
    return finish(o,name,ink)

# Aluminum Race toe: compact transverse housing, wings, rollers and low AFD.
box('Toe mounting foot',(0,-187,3),(75,99,6),black,7)
wedge('Race toe housing',[(-224,26,7,24),(-211,33,7,43),(-179,32,8,40),(-166,19,10,26)],paint)
cylinder('Toe spring barrel',(0,-205,28),17,72,paint,'X')
for side in [-1,1]:
    cylinder('Toe endcap',(side*37,-205,28),17,6,black,'X')
    screw('Toe adjuster',(side*40.6,-205,28),9,'X')
    wedge('Toe wing', [(-189,11,18,36),(-167,14,17,33),(-151,9,15,28)],paint).location.x=side*.023
    cylinder('Boot toe roller',(side*27,-154,24),5,17,rubber)
    cylinder('Toe wing pivot',(side*26,-178,35),3.4,2.5,chrome)
    screw('Toe plate screw',(side*25,-227,7))
box('Toe DIN cover',(0,-192,43),(19,27,2.2),glass,3)
label('Toe DIN scale','6  9  12  15',(0,-190,44.3),3.3)
box('AFD sliding base',(0,-145,6),(64,32,8),black,5)
box('AFD contact pad',(0,-145,11),(59,27,2.8),white,4)
for x in [-23,23]: box('AFD edge runner',(x,-145,12.7),(1,20,.6),alloy,.15)
label('Toe branding','PIVOT',(0,-213,44),8)

# Heel turntable and short mounting zone. Brake is shown retracted/boot-in.
box('Heel mounting foot',(0,169,3),(70,84,6),black,9)
cylinder('Turntable lower ring',(0,157,7),33,7,chrome)
cylinder('Turntable bearing',(0,157,11.5),30,3,black)
cylinder('Rotating heel deck',(0,157,15),28,5,alloy)
for side in [-1,1]:
    screw('Heel mounting screw',(side*22,193,7.5))
    screw('Turntable screw',(side*15,149,18),3.8)
    cylinder('Heel arm lower axle',(side*29,174,22),8,4,chrome,'X')
    tube('Steel heel arm',[(side*29,174,22),(side*30,185,38),(side*27,195,59),(side*21,197,64)],3.2,chrome)
    cylinder('Upper arm pivot',(side*23,196,61),8,5,black,'X')
    screw('Upper pivot cap',(side*26,196,61),4,'X')
    tube('Retracted brake wire',[(side*21,151,11),(side*43,156,9),(side*57.5,177,7),(side*57.5,214,8)],2.1,chrome)
    box('Brake paddle',(side*57.5,218,8),(9,25,9),black,3)
box('Brake pedal',(0,140,22),(46,33,8),black,5)
for x in [-17,-9,0,9,17]: box('Pedal tread',(x,140,26.2),(2,22,1),rubber,.4)
wedge('Heel lower yoke',[(181,22,31,51),(199,25,38,65),(210,20,43,68)],paint)
box('Heel spring cartridge',(0,211,85),(37,30,79),paint,7,(-.13,0,0))
for side in [-1,1]: box('Protective heel bumper',(side*19,211,88),(5,26,64),rubber,2,(-.13,0,0))
box('Heel lever cap',(0,216,126),(36,24,10),black,4)
box('Heel DIN window',(0,195.4,103),(19,2,17),glass,2)
cylinder('Heel DIN adjuster',(0,216,126),5,2,chrome)
label('Heel lettering','LOOK',(0,194,77),12,(math.pi/2,0,0))
label('Heel model','PIVOT 15',(0,195,61),4.5,(math.pi/2,0,0))
for z in range(59,91,6): box('Rear lever ribs',(0,228,z),(25,2,2),black,.6,(-.13,0,0))

# Export only the editable binding meshes. glTF converts Blender Z-up to Y-up.
bpy.ops.object.select_all(action='DESELECT')
for obj in parts: obj.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/look-pivot-15.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)

# Studio scene for inspecting the actual Blender model.
floor=material('Studio floor',(.045,.053,.059),0,.65)
box('Studio plinth',(0,0,-7),(270,580,12),floor,8)
world=bpy.data.worlds.new('Studio world') if not scene.world else scene.world
scene.world=world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.16,.19,1); world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,power,size in [('Key',(400,-250,700),8,.7),('Rim',(-350,250,500),12,.5),('Fill',(150,500,250),5,.45)]:
    bpy.ops.object.light_add(type='AREA',location=Vector(loc)/1000)
    lamp=bpy.context.object; lamp.name=name; lamp.data.energy=power; lamp.data.shape='DISK'; lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,.035))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.49,-.63,.55))
camera=bpy.context.object; camera.rotation_euler=(Vector((0,0,.035))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=.66; scene.camera=camera
scene.render.engine='CYCLES'; scene.cycles.samples=48
scene.render.resolution_x=1400; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(OUT/'look-pivot-15-study.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'look-pivot-15-study.blend'))
bpy.ops.render.render(write_still=True)
print('Exported editable Blender study and runtime GLB:',len(parts),'objects')
