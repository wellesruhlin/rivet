"""LOOK Pivot 2.0 15 GW toe (aluminum Race toe) as signed-distance solids.

Local frame (mm): x lateral (+x = skier's left), y = u, measured rearward from the end
cap's front face, z up from the ski. Dimensions were measured from side and top
photographs of a retail binding (8.7 px/mm, scaled by the 18 mm stand height) and
checked against LOOK's product renders. Approximate: not factory CAD.
"""
import numpy as np
from . import sdf
from .sdf import F

CAP_Z = 36.5        # end cap / DIN adjuster axis
CAP_R = 15.2
JAW_Z = 37.5        # wing underside = 18 mm stand height + 19 mm ISO toe lug

# Front section loft: u, z_bottom, z_top, half-width bottom, half-width mid (z 36), half-width top
SHOE = np.array([
    # u     zb     zt    hb    hm    ht
    [6.0, 20.5, 49.0, 16.5, 18.0, 12.5],
    [7.5, 19.4, 51.0, 18.0, 19.6, 13.4],
    [10.0, 18.6, 54.5, 20.0, 21.4, 14.6],
    [14.0, 18.1, 56.6, 22.0, 23.2, 15.6],
    [22.0, 17.8, 57.2, 24.4, 25.3, 16.4],
    [32.0, 17.8, 57.6, 26.6, 27.0, 17.0],
    [44.0, 17.8, 58.3, 29.2, 28.6, 17.4],
    [52.0, 17.8, 58.8, 28.5, 27.5, 17.4],
    [58.0, 18.2, 59.2, 22.5, 21.0, 16.5],
])

# Rear body (the large convex "arch" flank that carries the wings), measured from the top
# photo widths (≈41 mm at u 62, 51 at u 70, 66 at u 80) and the side-photo underside.
REAR = np.array([
    # u     zb     zt    hb    hw    zm    ht
    [46.0, 18.4, 59.0, 15.0, 18.8, 40.0, 12.5],
    [54.0, 18.4, 59.8, 14.5, 19.6, 40.5, 13.0],
    [62.0, 18.6, 61.0, 14.0, 20.6, 41.0, 13.8],
    [70.0, 19.8, 62.2, 13.5, 24.8, 43.0, 15.0],
    [78.0, 24.0, 62.2, 13.5, 29.2, 46.0, 16.0],
    [86.0, 30.5, 58.8, 15.0, 32.4, 47.5, 17.0],
    [92.0, 36.0, 54.5, 18.0, 33.6, 47.0, 18.5],
])

WING_SIDE = [(56, 54), (63, 59.8), (72, 62.4), (79, 62.2), (86, 58.8), (93, 54), (100, 50.4), (106, 47.6), (110.2, 44.4), (111.6, 41), (110, 38), (104, JAW_Z - 0.2), (90, JAW_Z - 0.2), (84, 38.2), (78, 42), (68, 46)]
WING_PLAN = [(-15.5, 55), (-17.5, 64), (-24, 77), (-32.5, 87.5), (-38.6, 95.5), (-39.9, 103), (-38.2, 109.5), (-34.2, 113.2), (-29.2, 113.0), (-26.0, 109.5), (-22.5, 102.5), (-15, 95.5), (-7, 91.8), (0, 91.0), (7, 91.8), (15, 95.5), (22.5, 102.5), (26.0, 109.5), (29.2, 113.0), (34.2, 113.2), (38.2, 109.5), (39.9, 103), (38.6, 95.5), (32.5, 87.5), (24, 77), (17.5, 64), (15.5, 55)]

WINDOW_PLAN = [(0, 21.0), (4.6, 22.4), (8.6, 27), (12.2, 35), (14.6, 44), (15.2, 51), (14.2, 57.5), (11.2, 62.5), (6.2, 65.6), (0, 66.4), (-6.2, 65.6), (-11.2, 62.5), (-14.2, 57.5), (-15.2, 51), (-14.6, 44), (-12.2, 35), (-8.6, 27), (-4.6, 22.4)]

BASE_SIDE = [(25.4, 0), (25.9, 3.0), (27.9, 6.6), (31.4, 9.6), (37, 12.0), (45, 13.4), (60, 13.9), (96, 14.1), (104, 15.2), (110, 15.6), (129, 15.6), (132.5, 15.0), (137, 10.2), (141.4, 4.0), (143.2, 0.8), (143.4, 0)]
BASE_PLAN = [(0, 25.4), (11, 27.5), (20.5, 33.5), (27.4, 43), (30.0, 54), (30.4, 96), (35.4, 101), (35.6, 127), (29.5, 139.5), (19, 143.4), (-19, 143.4), (-29.5, 139.5), (-35.6, 127), (-35.4, 101), (-30.4, 96), (-30.0, 54), (-27.4, 43), (-20.5, 33.5), (-11, 27.5)]

