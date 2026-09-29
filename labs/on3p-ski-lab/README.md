# ON3P geometry study — v1

A working, reusable ski reconstruction prototype built from ON3P's public 2026/27 specifications and original images. Three pilot models: **Jeffrey 106, Woodsman 108, and Jeffrey 112**, covering 18 model/length combinations. This remains an independent geometry review tool at port 5190; its geometry and construction extension are also integrated into the standalone configurator at port 5178.

Local preview: **http://127.0.0.1:5190/**

## Try it

- Choose a model and published length.
- Use **Pair / Top / Side / Base / Sidewall detail**. Side view is orthographic, with actual proportions. Drag to orbit, scroll to zoom; arrow keys orbit a focused canvas and Home resets its camera.
- Choose neutral material to inspect the geometry independently of the artwork.
- Open **Explore dimensions** to change length, widths, tip/tail rise, camber, or underfoot thickness. These are hypothetical research edits, not ON3P order options. **Reset to reference** restores the selected stock dimensions.
- Open **Source & trace** for the original-image overlay, a 100 mm scale grid, and the width correction needed to match the published dimensions.
- **Download geometry JSON** exports the current live mesh, parameters, artwork UVs, material assignments, and source notes.

## Blender deliverables

**Construction extension:** `blender/on3p-ski-construction.blend` adds six layered layups with a driven reveal animation. The existing configurator on port 5178 now uses the same construction generator. See [CONSTRUCTION.md](CONSTRUCTION.md) for controls, integration, sources and estimated dimensions.

- `blender/on3p-ski-library.blend`: three asset-marked model collections and six ski objects, with packed artwork and embedded source notes.
- `blender/jeffrey-106-186.glb`, `woodsman-108-186.glb`, `jeffrey-112-186.glb`: portable 186 cm ski pairs, with four material slots each.
- `scripts/blender_controls.py`: working dimension-control panel. Open this file in Blender's Text Editor and **Run Script** once. Open the 3D View sidebar → **ON3P**. Choose model and length, optionally enable hypothetical dimension overrides, then click **Regenerate ski pair**. This creates/replaces only tagged objects in the `ON3P Parametric Preview` collection.

Keep the complete folder together. The Blender controls invoke the shared Node generator in this folder, so Node.js must be on PATH. Changing saved object custom properties alone does not regenerate a mesh. Blender does not auto-run embedded scripts. To use the marked assets in the Asset Browser, add this folder's `blender/` directory as an asset library in Blender preferences; this prototype has not modified your Blender preferences.

## How the reconstruction works

`reference/` contains unmodified manufacturer images. Their 186 cm topsheet labels establish the reference size. `scripts/reconstruct.py` measures alpha-mask silhouettes from the base image and gap/thickness of the side-profile pair. Partially transparent artwork/shadows are excluded by a documented threshold. The raw pixel traces are retained.

Published tip/waist/tail widths constrain the traced outline. We preserve taper positions and the contour between those constraints. The reference size's nominal length is assumed equal to projected length for calibration. Sizes other than 186 cm use their own published widths with longitudinally scaled reference curves; their individual molded rocker profiles have not been measured.

Rocker is estimated from half the separation between paired bases. The source's loading condition, camera geometry, compositing, and true projected length remain unverified. The last 1% of each end is extrapolated past incomplete rounded-cap pixels. Thickness in the central body is estimated from silhouette separation; the outer 8% at each end tapers to an explicitly estimated 4 mm. Sidewall shoulder shape and steel termination are also estimates.

ON3P publishes a 1.8 mm stock base and 2.5 × 2.5 mm steel edges. V1 represents those exterior dimensions and separates the base, sidewall, top, and steel surfaces; it does not recreate every hidden laminate. ON3P describes a 3/4 steel wrap, but exact termination locations are unavailable. The tip termination in this mesh is an estimated parameter.

### What the evidence revealed

| Model, 186 cm | Published tip / waist / tail | Raw image-derived widths | Largest width correction |
| --- | --- | --- | --- |
| Jeffrey 106 | 134 / 106 / 127 mm | 136.73 / 109.03 / 130.43 mm | 2.78% |
| Woodsman 108 | 138 / 108 / 128 mm | 142.40 / 112.15 / 131.69 mm | 3.70% |
| Jeffrey 112 | 139 / 112 / 131 mm | 148.70 / 121.61 / 141.14 mm | 7.90% |

