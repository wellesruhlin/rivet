"""Signed-distance modeling on dense numpy grids, meshed with OpenVDB (bundled with Blender).

Units are millimeters; distances are negative inside. A Grid supplies broadcast
coordinates (x: (nx,1,1), y: (1,ny,1), z: (1,1,nz)) so 2D profiles stay cheap until
they are combined. Formulas follow Inigo Quilez's distance-function catalogue.
"""
import numpy as np

F = np.float32


class Grid:
    def __init__(self, lo, hi, voxel):
        self.voxel = float(voxel)
        self.lo = np.asarray(lo, dtype=np.float64)
        n = np.ceil((np.asarray(hi, dtype=np.float64) - self.lo) / voxel).astype(int) + 1
        self.shape = tuple(int(v) for v in n)
        axes = [(self.lo[i] + np.arange(n[i]) * voxel).astype(F) for i in range(3)]
        self.x = axes[0][:, None, None]
        self.y = axes[1][None, :, None]
        self.z = axes[2][None, None, :]

    @property
    def P(self):
        return self.x, self.y, self.z


# ---------------------------------------------------------------------------
# scalar helpers

def length(*c):
    s = c[0] * c[0]
    for v in c[1:]:
        s = s + v * v
    return np.sqrt(s)


def clamp(v, lo, hi):
    return np.minimum(np.maximum(v, lo), hi)


def smin(a, b, k):
    """Polynomial smooth minimum (blend radius k)."""
    if k <= 0:
        return np.minimum(a, b)
    h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def union(*ds):
    out = ds[0]
    for d in ds[1:]:
        out = np.minimum(out, d)
    return out


def inter(*ds):
    out = ds[0]
    for d in ds[1:]:
        out = np.maximum(out, d)
    return out


def sub(a, b, k=0.0):
    """a minus b (optionally smooth)."""
    return smax(a, -b, k) if k > 0 else np.maximum(a, -b)


def round_inter(a, b, r):
    """Intersection with a circular fillet of radius r along the crease (hg_sdf)."""
    r = F(r)
    return np.minimum(-r, np.maximum(a, b)) + length(np.maximum(a + r, 0), np.maximum(b + r, 0))


def round_union(a, b, r):
    """Union with a circular fillet of radius r in the concave corner (hg_sdf)."""
    r = F(r)
    return np.maximum(r, np.minimum(a, b)) - length(np.maximum(r - a, 0), np.maximum(r - b, 0))


def shell(d, t):
    return np.abs(d) - t


# ---------------------------------------------------------------------------
# transforms (return new coordinate triples)

def translate(P, t):
    return P[0] - F(t[0]), P[1] - F(t[1]), P[2] - F(t[2])


def rot_x(P, deg, c=(0, 0, 0)):
    x, y, z = translate(P, c)
    a = np.radians(deg)
    ca, sa = F(np.cos(a)), F(np.sin(a))
    return x, ca * y + sa * z, -sa * y + ca * z


def rot_y(P, deg, c=(0, 0, 0)):
    x, y, z = translate(P, c)
    a = np.radians(deg)
    ca, sa = F(np.cos(a)), F(np.sin(a))
    return ca * x - sa * z, y, sa * x + ca * z


def rot_z(P, deg, c=(0, 0, 0)):
    x, y, z = translate(P, c)
    a = np.radians(deg)
    ca, sa = F(np.cos(a)), F(np.sin(a))
    return ca * x + sa * y, -sa * x + ca * y, z


def mirror_x(P):
    return np.abs(P[0]), P[1], P[2]


# ---------------------------------------------------------------------------
# 3D primitives

def box(P, c, half, r=0.0):
    qx = np.abs(P[0] - F(c[0])) - F(half[0] - r)
    qy = np.abs(P[1] - F(c[1])) - F(half[1] - r)
    qz = np.abs(P[2] - F(c[2])) - F(half[2] - r)
    outside = length(np.maximum(qx, 0), np.maximum(qy, 0), np.maximum(qz, 0))
    inside = np.minimum(np.maximum(np.maximum(qx, qy), qz), 0)
    return outside + inside - F(r)