MOUNT_SCREWS = [(-24.0, 57.5), (24.0, 57.5), (-18.0, 100.0), (18.0, 100.0)]


def _poly(points, samples=10):
    return sdf.catmull(points, samples, closed=True)


def _shoe_section(u):
    if u < SHOE[0, 0] or u > SHOE[-1, 0]:
        return None
    zb, zt, hb, hm, ht = (np.interp(u, SHOE[:, 0], SHOE[:, i]) for i in range(1, 6))
    zm = 36.0
    half = [(ht, zt), (ht + 4.2, zt - 1.6), (hm - 0.6, zm + 9), (hm, zm), (hb + 0.6, zb + 8), (hb, zb + 3.2), (hb - 3.4, zb)]
    right = [(x, z) for x, z in half]
    left = [(-x, z) for x, z in reversed(half)]
    return sdf.catmull(right + left, 6, closed=True)


def _rear_section(u):
    if u < REAR[0, 0] or u > REAR[-1, 0]:
        return None
    zb, zt, hb, hw, zm, ht = (np.interp(u, REAR[:, 0], REAR[:, i]) for i in range(1, 7))
    half = [(ht, zt), (hw * 0.86, zm + (zt - zm) * 0.62), (hw, zm), (hw * 0.9, zm - (zm - zb) * 0.55), (hb, zb + 1.2), (hb * 0.6, zb)]
    left = [(-x, z) for x, z in reversed(half)]
    return sdf.catmull(half + left, 6, closed=True)


def body(grid):
    P = grid.P
    x, u, z = P
    # Front section: lofted rounded section with gently bulged flanks.
    shoe = sdf.loft(grid, _shoe_section, axis=1)
    shoe = sdf.smax(shoe, F(7.4) - u, 2.4)                       # front face, softened edge
    top_chamfer = sdf.plane(P, (0, -0.62, 1.0), (-0.62 * 7.2 + 50.6) / np.hypot(0.62, 1.0))
    shoe = sdf.smax(shoe, top_chamfer, 1.5)                        # facet from front face to top
    # Rear body: the big convex flank under the wings, closed with rounded ends.
    rear = sdf.loft(grid, _rear_section, axis=1)
    rear = sdf.smax(sdf.smax(rear, F(REAR[0, 0] + 0.5) - u, 3.0), u - F(REAR[-1, 0] - 0.5), 5.0)
    wing = sdf.smax(sdf.extrude(sdf.polygon2(u, z, _poly(WING_SIDE)), x, -42, 42),
                    sdf.extrude(sdf.polygon2(x, u, _poly(WING_PLAN, 8)), z, 20, 80), 3.5)
    d = sdf.smin(rear, wing, 5.0)
    d = sdf.smin(d, shoe, 1.2)                                     # soft crease between the forms
    # Collar around the end cap; recess for the DIN window.
    collar = sdf.cylinder(P, (0, 9.0, CAP_Z), 'y', CAP_R + 2.6, 3.0, 1.2)
    d = sdf.smin(d, collar, 1.2)
    win = sdf.extrude(sdf.polygon2(x, u, _poly(WINDOW_PLAN, 6)) + F(0.6), z, 52.5, 90, 0.6)
    d = sdf.sub(d, win, 0.8)
    return d


def tip_region(P):
    """Gloss-black anti-friction pads on the rear of each wing, including the jaw faces."""
    x, u, z = P
    boundary = F(90.0) + (F(56.0) - z) * F(0.40) - u
    return np.maximum(boundary, F(13.5) - np.abs(x))


def window(P):
    x, u, z = P
    plan = sdf.extrude(sdf.polygon2(x, u, _poly(WINDOW_PLAN, 6)), z, 50, 95, 0.9)
    top = 56.0 + 0.125 * (u - 20.0) + 2.0 * np.maximum(0, 1 - (x / 15.5) ** 2) * np.maximum(0, 1 - ((u - 44) / 25.0) ** 2)
    return sdf.smax(plan, z - top.astype(F), 1.0)


