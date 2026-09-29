"""LOOK Pivot 2.0 15 GW turntable heel as signed-distance solids.

Heel frame (mm): x lateral (+x = skier's left), y = v measured rearward from the
turntable centre, z up from the ski. The cast tower is modelled in its own frame
(x, w along the tower axis from the pivot axle, s toward the boot) and placed with an
object transform. Proportions come from side, front three-quarter and paired
photographs of a retail binding (heel scaled against the toe in the same frame);
the "product" pose follows LOOK's catalogue renders (tower upright, brake retracted).
Approximate: not factory CAD.
"""
import math
from dataclasses import dataclass
import numpy as np
from mathutils import Matrix
from . import sdf
from .sdf import F

ARM_LENGTH = 77.3            # rivet (bracket pivot) to tower axle, from the side photo
ARM_X = (34.4, 29.8)          # arm lateral offset at the rivet eye and at the knuckle
TURNTABLE_R = 44.0
# Tower proportions refined against LOOK's catalogue silhouette (IoU 0.775 -> 0.788):
# 10% slimmer across and front-to-back, 5% taller than the first photo-based pass.
TOWER_SCALE = (0.90, 1.05, 0.90)   # x, w, s


@dataclass
class Pose:
    name: str
    tilt: float            # tower axis lean back from vertical, degrees
    rivet: tuple           # arm lower pivot on the turntable bracket (v, z)
    arm_angle: float       # arm elevation from the rivet to the tower axle, degrees
    pedal_z: float         # pedal pad centre height
    pedal_tilt: float      # pedal pitch (negative = front edge up)
    brake: str             # 'retracted' (along the ski), 'deployed' (down) or 'flared' (catalogue)

    @property
    def pivot(self):
        a = math.radians(self.arm_angle)
        return (self.rivet[0] + ARM_LENGTH * math.cos(a), self.rivet[1] + ARM_LENGTH * math.sin(a))

    @property
    def axis(self):
        a = math.radians(self.tilt)
        return np.array([0.0, math.sin(a), math.cos(a)])

    @property
    def fwd(self):
        a = math.radians(self.tilt)
        return np.array([0.0, -math.cos(a), math.sin(a)])

    def matrix(self):
        """Tower local (x, w, s) mm -> heel (x, v, z) mm."""
        ax, fw = self.axis, self.fwd
        pv = self.pivot
        return Matrix(((1, 0, 0, 0), (0, ax[1], fw[1], pv[0]), (0, ax[2], fw[2], pv[1]), (0, 0, 0, 1)))

    def to_heel(self, x, w, s):
        ax, fw = self.axis, self.fwd
        pv = self.pivot
        return np.array([x, pv[0] + ax[1] * w + fw[1] * s, pv[1] + ax[2] * w + fw[2] * s])


POSES = {
    # LOOK's catalogue renders: pedal raised, brakes flared out and down (solved by
    # back-projecting the brake from the product image with the fitted camera). The tower
    # leans back 14° (revision 3; revision 2 stood it at 9°, which read too upright).
    'catalogue': Pose('catalogue', 14.0, (14.9, 25.2), 19.72, 25.0, -6.0, 'flared'),
    # Mounted on a ski with the boot's heel down: pedal flat, brakes folded along the ski.
    'ski': Pose('ski', 14.0, (14.9, 25.2), 19.72, 21.5, 0.0, 'retracted'),
    # Step-in position as photographed on a retail binding.
    'open': Pose('open', 17.0, (14.9, 25.2), 19.72, 38.5, -21.0, 'deployed'),
}

