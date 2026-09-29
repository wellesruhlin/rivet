"""LOOK Pivot 2.0 15 GW toe (aluminum Race toe) as signed-distance solids.

Local frame (mm): x lateral (+x = skier's left), y = u, measured rearward from the end
cap's front face, z up from the ski. Dimensions were measured from side and top
photographs of a retail binding (8.7 px/mm, scaled by the 18 mm stand height) and
checked against LOOK's product renders. Approximate: not factory CAD.
"""
import numpy as np
from . import sdf
from .sdf import F

CAP_Z = 36.0        # end cap / DIN adjuster axis
CAP_R = 16.0
JAW_Z = 37.5        # wing underside = 18 mm stand height + 19 mm ISO toe lug

# The toe is read from colour-segmented side and top photographs (orange and black
# retail bindings, registered on their mounting screws and end caps) and LOOK's
# product renders. The body is one loft of superellipse sections: two halves that meet
# at a soft crease (the widest line, zc) with a round shoulder above (flanks lean in
# ~20° toward the DIN window) and a flatter underside below. Behind the end cap the
# section is nearly a circle hugging the cap, so the nose reads round; in plan the
# cowl tapers from 40 mm wide there to 62 mm at its rear, pinches to a 42 mm waist and
# flares into 81 mm wings.
BODY = np.array([
    # u      a     zc    b_top  b_bot n_top  n_bot  lean_top lean_bot
    [5.0,   18.4, 36.0, 18.6, 16.6, 2.00, 2.10, 0.00, 0.00],
    [8.5,   19.4, 35.6, 20.0, 17.0, 2.05, 2.20, 0.03, 0.03],
    [11.0,  21.6, 34.4, 21.8, 17.4, 2.25, 2.50, 0.08, 0.05],
    [15.0,  23.6, 33.0, 23.6, 16.4, 2.50, 2.80, 0.14, 0.08],
    [22.0,  26.1, 32.2, 24.4, 15.5, 2.90, 3.00, 0.20, 0.10],
    [30.0,  28.6, 32.0, 24.6, 15.2, 3.10, 3.10, 0.24, 0.10],
    [38.0,  30.2, 32.0, 24.8, 14.9, 3.20, 3.10, 0.25, 0.10],
    [44.0,  29.9, 32.2, 25.4, 14.6, 3.20, 3.10, 0.25, 0.10],
    # the waist and wings: flat flanks leaning in to a crisp top ridge, widest low down
    [48.0,  27.6, 32.2, 26.4, 13.8, 3.40, 3.00, 0.25, 0.09],
    [52.0,  24.9, 30.6, 29.2, 10.8, 3.80, 2.90, 0.25, 0.07],
    [56.0,  22.8, 28.2, 32.6,  8.0, 4.40, 2.70, 0.25, 0.05],
    [60.0,  21.3, 26.2, 35.2,  6.0, 5.00, 2.50, 0.26, 0.04],
    [64.0,  21.0, 25.4, 36.0,  5.4, 5.60, 2.50, 0.27, 0.04],
    [68.0,  22.8, 27.0, 34.3,  4.8, 6.00, 2.40, 0.28, 0.04],
    [72.0,  26.9, 29.2, 31.8,  4.6, 6.40, 2.40, 0.28, 0.04],
    [76.0,  30.9, 30.0, 30.2,  4.7, 6.60, 2.40, 0.28, 0.04],
    [80.0,  34.4, 32.0, 26.4,  4.5, 6.60, 2.40, 0.26, 0.04],
    [84.0,  37.3, 36.2, 20.6,  4.2, 6.20, 2.40, 0.22, 0.04],
    [88.0,  38.8, 39.6, 15.6,  3.9, 5.60, 2.50, 0.18, 0.04],
    [92.0,  39.4, 41.4, 10.8,  3.8, 5.00, 2.80, 0.12, 0.03],
    [96.0,  39.6, 41.8,  8.0,  3.8, 5.00, 3.20, 0.08, 0.02],
    [100.0, 39.5, 41.8,  6.2,  3.8, 5.00, 3.60, 0.04, 0.00],
    [104.0, 39.0, 41.8,  4.8,  3.8, 5.00, 4.00, 0.00, 0.00],
    [107.0, 38.0, 41.6,  4.0,  3.6, 5.00, 4.00, 0.00, 0.00],
])
# Front of the cowl in side view: upper flank almost upright at the end cap, the lower
# facet set back ~2 mm below the crease, curving under to the flat bottom.
COWL_FRONT = [(7.3, 70), (7.3, 56.0), (7.6, 48), (8.1, 40), (8.7, 34.5), (9.6, 31.4), (10.0, 26), (10.7, 21.5),
              (12.2, 18.2), (14.6, 16.0), (18, 14.5), (120, 14.5), (120, 70)]