def dial(P):
    x, u, z = P
    top = 53.4 + 0.125 * (u - 20.0)
    plan = sdf.extrude(sdf.polygon2(x, u, _poly(WINDOW_PLAN, 6)) + F(1.2), z, 45, 90, 0.3)
    return np.maximum(plan, z - top.astype(F))


def end_cap(P):
    cap = sdf.cylinder(P, (0, 4.4, CAP_Z), 'y', CAP_R, 4.4, 2.8)
    ring = sdf.torus(P, (0, 0.9, CAP_Z), 'y', 9.8, 0.9)
    return sdf.sub(cap, ring, 0.3)


def din_screw(P):
    head = sdf.cylinder(P, (0, -0.6, CAP_Z), 'y', 7.0, 1.6, 1.1)
    dome = sdf.ellipsoid(P, (0, -1.4, CAP_Z), (6.6, 1.6, 6.6))
    d = sdf.smin(head, dome, 0.6)
    slot_a = sdf.box(P, (0, -2.4, CAP_Z), (5.2, 1.3, 0.75), 0.2)
    slot_b = sdf.box(P, (0, -2.4, CAP_Z), (0.75, 1.3, 5.2), 0.2)
    return sdf.sub(d, sdf.union(slot_a, slot_b), 0.25)


def base(P):
    x, u, z = P
    d = sdf.smax(sdf.extrude(sdf.polygon2(u, z, _poly(BASE_SIDE)), x, -37, 37, 0.8),
                 sdf.extrude(sdf.polygon2(x, u, _poly(BASE_PLAN, 8)), z, -2, 30, 0.8), 1.2)
    # Pivot pedestal: the black neck that carries the body, sloping back to the base.
    ped = sdf.box(P, (0, 70.0, 17.0), (14.5, 12.0, 6.5), 4.0)
    ped = sdf.smax(ped, sdf.plane(P, (0, 0.55, 1.0), (0.55 * 86.0 + 20.0) / np.hypot(0.55, 1.0)), 3.0)
    d = sdf.smin(d, ped, 5.0)
    for sx, su in MOUNT_SCREWS:
        d = sdf.smin(d, sdf.cylinder(P, (sx, su, 13.2), 'z', 6.4, 2.2, 1.0), 1.6)
    # Molded parting line and the diagonal recess on each side of the rear ramp.
    outline = sdf.extrude(sdf.polygon2(x, u, _poly(BASE_PLAN, 8)), z, -2, 30)
    groove = np.maximum(sdf.shell(outline, 0.35), np.abs(z - F(9.4)) - F(0.3))
    d = sdf.sub(d, groove, 0.1)
    ramp = sdf.polygon2(u, z, [(104, 3.5), (131, 3.5), (131, 12.5), (116, 12.5)])
    recess = sdf.extrude(ramp, np.abs(x), 34.3, 40, 0.6)
    d = sdf.sub(d, recess, 0.5)
    return d


def afd(P):
    return sdf.box(P, (0, 120.0, 16.6), (31.8, 7.8, 1.45), 1.2)


def mount_screw(P, cx, cu):
    x, u, z = sdf.translate(P, (cx, cu, 0))
    Q = (x, u, z)
    head = sdf.cylinder(Q, (0, 0, 18.2), 'z', 4.5, 1.3, 0.9)
    dome = sdf.ellipsoid(Q, (0, 0, 19.0), (4.3, 4.3, 1.0))
    head = sdf.smin(head, dome, 0.5)
    shank = sdf.cylinder(Q, (0, 0, 15.0), 'z', 2.5, 2.4, 0.2)
    threads = sdf.union(*[sdf.torus(Q, (0, 0, zz), 'z', 2.5, 0.42) for zz in np.arange(13.2, 17.0, 0.9)])
    d = sdf.union(head, shank, threads)
    cross = sdf.union(sdf.box(Q, (0, 0, 19.9), (2.8, 0.55, 1.4), 0.1), sdf.box(Q, (0, 0, 19.9), (0.55, 2.8, 1.4), 0.1))
    diag = sdf.union(sdf.box(sdf.rot_z(Q, 45), (0, 0, 20.1), (1.6, 0.18, 0.7)), sdf.box(sdf.rot_z(Q, -45), (0, 0, 20.1), (1.6, 0.18, 0.7)))
    return sdf.sub(d, sdf.union(cross, diag), 0.15)


def indicator(P):
    x, u, z = P
    top = F(53.4) + F(0.125) * (u - F(20.0))
    bar = sdf.box((x, u, z - top), (0, 32.0, 0.35), (1.25, 5.2, 0.45), 0.3)
    return bar


