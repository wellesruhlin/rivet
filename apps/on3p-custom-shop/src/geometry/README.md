# ON3P primary 3D preview — 2026-09-24

The live standalone configurator on port 5178 uses only the Blender study's shared geometry renderer. `ModelStage.jsx` receives normalized `config` and `view` from App's reducer; there is no second configuration store. `displaySelection()` supplies a display-only sample model/length when a choice is incomplete, without selecting a purchasable size. The old SVG/comparison components are retained as unused source and are outside the runtime import graph.

## Source and coverage

`kernel.mjs` is an unchanged copy of the canonical kernel from `go-x20/outputs/on3p-ski-lab/geometry.mjs`. The browser builds meshes with that kernel rather than loading a separate static ski GLB. The binding study is a separate actual Blender-exported GLB; see ../../BINDINGS.md. `on3p.json` retains the original Jeffrey 106, Woodsman 108 and Jeffrey 112 records, with source URLs, hashes, warnings, published dimensions and calibration details. It now covers all 18 selectable models at every orderable length.

`scripts/extend-geometry.py` adds 12 model-specific outlines traced from the clean base silhouettes in current official product composites. Width constraints use extrema of the final sampled curves. Their rocker/camber/thickness profiles are explicitly estimated from the closest of the original three families. Jeffrey 124 and Billy Goat 102/108 lack current stock listings and also use disclosed family outlines; Billy Goats use the traced Billy Goat 114 RES planform. Published model-specific widths and lengths constrain every shape. The independent Blender lab and canonical geometry/construction kernels remain unchanged. Source composites and public product metadata were cached under `../../work/stock-2027`; stock artwork provenance is in `../stock-art.json`.

Model data came from the maker's product pages on 2026-09-24:

- https://www.on3pskis.com/products/jeffrey-106
- https://www.on3pskis.com/products/woodsman-108
- https://www.on3pskis.com/products/jeffrey-112

Widths and nominal lengths are published specifications. Outlines are photo-calibrated and constrained to those widths. Rocker, camber, thickness, shoulder and end treatment are estimates. Other lengths scale the 186 cm curves. Jeffrey 112 uses the Signature Pow family illustration because its product-composite side profile is pixel-identical to Jeffrey 106. These are visual prototypes, not CAD or manufacturing dimensions.

`configured.js` adapts normalized choices to that kernel. Ripper is an explicitly labeled family estimate using the relative changes described at https://www.on3pskis.com/products/jeffrey-92: +25% camber, +10% contact, -15% rise. Applying those relative changes to these custom molds is an inference, especially for Signature Pow; it is not a measured custom Ripper profile. The longer contact zone is distributed proportionally between the original tip and tail rocker zones.

LITE/Tour use the existing configurator's published 1.4 mm base and 2.2 × 2.0 mm edges. The other layups use 1.8 mm and 2.5 × 2.5 mm. Total depth is retained as estimated; layup/flex do not invent new total thickness measurements. Flex behavior, detune and skin-clip hardware are not modeled and are identified in the visible disclosure.

## Art and rendering

`renderer.js` uses pinned Three.js 0.180.0. Each current top/base artwork crop is registered into the same 92 × 1424 print area used by the original SVG. Four native-resolution canvas textures are produced for the two skis and two surfaces, without intermediate upscaling. Print UVs use constant width so sidecut does not stretch the graphic row by row. Base handedness is handled separately from topsheets. Geometry changes reuse the current art; art/color changes do not regenerate geometry. Generation counters prevent delayed loads from overwriting newer choices.

GPU resources, listeners, resize observers and the WebGL context are disposed on unmount. Rendering is on demand plus a bounded animation during transitions. Lighting normals are smoothed longitudinally to suppress pixel-scale trace noise without changing vertices. The 3D code is lazy loaded. A WebGL failure displays an explicit reload message; there is no automatic return to the retired SVG preview.

## Views and surface treatment

The navigation is Front / Back / Sidewall / 3D / Bindings / Inside / Tech Specs. Internal reducer aliases Topsheet, Base and Technical stay compatible with the existing graphics flow. Entering the Sidewalls picker (including a build-sheet edit) automatically dispatches Sidewall; choosing a sidewall also recalls that close-up. Each ski has a separate pivot around its lengthwise axis; the camera stays in place for Front ↔ Back. Reversals start at the current pose. Reduced-motion users get immediate transitions. Zooming mid-flip settles the flip before adjusting magnification. 3D enables free orbit; Tech Specs shows the actual-scale side profile and published dimensions, effective edge, mount, radius and stock weight.