# Tower sections: w, half-width x, s_rear, s_front
TOWER = np.array([
    [-9.0, 29.4, -13.5, 11.0],
    [-4.0, 29.2, -16.0, 14.5],
    [2.0, 28.6, -17.8, 17.5],
    [10.0, 27.0, -20.0, 21.0],
    [18.0, 25.2, -21.6, 23.8],
    [27.0, 23.6, -22.4, 25.6],
    [45.0, 23.0, -21.2, 23.6],
    [70.0, 22.1, -19.2, 21.0],
    [95.0, 21.2, -17.2, 18.4],
    [114.0, 20.5, -15.6, 16.4],
])
LIP_SIDE = [(24, 24.6), (13, 25.4), (3, 29.0), (-4.5, 34.2), (-9.2, 38.2), (-12.6, 38.0), (-13.4, 34.6), (-9.5, 26.8), (-4.0, 19.5), (5, 15.5), (14, 16.5)]
LEG_SIDE = [(26, -22.2), (8, -21.8), (-10, -20.8), (-21, -19.4), (-25.8, -15.6), (-24.6, -11), (-15, -9.6), (-3, -11.2), (12, -14), (24, -17)]
DIN_WINDOW = (3.0, 51.0, 6.0, 9.0)     # x centre, w centre, half x, half w (front face)
UPPER_WINDOW = (4.0, 99.5, 6.2, 6.8)
HUB_SCREWS = [(11.0, -11.5), (-11.0, -11.5)]


def _rrect(hx, s0, s1, r):
    pts = []
    for cx, cs, start in ((hx - r, s1 - r, 0), (-hx + r, s1 - r, 90), (-hx + r, s0 + r, 180), (hx - r, s0 + r, 270)):
        for k in range(7):
            a = math.radians(start + 15 * k)
            pts.append((cx + r * math.cos(a), cs + r * math.sin(a)))
    return pts


def _tower_section(w):
    """Cast tower section (x, s): tight front corners under the gloss strips, a back
    rounded almost to a half-round, and gently crowned sides and back (no flat slab)."""
    if w < TOWER[0, 0] or w > TOWER[-1, 0]:
        return None
    hx, s0, s1 = sdf.smooth_table(w, TOWER)
    r_front = float(np.interp(w, [-9, 20, 114], [4.0, 5.5, 5.5]))
    r_back = float(np.interp(w, [-9, 20, 60, 114], [6.0, 10.0, 11.5, 11.0]))
    mid = (s0 + s1) / 2
    pts = [(0, s1), (hx, s1), (hx + 0.7, mid), (hx, s0), (0, s0 - 1.2), (-hx, s0), (-hx - 0.7, mid), (-hx, s1)]
    return sdf.fillet_polygon(pts, [80, r_front, 90, r_back, 70, r_back, 90, r_front])


def _front(w):
    return np.interp(w, TOWER[:, 0], TOWER[:, 1]).astype(F), np.interp(w, TOWER[:, 0], TOWER[:, 3]).astype(F)


def tower_paint(grid):
    x, w, s = grid.P
    t = sdf.loft(grid, _tower_section, axis=1)
    t = sdf.smax(t, sdf.plane(grid.P, (0, 1.0, -0.102), 112.2 / math.hypot(1.0, 0.102)), 8.0)
    # Rounded back-top edge: the top falls away toward the ski tail.
    t = sdf.smax(t, sdf.plane(grid.P, (0, 0.8, -0.6), 93.0), 9.0)
    t = sdf.smax(t, F(-9.2) - w, 2.0)
    # Heel cup: an inverted U whose side claws reach forward over the boot heel.
    lip = sdf.extrude(sdf.polygon2(w, s, sdf.catmull(LIP_SIDE, 8)), x, -26.0, 26.0, 3.2)
    t = sdf.smin(t, lip, 5.0)
    hub = np.maximum(sdf.cylinder(grid.P, (0, 0, 0), 'x', 11.5, 27.0, 2.0), F(17.0) - np.abs(x))
    t = sdf.smin(t, hub, 2.0)
    arch = sdf.cylinder(grid.P, (0, -19.0, 8.0), 'z', 24.0, 40.0, 0.0)   # opening for the boot heel
    t = sdf.sub(t, arch, 3.0)
    hx, sf = _front(w)
    panel = sdf.inter(np.abs(x - F(1.5)) - (hx - F(9.5)), sf - F(1.0) - s, w - F(109.0), F(33.0) - w)
    t = sdf.sub(t, panel, 0.8)
    for cx, cw, hxw, hw in (DIN_WINDOW, UPPER_WINDOW):
        pocket = np.maximum(sdf.box((x, w, s), (cx, cw, 0), (hxw, hw, 80), 1.3), sf - F(3.4) - s)
        t = sdf.sub(t, pocket, 0.4)
    t = sdf.sub(t, sdf.cylinder(grid.P, (0, 111.0, -5.0), 'y', 6.6, 4.0, 0.4), 0.4)
    # Rear spur under the hub and the ribbed flank panels (cast, painted).
    leg = sdf.extrude(sdf.polygon2(w, s, sdf.catmull(LEG_SIDE, 8)), x, -12.0, 12.0, 3.0)
    t = sdf.smin(t, leg, 2.5)
    panel, slots = tower_ribs(grid, hx, sf)
    t = sdf.smin(t, panel, 0.5)
    return sdf.sub(t, slots, 0.35)


