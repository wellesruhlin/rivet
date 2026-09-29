"""Assembles the Pivot toe and heel around the boot centre (mount mark).

World frame (Blender, meters): origin at the mount mark on the ski's top surface,
-Y toward the ski nose, +Z up. Placement follows a 320 mm reference boot sole: the
toe jaw meets the boot toe at y = -160 mm, the heel cup meets the boot heel at +160 mm.
"""
import bpy
from mathutils import Matrix
from . import materials, toe, heel

BSL = 320.0
TOE_Y0 = -BSL / 2 - 88.0        # toe local u = 88 mm is the boot toe contact
HEEL_Y0 = BSL / 2 - 35.0        # boot heel end sits 35 mm behind the turntable centre


def _group(name, objs, location_mm, collection):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'PLAIN_AXES'
    empty.empty_display_size = 0.03
    collection.objects.link(empty)
    for obj in objs:
        mw = obj.matrix_world.copy()
        obj.parent = empty
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_world = mw
    empty.location = (location_mm[0] / 1000, location_mm[1] / 1000, location_mm[2] / 1000)
    return empty


def build(colorway='Black', pose='catalogue', collection=None, voxel=None):
    collection = collection or bpy.context.scene.collection
    mats = materials.build(colorway)
    toe_objs = toe.build(mats, collection, **({'voxel': voxel} if voxel else {}))
    heel_objs = heel.build(mats, collection, pose=pose, **({'voxel': voxel} if voxel else {}))
    t = _group('Pivot toe', toe_objs, (0, TOE_Y0, 0), collection)
    h = _group('Pivot heel', heel_objs, (0, HEEL_Y0, 0), collection)
    return mats, t, h, toe_objs + heel_objs
