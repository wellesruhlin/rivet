# ON3P interior construction — September 24, 2026

The local configurator at http://127.0.0.1:5178 now opens an animated interior view when the customer enters Construction. It retains the selected graphic, color, ski dimensions and rocker. The camera moves into an underfoot inspection, then the topsheet and internal layers separate. Assemble ski / Separate layers and Whole ski / Underfoot detail control the presentation. The Inside tab can recall the view at any time; other tabs return to the exterior and the customer's previous comparison layout.

## Blender

`blender/on3p-ski-construction.blend` is a new version of the existing exterior library. The original exterior collections remain in the file but are hidden to focus on the new construction study. Six asset-marked Jeffrey 106 / 186 cm collections cover Stock, LITE, 50/50, Tour, Leaf Spring and Torsion Bar. Each contains a Reveal control empty and 28 or 29 individual layer objects. Scrub frames 1–55 to assemble/separate the layers. The empty's `separation` property drives their offsets from 0 to 1.

For another supported model/size, run `scripts/blender_controls.py` in Blender's Text Editor, then use Sidebar → ON3P → Show construction layers. Select a layup, model and size and regenerate. Layer separation updates the generated preview live. Existing assets are not overwritten by this operation. Scripts require the complete lab folder and Node.js. Nothing auto-executes when the blend file is opened.

`construction.mjs` generates the layer solids from the original exterior's longitudinal sections. Browser and Blender use identical vertex geometry; their artwork UV registration differs because Blender retains the photographed stock art and the web preview uses the configurable print canvases. Each internal layer follows the original outline, thickness envelope and rocker/camber. Browser coordinates are meters, X across, Y up, +Z nose; Blender rotates them to X across, -Y nose, Z up.

## Evidence and limits

Source: [ON3P Custom Skis, layup comparison and materials](https://www.on3pskis.com/products/custom-skis), accessed September 24, 2026. Original diagrams are archived in `reference/construction/` with their URLs and hashes in `sources.json`.

Published facts represented include the full bamboo versus bamboo/paulownia cores, bamboo mounting plate for hybrid cores, two Scalium insert types, 2800 fiberglass/carbon composite, binding reinforcement, full-height UHMW sidewalls, VDS bonding rubber, and the layup-specific base/edge sizes. The long narrow Torsion Bar and shorter wider Leaf Spring are distinguishable; exact outlines, including the Leaf Spring's fork details, are simplified.

**This is a material/construction illustration, not a manufacturing laminate schedule.** ON3P does not publish precise ply thicknesses, core-strip widths, insert dimensions/depths or the full bond schedule. Those are estimated for visualization. Layer gaps are exaggerated. The insert is shown lifting from the top-core region; the core is not CNC-machined into an exact receiving pocket. Resin is not shown as a separate layer. Steel termination remains estimated. Flex-dependent machining, skin-clip hardware and detune are not simulated. Existing width/rocker confidence notes remain in force.

The wider underfoot binding mat is distinct from the bamboo mounting plate. Base artwork is placed only on the underside; topsheet artwork only on the outer face. Core strips and inserts change with layup, while the external dimensions continue to come from the existing normalized selection.

## Reproduce and verify

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender_construction.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/verify_construction.py
```

Verification reports in `data/construction-verification.json` and `data/construction-blender-check.json` record shared-coordinate agreement, six saved collections, working reveal drivers, and successful Woodsman 108 / 181 cm / Tour regeneration with live separation changes. Verification does not overwrite the saved library. Blender emits an unrelated thumbnail-cache warning on this machine; saving and reopening the actual blend, rendering and driver checks succeed.

The integrated app is in `../../../i/outputs/on3p-custom-shop` relative to this folder. Its `src/geometry/construction.mjs` is a byte-identical copy of this generator. `construction-renderer.js` owns the layer materials and GPU lifecycle; `renderer.js` owns the shared camera and reveal transitions. The app's 35 tests include closed finite layer solids across all supported sizes, published base depth, optional-material rules, insert proportions, canonical generator parity and automatic Construction entry. Build with `npm run build` in that app to refresh port 5178.