# The oval "disc" on each flank (side view: 29 x 37 mm): the cowl's rear edge wraps its
# front half as a crisp arc; inside it the flank sweeps in to the waist and on out to
# the wing as one convex facet.
DISC = (59.0, 38.0, 14.5, 18.5)          # centre u, z; radius along u, z
SLEEVE = np.array([
    # the cowl's rear continued past the disc's front edge (same columns as BODY)
    [40.0,  30.6, 32.0, 24.9, 14.8, 3.20, 3.10, 0.25, 0.10],
    [44.0,  30.9, 32.2, 25.4, 14.6, 3.20, 3.10, 0.25, 0.10],
    [48.0,  30.2, 32.6, 26.2, 14.2, 3.30, 3.00, 0.25, 0.10],
    [52.0,  28.8, 33.0, 27.0, 13.4, 3.40, 2.90, 0.25, 0.10],
    [56.0,  26.0, 33.4, 27.6, 13.2, 3.50, 2.90, 0.25, 0.08],
    [60.0,  22.0, 33.8, 27.6, 13.6, 3.60, 2.90, 0.25, 0.08],
])
# Boot-toe opening between the wings: the saddle falls from a lip at u 88.5 (centre)
# / 98 (at the wings) toward the jaw; below the jaw the boot toe needs room.
SADDLE = ((0.0, 104.0, 56.0), (37.1, 15.5, 18.4))       # ellipsoid centre, radii
BOOT_TOE = (130.0, 42.0)           # boot toe outline in plan: circle centre u, radius (front at u 88)
# Gloss-black anti-friction pads capping the wing tips: plan (x, u) and side (u, z)
# outlines from the photographs, intersected with a generous fillet.
PAD_PLAN = [(20.6, 99.2), (25.4, 96.8), (32.6, 94.8), (38.9, 94.9), (40.3, 100), (40.1, 106), (38.6, 111.4), (35.2, 113.6), (30.4, 113.4), (26.4, 110.4), (22.6, 105.0)]
PAD_SIDE = [(91.0, 51.8), (96.0, 50.4), (100.0, 48.8), (104.4, 46.8), (108.0, 44.6), (110.6, 41.8), (111.6, 39.0), (110.4, 36.6), (104.0, 36.0), (95.0, 36.2), (90.4, 37.8), (89.6, 45.0)]

WINDOW_PLAN = [(0, 21.0), (4.6, 22.4), (8.6, 27), (12.2, 35), (14.6, 44), (15.2, 51), (14.2, 57.5), (11.2, 62.5), (6.2, 65.6), (0, 66.4), (-6.2, 65.6), (-11.2, 62.5), (-14.2, 57.5), (-15.2, 51), (-14.6, 44), (-12.2, 35), (-8.6, 27), (-4.6, 22.4)]

