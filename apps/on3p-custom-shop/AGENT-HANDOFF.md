# ON3P configurator: agent handoff

Prepared September 24, 2026. This document describes the implemented prototype and the user's accepted direction. It does not authorize contacting ON3P, publishing, or changing unrelated projects.

## Purpose and design direction

An independent fan redesign of ON3P's custom ski configurator, intended eventually to be shared with ON3P as an act of appreciation. The user wants a thoughtful ski-buying experience with strong product relationships, original ON3P graphics, clear configuration progress, and convincing 3D inspection. Keep the dark studio presentation, restrained typography, and artwork as the main source of color.

Original source: https://www.on3pskis.com/products/custom-skis

## Correct project and preview

- Project: `C:\Users\Welles Ruhlin\Documents\Codex\2026-09-23\i\outputs\on3p-custom-shop`
- Local preview: http://127.0.0.1:5178/
- Billy Goat example: http://127.0.0.1:5178/#build=model=billy-goat-118&length=186
- Port 5178 serves the production `dist` directory. Source edits require `npm run build` before refreshing this preview.
- The server was restarted after a power outage and the Billy Goat 118 preview was visually verified. A future machine restart will stop this local process again.
- This URL is local to the host computer; it is not a public share link.
- The separate `2026-09-24/ski-studio` workspace is a different application. Do not accidentally work there.

## Read next

1. [README.md](README.md): application overview, commands, architecture, design system, and boundaries.
2. [PRODUCT-RELATIONSHIPS.md](PRODUCT-RELATIONSHIPS.md): source precedence, category hierarchy, exact compatibility matrix, and source conflicts.
3. [src/geometry/README.md](src/geometry/README.md): Blender/browser relationship, geometry provenance, material rendering, construction layers, and artwork-resolution limitations.
4. [BINDINGS.md](BINDINGS.md): current catalog, quote/preview separation, brake policy, and editable Blender asset.
5. [src/stock-art.json](src/stock-art.json): current stock topsheet/base IDs, model mappings, observation date, and official source URLs.

## Behaviors to preserve

- Shape selection is **category → named model → explicit length → rocker**. Categories are Park, Freestyle, Freeride, and Touring. Width alone is not the product hierarchy. A displayed sample length never selects the customer's size.
- Ripper rocker is restricted by exact model and length. It is not universal. Construction, flex, tune, and skin-clip options also follow the compatibility data. Invalid dependent selections are normalized and visibly explained.
- Graphics includes 260 topsheets, 91 bases, and nine sidewall colors. Selecting artwork never removes, replaces, or reorders its original gallery tile. Search, filters, pagination, and “Find in gallery” remain available.
- Base and sidewall choices require an interaction or explicit acceptance before progressing to Construction. The main button prompts for **base first**, then sidewalls. “Use this base” and “Use black sidewalls” allow keeping defaults. Merely visiting a tab does not confirm it; clicking the already-selected option does. Later step tabs redirect to the first unconfirmed graphic choice.
- Stock artwork defaults are verified for 15 models. **Billy Goat 118 starts with BG XXII topsheet and Green base**. Green is the stock herringbone design, not Herringburn Green. Oski has its own OSKI I topsheet/base. Untouched stock presets follow model changes; deliberately different artwork is retained.
- Jeffrey 124 and Billy Goat 102/108 had no current stock listing to verify. Their existing/neutral artwork is not labeled as verified stock.
- The expandable build sheet is an editable bill of materials, with prices and section-review progress. It shares the same calculations as Review and the text export.
- Device saves preserve graphics confirmations. Shared links carry configuration values, but their recipients confirm graphics again.
- **The Blender-based 3D renderer is the sole live preview**. Front, Back, Sidewall, 3D orbit, Bindings, Inside, and Tech Specs are available. Original/Compare layout controls were retired. Old SVG/comparison files remain unused source.
- Bindings is the optional fourth configuration section, before Review. An actual Blender GLB Pivot 15 can be added/removed from the skis. Valid available pairs enter the price and saved configuration; wide-ski visual tests do not. See BINDINGS.md for the conservative brake policy.
- Construction automatically opens Inside and reveals the selected layup's layers. Preserve assembly/separation, whole-ski/underfoot views, and synchronized artwork/sidewalls.

## Implementation map

