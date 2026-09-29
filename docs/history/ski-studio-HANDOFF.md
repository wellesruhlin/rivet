# Handoff — Ski Studio

## September 25, 2026 — Proteus snowboards

Requested: “Now do Proteus snowboards”: a Proteus configurator at the level of ON3P and Praxis.

Delivered (`apps/proteus`, http://127.0.0.1:5182, launch config `studio-proteus`):

- **The catalog from proteussnowboards.com**: 53 designs in 217 colorways with their prices ($749, collaborations $774), the four builds (+$15 / +$30 / +$45), eleven sizes with the published chart, accessories, free sidewall text (12 letters or numbers), the custom program ($50 processing fee) and the five ready-to-ride boards. The shop listed production as paused; the concept says so.
- **Steps**: Size (rider weight marks the sizes the chart fits; never chosen for you) → Graphics (board-wall gallery with colorways, collections and search; in-stock matches; your own artwork with a print-resolution check and base colors in Proteus's own template) → Build (Proteus's gauge and glass per build) → Camber → Extras (Snow Stopper, wax, wrench, sidewall text) → Review.
- **Adjustable Camber, the hero**: Proteus's six settings and a screw per end. The 3D board morphs and rests on the snow in the Camber view (heights ×4); Full S Curve tilts the board onto its tail contact as a real one would. From Proteus's stated 1.2 in travel per side, with flat at the indicator's center line; molded heights are estimates and labelled.
- **3D studio for a board**: the planform from the published waist, sidecut radius and effective edge with the traced nose and tail; design art cropped from Proteus's product images; printed sidewall text; the Snow Stopper; an Inside view of Proteus's layup (PiO2 top, Thru-Stitch Kevlar, glass per build, calculated carbon, triax patches, the camber mechanism (illustrative), poplar/paulownia core, UHMWPE tipfill, PU sidewalls, VDS rubber, full-wrap edges, 7500 base) in ten legend entries.
- **Shared package** (backwards compatible): `number` groups, `ui.widget`, function `bom`, text `sanitize`, resets that keep a dependent the same edit sets, pack wording hooks, and `model3d` options for a single board (`pair: false`, own `views`, the Camber view, `animateShape`, `parts`, `detailSpan`, printed sidewalls, rectangle and tinted-mask art layers).

Verification: `npm test` 66 of 66 (Proteus 15); `npm run qa:proteus` 54 of 54, `npm run qa:praxis` 48 of 48 and `npm run qa:on3p` 34 of 34, with no console errors or failed requests; `npm run build` builds all three apps; screenshots reviewed at 1440 × 900 and 390 × 844.

## September 25, 2026 — Praxis brought up to date

Requested: bring the Praxis configurator up to date with everything developed on the ON3P configurator since September 24 (bindings, clean-up, the Inside view and the rest).

Delivered:

- **3D studio in the shared package** (`packages/configurator/src/studio3d`), ported from the ON3P configurator in `2026-09-23/i/outputs/on3p-custom-shop`: the ski kernel, renderer, procedural finishes and construction materials, the exploded Inside view with hover, legend, pinned layer cards and pulled-out sidewalls, the binding GLB renderer, and the Front / Back / Sidewall / 3D / Bindings / Inside / Tech Specs views. Opt-in through `pack.model3d`; ski-studio's own ON3P app keeps its 2D stage.
- **Praxis in 3D**: every model, length and ±10 mm width from Praxis's traced outlines and spec charts (estimated, labelled profiles for the nine uncharted models); veneer and artwork painted as in 2D; the Praxis layup from its construction page (maple, ash, aspen and paulownia cores; tri-axial glass; carbon; the Rubber Dampening System; UHMW spacers and sidewalls; 4001 sintered base; 360° edges).
- **Bindings**: a new Bindings step with Praxis's LOOK Pivot 2.0 18 / 15 / 13 / 11 GW and CAST Freetour 2.0 pairs (52 color and brake variants, prices and stock from praxisskis.com), the brake screen, visual tests that stay mounted through Review and shape edits, notices when a pair leaves or rejoins the total, the pair in the build sheet, review, share links, downloads and the bag.
- **Clean-up**: plain step titles, the skiing style folding into a summary with Change, About this ski and core details on demand, a compact core picker, width and custom profile folded into one section, cents kept on binding prices, and a phone layout without sideways scrolling.
- ON3P features that don't apply to Praxis were left out: Maker Studio handoff (ON3P-only local service), ON3P's stock-art and base/sidewall confirmations, and the phone Configure/Preview switch (the Praxis page scrolls, so the stacked stage and panel already work).

Verification: `npm test` 51 of 51; `npm run qa:praxis` 48 of 48 and `npm run qa:on3p` 34 of 34, no console errors or failed requests; screenshots reviewed at 1440 × 900 and 390 × 844. The earlier sources are snapshotted outside the workspace (Claude session scratchpad, `ski-studio-before-praxis-3d`).

## September 24, 2026 — the shared configurator

### Requested

1. Make the ON3P weight estimate respond to construction changes such as the layup.
2. Generalize the ON3P configurator so it can serve Praxis's catalog.
3. Bring the Praxis concept site up to the configurator's standard and plug the configurator in.

### Delivered

- **One configurator, two brands.** `packages/configurator` holds the engine (validation, dependent-choice normalization with explanations, BOM pricing with quotes, weight ranges, share links, build sheet), the session reducer and the React UI. Each brand is a pack plus a theme; see `README.md`.
- **ON3P (rev 3.1)** runs on the shared package with its original 13 configuration tests passing unchanged apart from the import path. Weight now follows the layup: Woodsman 108 at 181 cm reads 2,040 g stock, 1,640–1,715 g with Tour and 2,115–2,140 g with Torsion Bar, on the stage, in the review and on the build sheet.
- **Praxis** is rebuilt in React on the same design language (warm graphite, Fraunces and DM Sans): home, collection with compare, product pages with to-scale drawings from Praxis's spec charts, workshop, materials and support, and a bag that holds stock skis and editable custom builds. The configurator covers all 22 custom shapes with Praxis's own options, prices, standard flex and core per model and length, 157 library graphics plus the three signature graphics, six veneers blended the way Praxis stains them, width adjustments that redraw the outline, molding quotes, and weight estimates that only move by amounts Praxis publishes. Details and every data conflict are in `apps/praxis/README.md`.
- The AI-generated graphite covers from the first Praxis concept are replaced by cutouts of Praxis's original photographs.

### Verification (final run)

- `npm test`: 42 of 42 (engine 8, ON3P 21, Praxis 13).
- `npm run build`: both apps build. ON3P JS 117 KB / CSS 11 KB gzipped, `dist/` 34 MB with artwork. Praxis JS 131 KB / CSS 16 KB gzipped, `dist/` 12 MB.
- `npm run qa:praxis`: 35 of 35, and `npm run qa:on3p`: 34 of 34, with no console errors (and, for Praxis, no failed requests).
- Screenshots in `screenshots/` were reviewed at 1440×900 and 390×844.

### Where things are

- Workspace: `Documents/Codex/2026-09-24/ski-studio` (npm workspaces; not a git repository).
- Dev servers: `npm run dev:on3p` (5180) and `npm run dev:praxis` (5181), also available as `studio-on3p` and `studio-praxis` in `Documents/Codex/.claude/launch.json`.
- Untouched originals: ON3P revision 3 at `2026-09-23/i/outputs/on3p-custom-shop` (launch config `on3p-custom-shop`, port 5179) and the first Praxis concept and review package at `2026-09-23/go-x20/outputs/`. Nothing was published or redeployed; the private hosted Praxis preview still serves the first concept.

### Open items

- `npm audit` reports one high-severity advisory: sharp 0.34 (libvips/libheif). Sharp only runs in the local art scripts on images already cached from the brands' sites; the apps don't ship it. Upgrading to sharp 0.35.4 means re-running and re-checking both art pipelines.
- Praxis data that needs the maker's answer: SND standard flex (#4 on the form, #5 in the description), FRD standard core (carbon in the description, not on the form), missing charts for nine models and several lengths, and the Quixote's foot-specific outlines.
- For production: live prices and availability, a real cart and checkout (Praxis's BigCommerce product and option IDs are in the saved pages), the brands' approval of copy, imagery and wordmarks, optimized original photographs, and consented analytics.