The Jeffrey 106 and Jeffrey 112 product composites have **pixel-identical side-profile regions**, despite their different published rocker families. This is recorded in `data/source-notes.json`. The Jeffrey 112 therefore uses ON3P's separate Signature Pow family diagram instead. That diagram has an assumed 186 cm calibration and is not a measured current Jeffrey 112 profile. Its absolute height numbers are estimates. Its small numerical difference from the 106 should not be interpreted as evidence that one rocker family has less rise or more camber; source scale/loading are insufficient to establish that comparison.

The outline corrections are evidence of discrepancies between marketing images and the specification table. Fitting the image to those dimensions does not independently validate them. This is suitable for a reviewable configurator v1, with the confidence labels retained. It is not manufacturing CAD or a flex simulation.

## Shared geometry and integration

`geometry.mjs` is the dependency-free source of geometry for both the browser and Blender. `resolve(model, length, overrides)` resolves parameters; `generateMesh(model, definition, {side})` produces positions, faces, face-local UVs, material assignments, and longitudinal stations. The mesh varies outline, rocker, camber, thickness, and sidewalls. Thickness offsets follow the local base normal. Mount position is separate from waist position. Left/right and top/base artwork orientation are explicit.

Inputs are millimeters. Mesh buffers use meters, X across, Y up, +Z nose. Blender imports the same positions with the rotation `(x, -z, y)`; glTF export returns to the canonical browser axes. Neither Blender nor the UI maintains a second set of shape equations. The side-profile diagram is projected from the same mesh.

For future Ski Studio integration, extract this kernel into `packages/ski-geometry` in:

`C:/Users/Welles Ruhlin/Documents/Codex/2026-09-24/ski-studio`

Connect the ON3P brand pack's normalized model/length to the geometry definition and replace only the current stage renderer. Preserve the configuration engine, compatibility rules, pricing, saved state, and share-link semantics. The current lab's stock-image UV mapping should be adapted to the configurator's print-canvas registration. Runtime prototype: `app.mjs`; current shared stage: `packages/configurator/src/ui/Stage.jsx`. No application files in that workspace were edited for this prototype.

## Regenerate and verify

From this folder, Node.js 22+ is sufficient to serve the lab and run the geometry checks. Three.js and fonts are bundled locally with their licenses; no CDN is needed at runtime.

```sh
npm start
npm test
npm run export
```

To redo image measurement, use Python with Pillow and NumPy:

```sh
python scripts/reconstruct.py --sources reference/metadata
node scripts/export-mesh.mjs
```

Build and check Blender outputs with Blender 5.2:

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/blender_build.py
blender --background --factory-startup --python-exit-code 1 --python scripts/verify_blender.py
```

On this machine Blender is installed at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`; quote that full path if `blender` is not on PATH. Rebuilding overwrites only generated assets inside this lab folder. The original Fall Line Blender assets are unchanged.

Validation files:

- `data/verification.json`: all 18 published model/length combinations; width and length constraints, rise constraints, closed topology, triangle validity, outward winding/positive volume, input validation, and custom regeneration.
- `data/blender-verification.json`: six Blender objects reproduce the canonical mesh coordinates within floating-point tolerance.
- `data/export-verification.json`: all three GLB pairs reimport with matching coordinates, UVs and four material slots; the Blender control panel regenerates a changed waist dimension.

These are software consistency checks. Manufacturer accuracy remains limited by the source evidence. The Blender CLI emitted a thumbnail-cache write warning in this environment; saved `.blend`, packed textures, rendered preview, GLB export and reimport were verified successfully.

## Sources and credits

Retrieved September 24, 2026:

- [ON3P Jeffrey 106](https://www.on3pskis.com/products/jeffrey-106)
- [ON3P Woodsman 108](https://www.on3pskis.com/products/woodsman-108)
- [ON3P Jeffrey 112](https://www.on3pskis.com/products/jeffrey-112)
- Source image URLs and SHA-256 hashes are retained in `data/on3p.json`; original delivered model/image metadata is in `reference/metadata/`.
- Signature and Signature Pow rocker references are ON3P diagrams linked from those product pages. The filenames identify them as 2025-family assets; their presence on a current product page does not prove a size-specific 2027 profile.
- Original graphics belong to ON3P and their artists. This is an independent appreciation prototype, with no affiliation or endorsement claimed.
- Three.js 0.180.0 (MIT), Barlow and Saira fonts (OFL); licenses in `vendor/`.