| Area | Main files |
| --- | --- |
| Product rules, stock defaults, pricing, BOM, links | `src/config.js`, `src/catalog.json`, `src/compatibility.json`, `src/stock-art.json` |
| Session transitions and confirmations | `src/build-state.js` |
| Shell, save/restore, routing between panels | `src/App.jsx` |
| Primary 3D preview | `src/components/ModelStage.jsx`, `src/components/SkiModel.jsx` |
| Geometry and rendering | `src/geometry/configured.js`, `kernel.mjs`, `on3p.json`, `renderer.js` |
| Construction layers and surface finishes | `src/geometry/construction.mjs`, `finishes.js`, `print-detail.js` |
| Graphics, dynamic CTA, build sheet | `src/panels/GraphicsPanel.jsx`, `src/components/BuildBar.jsx` |
| Styling | `src/styles.css`, `src/components/comparison.css` (still used by the primary model stage) |
| Artwork provenance | `public/art/print/manifest.json`, `scripts/build-print-art.mjs` |
| Additional geometry generation | `scripts/extend-geometry.py` |

One reducer owns the configuration. Every edit, saved build, and incoming link uses the shared normalization path. Do not add a second configuration store inside the renderer.

## What “Blender-based” means

The live browser generates meshes with the same dependency-free geometry and construction kernels used by the Blender study. The ski bodies do not load a static `.blend` or GLB at runtime. The new Pivot 15 binding **does** load an actual Blender-exported GLB; its editable scene and generator live in this app’s `blender/` and `scripts/` folders. The source lab is:

`C:\Users\Welles Ruhlin\Documents\Codex\2026-09-23\go-x20\outputs\on3p-ski-lab`

All 18 selectable models have geometry for every orderable length. Jeffrey 106, Woodsman 108, and Jeffrey 112 retain the original study records. Twelve more use current product silhouettes constrained to published widths, with estimated family profiles. Jeffrey 124 and Billy Goat 102/108 also use family outline estimates. Rocker, camber, thickness, finishes, and unpublished internal geometry are illustrative, not factory CAD. These limitations are disclosed in the UI.

## Artwork fidelity: important remaining limitation

The public custom-art canvases contain only about **92 × 1424 pixels per ski**. Lossless crops prevent additional degradation but cannot restore absent detail. The user specifically objected to pixelation during close inspection.

The twelve Factory color topsheets now have reconstructed underfoot lettering/badges rendered into localized high-density textures. Model, length, dimensions, and rocker follow the selection. Fonts, badges, and tiny footer text are concept approximations, explicitly disclosed; these are not recovered production masters. Other illustration details and distressed logos remain limited by the public source resolution. Do not describe the whole artwork catalog as high resolution or imply that all close-up pixelation has been solved. Higher-resolution official masters remain the faithful solution.

## Run and packaging dependencies

From the project directory, with Node.js 22.12 or newer:

```powershell
npm ci
npm test
npm run build
npm run preview -- --port 5178 --strictPort
```

If dependencies are already installed and `dist` exists, only the last command is needed to restore the preview. The server stays running while that command runs. For development, use `npm run dev -- --port 5179 --strictPort`.

**Source portability caveat:** `package.json` references `@maker/configurator-core` through `file:../../../go-x20/outputs/maker-studio/packages/configurator-core`. Copying this project folder alone is not enough for a clean install elsewhere. Include that package and update the local path, or package it properly. Review the construction parity test's optional sibling-lab reference too. The already-built `dist` is a self-contained static web artifact with relative asset URLs; its assets do not require the sibling source package at runtime.

The additional-geometry script needs Python with Pillow/numpy and cached product files under `../../work/stock-2027`. These are regeneration dependencies, not browser runtime dependencies. Production artwork derivatives are already checked into the project folder under `public/art`.

## Validation and limits

Last implementation validation: **48 tests passed** and the production build passed. Tests cover stock defaults, confirmation flow, configuration rules, all orderable model/length geometry, UV bounds, closed meshes, construction, finishes, and source parity. Browser checks covered desktop and 390-pixel phone layouts, defaults, confirmation prompts, construction entry, binding preview removal/color changes, quote pricing/removal, and BOM/Review integration without console errors. Vite reports a large lazy-loaded Three.js chunk warning; it is not a build failure. The binding implementation and production build were verified on September 24, 2026.

This is a static fan prototype: no checkout, backend, order submission, live inventory, custom uploads, mixed graphics, or automatic binding package discounts. Price and compatibility are public-source snapshots. Mango 114 custom construction remains held for confirmation. ON3P owns its artwork and branding; provenance is retained in the project.

## Suggested prompt for the receiving agent

“Read AGENT-HANDOFF.md and the linked documentation, then inspect the actual source before proposing changes. Analyze the configurator for product-rule correctness, graphics confirmation flow, 3D fidelity, and portability. Preserve the user's accepted behaviors. Distinguish verified ON3P data from estimates and identify what still needs official assets or confirmation. If packaging the source, resolve the local configurator-core dependency; if packaging the built demo, include the complete dist directory. Do not send anything to ON3P or publish without my request.”
