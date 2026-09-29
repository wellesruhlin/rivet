"""Physically based materials for the LOOK Pivot study (Cycles; simplified for glTF export).

Names are stable: the browser recolors `Pivot_Paint` and `Pivot_Ink`. Colorways follow
LOOK's product imagery: metallic paint with flakes under a clear coat, champagne nickel
arms, a concentrically brushed turntable, zinc/chrome hardware, gloss/satin black
polymers and rubber. Super Edition fades to black toward the toe wings and heel skirt
(a per-vertex `paint_fade` attribute written by the part builders).
"""
import bpy

# Linear-light base colors with approximate sRGB references.
PAINT = {
    # name: (base color, metallic, roughness, coat, coat roughness, flake strength)
    'Black': ((0.030, 0.032, 0.036), 0.60, 0.48, 0.10, 0.36, 0.08),           # "Black Metal" gunmetal
    'Blue': ((0.045, 0.262, 0.610), 0.85, 0.28, 0.50, 0.06, 0.22),            # "Blue Steel" ~#3c8cce
    'Orange': ((0.640, 0.085, 0.020), 0.88, 0.30, 0.55, 0.06, 0.22),          # metal orange ~#d45226
    'Super Edition': ((0.680, 0.760, 0.008), 0.15, 0.34, 0.35, 0.08, 0.05),   # neon yellow ~#d9e214
}
INK = {  # graphics print color per colorway
    'Black': (0.018, 0.019, 0.021),
    'Blue': (0.90, 0.92, 0.94),
    'Orange': (0.012, 0.012, 0.013),
    'Super Edition': (0.020, 0.050, 0.520),
}
EXPORT_COLOR = {}   # material name -> plain base color used for glTF


def _principled(name, color=(0.5, 0.5, 0.5), metallic=0.0, roughness=0.5, **inputs):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    for key, value in inputs.items():
        socket = bsdf.inputs.get(key)
        if socket is not None:
            socket.default_value = value
    m.diffuse_color = (*color, 1)
    m.metallic = metallic
    m.roughness = roughness
    EXPORT_COLOR[name] = color
    return m


def _micro_bump(m, scale, strength, detail=6.0):
    """Fine surface noise (casting or molded-plastic texture) via a bump node."""
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    coords = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = detail
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = 0.0001
    nt.links.new(coords.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])


def paint(colorway='Black'):
    """Metallic paint: flake-perturbed base normal under a smooth clear coat, with the
    Super Edition black fade driven by the `paint_fade` vertex attribute."""
    color, metallic, rough, coat, coat_rough, flake = PAINT[colorway]
    m = _principled('Pivot_Paint', color, metallic, rough, **{'Coat Weight': coat, 'Coat Roughness': coat_rough, 'Coat IOR': 1.5})
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    # Flakes: random per-cell normals (~0.2 mm cells) nudging the base layer only.
    coords = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 5200.0
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    centered = nt.nodes.new('ShaderNodeVectorMath'); centered.operation = 'SUBTRACT'
    centered.inputs[1].default_value = (0.5, 0.5, 0.5)
    scaled = nt.nodes.new('ShaderNodeVectorMath'); scaled.operation = 'SCALE'
    scaled.name = 'Flake strength'
    scaled.inputs['Scale'].default_value = flake
    added = nt.nodes.new('ShaderNodeVectorMath'); added.operation = 'ADD'
    norm = nt.nodes.new('ShaderNodeVectorMath'); norm.operation = 'NORMALIZE'
    nt.links.new(coords.outputs['Object'], vor.inputs['Vector'])
    nt.links.new(vor.outputs['Color'], centered.inputs[0])
    nt.links.new(centered.outputs['Vector'], scaled.inputs[0])
    nt.links.new(geo.outputs['Normal'], added.inputs[0])
    nt.links.new(scaled.outputs['Vector'], added.inputs[1])
    nt.links.new(added.outputs['Vector'], norm.inputs[0])
    nt.links.new(norm.outputs['Vector'], bsdf.inputs['Normal'])
    # Super Edition fade: mix toward black by the vertex attribute when enabled.
    attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'paint_fade'
    enable = nt.nodes.new('ShaderNodeValue'); enable.name = 'Fade enabled'
    enable.outputs[0].default_value = 1.0 if colorway == 'Super Edition' else 0.0
    amount = nt.nodes.new('ShaderNodeMath'); amount.operation = 'MULTIPLY'
    base = nt.nodes.new('ShaderNodeRGB'); base.name = 'Paint color'
    base.outputs[0].default_value = (*color, 1)
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['B'].default_value = (0.010, 0.010, 0.011, 1)
    nt.links.new(attr.outputs['Fac'], amount.inputs[0])
    nt.links.new(enable.outputs[0], amount.inputs[1])
    nt.links.new(amount.outputs[0], mix.inputs['Factor'])
    nt.links.new(base.outputs[0], mix.inputs['A'])
    nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    m['colorway'] = colorway
    return m


