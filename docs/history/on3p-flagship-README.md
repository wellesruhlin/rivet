# ON3P Custom Shop — independent fan concept

A working React + Vite redesign of the ON3P custom ski experience, built around original ON3P artwork and the public 26.27 specifications. Revision 3 presents the skis like a premium configurator: a dark studio stage, quiet type, and the artwork carrying all of the color.

## Run

Requires Node.js 22.12 or newer.

```sh
npm ci
npm test
npm run build
npm run preview -- --port 5178
```

Open http://127.0.0.1:5178. Development: `npm run dev`. The production `dist/` directory can be served by any static host, at the domain root or a sub-path (the build uses relative asset URLs). Static hosting still supports the visual configurator. On localhost, Request maker review connects to the sibling Maker Studio service for durable builds, approved pilot quotes and CSV/JSON handoff. Start that workspace with its scripts/start-workspace.ps1 and manage it at http://127.0.0.1:5192/manage. No payment, live ERP transmission or manufacturer order is created.

### Artwork pipeline

Original print canvases are 1000 × 1600 px, with each ski occupying about 92 × 1424 pixels. The 3D preview uses lossless PNG pair crops fetched directly from the catalog's original source URLs. `npm run art:print` reproduces all 351 crops and their provenance manifest. `npm run art` retains the older WebP/thumbnail pipeline:

| Output | Crop | Typical size | Used by |
| --- | --- | --- | --- |
| `art/print/<name>.png` | the ski pair at native resolution | varies | 3D preview |
| `art/stage/<name>.webp` | older compressed pair | ~70 KB | retained fallback assets |
| `art/thumb/<name>.webp` | the tip half of the pair, 200 px wide | ~21 KB | gallery tiles, summaries |

Outputs newer than their source are skipped, so re-running is cheap. Crops share canvas coordinates with the preview geometry in `src/art-geometry.js`. The derivatives are kept in `public/art/`, so `npm ci && npm run build` works without regenerating them.

## Experience

- **Inside / Construction:** entering Construction enlarges the 3D pane, zooms into the selected ski, and lifts the topsheet to reveal the layup. All six layups have distinct core/insert/base/edge combinations. Assemble or separate the layers and switch between underfoot detail and the whole ski. Hover a layer (or tap it on touch screens, or use the numbered legend) to highlight it, dim the rest and open a card saying what it is and does; a click or tap pins it. Layers use procedural material maps (bamboo and paulownia grain, glass/carbon twill, chopped-strand mat, brushed steel and Scalium, damping rubber, machined UHMW) with soft studio reflections, and the sidewalls stand well clear of the core. The same layer generator also produces the Blender construction asset; unpublished internal dimensions and separation are visibly labeled as illustrative.

- **Shape:** category → named model → explicit length → rocker, with source-backed limits and visible reasons for anything unavailable. The size is never picked for the customer.
- **Graphics:** 260 topsheets and 91 bases with search, filters and a stable gallery order; nine sidewall colors. Verified current stock topsheets and bases default per model. The action button prompts for an unconfirmed base first, then sidewalls, with an explicit way to keep each default. Selecting an option also confirms it; visiting its tab does not. Wood tops show their $250 surcharge.
- **Construction:** six layups with tradeoffs and specs, four flex options, park detune and skin clip, each constrained by model rules.
- **Bindings:** optional LOOK Pivot 2.0 15 GW / 13 GW pairs with dated prices, colors, availability, and conservative brake-width screening. Preview an actual Blender-exported Pivot 15 on the skis, change its paint, or remove it. Valid selections enter the BOM and saved build; visual tests stay separate. See [BINDINGS.md](BINDINGS.md).
- **Review and build sheet:** an itemized, editable bill of materials with review progress; save on the device, copy a link, or download a text build sheet.
- **Preview:** the Blender study's shared geometry renderer is the sole preview, covering all 18 selectable models. Front ↔ Back turns each ski around its own vertical axis. Sidewall opens automatically while choosing sidewall colors; 3D enables free orbit; Tech Specs shows the 3D side profile and published specifications. Printed tops use coarse worn facets with subtle moving glints; wood covers use a medium-flat satin finish. See `src/geometry/README.md` for renderer, source and measurement details.

## Architecture