def sphere(P, c, r):
    return length(P[0] - F(c[0]), P[1] - F(c[1]), P[2] - F(c[2])) - F(r)


def ellipsoid(P, c, rad):
    x, y, z = (P[0] - F(c[0])) / F(rad[0]), (P[1] - F(c[1])) / F(rad[1]), (P[2] - F(c[2])) / F(rad[2])
    k0 = length(x, y, z)
    k1 = length(x / F(rad[0]), y / F(rad[1]), z / F(rad[2]))
    return k0 * (k0 - 1) / np.maximum(k1, 1e-6)


def capsule(P, a, b, r):
    a = np.asarray(a, F); b = np.asarray(b, F)
    ba = b - a
    px, py, pz = P[0] - a[0], P[1] - a[1], P[2] - a[2]
    h = clamp((px * ba[0] + py * ba[1] + pz * ba[2]) / F(ba @ ba), 0, 1)
    return length(px - ba[0] * h, py - ba[1] * h, pz - ba[2] * h) - F(r)


def _axis(P, c, axis):
    x, y, z = P[0] - F(c[0]), P[1] - F(c[1]), P[2] - F(c[2])
    if axis == 'x':
        return x, length(y, z)
    if axis == 'y':
        return y, length(x, z)
    return z, length(x, y)


def cylinder(P, c, axis, r, h, rr=0.0):
    """Capped cylinder along axis, half-length h, edge rounding rr."""
    a, rad = _axis(P, c, axis)
    dx = rad - F(r - rr)
    dy = np.abs(a) - F(h - rr)
    return np.minimum(np.maximum(dx, dy), 0) + length(np.maximum(dx, 0), np.maximum(dy, 0)) - F(rr)


def torus(P, c, axis, R, r):
    a, rad = _axis(P, c, axis)
    return length(rad - F(R), a) - F(r)


def plane(P, n, d0):
    n = np.asarray(n, F); n = n / np.linalg.norm(n)
    return P[0] * n[0] + P[1] * n[1] + P[2] * n[2] - F(d0)


# ---------------------------------------------------------------------------
# 2D profiles

def catmull(points, samples=12, closed=True):
    """Centripetal Catmull-Rom through control points; returns a dense polyline."""
    p = np.asarray(points, np.float64)
    n = len(p)
    out = []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = p[(i - 1) % n] if closed or i > 0 else p[0]
        p1 = p[i]
        p2 = p[(i + 1) % n]
        p3 = p[(i + 2) % n] if closed or i + 2 < n else p[-1]
        def tj(ti, a, b):
            return ti + max(np.linalg.norm(b - a), 1e-6) ** 0.5
        t0 = 0.0; t1 = tj(t0, p0, p1); t2 = tj(t1, p1, p2); t3 = tj(t2, p2, p3)
        for t in np.linspace(t1, t2, samples, endpoint=False):
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    if not closed:
        out.append(p[-1])
    return np.asarray(out)


def fillet_polygon(vertices, radii, arc_step=6.0):
    """Closed polygon with a tangent circular fillet of the given radius at each vertex.

    Fillets are shortened where neighbouring ones would overlap. arc_step is the
    angular sampling in degrees. Returns a dense (n, 2) polyline for polygon2/loft.
    """
    V = np.asarray(vertices, np.float64)
    n = len(V)
    R = np.broadcast_to(np.asarray(radii, np.float64), (n,))
    out = []
    for i in range(n):
        p, a, b = V[i], V[i - 1], V[(i + 1) % n]
        la, lb = np.linalg.norm(a - p), np.linalg.norm(b - p)
        d1, d2 = (a - p) / la, (b - p) / lb
        cos_t = float(np.clip(d1 @ d2, -1.0, 1.0))
        theta = np.arccos(cos_t)
        if R[i] <= 0 or theta > np.pi - 1e-3:
            out.append(p)
            continue
        t = R[i] / np.tan(theta / 2)
        t = min(t, 0.49 * la, 0.49 * lb)
        r = t * np.tan(theta / 2)
        bis = d1 + d2
        c = p + bis / np.linalg.norm(bis) * (r / np.sin(theta / 2))
        t1, t2 = p + d1 * t, p + d2 * t
        a1 = np.arctan2(*(t1 - c)[::-1])
        a2 = np.arctan2(*(t2 - c)[::-1])
        sweep = (a2 - a1 + np.pi) % (2 * np.pi) - np.pi      # shorter way round
        k = max(2, int(np.ceil(abs(np.degrees(sweep)) / arc_step)))
        for s in np.linspace(0.0, 1.0, k + 1):
            ang = a1 + sweep * s
            out.append(c + r * np.array([np.cos(ang), np.sin(ang)]))
    return np.asarray(out)