All 351 source previews use lossless PNG crops recovered directly from catalog `source` URLs, rather than another WebP compression pass. `npm run art:print` reproduces them; per-file provenance, original dimensions and SHA-256 hashes are in `public/art/print/manifest.json`. All checked public originals are 1000 × 1600; each individual printed ski occupies roughly 92 × 1424 pixels. These source files retain the original pixels and colors. Supersampled rendering and anisotropic filtering improve display quality; the public artwork still limits very close logo/detail inspection except for the separately reconstructed labels described below.

### Factory-series close-up labels

The 3D view now uses `print-detail.js` for the twelve explicitly registered 2027 Factory color designs (Onyx through Turquoise). Their underfoot lettering, stripe badge and flag are reconstructed as vector/text commands, rendered into two small local textures at 24× the source's pixel density, capped by the GPU texture limit. A material shader composites each patch in the original print UV coordinates before lighting, so the ink shares the ski's surface finish and also works on the separated construction topsheet. No whole-ski 32K texture or runtime AI upscaling is needed. The 92-pixel-wide source map retains all artwork outside the label patches. The inspection zoom ceiling is now 32× for both wheel and button controls, including after changing camera modes.

These are clearly disclosed concept reconstructions, not recovered ON3P production masters: font and badge contours are approximations, the tiny footer reads Handmade Skis / Portland, Oregon / ON3PSKIS.COM, and the specification label uses the current configured model, length, dimensions and rocker. The patch background is interpolated from adjacent unprinted pigment with feathered edges. All catalog thumbnails retain the untouched source artwork; the disclosure links directly to the original source image. Complex artwork, large distressed logos and other catalog designs still need higher-resolution master files for faithful extreme close-ups. Detail textures are generation-guarded with the main art load, are replaced when design/specs change, and are disposed on replacement/unmount.

`finishes.js` creates physically scaled, seamless 24 mm normal/roughness tiles in code. The default embossed texture has worn raised facets and a small fraction of smoother facets for moving glints. The 24 actual Wood covers use shallow longitudinal texture and a medium-flat satin response; a printed graphic named Woodland is correctly treated as printed material. The finish is an art-direction approximation requested for the concept, not a manufacturer-verified material scan. Neutral lighting, lower specular/clearcoat response and removal of filmic tone mapping preserve pigment saturation and deeper blacks. The canonical geometry kernel and Blender source asset are unchanged.

## Integration boundaries

### Construction reveal

Entering the Construction step now selects `Construction` / Inside. The existing camera moves into underfoot detail, then separate layer meshes lift within the same ski pivot. The original exterior is shown at zero separation and on leaving the view. Whole ski framing, assembly reversal, free orbit and reduced-motion transitions are supported. Changing layup regenerates the corresponding interior; artwork and sidewall changes retain the common selection.

`construction.mjs` is identical to the Blender lab's dependency-free generator. It uses the existing exterior sections, never a second outline equation. It represents Stock, LITE, 50/50, Tour, Leaf Spring and Torsion Bar with bamboo/hybrid cores, optional mounting/Scalium inserts, composite, binding mat, VDS rails, sidewalls, steel and base. Material identities and base/edge dimensions are published; internal thicknesses, insert shapes and placement are illustrative. Exact recess machining and Leaf Spring fork details are not modeled. See the lab's `CONSTRUCTION.md` for sources and Blender controls. Base graphics are confined to the bottom face, and topsheet graphics to the outer top face.

In the browser, `construction-renderer.js` adds presentation only: box-mapped UVs (v along the ski on every face), physical materials from `construction-materials.js` (seamless procedural color/normal/roughness tiles generated once per session) with a RoomEnvironment reflection map scoped to the construction materials, an extra outward spread for the sidewalls so the core is unobstructed, and layer picking. `LAYER_KEYS`/`layerKey()` group the generator's layer ids into the nine legend entries described in `src/construction-layers.js`; hover, legend focus and click/tap pinning drive `highlightLayer()`. The generator file itself stays byte-identical to the lab.

This lives in `2026-09-23/i/outputs/on3p-custom-shop`, the source of the user's existing port-5178 preview. The separate `2026-09-24/ski-studio` workspace and its 5180/5181 apps have not been changed by this integration. The independent source/Blender lab on 5190 remains intact. To move this into Ski Studio, adapt the art registration to `pack.art.surface` and mount the renderer as an optional stage component; retain the shared reducer as the only configuration authority.

Run `npm test` for existing config/session tests plus geometry, UV orientation, finite closed meshes, dimensional constraints, model coverage, Ripper, construction, and render-normal tests. Run `npm run build` to refresh the already-running 5178 production preview. For live edits, start a standalone dev server with `npm run dev -- --port 5179`.