```
src/
  config.js            domain: catalog, compatibility rules, normalization, prices, BOM, links, export
  build-state.js       pure reducer (config, step, reviews, graphics confirmations, adjustments, view)
  stock-art.json       verified current stock top/base mapping and public source provenance
  art-geometry.js      artwork crop geometry, ski outline and asset URLs (shared with scripts/)
  preview-views.js     shared seven-view mapping and transition easing
  App.jsx              layout shell and side effects (save, restore, share, download, toasts)
  components/          Header + StepNav, ModelStage + SkiModel, BuildBar + sheet,
                       Dialogs, ArtSwatch, Controls (radio groups, fields)
  panels/              Shape, Graphics, Construction, Bindings and Review panels
  geometry/            source data, geometry adapter, Three.js renderer, procedural finishes
  styles.css           design tokens and component styles, one file in sections
scripts/build-art.mjs  artwork derivatives
scripts/build-print-art.mjs  lossless source crops and provenance manifest
scripts/extend-geometry.py   additional public outlines and disclosed family estimates
```

- Every entry point — edits, restored saves, incoming links — goes through `normalizeConfig`, so dependent choices are validated in one place and explained when they change.
- The bill of materials (`bomLines`) is the single source for the total, the review breakdown and the exported sheet. Reference prices live in one `PRICES` table.
- UI state transitions are pure (`buildReducer`) and tested in Node alongside the domain rules.
- Single-choice controls are ARIA radio groups with roving focus and arrow keys; the build sheet takes focus when opened and returns it on Escape.

## Design system

| Token | Value | Use |
| --- | --- | --- |
| Background | `#0a0b0d` / panel `#0e1012` / surface `#14161a` | studio, options panel, cards |
| Text | `#eeece6`, `#a7aaaf`, `#7c8087` | primary, secondary, labels (all ≥ 4.5:1 on panel) |
| Pearl | `#f3f1eb` | the only accent: primary action and selected states |
| Caution | `#d8a55e` | rule notes and build adjustments |
| Display | Saira (variable width/weight) | nameplate, headings, numerals, tracked labels |
| Body | Barlow 400–600 | reading text |

Saira is ON3P's own web fallback for its Klavika headings, and Barlow is its body face, so the type stays on-brand while the weight and spacing become quieter. Both are OFL-licensed and bundled from `@fontsource` as WOFF2; licenses are in `public/licenses/`.

## Data and assets

Source: https://www.on3pskis.com/products/custom-skis, including its publicly delivered Kickflip catalog. Specification table revision: September 19, 2026. Retrieved September 24, 2026 UTC. Original artwork and logo belong to ON3P and their respective artists; they are used here to demonstrate a fan redesign, with no claim of ownership. Approval from the relevant rights holders is needed for independent commercial reuse. See `PRODUCT-RELATIONSHIPS.md` for the category mapping, compatibility matrix and unresolved source conflicts.

## Deliberate prototype boundaries

- All 18 selectable models have 3D geometry at every orderable length. The original three models retain their Blender-study traces; 12 more use current product silhouettes with estimated family profiles. Jeffrey 124 and Billy Goat 102/108 also use estimated family outlines. Lengths and widths are published; rocker, camber, thickness and shoulders remain estimates. Finishes are visual approximations. Manufacturing silhouette and exact artwork registration are not guaranteed.
- Stock art is verified for 15 current product listings in `stock-art.json`. Jeffrey 124 and Billy Goat 102/108 had no current stock listing and keep the existing/neutral graphic rather than claiming a stock match. Untouched stock presets follow model changes; deliberately different graphics are retained. Saves retain base/sidewall confirmations; incoming shared links ask for confirmation again.
- Some print canvases carry a model name in the artwork (for example, SFTL Blue reads "Jeffrey 108"), so the preview can show another model's nameplate. ON3P's production renderer presumably composites that zone separately.
- The catalog is a snapshot, not an availability feed. Mango 114 custom construction is held because the source lacks model rules.
- Pricing uses the published $1,099 starting price and regular upgrade prices. Selected binding pairs use their own catalog prices. Promotions, mounting, tax and shipping are excluded. Metal uses the regular $150 price rather than the temporary $100 introductory price.
- Custom uploads, mix-and-match art, automatic binding package discounts and checkout are not implemented.
- Local saves stay in this browser. A localhost build link only works on the computer running the preview.

## Verification

`npm test` covers configuration and reducer behavior, stock defaults, explicit graphics confirmations, every orderable model/length, UV orientation, dimensions, closed internal layer solids, source/Blender generator parity, original artwork provenance, finishes and view mappings. `npm run build` produces the static app; the Three.js renderer is lazy loaded. Public source resolution still limits extreme artwork close-ups, apart from the explicitly reconstructed Factory-series underfoot labels described in the geometry documentation.