BASE_SIDE = [(33.8, 0), (34.2, 3.0), (35.0, 6.2), (36.2, 8.6), (38.0, 9.7), (50, 10.8), (62, 11.8), (66, 12.6), (67.5, 14.2), (77, 14.2), (78.5, 11.4), (97, 11.4), (108, 15.6), (129, 15.6), (132.5, 15.0), (137, 10.2), (141.4, 4.0), (143.2, 0.8), (143.4, 0)]
BASE_PLAN = [(0, 33.8), (11, 35.2), (20, 38.5), (26.5, 44), (29.6, 51), (30.2, 58), (30.4, 96), (35.4, 101), (35.6, 127), (29.5, 139.5), (19, 143.4), (-19, 143.4), (-29.5, 139.5), (-35.6, 127), (-35.4, 101), (-30.4, 96), (-30.2, 58), (-29.6, 51), (-26.5, 44), (-20, 38.5), (-11, 35.2)]

MOUNT_SCREWS = [(-24.0, 57.5), (24.0, 57.5), (-18.0, 100.0), (18.0, 100.0)]


def _poly(points, samples=10):
    return sdf.catmull(points, samples, closed=True)


def _mirror(half):
    """Right-half vertices (top centre first, bottom centre last) -> closed outline."""
    return half + [(-x, z) for x, z in reversed(half[1:-1])]


def _superellipse_half(a, zc, b, n, lean, top, samples=36):
    """Half of a superellipse outline from (+a, zc) round to (-a, zc), above or below
    the crease; lean narrows the half linearly away from it (gives the crease an angle)."""
    t = np.linspace(0.0, np.pi, samples + 1)
    c, s = np.cos(t), np.sin(t)
    x = a * np.sign(c) * np.abs(c) ** (2.0 / n)
    h = np.abs(s) ** (2.0 / n)
    x = x * (1.0 - lean * h)
    z = zc + (b * h if top else -b * h)
    pts = np.stack([x, z], axis=1)
    return pts if top else pts[::-1]


def _section(params):
    a, zc, bt, bb, nt, nb, lt, lb = params
    top = _superellipse_half(a, zc, bt, nt, lt, True)
    bottom = _superellipse_half(a, zc, bb, nb, lb, False)
    return np.concatenate([top, bottom[1:-1]])


def _body_section(u):
    if u < BODY[0, 0] or u > BODY[-1, 0]:
        return None
    return _section(sdf.smooth_table(u, BODY))


def _sleeve_section(u):
    if u < SLEEVE[0, 0] or u > SLEEVE[-1, 0]:
        return None
    return _section(sdf.smooth_table(u, SLEEVE))


def _pad(P):
    """Field of the two pads (mirrored in x)."""
    x, u, z = P
    plan = sdf.polygon2(np.abs(x), u, _poly(PAD_PLAN, 6))
    side = sdf.polygon2(u, z, _poly(PAD_SIDE, 6))
    return sdf.round_inter(plan, side, 3.0)


def body(grid):
    P = grid.P
    x, u, z = P
    main = sdf.loft(grid, _body_section, axis=1)
    front = sdf.extrude(sdf.polygon2(u, z, COWL_FRONT), x, -50, 50)
    main = sdf.round_inter(main, front, 3.5)                      # rounded edge round the end cap
    main = sdf.round_inter(main, u - F(BODY[-1, 0] - 0.3), 2.0)   # wing tips, capped by the pads
    # The disc: the sleeve stands proud of the waist everywhere outside the oval.
    du, dz, ru, rz = DISC
    oval = (sdf.length((u - F(du)) / F(ru), (z - F(dz)) / F(rz)) - F(1.0)) * F(min(ru, rz))
    sleeve = sdf.loft(grid, _sleeve_section, axis=1)
    sleeve = sdf.round_inter(sleeve, F(SLEEVE[0, 0] + 0.5) - u, 1.0)
    sleeve = sdf.round_inter(sleeve, u - F(SLEEVE[-1, 0] - 0.5), 1.0)
    sleeve = sdf.round_inter(sleeve, -oval, 0.55)
    d = sdf.smin(main, sleeve, 0.6)
    # Saddle between the wings and the boot-toe opening under them.
    sc, sr = SADDLE
    d = sdf.sub(d, sdf.ellipsoid(P, sc, sr), 1.6)
    d = sdf.smin(d, _pad(P), 1.2)
    bu, br = BOOT_TOE
    boot = np.maximum(sdf.circle2(x, u, (0, bu), br), z - F(JAW_Z))
    d = sdf.sub(d, boot, 1.0)
    # Recess for the DIN window.
    win = sdf.extrude(sdf.polygon2(x, u, _poly(WINDOW_PLAN, 6)) + F(0.6), z, 52.5, 90, 0.6)
    return sdf.sub(d, win, 0.8)