def tower_strips(grid):
    """Gloss-black protective strips along the two front corners (wide on the skier's right)."""
    x, w, s = grid.P
    hx, sf = _front(w)
    def strip(sign, width):
        dx = np.maximum((hx - F(width)) - sign * x, sign * x - (hx + F(0.9)))
        ds = np.maximum(sf - F(8.0) - s, s - (sf + F(1.3)))
        dw = np.maximum(F(28.0) - w, w - F(110.5))
        return sdf.smax(sdf.smax(dx, ds, 1.2), dw, 2.0)
    return np.minimum(strip(-1, 15.5), strip(1, 5.5))


def tower_ribs(grid, hx, sf):
    """Cast rib panel low on each flank (painted, as on the coloured editions): a plate
    standing ~0.9 mm proud with five 1.5 mm slots rising toward the tail at ~20° to the
    tower's cross axis. Returns (panel, slots) fields."""
    x, w, s = grid.P
    ax = np.abs(x)
    panel = sdf.inter(ax - (hx + F(0.9)), (hx - F(1.2)) - ax, F(29.0) - w, w - F(56.0), F(-13.0) - s, s - (sf - F(7.5)))
    rib = np.abs(((w + F(0.36) * s - F(31.5)) % F(5.2)) - F(2.6)) - F(1.05)
    slots = sdf.inter(rib, F(31.0) - w, w - F(54.5), F(-11.5) - s, s - (sf - F(9.5)), (hx - F(0.6)) - ax)
    return panel, slots


def window_backing(grid):
    """Dark inserts behind the window glass (the DIN mechanism housing)."""
    x, w, s = grid.P
    hx, sf = _front(w)
    d = None
    for cx, cw, hxw, hw in (DIN_WINDOW, UPPER_WINDOW):
        g = np.maximum(sdf.box((x, w, s), (cx, cw, 0), (hxw - 0.2, hw - 0.2, 80), 1.1), sdf.inter(s - (sf - F(3.0)), sf - F(3.6) - s))
        d = g if d is None else np.minimum(d, g)
    return d


def tower_glass(grid):
    x, w, s = grid.P
    hx, sf = _front(w)
    d = None
    for cx, cw, hxw, hw in (DIN_WINDOW, UPPER_WINDOW):
        g = np.maximum(sdf.box((x, w, s), (cx, cw, 0), (hxw - 0.3, hw - 0.3, 80), 1.1), s - (sf - F(0.4)))
        g = np.maximum(g, sf - F(3.3) - s)
        d = g if d is None else np.minimum(d, g)
    return d


