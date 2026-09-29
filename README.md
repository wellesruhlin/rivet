# Rivet CPQ

Welles Ruhlin's configure-price-quote work: product configurators built from
real makers' public catalogs, the shared engines behind them, and the Rivet
marketing site. Private. Several apps contain makers' original artwork and
names; nothing here is affiliated with or endorsed by those makers.

## Layout

One npm workspace (`npm install` at the root) for everything except `apps/site`.

| Path | What it is |
|---|---|
| `packages/configurator` | `@rivet/configurator`: the engine every brand runs on (rules, session, React UI, 3D ski studio) and, under `./product`, the order-side contract (validate, price, snapshot, hand off). `engineProduct()` turns any brand's engine into a Maker product. |
| `packages/ski-geometry` | `@rivet/ski-geometry`: the one ski mesh kernel, construction-layer builder and traced-outline models. Dependency-free; runs in Node, the browser, Blender exports and Fall Line. |
| `packages/product-recipes`, `packages/ref-parsons` | Maker Studio's recipe compiler and the Parsons table product. |
| `brands/on3p` | `@rivet/brand-on3p`: ON3P's catalog, rules, traced geometry, layups, bindings, artwork (`art-source/`, `public/`), Blender sources, art scripts and app shell. |
| `brands/praxis` | `@rivet/brand-praxis`: Praxis's custom catalog and rules, in-stock catalog, traced shapes, veneers, artwork, bindings, import scripts and configurator guides. |
| `brands/proteus` | `@rivet/brand-proteus`: Proteus's boards, sizing, adjustable camber, board geometry, layup, artwork, import scripts and app shell. |
| `brands/folsom`, `brands/meier`, `brands/grass-sticks` | The outreach makers: each pack is the maker's record, scraped catalog, traced outlines, maker-specific options and artwork (`public/`). |
| `apps/on3p`, `apps/proteus` | Thin hosts: the shared configurator plus one brand pack (a few lines each). |
| `apps/praxis` | The Praxis storefront (collection, product pages, bag) around `@rivet/brand-praxis`. |
| `apps/outreach` | The first-wave review: one studio template (`src/pack.js`) run over the three outreach packs, plus catalog controls. |
| `apps/maker-studio` | Product recipe editor, table configurators, quote/handoff API. |
| `apps/site` | Rivet marketing site (ChatGPT Sites; own lockfile, not in the workspace). |
| `labs/on3p-ski-lab` | ON3P geometry lab and Blender library/export scripts, on the shared kernel. |
| `qa/` | Scripted browser passes (puppeteer) and presentation screenshots. `qa/on3p-parity.mjs` checks the ON3P flagship's preserved behaviors. |
| `work/maker-studio-builds` | Maker Studio's saved drafts and builds. **Data: back it up.** |
| `work/stock-2027` | Cached ON3P product data for `brands/on3p/scripts/extend-geometry.py`. |
| `docs/history` | Handoff notes from the pre-import projects. |

Fall Line consumes these products too. Its
[CPQ asset reuse contract](https://github.com/wellesruhlin/fall-line/blob/main/docs/CPQ-ASSET-REUSE-CONTRACT.md)
requires one maintained Blender/product master to feed both the CPQ preview and the game.

## Run and test

Node 22.12+.

```sh
npm install
npm test                 # every workspace: engine, geometry, brands, apps, lab
npm run build            # every app
npm run dev:on3p         # flagship ON3P  http://127.0.0.1:5178
npm run dev:praxis       # 5181 · dev:proteus 5182 · dev:outreach 5184
npm run server:maker     # Maker API 5193, then npm run dev:maker for the app on 5192
```

Browser QA: start the matching dev server, then `npm run qa:on3p` (or `qa:praxis`,
`qa:proteus`, `qa:outreach`). Set `CHROME_PATH` if Chrome isn't at the default Windows
location; `CHROME_NO_SANDBOX=1` for containers running as root.

`brands/on3p/test/parity.test.js` checks the ON3P engine pack against frozen copies of
the original flagship's rules and session: normalization, edits, explanations, build
sheet, links and whole sessions must match. `labs/on3p-ski-lab/test/golden.json` pins every lab mesh and construction layer to
the output of the original lab code. If a kernel change moves a fingerprint, that
change altered real geometry: review it, don't just regenerate the file.

## Adding a brand

A brand is a folder under `brands/<id>` with its own `package.json` (`@rivet/brand-<id>`).
It exports a pack for `createEngine()` from `@rivet/configurator`: steps, option groups,
context, prices and presentation hooks, and optionally `model3d` for the 3D studio (use
`@rivet/ski-geometry` for shapes). Artwork goes in the pack's `public/`, sources and
scrapes in `art-source/`, and tests in the pack. An app is then a few lines that mount
`Configurator` with the engine and point Vite's `publicDir` at the pack (see `apps/proteus`).
For a quick outreach demo, add a pack like `brands/meier` and list it in
`apps/outreach/src/catalog.js` and `vite.config.js`.

## History

Assembled on 2026-09-29 from the Codex working folders on Welles's PC. Only the
site had version control before; its history is preserved under `apps/site`.
The original folders were left untouched. Older documents (including Fall
Line's asset-production records) cite these pre-import paths:

| Old path under `Documents/Codex` | Now |
|---|---|
| `2026-09-23/i/outputs/on3p-custom-shop` | `apps/on3p` (app) and `brands/on3p` (rules, data, geometry, art, scripts, Blender) |
| `2026-09-23/go-x20/outputs/maker-studio` | `apps/maker-studio`, `packages/configurator/src/product` (was `configurator-core`), `packages/product-recipes`, `packages/ref-parsons` |
| `2026-09-23/go-x20/outputs/on3p-ski-lab` | `labs/on3p-ski-lab` |
| `2026-09-23/go-x20/work/maker-studio-builds` | `work/maker-studio-builds` |
| `2026-09-23/i/work/stock-2027` | `work/stock-2027` |
| `2026-09-24/ski-studio` | `packages/configurator`; `brands/praxis` + `apps/praxis`; `brands/proteus` + `apps/proteus`; `brands/folsom`, `brands/meier`, `brands/grass-sticks` + `apps/outreach`; `qa/` (its 2D ON3P app was retired for the flagship) |
| `2026-09-28/giv/outputs/rivet-site` | `apps/site` |

Text files are stored with LF line endings, so a few files that had Windows line
endings hash differently from the originals. Ski Studio's lockfile was
re-synced during import (the `outreach` app had been added without updating it,
so `npm ci` failed).

Not imported (still only in the Codex folders): the earlier Praxis site
prototypes and review packages in `2026-09-23/go-x20/outputs/`, zip snapshots,
and scratch scripts and logs under the dated `work/` folders.