def tip_region(P):
    """Gloss-black anti-friction pads: the pad fingers plus the jaw underside."""
    x, u, z = P
    under = np.maximum(np.maximum(z - F(39.4), F(93.0) - u), F(18.0) - np.abs(x))
    return np.minimum(_pad(P) - F(0.25), under)


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
    # Runs back into the cowl: below the crease the cowl is set back and the cap shows.
    cap = sdf.cylinder(P, (0, 6.2, CAP_Z), 'y', CAP_R, 6.2, 2.8)
    ring = sdf.torus(P, (0, 0.9, CAP_Z), 'y', 9.8, 0.9)
    return sdf.sub(cap, ring, 0.3)


def din_screw(P):
    head = sdf.cylinder(P, (0, 0.9, CAP_Z), 'y', 7.0, 1.6, 1.1)
    dome = sdf.ellipsoid(P, (0, 0.1, CAP_Z), (6.6, 1.6, 6.6))
    d = sdf.smin(head, dome, 0.6)
    slot_a = sdf.box(P, (0, -0.9, CAP_Z), (5.2, 1.3, 0.75), 0.2)
    slot_b = sdf.box(P, (0, -0.9, CAP_Z), (0.75, 1.3, 5.2), 0.2)
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
    out = [decals.text('Toe print PIVOT', 'PIVOT', body_obj, (-27.8, 28.0, 40.0), (0, -1, 0), (0.40, 0, 0.92), 15.0, mats['ink'], 'semibold', 1.06),
           decals.text('Toe print 15', '15', body_obj, (24.6, 22.8, 42.4), (0, 1, 0), (-0.42, 0, 0.91), 26.0, mats['ink'], 'bold')]
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
    g = sdf.Grid((-44, 4, 15), (44, 116, 66), voxel)
    b = body(g)
    tip = tip_region(g.P)
    painted = np.maximum(b, -(tip - F(0.12)))
    tips = np.maximum(b, tip + F(0.12))
    body_obj = sdf.to_object('Toe body', g, painted, mats['paint'], collection)
    # Super Edition: yellow cowl, fading to black diagonally across the rear facet to the wings.
    sdf.vertex_attribute(body_obj, 'paint_fade', lambda x, u, z: np.clip(((u - 54.0) + 0.5 * (z - 40.0)) / 14.0, 0, 1))
    objs.append(body_obj)
    objs.append(sdf.to_object('Toe wing pads', g, tips, mats['gloss'], collection))
    del b, tip, painted, tips
    g = sdf.Grid((-17, 19, 48), (17, 68, 67), voxel * 0.7)
    objs.append(sdf.to_object('Toe DIN window', g, window(g.P), mats['window'], collection))
    objs.append(sdf.to_object('Toe DIN dial', g, dial(g.P), mats['dial'], collection))
    g = sdf.Grid((-3, 25, 52), (3, 39, 58), 0.1)
    objs.append(sdf.to_object('Toe DIN indicator', g, indicator(g.P), mats['afd'], collection))
    g = sdf.Grid((-18, -4, 18), (18, 13.5, 55), voxel * 0.6)
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