def tower_steel(grid):
    """Top DIN screw, the small front screw and the chrome DIN indicator block."""
    x, w, s = grid.P
    hx, sf = _front(w)
    cap = sdf.cylinder(grid.P, (0, 111.6, -5.0), 'y', 6.2, 2.4, 0.8)
    sock = sdf.inter(np.maximum(np.abs(x) * F(0.866) + np.abs(s + F(5.0)) * F(0.5), np.abs(s + F(5.0))) - F(2.4), F(112.2) - w)
    cap = sdf.sub(cap, sock, 0.2)
    screw = np.maximum(sdf.ellipsoid(grid.P, (4.0, 78.0, 0), (2.9, 2.9, 30)), sf - F(1.6) - s)
    screw = np.maximum(screw, s - (sf + F(0.9)))
    cross = sdf.union(sdf.box(grid.P, (4.0, 78.0, 0), (1.9, 0.35, 80), 0.1), sdf.box(grid.P, (4.0, 78.0, 0), (0.35, 1.9, 80), 0.1))
    screw = sdf.sub(screw, np.maximum(cross, sf + F(0.3) - s), 0.1)
    indicator = np.maximum(sdf.box(grid.P, (UPPER_WINDOW[0], UPPER_WINDOW[1], 0), (3.6, 4.4, 80), 1.2), sdf.inter(s - (sf - F(1.6)), sf - F(4.0) - s))
    return sdf.union(cap, screw, indicator)


def _segment_frame(a, b):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ax = (b - a) / np.linalg.norm(b - a)
    ref = np.array([1.0, 0, 0]) if abs(ax[0]) < 0.9 else np.array([0, 0, 1.0])
    bx = np.cross(ax, ref); bx /= np.linalg.norm(bx)
    return ax, bx, np.cross(ax, bx)


def knurled(P, a, b, r, depth=0.28, count=28):
    ax, bx, cx = _segment_frame(a, b)
    px, py, pz = P[0] - F(a[0]), P[1] - F(a[1]), P[2] - F(a[2])
    t = px * F(ax[0]) + py * F(ax[1]) + pz * F(ax[2])
    pb = px * F(bx[0]) + py * F(bx[1]) + pz * F(bx[2])
    pc = px * F(cx[0]) + py * F(cx[1]) + pz * F(cx[2])
    L = float(np.linalg.norm(np.asarray(b, float) - np.asarray(a, float)))
    d_r = np.sqrt(pb * pb + pc * pc) - (F(r) + F(depth) * np.cos(F(count) * np.arctan2(pc, pb)))
    d_t = np.abs(t - F(L / 2)) - F(L / 2 - 0.3)
    return np.minimum(np.maximum(d_r, d_t), 0) + sdf.length(np.maximum(d_r, 0), np.maximum(d_t, 0)) - F(0.3)


def hex_x(P, c, across, half_len, rr=0.5):
    x, y, z = P[0] - F(c[0]), P[1] - F(c[1]), P[2] - F(c[2])
    kx, ky, kz = -0.8660254, 0.5, 0.57735
    py, pz = np.abs(y), np.abs(z)
    dot = F(2) * np.minimum(F(kx) * py + F(ky) * pz, 0)
    py = py - dot * F(kx); pz = pz - dot * F(ky)
    h = F(across / 2 - rr)
    d2 = sdf.length(py - sdf.clamp(py, -F(kz) * h, F(kz) * h), pz - h) * np.sign(pz - h) - F(rr)
    dx = np.abs(x) - F(half_len)
    return np.minimum(np.maximum(d2, dx), 0) + sdf.length(np.maximum(d2, 0), np.maximum(dx, 0))


def arm_points(sign, pose):
    pv = pose.pivot
    return np.array([sign * ARM_X[0], pose.rivet[0], pose.rivet[1]]), np.array([sign * ARM_X[1], pv[0], pv[1]])


