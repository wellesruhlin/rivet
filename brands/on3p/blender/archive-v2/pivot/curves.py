"""Bent wire and rod parts: polylines with filleted bends, swept into meshes."""
import numpy as np
import bpy


def fillet(points, bend_radius):
    """Replace interior corners with circular arcs (points in mm)."""
    p = [np.asarray(q, float) for q in points]
    out = [p[0]]
    for i in range(1, len(p) - 1):
        a, b, c = p[i - 1], p[i], p[i + 1]
        u = (a - b) / np.linalg.norm(a - b)
        v = (c - b) / np.linalg.norm(c - b)
        cosang = float(np.clip(u @ v, -1, 1))
        ang = np.arccos(cosang)
        if ang > np.radians(176) or ang < 1e-3:
            out.append(b)
            continue
        t = bend_radius / np.tan(ang / 2)
        t = min(t, 0.45 * np.linalg.norm(a - b), 0.45 * np.linalg.norm(c - b))
        r = t * np.tan(ang / 2)
        s, e = b + u * t, b + v * t
        bis = (u + v) / np.linalg.norm(u + v)
        center = b + bis * (r / np.sin(ang / 2))
        n = max(4, int(np.degrees(np.pi - ang) / 7))
        v0, v1 = s - center, e - center
        for k in range(n + 1):
            f = k / n
            # slerp between the two radius vectors
            omega = np.arccos(np.clip(v0 @ v1 / (np.linalg.norm(v0) * np.linalg.norm(v1)), -1, 1))
            if omega < 1e-6:
                q = v0
            else:
                q = (np.sin((1 - f) * omega) * v0 + np.sin(f * omega) * v1) / np.sin(omega)
            out.append(center + q)
    out.append(p[-1])
    return out


def tube(name, points_mm, radius_mm, material, collection=None, bend_radius=None, resolution=10):
    """Swept round rod along filleted polyline points (mm); returns a mesh object."""
    pts = fillet(points_mm, bend_radius or radius_mm * 2.2)
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius_mm / 1000
    curve.bevel_resolution = resolution
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(len(pts) - 1)
    for sp, q in zip(spline.points, pts):
        sp.co = (q[0] / 1000, q[1] / 1000, q[2] / 1000, 1)
    obj = bpy.data.objects.new(name, curve)
    (collection or bpy.context.scene.collection).objects.link(obj)
    if material is not None:
        curve.materials.append(material)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    mesh.name = name
    for poly in mesh.polygons:
        poly.use_smooth = True
    mobj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(mobj)
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.curves.remove(curve)
    if material is not None and not mesh.materials:
        mesh.materials.append(material)
    return mobj


def helix(name, center, axis_dir, radius, wire, turns, length, material, collection=None):
    """Coil spring from center along axis_dir (unit vector)."""
    axis_dir = np.asarray(axis_dir, float); axis_dir /= np.linalg.norm(axis_dir)
    ref = np.array([1.0, 0, 0]) if abs(axis_dir[0]) < 0.9 else np.array([0, 1.0, 0])
    b = np.cross(axis_dir, ref); b /= np.linalg.norm(b)
    c = np.cross(axis_dir, b)
    n = int(turns * 24)
    pts = []
    for k in range(n + 1):
        a = 2 * np.pi * turns * k / n
        pts.append(np.asarray(center) + axis_dir * (length * k / n - length / 2) + radius * (np.cos(a) * b + np.sin(a) * c))
    return tube(name, pts, wire, material, collection, bend_radius=0.01, resolution=5)
