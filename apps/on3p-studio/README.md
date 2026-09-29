# ON3P Custom Shop — independent fan concept

A working React + Vite redesign of the ON3P custom ski experience, built around original ON3P artwork and the public 26.27 specifications. Revision 3 presents the skis like a premium configurator: a dark studio stage, quiet type, and the artwork carrying all of the color. Revision 3.1 moves the configurator into the shared `@rivet/configurator` package (also used by the Praxis concept) and makes the weight estimate follow the layup.

## Run

Requires Node.js 22.12 or newer. From the workspace root (`ski-studio/`):

```sh
npm ci
npm test
npm run build
npm run dev:on3p         # http://127.0.0.1:5180
```

To preview the production build: `npm run preview --workspace apps/on3p -- --port 5178`. The `apps/on3p/dist/` directory can be served by any static host, at the domain root or a sub-path (the build uses relative asset URLs). There is no backend, authentication, telemetry, or order submission.

### Artwork pipeline

Original print canvases (1000 × 1600 px) live in `art-source/` and are not shipped. `npm run art` (sharp) derives two sizes into `public/art/`:

| Output | Crop | Typical size | Used by |
| --- | --- | --- | --- |
| `art/stage/<name>.webp` | the ski pair at native resolution | ~70 KB | stage, technical drawing |
| `art/thumb/<name>.webp` | the tip half of the pair, 200 px wide | ~21 KB | gallery tiles, summaries |

Outputs newer than their source are skipped, so re-running is cheap. Crops share canvas coordinates with the preview geometry in `src/brand/art.js`. The derivatives are kept in `public/art/`, so `npm ci && npm run build` works without regenerating them.

## Experience

- **Shape:** category → named model → explicit length → rocker, with source-backed limits and visible reasons for anything unavailable. The size is never picked for the customer.
- **Graphics:** 260 topsheets and 91 bases with search, filters and a stable gallery order; nine sidewall colors. Wood tops show their $250 surcharge.
- **Construction:** six layups with tradeoffs and specs, four flex options, park detune and skin clip, each constrained by model rules.
- **Weight:** the stage readout, review and build sheet start from the published stock weight for the chosen length and apply ON3P's per-ski range for the layup (for example Woodsman 108 at 181 cm: 2,040 g stock, 1,640–1,715 g with Tour, 2,115–2,140 g with Torsion Bar).
- **Review and build sheet:** an itemized, editable bill of materials with review progress; save on the device, copy a link, or download a text build sheet.
- **Stage:** the pair stands on a lit studio floor. Topsheet ↔ Base turns the pair over in 3D; zoom to 240% and drag (or use arrow keys) to study artwork; **Technical** draws the planform and rocker profile from the published dimensions with the chosen topsheet inside.

## Architecture

The generic engine, session reducer and UI live in `packages/configurator` (see the workspace README). This app holds only what is ON3P's:

```
src/
  brand/catalog.json        models with lengths and specs; topsheet and base artwork
  brand/compatibility.json  per-model rules and per-artwork surcharges
  brand/pack.js             steps, option groups, prices, layups, sidewalls, weight, stage and review copy
  brand/art.js              artwork crop geometry, ski outline and asset URLs (shared with scripts/)
  brand/index.js            the engine, plus the helper names the original tests use
  guides.jsx                size, rocker, specifications, construction and how-it-works guides
  App.jsx                   header and share-link wiring around <Configurator>
  styles.css                ON3P theme: --cfg-* tokens and brand details
scripts/build-art.mjs       artwork derivatives
```

- Every entry point — edits, restored saves, incoming links — goes through the engine's `normalize`, so dependent choices are validated in one place and explained when they change.
- The bill of materials is the single source for the total, the review breakdown and the exported sheet. Reference prices live in `PRICES` and the layup table in `pack.js`; artwork surcharges come from `compatibility.json`.
- UI state transitions are pure (`createSessionReducer`) and tested in Node alongside the domain rules.
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

- The stage outline, lighting, 3D turn-over and technical drawing are illustrative. Manufacturing silhouette, exact rocker geometry and artwork registration are not guaranteed.
- Some print canvases carry a model name in the artwork (for example, SFTL Blue reads "Jeffrey 108"), so the preview can show another model's nameplate. ON3P's production renderer presumably composites that zone separately.
- The catalog is a snapshot, not an availability feed. Mango 114 custom construction is held because the source lacks model rules.
- Pricing uses the published $1,099 starting price and regular upgrade prices. Promotions, bindings, tax and shipping are excluded. Metal uses the regular $150 price rather than the temporary $100 introductory price.
- Custom uploads, mix-and-match art, binding packages and checkout are not implemented.
- Local saves stay in this browser. A localhost build link only works on the computer running the preview.

## Verification

ON3P's 21 tests run with the workspace's `npm test`: the 13 original configuration tests (including 3,024 normalized combinations), unchanged apart from their import path, and 8 session tests covering step locking, review gating, reopened sections, adjustment notices, link loading and weight by layup. `npm run build` succeeds (JS 117 KB gzip, CSS 11 KB gzip, `dist/` 34 MB including artwork). A scripted browser pass at 1440×900 (34 checks) covers dependency repair, keyboard radios, the Billy Goat 108 skin clip, Mango 114 holds, stock and layup weights, the Touring layup, wood pricing, gallery stability, build-sheet editing and focus, save/restore, link roundtrip and zoom panning, with no console errors. Revision 3 was also checked at 1920×1080, 1280×720, 1024×768 and 390×844.
