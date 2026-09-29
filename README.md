# Rivet CPQ

Welles Ruhlin's configure-price-quote work: product configurators built from
real makers' public catalogs, the shared engines behind them, and the Rivet
marketing site. Private. Several apps contain makers' original artwork and
names; nothing here is affiliated with or endorsed by those makers.

## Layout

One npm workspace (`npm install` at the root) for everything except `apps/site`.

| Path | What it is |
|---|---|
| `packages/configurator` | `@rivet/configurator`: the shared engine, session reducer, React UI and 3D ski studio every brand runs on. |
| `packages/ski-geometry` | `@rivet/ski-geometry`: the one ski mesh kernel, construction-layer builder and traced-outline models. Dependency-free; runs in Node, the browser and feeds Blender and Fall Line. |
| `packages/configurator-core` | `@maker/configurator-core`: the order-side product contract (validate, price, snapshot, hand off). |
| `packages/product-recipes`, `packages/ref-parsons` | Maker Studio's recipe compiler and the Parsons table product. |
| `brands/on3p` | ON3P artwork (`art-source/`, `public/`) and construction layups, stored once. |
| `apps/on3p-custom-shop` | Flagship ON3P configurator: Blender-based 3D, bindings, build sheet. |
| `apps/on3p-studio` | The older 2D ON3P pack on the shared engine (to be replaced by the flagship). |
| `apps/praxis`, `apps/proteus`, `apps/outreach` | Praxis storefront + configurator, Proteus snowboards, and the Grass Sticks / Folsom / Meier outreach demos. |
| `apps/maker-studio` | Product recipe editor, table configurators, quote/handoff API. |
| `apps/site` | Rivet marketing site (ChatGPT Sites; own lockfile, not in the workspace). |
| `labs/on3p-ski-lab` | ON3P geometry lab and Blender library/export scripts, on the shared kernel. |
| `qa/` | Scripted browser passes (puppeteer) and presentation screenshots. |
| `work/maker-studio-builds` | Maker Studio's saved drafts and builds. **Data: back it up.** |
| `work/stock-2027` | Cached ON3P product data for `extend-geometry.py`. |
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
npm run dev:praxis       # 5181 · dev:proteus 5182 · dev:outreach 5184 · dev:on3p-studio 5180
npm run server:maker     # Maker API 5193, then npm run dev:maker for the app on 5192
```

Browser QA: start the matching dev server, then `npm run qa:praxis` (or `qa:proteus`,
`qa:on3p-studio`). Set `CHROME_PATH` if Chrome isn't at the default Windows
location; `CHROME_NO_SANDBOX=1` for containers running as root.

`labs/on3p-ski-lab/test/golden.json` pins every lab mesh and construction layer to
the output of the original lab code. If a kernel change moves a fingerprint, that
change altered real geometry: review it, don't just regenerate the file.

## History

Assembled on 2026-09-29 from the Codex working folders on Welles's PC. Only the
site had version control before; its history is preserved under `apps/site`.
The original folders were left untouched. Older documents (including Fall
Line's asset-production records) cite these pre-import paths:

| Old path under `Documents/Codex` | Now |
|---|---|
| `2026-09-23/i/outputs/on3p-custom-shop` | `apps/on3p-custom-shop` (artwork: `brands/on3p`) |
| `2026-09-23/go-x20/outputs/maker-studio` | `apps/maker-studio`, `packages/configurator-core`, `packages/product-recipes`, `packages/ref-parsons` |
| `2026-09-23/go-x20/outputs/on3p-ski-lab` | `labs/on3p-ski-lab` |
| `2026-09-23/go-x20/work/maker-studio-builds` | `work/maker-studio-builds` |
| `2026-09-23/i/work/stock-2027` | `work/stock-2027` |
| `2026-09-24/ski-studio` | `packages/configurator`, `apps/praxis`, `apps/proteus`, `apps/outreach`, `apps/on3p-studio`, `qa/` |
| `2026-09-28/giv/outputs/rivet-site` | `apps/site` |

Text files are stored with LF line endings, so a few files that had Windows line
endings hash differently from the originals. Ski Studio's lockfile was
re-synced during import (the `outreach` app had been added without updating it,
so `npm ci` failed).

Not imported (still only in the Codex folders): the earlier Praxis site
prototypes and review packages in `2026-09-23/go-x20/outputs/`, zip snapshots,
and scratch scripts and logs under the dated `work/` folders.