def base(P):
    x, v, z = P
    front = sdf.cylinder(P, (0, 0, 1.6), 'z', TURNTABLE_R + 1.2, 1.6, 0.6)
    plan = sdf.catmull([(0, 116.5), (8, 115.5), (17, 110), (24, 98), (27, 70), (27.5, 30), (30, 12), (-30, 12), (-27.5, 30), (-27, 70), (-24, 98), (-17, 110), (-8, 115.5)], 8)
    track = sdf.extrude(sdf.polygon2(x, v, plan), z, 0, 4.6, 0.8)
    block = sdf.extrude(sdf.polygon2(v, z, sdf.catmull([(52, 4.0), (62, 6.5), (74, 11.5), (86, 13.6), (100, 13.0), (106, 9.0), (107, 4.0)], 8)), x, -22, 22, 2.0)
    d = sdf.smin(np.minimum(front, track), block, 2.0)
    # Brake pivot bosses under the turntable edge.
    for sx in (-1, 1):
        d = sdf.smin(d, sdf.cylinder(P, (sx * 32.0, 8.0, 3.2), 'x', 4.2, 7.0, 1.0), 1.0)
    return d


def turntable(P):
    R = TURNTABLE_R
    pts = [(0, 3.0), (R - 1.2, 3.0), (R, 4.2), (R - 0.4, 6.6), (R - 3.2, 7.3), (R - 5.0, 6.4), (28.5, 6.2), (28.5, 6.9), (0, 6.9)]
    return sdf.revolve(lambda r, a: sdf.polygon2(r, a, pts), P, (0, 0, 0), 'z')


def inner_disc(P):
    x, v, z = P
    d = sdf.cylinder(P, (0, 0, 7.5), 'z', 27.0, 1.1, 0.7)
    for cx, cv in HUB_SCREWS:
        cone = sdf.length(x - F(cx), v - F(cv)) - (F(2.4) + np.maximum(z - F(7.0), 0) * F(1.1))
        d = sdf.sub(d, np.maximum(cone, F(6.0) - z), 0.2)
    return d


def hub_screw(P, cx, cv):
    x, v, z = sdf.translate(P, (cx, cv, 0))
    Q = (x, v, z)
    head = sdf.revolve(lambda r, a: sdf.polygon2(r, a, [(0, 6.2), (2.3, 6.2), (4.4, 8.3), (4.3, 8.55), (0, 8.55)]), Q, (0, 0, 0), 'z')
    cross = sdf.union(sdf.box(Q, (0, 0, 8.6), (2.6, 0.5, 1.4), 0.1), sdf.box(Q, (0, 0, 8.6), (0.5, 2.6, 1.4), 0.1))
    diag = sdf.union(sdf.box(sdf.rot_z(Q, 45), (0, 0, 8.8), (1.5, 0.16, 0.6)), sdf.box(sdf.rot_z(Q, -45), (0, 0, 8.8), (1.5, 0.16, 0.6)))
    return sdf.sub(head, sdf.union(cross, diag), 0.12)


def fender(P):
    """Black arc around the rear of the turntable hub (boot heel support)."""
    x, v, z = P
    r = sdf.length(x, v)
    ring = sdf.box2(r, z, (34.0, 9.4), (7.0, 3.4), 1.6)
    return sdf.smax(ring, F(-8.0) - v, 2.0)     # rear half plus a little, softened ends


def bracket(P, sign, pose):
    x, v, z = P
    rv, rz = pose.rivet
    lift = rz - 25.2                     # the fin's apex follows the rivet height
    outline = sdf.catmull([(-18, 6.4), (30, 6.4), (29, 10), (24, 19 + lift * 0.5), (19.5, 29.8 + lift), (15, 32.2 + lift), (10, 30.5 + lift), (3, 17 + lift * 0.5), (-9, 9.5)], 8)
    plate = sdf.extrude(sdf.polygon2(v, z, outline), x * F(sign), 30.4, 32.6, 0.5)
    rivet = sdf.ellipsoid(P, (sign * 36.2, rv, rz), (2.2, 4.6, 4.6))
    axle = sdf.cylinder(P, (sign * 33.5, rv, rz), 'x', 2.6, 3.0, 0.3)
    return sdf.union(plate, rivet, axle)


