# Rivet CPQ

Welles Ruhlin's configure-price-quote work: product configurators built from
real makers' public catalogs, the shared engines behind them, and the Rivet
marketing site. Private. Several apps contain makers' original artwork and
names; nothing here is affiliated with or endorsed by those makers.

## Layout

| Path | What it is | Local port |
|---|---|---|
| `apps/on3p-custom-shop` | Standalone ON3P custom-ski configurator (the hero CPQ demo). Blender-based 3D preview, bindings, build sheet. | 5178 (serves `dist`) |
| `apps/maker-studio` | Product recipe editor, configurator core (`packages/configurator-core`), table configurators, quote/handoff API. | 5192 app, 5193 API |
| `apps/ski-studio` | Shared ski/snowboard configurator engine with ON3P, Praxis and Proteus brand packs, plus the outreach app. | 5180 / 5181 / 5182 |
| `apps/site` | Rivet marketing site and product-intake form (hosted on ChatGPT Sites with D1/R2). Full git history preserved. | 5173 |
| `labs/on3p-ski-lab` | Canonical ON3P ski geometry and construction kernel, Blender library/export scripts. | 5190 |
| `work/maker-studio-builds` | Maker Studio's saved drafts, published versions and build snapshots. **This is data, back it up.** | — |
| `work/stock-2027` | Cached public product metadata/images used by `on3p-custom-shop/scripts/extend-geometry.py`. | — |

### How the pieces depend on each other

- `on3p-custom-shop` installs `@maker/configurator-core` from `apps/maker-studio/packages/configurator-core`.
- `maker-studio`'s server and tests import the ON3P adapter, config and bindings from `apps/on3p-custom-shop/src`.
- `on3p-custom-shop`'s construction test checks its kernel against `labs/on3p-ski-lab/construction.mjs`.
- Maker Studio stores data in `work/maker-studio-builds` (override with `MAKER_STORAGE`).

Keep these apps side by side; moving one breaks the others.

Fall Line consumes these products too. Its
[CPQ asset reuse contract](https://github.com/wellesruhlin/fall-line/blob/main/docs/CPQ-ASSET-REUSE-CONTRACT.md)
requires one maintained Blender/product master to feed both the CPQ preview and the game.

## Run and test

Node 22.12+. Install `maker-studio` before `on3p-custom-shop`.

```sh
cd apps/maker-studio      && npm ci && npm test      # 34 tests
cd apps/on3p-custom-shop  && npm ci && npm test      # 52 tests; npm run build
cd apps/ski-studio        && npm ci && npm test      # 66 tests
cd labs/on3p-ski-lab      && npm test                # geometry verification
cd apps/site              && npm ci && npm run build
```

Each app's own `README.md` and handoff file has the full detail.

## History

Assembled on 2026-09-29 from the Codex working folders on Welles's PC. Only the
site had version control before; its history is preserved under `apps/site`.
The original folders under `Documents/Codex/2026-09-2x/` were left untouched.
Ski Studio's lockfile was re-synced during import (the `outreach` app had been
added without updating it, so `npm ci` failed).
