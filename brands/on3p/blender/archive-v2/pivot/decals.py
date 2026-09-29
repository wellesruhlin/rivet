"""Printed graphics as thin conforming meshes (they survive glTF export, unlike shader decals).

Text is converted to a mesh, subdivided, laid out in the target part's local frame
(millimetres) and shrink-wrapped onto the part 0.04 mm above its surface.
Font: Barlow (SIL Open Font License, bundled with the app under public/licenses).
"""
from pathlib import Path
import bmesh
import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
FONTS = {
    'semibold': ROOT / 'node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff',
    'bold': ROOT / 'node_modules/@fontsource/barlow/files/barlow-latin-700-normal.woff',
    'black': ROOT / 'node_modules/@fontsource/barlow/files/barlow-latin-800-normal.woff',
}


def _font(weight):
    path = FONTS[weight]
    if not path.exists():
        return None
    return bpy.data.fonts.load(str(path), check_existing=True)


def _text_mesh(text, weight, size_mm, spacing=1.0):
    curve = bpy.data.curves.new('decal-text', 'FONT')
    curve.body = text
    font = _font(weight)
    if font:
        curve.font = font
    curve.size = size_mm
    curve.space_character = spacing
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    obj = bpy.data.objects.new('decal-text', curve)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.curves.remove(curve)
    return mesh


def _refine(mesh, max_edge):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    for _ in range(8):
        long_edges = [e for e in bm.edges if e.calc_length() > max_edge]
        if not long_edges:
            break
        bmesh.ops.subdivide_edges(bm, edges=long_edges, cuts=1, use_grid_fill=False)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bm.to_mesh(mesh)
    bm.free()


def text(name, body, target, origin, right, up, size_mm, material, weight='bold', spacing=1.0, lift=0.6, offset=0.04, max_edge=0.45, stretch=(1.0, 1.0)):
    """Places `body` on `target`. origin/right/up are in the target's local frame (mm).

    right x up must point out of the surface (the side the text is read from).
    """
    mesh = _text_mesh(body, weight, size_mm, spacing)
    _refine(mesh, max_edge)
    right = np.asarray(right, float); right /= np.linalg.norm(right)
    up = np.asarray(up, float); up /= np.linalg.norm(up)
    normal = np.cross(right, up)
    co = np.empty(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(float)
    local = np.asarray(origin, float) + np.outer(co[:, 0] * stretch[0], right) + np.outer(co[:, 1] * stretch[1], up) + normal * lift
    mesh.vertices.foreach_set('co', (local * 0.001).astype(np.float32).ravel())
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.name = name
    obj = bpy.data.objects.new(name, mesh)
    for coll in target.users_collection:
        coll.objects.link(obj)
    obj.matrix_world = target.matrix_world.copy()
    mesh.materials.append(material)
    mod = obj.modifiers.new('Conform', 'SHRINKWRAP')
    mod.target = target
    mod.wrap_method = 'NEAREST_SURFACEPOINT'
    mod.wrap_mode = 'ABOVE_SURFACE'
    mod.offset = offset * 0.001
    bpy.context.view_layer.update()
    evaluated = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    obj.modifiers.clear()
    old = obj.data
    obj.data = evaluated
    bpy.data.meshes.remove(old)
    evaluated.name = name
    if not evaluated.materials:
        evaluated.materials.append(material)
    return obj