def arm(P, sign, pose):
    r, k = arm_points(sign, pose)
    dirv = (k - r) / np.linalg.norm(k - r)
    p1, p2, p3 = r + dirv * 30.0, r + dirv * 38.5, r + dirv * 67.0
    eye = sdf.cylinder(P, (r[0], r[1], r[2]), 'x', 6.0, 1.6, 0.6)
    link = sdf.smin(eye, sdf.capsule(P, r, p1, 3.5), 1.5)
    tube = sdf.capsule(P, p2, p3, 4.9)
    knuckle = hex_x(P, (sign * (ARM_X[1] + 1.0), k[1], k[2]), 15.0, 6.0, 0.6)
    pin = sdf.cylinder(P, (sign * (ARM_X[1] + 7.6), k[1], k[2]), 'x', 4.2, 1.2, 0.5)
    return sdf.union(link, sdf.smin(tube, knuckle, 1.5), pin), knurled(P, p1, p2, 5.0)


def u_bar_path(sign, pose):
    X = sign * 28.8
    kv, kz = pose.pivot
    return [(X, kv - 1.7, kz + 0.7), (X, kv + 1.3, kz - 8.3), (X, kv + 4.1, kz - 21.3), (X, 93.0, 12.5), (X, 95.5, 6.2), (X, 104.0, 5.2)]


def pedal(P, pose):
    Q = sdf.rot_x(P, pose.pedal_tilt, (0, 0.5, pose.pedal_z))
    pad = sdf.box(Q, (0, 0, 0), (27.0, 14.5, 3.8), 2.6)
    notch = sdf.box(Q, (0, -14.5, 0), (9.5, 3.4, 5.5), 1.2)      # step in the front edge
    return sdf.sub(pad, notch, 0.8)


def pedal_metal(P, pose):
    """Zinc carrier, corner clips and hinge under the pedal."""
    Q = sdf.rot_x(P, pose.pedal_tilt, (0, 0.5, pose.pedal_z))
    plate = sdf.box(Q, (0, 2.0, -4.6), (18.0, 10.5, 1.0), 0.8)
    clips = sdf.union(*[sdf.box(Q, (cx, cv, 0.6), (1.6, 1.2, 3.8), 0.4) for cx, cv in ((-26.0, 8.0), (26.0, 8.0), (26.0, -8.0), (-26.0, -8.0))])
    top = pose.pedal_z - 5.0
    legs = sdf.union(*[sdf.capsule(P, (sx * 14.0, 6.0, top), (sx * 15.5, 16.0, 9.0), 1.6) for sx in (-1, 1)])
    hinge = sdf.cylinder(P, (0, 16.5, 9.0), 'x', 2.4, 18.0, 0.4)
    # Front mechanism: stamped plate and the large adjustment screw below the pedal nose.
    mech = sdf.box(P, (0, -26.0, 8.2), (11.0, 9.0, 0.8), 0.5)
    screw = sdf.cylinder(P, (4.0, -27.0, 10.0), 'z', 4.2, 1.3, 0.9)
    cross = sdf.union(sdf.box(P, (4.0, -27.0, 11.2), (2.6, 0.5, 0.8), 0.1), sdf.box(P, (4.0, -27.0, 11.2), (0.5, 2.6, 0.8), 0.1))
    return sdf.union(plate, clips, legs, hinge, mech, sdf.sub(screw, cross, 0.1))


def brake_path(sign, pose):
    if pose.brake == 'retracted':
        X = sign * 51.0
        return [(sign * 22.0, 6.0, 3.0), (sign * 36.0, 7.0, 3.5), (X, 12.0, 5.0), (X, 30.0, 6.5), (X, 96.0, 7.5)]
    if pose.brake == 'flared':
        return [(sign * 22.0, -2.0, 3.0), (sign * 47.0, -6.0, 4.0), (sign * 73.0, 60.4, -20.0)]
    d = math.radians(58.0)
    L = 84.0
    start = (sign * 40.5, 12.0, 6.0)
    return [(sign * 22.0, 6.0, 3.0), (sign * 37.0, 8.0, 4.0), start, (sign * 48.0, 12.0 + L * math.cos(d), 6.0 - L * math.sin(d))]


