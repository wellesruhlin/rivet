# Bindings step and Blender study

Implemented September 24, 2026. The flow is now **Shape → Graphics → Construction → Bindings → Review**. Bindings are optional; “Skis only” is the default. Four configurable sections contribute to review progress. Existing graphic confirmations still apply before entering Bindings or Review.

## Current ON3P catalog

Sources: [binding collection](https://www.on3pskis.com/collections/bindings), [Pivot 2.0 15 GW](https://www.on3pskis.com/products/look-pivot-2-0-15-gw), [Pivot 2.0 13 GW](https://www.on3pskis.com/products/look-pivot-2-0-13-gw), [replacement brake](https://www.on3pskis.com/products/look-pivot-brake).

| Product | Pair price | DIN range | Colors | Listed brakes |
| --- | --- | --- | --- | --- |
| LOOK Pivot 2.0 15 GW | $499.95 | 6–15 | Black, Blue, Orange, Super Edition | 95 / 105 / 115 mm |
| LOOK Pivot 2.0 13 GW | $399.95 | 4.5–13 | Black | 95 / 105 / 115 mm |

Prices and per-variant availability come from the live product pages and their public Shopify `.js` records, not older collection/search prices. `src/bindings-catalog.json` preserves product sources, variant IDs, prices, availability, and the observation date. Availability is a snapshot, not a live inventory integration. Downloaded product records are in `../../work/bindings/`; ON3P photographs are in `public/bindings/`.

The replacement brake listing is for Pivot 1.0. It is linked as an accessory, not treated as another binding or a verified 2.0 conversion. Package discounts, mounting, shipping, and tax are excluded.

## Quote versus visual preview

`config.binding` is an available catalog variant ID, or an empty string for skis only. It contributes one pair price to the existing BOM, total, Review, text export, local save, and shared URL. The default normalization path validates it on every edit or load.

The prototype conservatively screens brake widths: at least the exact selected ski waist and no more than 15 mm wider. This is our prototype policy, not a manufacturer compatibility certification. DIN ranges and boot standards describe products; the app never recommends a release setting. Final fit and mounting remain shop work.

Example: Jeffrey 98 / 186 with Blue / 105 mm Pivot 15 passes that screen and was available in the snapshot: $1,099 + $499.95 = **$1,598.95**. Removing it restores **$1,099**. Changing to an incompatible ski removes the binding and displays the reason.

Billy Goat 118 exceeds every listed brake width; all 115 mm variants were also unavailable. The app therefore offers an explicitly labeled **visual test only** on that ski. It does not add a binding cost or assert confirmed fit.

The step is one mutually exclusive choice: **Skis only**, **Pivot 2.0 15 GW** or **Pivot 2.0 13 GW** (September 25, 2026). Choosing a model mounts it on the skis immediately, starting from the first variant that is listed available and passes the brake screen, or the widest fitting brake when none is orderable. Changing color or brake width re-applies the choice. An orderable variant goes into `config.binding` and the price (“In your build”); any other variant becomes the temporary `previewBinding` owned by `App.jsx` (“Visual test only · not in your total”), with the reason and the orderable alternatives for that ski. Options that are not orderable for the selected ski are faded but still selectable. The choice travels with the build: a visual test stays on the skis through Review, and after a shape edit the choice is re-checked, staying in the price if it is still orderable and otherwise dropping to a visual test with a notice (the same happens when a link or saved build carries a pair that no longer passes). “Skis only” and “Remove bindings” clear both. Visual tests are labelled in Review and the build sheet (“Not in total”) and are not downloaded, saved or encoded in links. The Pivot 13 mounts the Pivot 15 model in black as a labelled stand-in, because its composite toe has not been modeled.

Example: on Woodsman 108 / 186 (108 mm waist) only the 115 mm brake passes the screen, and every 115 mm variant was listed unavailable in the snapshot, so any Pivot choice there is a visual test and the total stays at the skis' price.

## Blender asset (revision 3: rounded forms)

- Editable scene: `blender/look-pivot-15-study.blend` (43 MB; LOOK's catalogue pose, full Cycles materials, studio lights; cameras `Catalogue camera` (active), `Detail heel`, `Detail toe`)
- Study render: `blender/look-pivot-15-study.png`; every colorway, close-ups and comparison sheets in `blender/renders/`
- Browser asset: `public/models/look-pivot-15.glb` (1.77 MB, about 81,000 triangles, 58 named parts)
- Generator: `scripts/build-pivot-binding.py` with the modules in `scripts/pivot/`
- Earlier passes: `blender/archive-v1/` (box-primitive study) and `blender/archive-v2/` (revision 2 render, GLB and generator modules, for reference)

**Revision 3 (September 24, 2026).** Reworked after review: revision 2 read too square and the heel stood too upright.

- *Toe.* Re-measured from close-ups: the orange, purple and blue retail sets (registered to the calibrated black set on the mounting screws and end cap, then colour-segmented), a review photograph of the metal toe and LOOK's renders. The body is one loft of superellipse sections. The nose is nearly round and hugs the end cap. In plan the cowl tapers from 40 mm wide behind the cap to 62 mm at its rear. Its flanks lean in about 25° to a rounded shoulder under the DIN window, above a soft crease and a flatter underside. The oval disc on each flank (29 × 37 mm in side view) opens onto the 42 mm waist, which sweeps out as one facet into the 80 mm wings. The saddle between the wings is carved as photographed, and the gloss pads are caps over the wing tips. The base plate's front was also corrected: revision 2 ran it 8 mm too far forward.
- *Heel.* Tower sections are filleted: tight front corners under the gloss strips, a back rounded almost to a half-round, and gently crowned sides. The back-top edge is rounded. The diagonal rib panels and the rear spur are part of the painted casting, as on the coloured editions (revision 2 made them black rubber). The tower leans back 14° in the catalogue and on-ski poses (9° before).
- *Fit.* The toe's outline matches the side and top photographs within about 1–2 mm (`comparison-toe-side-photo.jpg`). In its true mounted position, the toe overlaps LOOK's catalogue render at silhouette IoU 0.93. The 14° heel matches LOOK's image slightly better than revision 2 did once LOOK's own staging is allowed for (heel turned about 2° and 8 mm nearer the toe): IoU 0.75 against 0.73. The study itself keeps the true 320 mm boot-sole placement.

**How it is built.** Every cast and molded part is a signed-distance solid (lofted sections, smooth blends, real fillets) evaluated in numpy and meshed with the OpenVDB module bundled with Blender (`scripts/pivot/sdf.py`); rods and brake wires are swept curves; printed graphics are conforming meshes (Barlow, SIL OFL), so they survive glTF export.

**Where the dimensions come from.** Side, top and three-quarter photographs of a retail Black Metal Pivot 2.0 15 (a retailer's five-view product gallery), scaled by the published 18 mm toe stand height and cross-checked against the 19 mm ISO toe lug (the wing jaws sit at 37.5 mm), plus the same retailer's orange, purple and blue sets for the toe's form. The heel is scaled against the toe in a photograph that shows both. Renders were overlaid on those photographs to fit the silhouettes. LOOK's catalogue viewpoint was solved from keypoints in LOOK's product image and refined by maximizing silhouette overlap. Key sizes: toe body 112 mm long (143 mm with its base) and about 62 mm tall; heel tower about 119 mm from the axle to the top; turntable 88 mm across. Placement keeps the 320 mm reference boot sole (boot toe at −160 mm, turntable centre at +125 mm from the mount mark).

**Parts.** Toe: base plate with parting line and screw bosses, AFD, pivot pedestal, round-nosed cowl with printed flanks, oval side discs and rear facets, wings with gloss-black pads, DIN window over a printed LOOK dial, end cap and Phillips DIN adjuster, four Pozidriv mounting screws. Heel: painted tower with gloss corner strips, cast rib panels and rear spur, DIN windows and indicator, top DIN screw, open heel-cup arch with side claws; nickel arms with knurled joints, hex knuckles and pins; stamped brackets and rivets; brushed turntable, titanium hub with countersunk screws and black fender; pedal with clips and zinc mechanism; U-bars; brakes with pads.

**Materials and colorways.** Metallic flake paint under a clear coat, concentrically brushed (anisotropic) turntable, zinc with a thin-film chromate tint, champagne nickel, gloss/satin black polymer and rubber with micro-texture, glass windows, matte print ink. Black Metal, Blue Steel, Orange and Super Edition, including Super Edition's fade to black (a per-vertex `paint_fade` attribute read by the paint shader; on the toe it runs diagonally across the rear facet). `src/geometry/binding-renderer.js` uses the same paint, clear-coat and print values per colorway. The GLB keeps plain PBR values: procedural flakes, the Super Edition fade and turntable anisotropy stay in the .blend (three.js derives anisotropy tangents from UVs, which these meshes don't have).

**Poses.** `catalogue` matches LOOK's images (tower leaning back 14°, pedal raised, brakes flared out and down). `ski` is used for the browser (tower at 14°, pedal down, brakes folded along the ski, clear of the topsheet on any width). `open` matches the step-in photographs (17°).

**Limits.** A visual study, not factory CAD, a drilling template or release guidance: major forms are within roughly 1–2 mm of the photographs, and hidden internals are omitted. The hand-lettered "Pivot" logo and the large stylized "15" on the Blue and Orange editions are LOOK artwork; they are set in Barlow here. The arm linkage follows the retail photographs; LOOK's catalogue image shows steeper arms that suggest a closed-position linkage not visible in the photos. The Pivot 13 toe is different and is still not modeled.

Regenerate from the app directory (about 2.5 minutes on an RTX 5080):

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build-pivot-binding.py            # GLB, .blend and renders
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build-pivot-binding.py -- --glb   # browser asset only
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build-pivot-binding.py -- --quick # low-sample previews
npm run build
```

`src/geometry/binding-renderer.js` loads the actual exported GLB using Three.js GLTFLoader, clones it for both ski pivots, and applies the selected colorway's paint and print finish. It follows each ski through exterior views and is hidden in the exploded construction and technical views. Placement uses the selected geometry's reference mount offset and local topsheet height. The Bindings camera shows one ski close up with orbit and zoom. Delayed loads are guarded, and GPU resources are disposed when removed or unmounted.

## Validation

48 automated checks pass, including binding normalization, price precision, removal, URL round-tripping, dependency review invalidation, five-step progression, GLB structure, and placement. Production build passes. Desktop and 390 × 844 browser checks verified graphic gating, BG118 preview add/remove without a price change, live Blue paint, Jeffrey98 add/remove with correct totals, Review/BOM details, and a clean browser error/warning log. Screenshots are in the parent outputs directory as `on3p-bindings-added.png`, `on3p-bindings-removed.png`, and `on3p-bindings-phone.png`.

Revision 2 of the Blender asset (September 24, 2026): the 48 checks still pass with the new GLB, and the production build passes. In the browser on port 5178, Jeffrey 98 / 186 with a Blue / 105 mm Pivot 15 renders at true scale with the correct $1,598.95 total; switching to Super Edition recolors paint and print; the console is clean. Visual comparisons against LOOK's catalogue images and the retail photographs are in `blender/renders/comparison-*.jpg`.

Revision 3 (September 24, 2026): the 48 checks pass with the new GLB and the production build passes. On port 5178, Jeffrey 98 / 186 with a Blue / 105 mm Pivot 15 shows the rounded toe and the 14° heel at true scale with the $1,598.95 total; Super Edition recolors paint and print; the console is clean. `blender/renders/revision-3-comparison.jpg` sets LOOK's image beside revisions 2 and 3; `comparison-toe-side-photo.jpg` (side and top, with the model outline drawn on the photographs), `comparison-toe-front-photo.jpg` and `comparison-heel-side-photo.jpg` compare the study with the retail and review photographs.
