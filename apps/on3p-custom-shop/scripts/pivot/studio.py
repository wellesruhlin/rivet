"""Scene, lighting and camera helpers for the Pivot study renders."""
import math
import os
import bpy
from mathutils import Vector


def clear():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def gpu(samples=128):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            devices = [d for d in prefs.devices if d.type == backend]
            if devices:
                for d in prefs.devices:
                    d.use = d.type == backend
                scene.cycles.device = 'GPU'
                break
        except TypeError:
            continue
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 12
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 8
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'None'
    scene.render.film_transparent = False
    return scene


def studio_world(strength=0.6, rotation_deg=0.0, hdri='studio.exr'):
    """Blender's bundled studio HDRI for image-based lighting."""
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('Pivot studio')
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    mapping = nt.nodes.new('ShaderNodeMapping')
    coords = nt.nodes.new('ShaderNodeTexCoord')
    path = os.path.join(bpy.utils.system_resource('DATAFILES', path='studiolights/world'), hdri)
    env.image = bpy.data.images.load(path, check_existing=True)
    mapping.inputs['Rotation'].default_value[2] = math.radians(rotation_deg)
    nt.links.new(coords.outputs['Generated'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    return world


def area_light(name, location, target, power, size, size_y=None, color=(1, 1, 1)):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.color = color
    data.shape = 'RECTANGLE' if size_y else 'DISK'
    data.size = size
    if size_y:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    return obj


def product_lighting(hdri_strength=0.22, key=62.0):
    """Catalogue-style white studio: a large key from the camera's left and above (it
    lights the skier's-right flanks, as in LOOK's images), a frontal fill, a top light and
    a rim, over a dim HDRI that gives metals and gloss something to reflect. Standard
    view transform (catalogue renders keep saturated paint); render with a transparent
    film and composite onto white."""
    studio_world(hdri_strength, 200.0)
    target = (0.0, 0.0, 0.04)
    area_light('Softbox key', (-1.0, 0.25, 0.85), target, key, 1.3, 0.8)
    area_light('Softbox fill', (-1.1, -0.95, 0.45), target, key * 0.55, 1.4, 1.0)
    area_light('Top', (0.1, 0.1, 1.2), target, key * 0.35, 1.2, 1.2)
    area_light('Rim', (0.9, 0.8, 0.6), target, key * 0.45, 1.0, 0.6)
    area_light('Kicker', (0.6, -1.1, 0.25), target, key * 0.2, 0.8, 0.5)
    scene = bpy.context.scene
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0


def catalogue_camera(name='Catalogue camera'):
    """LOOK's product-image viewpoint: fitted to keypoints in LOOK's Pivot 2.0 render, then
    refined by maximizing silhouette overlap (IoU 0.76). 115.6 mm lens at 1.6 m, 21° down."""
    import math
    from mathutils import Vector
    target = Vector((0.03178, 0.03193, 0.05774))
    az, el, dist = 0.73145, 0.36884, 1.6
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), -math.sin(el)))
    cam = camera(name, target - d * dist, lens=115.56)
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
    cam.data.sensor_fit = 'HORIZONTAL'
    cam.data.sensor_width = 36
    return cam


def camera(name, location, target=None, rotation=None, lens=None, ortho_scale=None, up='Y'):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    if rotation is not None:
        obj.rotation_euler = rotation
    elif target is not None:
        obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', up).to_euler()
    if ortho_scale:
        data.type = 'ORTHO'
        data.ortho_scale = ortho_scale
    if lens:
        data.lens = lens
    data.clip_start = 0.001
    data.clip_end = 20
    return obj


def render(path, camera_obj, resolution=(1600, 1600), samples=None, transparent=False):
    scene = bpy.context.scene
    scene.camera = camera_obj
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    if samples:
        scene.cycles.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path