def _pad_direction(sign, pose):
    pts = brake_path(sign, pose)
    a = np.array(pts[-2], float); b = np.array(pts[-1], float)
    dirv = (b - a) / np.linalg.norm(b - a)
    if pose.brake == 'deployed':   # the pad bends back toward the ski tail
        dirv = dirv * 0.75 + np.array([0, 0.66, 0]) * 0.5
    elif pose.brake == 'flared':   # pad runs back and out, nearly level
        dirv = np.array([sign * 0.665, 0.747, -0.04])
    return b, dirv / np.linalg.norm(dirv)


def brake_pad(P, sign, pose):
    b, dirv = _pad_direction(sign, pose)
    c = b + dirv * 17.0
    ax, _, _ = _segment_frame(b, c)
    lat = np.array([sign * 1.0, 0, 0]) - ax * (ax[0] * sign)
    lat /= np.linalg.norm(lat)
    up = np.cross(ax, lat)
    if up[2] < 0:
        up = -up
    px, py, pz = P[0] - F(b[0]), P[1] - F(b[1]), P[2] - F(b[2])
    t = px * F(ax[0]) + py * F(ax[1]) + pz * F(ax[2])
    u = px * F(lat[0]) + py * F(lat[1]) + pz * F(lat[2])
    w = px * F(up[0]) + py * F(up[1]) + pz * F(up[2])
    body = sdf.box((u, t, w), (0, 19.0, 0), (5.0, 19.0, 4.4), 1.8)
    spike = sdf.extrude(sdf.polygon2(t, w, [(26, -2.5), (37.5, -2.5), (35.5, -11.5), (32.0, -12.0)]), u, -3.0, 3.0, 0.8)
    return sdf.smin(body, spike, 1.0)


def decorate(tower_obj, mats):
    """15 on the skier's right flank, PIVOT on the left, DIN scale behind the front window."""
    from . import decals
    out = [decals.text('Heel print 15', '15', tower_obj, (-24.0, 93.0, -3.0), (0, 0, 1), (0, 1, 0), 33.0, mats['ink'], 'bold'),
           decals.text('Heel print PIVOT', 'PIVOT', tower_obj, (24.0, 90.0, -2.2), (0, 1, 0), (0, 0, 1), 12.0, mats['ink'], 'semibold', 1.08)]
    sx, sw, ss = TOWER_SCALE
    wall = (float(np.interp(51.0, TOWER[:, 0], TOWER[:, 3])) - 3.4) * ss
    for k, label in enumerate(('7', '9', '11', '13', '15')):
        out.append(decals.text(f'Heel DIN scale {label}', label, tower_obj, (5.2 * sx, (57.2 - 3.1 * k) * sw, wall), (1, 0, 0), (0, 1, 0), 2.5, mats['print'], 'semibold', lift=0.25, max_edge=0.2))
    return out