def smooth_table(t, table, cols=None):
    """Monotone cubic (Fritsch–Carlson) interpolation of table rows [t, v1, v2, ...] at t.

    Returns the interpolated values (clamped at the ends). Avoids the kinks a
    piecewise-linear lookup leaves in lofted surfaces.
    """
    T = table[:, 0]
    t = float(np.clip(t, T[0], T[-1]))
    i = int(np.clip(np.searchsorted(T, t) - 1, 0, len(T) - 2))
    h = T[i + 1] - T[i]
    s = (t - T[i]) / h
    out = []
    for j in (cols if cols is not None else range(1, table.shape[1])):
        y = table[:, j]
        delta = np.diff(y) / np.diff(T)
        m = np.zeros_like(y)
        m[0], m[-1] = delta[0], delta[-1]
        for k in range(1, len(y) - 1):
            m[k] = 0.0 if delta[k - 1] * delta[k] <= 0 else (delta[k - 1] + delta[k]) / 2
        for k in range(len(delta)):
            if delta[k] == 0:
                m[k] = m[k + 1] = 0.0
            else:
                a, b = m[k] / delta[k], m[k + 1] / delta[k]
                q = a * a + b * b
                if q > 9:
                    tau = 3 / np.sqrt(q)
                    m[k], m[k + 1] = tau * a * delta[k], tau * b * delta[k]
        h00, h10, h01, h11 = 2 * s**3 - 3 * s**2 + 1, s**3 - 2 * s**2 + s, -2 * s**3 + 3 * s**2, s**3 - s**2
        out.append(h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1])
    return out


def polygon2(u, v, pts):
    """Exact signed distance to a closed polygon (u, v broadcastable arrays)."""
    pts = np.asarray(pts, F)
    d = (u - pts[0, 0]) ** 2 + (v - pts[0, 1]) ** 2
    s = np.ones(np.broadcast(u, v).shape, F)
    n = len(pts)
    j = n - 1
    for i in range(n):
        ex, ey = pts[j, 0] - pts[i, 0], pts[j, 1] - pts[i, 1]
        wx, wy = u - pts[i, 0], v - pts[i, 1]
        ee = ex * ex + ey * ey
        if ee > 0:
            t = clamp((wx * ex + wy * ey) / ee, 0, 1)
            bx, by = wx - ex * t, wy - ey * t
            d = np.minimum(d, bx * bx + by * by)
        c1 = v >= pts[i, 1]
        c2 = v < pts[j, 1]
        c3 = ex * wy > ey * wx
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
        j = i
    return s * np.sqrt(d)


