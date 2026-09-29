"""LOOK Pivot 2.0 15 GW: photoreal Blender study and the browser's GLB (Blender 5.2).

Run from the app directory:
  blender --background --python scripts/build-pivot-binding.py              # everything
  blender --background --python scripts/build-pivot-binding.py -- --quick   # fast previews
  blender --background --python scripts/build-pivot-binding.py -- --glb     # web asset only

Outputs
  public/models/look-pivot-15.glb      web asset in the mounted "ski" pose (pedal down,
                                       brakes folded), decimated, plain PBR materials
  blender/look-pivot-15-study.blend    editable catalogue scene: full materials (flake
                                       paint, brushed turntable, zinc, glass), studio
                                       lights, LOOK's catalogue camera and detail cameras
  blender/look-pivot-15-study.png      catalogue view, Black Metal
  blender/renders/                     every colorway, detail views, comparison sheet

The geometry is built as signed-distance solids (scripts/pivot/) from measurements of
photographs of a retail binding and LOOK's catalogue renders. It is a visual study, not
factory CAD, a drilling template or release-setting guidance.
"""
import sys
import time
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from pivot import assembly, materials, studio   # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUICK = '--quick' in ARGS
GLB_ONLY = '--glb' in ARGS
SAMPLES = 32 if QUICK else 256
RES = 800 if QUICK else 1600
OUT = ROOT / 'blender'
RENDERS = OUT / 'renders'
GLB = ROOT.parents[1] / 'brands/on3p/public/models/look-pivot-15.glb'
COLORWAYS = ['Black', 'Blue', 'Orange', 'Super Edition']
DESCRIPTION = ('LOOK Pivot 2.0 15 GW visual study. Signed-distance model measured from photographs of a '
               'retail binding and LOOK catalogue renders; 320 mm reference boot sole. Not factory CAD; '
               'not for mounting or release setup.')

# Triangle budgets for the browser asset (the study keeps full resolution).
WEB_BUDGET = {'Toe body': 12500, 'Heel tower': 12500, 'Toe base plate': 3500, 'Heel base': 3000,
              'Heel turntable': 3000, 'Toe wing pads': 2000, 'Heel tower strips': 1200,
              'Toe DIN dial': 1200, 'Toe DIN window': 1200, 'Toe end cap': 1500}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0      # no .blend1 backups
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene['description'] = DESCRIPTION
    scene['reference'] = 'https://www.on3pskis.com/products/look-pivot-2-0-15-gw'


def web_budget(obj):
    if obj.name in WEB_BUDGET:
        return WEB_BUDGET[obj.name]
    if 'print' in obj.name or 'dial' in obj.name or 'scale' in obj.name:
        return 1200
    return 700


def export_web_asset():
    reset()
    mats, toe_root, heel_root, objs = assembly.build('Black', 'ski')
    materials.simplify_for_export()
    window = bpy.data.materials['Pivot_Window']
    bsdf = window.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Transmission Weight'].default_value = 0.0      # cheap alpha glass in the browser
    bsdf.inputs['Alpha'].default_value = 0.32
    window.surface_render_method = 'BLENDED'
    tris = 0
    for obj in objs:
        if obj.type != 'MESH':
            continue
        count = sum(len(p.vertices) - 2 for p in obj.data.polygons)   # decimation counts triangles
        target = web_budget(obj)
        if count > target:
            mod = obj.modifiers.new('Web LOD', 'DECIMATE')
            mod.ratio = target / count
            mod.use_collapse_triangulate = True
        tris += min(count, target)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [toe_root, heel_root, *objs]:
        obj.select_set(True)
    GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_extras=False)
    print(f'Web asset: {GLB.relative_to(ROOT)} {GLB.stat().st_size / 1e6:.2f} MB, ~{tris} triangles, {len(objs)} parts')


def lighten(objs, limit=50000, floor=0.18):
    """Quadric-decimates the densest distance-field meshes for the saved study (keeps the
    look; the source meshes are ~0.25 mm uniform and far denser than a render needs)."""
    deps = bpy.context.evaluated_depsgraph_get()
    for obj in objs:
        if obj.type != 'MESH':
            continue
        count = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        if count <= limit:
            continue
        mod = obj.modifiers.new('Study LOD', 'DECIMATE')
        mod.ratio = max(floor, limit / count)
        deps.update()
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
        obj.modifiers.clear()
        old = obj.data
        obj.data = mesh
        bpy.data.meshes.remove(old)
        mesh.name = obj.name


def study_scene():
    reset()
    studio.gpu(SAMPLES)
    mats, toe_root, heel_root, objs = assembly.build('Black', 'catalogue')
    lighten(objs)
    studio.product_lighting()
    cam = studio.catalogue_camera()
    studio.camera('Detail heel', (-0.374, -0.066, 0.282), target=(0.0, 0.160, 0.085), lens=70)
    studio.camera('Detail toe', (-0.24, -0.39, 0.16), target=(0.0, -0.180, 0.034), lens=82)
    bpy.context.scene.camera = cam
    bpy.context.scene.render.film_transparent = True
    return cam


def render_study(cam):
    RENDERS.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    for colorway in COLORWAYS:
        materials.set_colorway(colorway)
        slug = colorway.lower().replace(' ', '-')
        studio.render(str(RENDERS / f'pivot-15-{slug}.png'), cam, (RES, RES), transparent=True)
        for name in ('Detail heel', 'Detail toe'):
            if colorway in ('Black', 'Blue'):
                detail = bpy.data.objects[name]
                studio.render(str(RENDERS / f'{name.lower().replace(" ", "-")}-{slug}.png'), detail, (RES, RES), transparent=True)
    materials.set_colorway('Black')
    studio.render(str(OUT / 'look-pivot-15-study.png'), cam, (RES, RES), transparent=True)
    scene.camera = cam


if __name__ == '__main__':
    t0 = time.time()
    export_web_asset()
    if not GLB_ONLY:
        cam = study_scene()
        OUT.mkdir(exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'look-pivot-15-study.blend'), compress=True)
        render_study(cam)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'look-pivot-15-study.blend'), compress=True)
    print(f'Done in {time.time() - t0:.0f} s')