def build(mats, collection, pose='catalogue', voxel=0.28, graphics=True):
    from . import curves
    pose = POSES[pose] if isinstance(pose, str) else pose
    objs = []
    world = Matrix.Scale(0.001, 4) @ pose.matrix() @ Matrix.Scale(1000, 4)
    g = sdf.Grid((-33, -30, -27), (33, 117, 42), voxel)
    paint = tower_paint(g)
    strips = tower_strips(g)
    paint = np.maximum(paint, -(strips - F(0.05)))
    tower = [sdf.to_object('Heel tower', g, paint, mats['paint'], collection),
             sdf.to_object('Heel tower strips', g, strips, mats['gloss'], collection)]
    del paint, strips
    g = sdf.Grid((-12, 40, 8), (12, 110, 30), voxel * 0.6)
    tower.append(sdf.to_object('Heel DIN windows', g, tower_glass(g), mats['window'], collection))
    tower.append(sdf.to_object('Heel DIN window backing', g, window_backing(g), mats['dialprint'], collection))
    g = sdf.Grid((-10, 70, -14), (12, 119, 30), 0.12)
    tower.append(sdf.to_object('Heel DIN adjusters', g, tower_steel(g), mats['steel'], collection))
    scale = Matrix.Diagonal((*TOWER_SCALE, 1.0))
    for obj in tower:
        obj.data.transform(scale)
        obj.matrix_world = world
        obj['tower'] = True
    # Super Edition: the tower fades to black through the skirt and heel cup.
    sdf.vertex_attribute(tower[0], 'paint_fade', lambda x, w, s: np.clip((44.0 - w) / 22.0, 0, 1))
    objs += tower
    if graphics:
        objs += decorate(tower[0], mats)
    g = sdf.Grid((-47, -47, -1), (47, 119, 16), voxel)
    objs.append(sdf.to_object('Heel base', g, base(g.P), mats['polymer'], collection))
    g = sdf.Grid((-46, -46, 2), (46, 46, 9), voxel * 0.7)
    objs.append(sdf.to_object('Heel turntable', g, turntable(g.P), mats['alu'], collection))
    g = sdf.Grid((-29, -29, 5.5), (29, 29, 9.5), voxel * 0.5)
    objs.append(sdf.to_object('Heel turntable hub', g, inner_disc(g.P), mats['titanium'], collection))
    for i, (cx, cv) in enumerate(HUB_SCREWS):
        g = sdf.Grid((cx - 5.5, cv - 5.5, 5.5), (cx + 5.5, cv + 5.5, 10), 0.08)
        objs.append(sdf.to_object(f'Heel hub screw {i + 1}', g, hub_screw(g.P, cx, cv), mats['zinc'], collection))
    g = sdf.Grid((-43, -12, 5), (43, 43, 14), 0.2)
    objs.append(sdf.to_object('Heel fender', g, fender(g.P), mats['polymer'], collection))
    for sign in (-1, 1):
        side = 'L' if sign > 0 else 'R'
        g = sdf.Grid((sign * 34.0 - 6, -21, 4), (sign * 34.0 + 6, 34, 34), 0.15)
        objs.append(sdf.to_object(f'Heel bracket {side}', g, bracket(g.P, sign, pose), mats['alu'], collection))
        r, k = arm_points(sign, pose)
        g = sdf.Grid(np.minimum(r, k) - 10, np.maximum(r, k) + 10, 0.16)
        nickel, nut = arm(g.P, sign, pose)
        objs.append(sdf.to_object(f'Heel arm {side}', g, nickel, mats['nickel'], collection))
        objs.append(sdf.to_object(f'Heel arm joint {side}', g, nut, mats['steel'], collection))
        objs.append(curves.tube(f'Heel U-bar {side}', u_bar_path(sign, pose), 3.3, mats['darksteel'], collection))
        objs.append(curves.tube(f'Heel brake arm {side}', brake_path(sign, pose), 2.7, mats['steel'], collection))
        end = np.array(brake_path(sign, pose)[-1])
        g = sdf.Grid(end - 44, end + 44, 0.25)
        objs.append(sdf.to_object(f'Heel brake pad {side}', g, brake_pad(g.P, sign, pose), mats['polymer'], collection))
    g = sdf.Grid((-30, -18, pose.pedal_z - 12), (30, 17, pose.pedal_z + 12), 0.2)
    objs.append(sdf.to_object('Heel pedal', g, pedal(g.P, pose), mats['rubber'], collection))
    g = sdf.Grid((-30, -37, 5), (30, 21, pose.pedal_z + 8), 0.2)
    objs.append(sdf.to_object('Heel pedal mechanism', g, pedal_metal(g.P, pose), mats['zinc'], collection))
    return objs