def set_colorway(colorway):
    """Updates paint and ink in place (renders every colorway from one scene)."""
    color, metallic, rough, coat, coat_rough, flake = PAINT[colorway]
    m = bpy.data.materials['Pivot_Paint']
    nodes = m.node_tree.nodes
    b = nodes['Principled BSDF']
    nodes['Paint color'].outputs[0].default_value = (*color, 1)
    nodes['Fade enabled'].outputs[0].default_value = 1.0 if colorway == 'Super Edition' else 0.0
    nodes['Flake strength'].inputs['Scale'].default_value = flake
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = coat_rough
    m.diffuse_color = (*color, 1)
    m['colorway'] = colorway
    EXPORT_COLOR['Pivot_Paint'] = color
    ink = bpy.data.materials.get('Pivot_Ink')
    if ink:
        ink.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*INK[colorway], 1)
        ink.diffuse_color = (*INK[colorway], 1)
        EXPORT_COLOR['Pivot_Ink'] = INK[colorway]


def build(colorway='Black'):
    mats = {}
    mats['paint'] = paint(colorway)
    mats['gloss'] = _principled('Pivot_GlossBlack', (0.006, 0.006, 0.007), 0.0, 0.2, **{'Specular IOR Level': 0.45})
    mats['polymer'] = _principled('Pivot_Polymer', (0.008, 0.008, 0.009), 0.0, 0.38, **{'Specular IOR Level': 0.35})
    _micro_bump(mats['polymer'], 1800.0, 0.05, 3.0)
    mats['rubber'] = _principled('Pivot_Rubber', (0.010, 0.010, 0.011), 0.0, 0.72, **{'Specular IOR Level': 0.3})
    _micro_bump(mats['rubber'], 900.0, 0.08, 4.0)
    mats['steel'] = _principled('Pivot_Steel', (0.80, 0.81, 0.82), 1.0, 0.14)
    mats['zinc'] = _principled('Pivot_Zinc', (0.74, 0.76, 0.78), 1.0, 0.22, **{'Thin Film Thickness': 380.0, 'Thin Film IOR': 1.45})
    mats['nickel'] = _principled('Pivot_Nickel', (0.72, 0.68, 0.60), 1.0, 0.17)
    mats['darksteel'] = _principled('Pivot_DarkSteel', (0.30, 0.31, 0.33), 1.0, 0.32)
    mats['titanium'] = _principled('Pivot_Titanium', (0.58, 0.54, 0.48), 1.0, 0.30)
    mats['afd'] = _principled('Pivot_AFD', (0.86, 0.87, 0.87), 0.0, 0.32, **{'Specular IOR Level': 0.5})
    mats['window'] = _principled('Pivot_Window', (1.0, 1.0, 1.0), 0.0, 0.03, **{'Transmission Weight': 1.0, 'IOR': 1.585})
    mats['dial'] = _principled('Pivot_Dial', (0.16, 0.165, 0.17), 0.0, 0.5)
    mats['ink'] = _principled('Pivot_Ink', INK[colorway], 0.0, 0.82, **{'Specular IOR Level': 0.12})
    mats['print'] = _principled('Pivot_ScalePrint', (0.80, 0.80, 0.78), 0.0, 0.5)
    mats['dialprint'] = _principled('Pivot_DialPrint', (0.012, 0.012, 0.013), 0.0, 0.5)
    mats['alu'] = aluminum()
    return mats


def aluminum():
    """Concentrically brushed aluminum: anisotropic with circumferential tangents."""
    m = _principled('Pivot_Aluminum', (0.56, 0.57, 0.58), 1.0, 0.38, **{'Anisotropic': 0.55})
    nt = m.node_tree
    tangent = nt.nodes.new('ShaderNodeTangent')
    tangent.direction_type = 'RADIAL'
    tangent.axis = 'Z'
    nt.links.new(tangent.outputs['Tangent'], nt.nodes['Principled BSDF'].inputs['Tangent'])
    return m


def simplify_for_export():
    """glTF keeps factors, not procedural networks: unlink procedural inputs so every
    material exports its plain PBR values (flakes, fade and bumps stay in the .blend)."""
    for m in bpy.data.materials:
        if not m.use_nodes or m.name not in EXPORT_COLOR:
            continue
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        for key in ('Base Color', 'Normal', 'Coat Normal', 'Tangent'):
            for link in list(bsdf.inputs[key].links):
                nt.links.remove(link)
        bsdf.inputs['Base Color'].default_value = (*EXPORT_COLOR[m.name], 1)
        # three.js derives anisotropy tangents from UVs, which these meshes don't have.
        bsdf.inputs['Anisotropic'].default_value = 0.0