def box2(u, v, c, half, r=0.0):
    qx = np.abs(u - F(c[0])) - F(half[0] - r)
    qy = np.abs(v - F(c[1])) - F(half[1] - r)
    return length(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - F(r)


def circle2(u, v, c, r):
    return length(u - F(c[0]), v - F(c[1])) - F(r)


def extrude(d2, w, lo, hi, r=0.0):
    """Extrude a 2D distance along w between lo and hi with edge rounding r."""
    c = F((lo + hi) / 2)
    h = F((hi - lo) / 2)
    a = d2 + F(r)
    b = np.abs(w - c) - h + F(r)
    return np.minimum(np.maximum(a, b), 0) + length(np.maximum(a, 0), np.maximum(b, 0)) - F(r)


def loft(grid, section, axis=1, lo=None, hi=None, outside=1e3):
    """Slice-wise 2D distance: section(t) -> closed polygon in the plane normal to axis.

    For axis=1 (y) polygons are (x, z) points. Outside [lo, hi] the field is `outside`
    (close the ends with smax against planes). Exact in-plane, approximate along axis.
    """
    coords = [grid.x, grid.y, grid.z]
    t_axis = coords[axis].ravel()
    a, b = [c for i, c in enumerate(coords) if i != axis]
    out = np.full(grid.shape, F(outside), dtype=F)
    for k, t in enumerate(t_axis):
        if (lo is not None and t < lo) or (hi is not None and t > hi):
            continue
        pts = section(float(t))
        if pts is None:
            continue
        # drop the slice axis from the broadcast shapes
        a2 = np.squeeze(a, axis=axis)
        b2 = np.squeeze(b, axis=axis)
        d2 = polygon2(a2, b2, pts)
        idx = [slice(None)] * 3
        idx[axis] = k
        out[tuple(idx)] = d2
    return out


def revolve(d2fn, P, c, axis='z'):
    """Revolve a 2D profile d2fn(radial, axial) about an axis through c."""
    a, rad = _axis(P, c, axis)
    return d2fn(rad, a)


# ---------------------------------------------------------------------------
# meshing

def mesh_arrays(grid, d, band=3.0, adaptivity=0.0):
    """Return (verts_mm, tris, quads) for the zero level set of d on grid."""
    import openvdb as vdb
    d = np.broadcast_to(d, grid.shape)
    bw = F(band * grid.voxel)
    arr = np.ascontiguousarray(np.clip(d, -bw, bw), dtype=F)
    g = vdb.FloatGrid(float(bw))
    # Only voxels clipped exactly to the band edge become inactive; everything that
    # carries a real distance near the surface must stay active for interpolation.
    g.copyFromArray(arr, ijk=(0, 0, 0), tolerance=1e-6)
    g.transform = vdb.createLinearTransform(voxelSize=grid.voxel)
    g.gridClass = vdb.GridClass.LEVEL_SET
    pts, tris, quads = g.convertToPolygons(isovalue=0.0, adaptivity=float(adaptivity))
    pts = np.asarray(pts, np.float64) + grid.lo
    return pts, np.asarray(tris, np.int64).reshape(-1, 3), np.asarray(quads, np.int64).reshape(-1, 4)


def to_object(name, grid, d, material=None, collection=None, band=3.0, adaptivity=0.0, flip=True, smooth=True):
    """Mesh a distance field into a Blender object (meters). OpenVDB winds faces inward; flip fixes that."""
    import bpy
    verts, tris, quads = mesh_arrays(grid, d, band, adaptivity)
    if len(verts) == 0:
        raise ValueError(f'{name}: empty level set')
    if flip:
        tris = tris[:, ::-1]
        quads = quads[:, ::-1]
    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(verts))
    mesh.vertices.foreach_set('co', (verts * 0.001).astype(np.float32).ravel())
    loops = np.concatenate([quads.ravel(), tris.ravel()]).astype(np.int32)
    totals = np.concatenate([np.full(len(quads), 4), np.full(len(tris), 3)]).astype(np.int32)
    starts = np.concatenate([[0], np.cumsum(totals)[:-1]]).astype(np.int32)
    mesh.loops.add(len(loops))
    mesh.loops.foreach_set('vertex_index', loops)
    mesh.polygons.add(len(totals))
    mesh.polygons.foreach_set('loop_start', starts)
    mesh.polygons.foreach_set('loop_total', totals)
    if smooth:
        mesh.polygons.foreach_set('use_smooth', np.ones(len(totals), dtype=bool))
    mesh.update(calc_edges=True)
    mesh.validate(clean_customdata=False)
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(obj)
    if material is not None:
        mesh.materials.append(material)
    return obj


def vertex_attribute(obj, name, fn):
    """Stores a per-vertex float attribute computed from local coordinates in mm: fn(x, y, z)."""
    mesh = obj.data
    co = np.empty(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3) * 1000.0
    values = np.asarray(fn(co[:, 0], co[:, 1], co[:, 2]), np.float32)
    attr = mesh.attributes.get(name) or mesh.attributes.new(name, 'FLOAT', 'POINT')
    attr.data.foreach_set('value', values)
    return attr