def decorate(objs, mats):
    """Printed graphics: PIVOT (skier's right), 15 (skier's left) and the DIN dial."""
    from . import decals
    body_obj = next(o for o in objs if o.name == 'Toe body')
    dial_obj = next(o for o in objs if o.name == 'Toe DIN dial')
    out = [decals.text('Toe print PIVOT', 'PIVOT', body_obj, (-31.0, 29.5, 32.6), (0, -1, 0), (0, 0, 1), 14.5, mats['ink'], 'semibold', 1.06),
           decals.text('Toe print 15', '15', body_obj, (31.0, 22.5, 43.4), (0, 1, 0), (0, 0, 1), 22.0, mats['ink'], 'bold')]
    tilt = (0, 1.0, 0.125)
    def on_dial(u):
        return 53.4 + 0.125 * (u - 20.0)
    out.append(decals.text('Toe dial LOOK', 'LOOK', dial_obj, (0, 47.5, on_dial(47.5)), (1, 0, 0), tilt, 7.2, mats['dialprint'], 'black', 1.0, lift=0.4, max_edge=0.35))
    for k, (left, right) in enumerate((('14', '15'), ('12', '13'), ('10', '11'), ('8', '9'), ('6', '7'))):
        u0 = 40.5 - 3.0 * k
        out.append(decals.text(f'Toe dial {left}', left, dial_obj, (-9.4, u0, on_dial(u0)), (1, 0, 0), tilt, 3.3, mats['dialprint'], 'semibold', lift=0.3, max_edge=0.25))
        out.append(decals.text(f'Toe dial {right}', right, dial_obj, (8.6, u0 + 1.4, on_dial(u0 + 1.4)), (1, 0, 0), tilt, 3.3, mats['dialprint'], 'semibold', lift=0.3, max_edge=0.25))
    return out


def build(mats, collection, voxel=0.25, graphics=True):
    """Creates the toe objects in its local frame (mm → m). Returns objects."""
    objs = []
    g = sdf.Grid((-42, 4, 15), (42, 116, 66), voxel)
    b = body(g)
    tip = tip_region(g.P)
    painted = np.maximum(b, -(tip - F(0.12)))
    tips = np.maximum(b, tip + F(0.12))
    body_obj = sdf.to_object('Toe body', g, painted, mats['paint'], collection)
    # Super Edition: yellow front, black from the arch flank back to the wings.
    sdf.vertex_attribute(body_obj, 'paint_fade', lambda x, u, z: np.clip((u - 56.0) / 12.0, 0, 1))
    objs.append(body_obj)
    objs.append(sdf.to_object('Toe wing pads', g, tips, mats['gloss'], collection))
    del b, tip, painted, tips
    g = sdf.Grid((-17, 19, 48), (17, 68, 67), voxel * 0.7)
    objs.append(sdf.to_object('Toe DIN window', g, window(g.P), mats['window'], collection))
    objs.append(sdf.to_object('Toe DIN dial', g, dial(g.P), mats['dial'], collection))
    g = sdf.Grid((-3, 25, 52), (3, 39, 58), 0.1)
    objs.append(sdf.to_object('Toe DIN indicator', g, indicator(g.P), mats['afd'], collection))
    g = sdf.Grid((-18, -4, 18), (18, 10, 55), voxel * 0.6)
    objs.append(sdf.to_object('Toe end cap', g, end_cap(g.P), mats['gloss'], collection))
    objs.append(sdf.to_object('Toe DIN adjuster', g, din_screw(g.P), mats['steel'], collection))
    g = sdf.Grid((-38, 23, -1), (38, 146, 32), voxel)
    objs.append(sdf.to_object('Toe base plate', g, base(g.P), mats['polymer'], collection))
    g = sdf.Grid((-34, 110, 13), (34, 130, 20), voxel * 0.6)
    objs.append(sdf.to_object('Toe AFD', g, afd(g.P), mats['afd'], collection))
    for i, (cx, cu) in enumerate(MOUNT_SCREWS):
        g = sdf.Grid((cx - 6, cu - 6, 11), (cx + 6, cu + 6, 21.5), 0.1)
        objs.append(sdf.to_object(f'Toe mounting screw {i + 1}', g, mount_screw(g.P, cx, cu), mats['zinc'], collection))
    if graphics:
        objs += decorate(objs, mats)
    return objs
