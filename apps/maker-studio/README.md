# Maker Studio — Product Studio v1

A local product recipe editor and two real-maker table configurators, built on the configuration core already used by the ON3P demo.

- **Editor:** http://127.0.0.1:5192/studio
- **Vermont Farm Table Bistro Round:** http://127.0.0.1:5192/products/vft-bistro-round
- **ref. Parsons:** http://127.0.0.1:5192/products/ref-parsons
- **Original Parsons experience:** http://127.0.0.1:5192/
- **Data-only workspace variation:** http://127.0.0.1:5192/products/bistro-walnut-study?version=2

These are independent public-data demonstrations. Local publishing does not publish to a maker's website, request a quote, or place an order.

## Start or recover after a restart

Node.js 22.23.2+ and npm are required. Blender is only needed to edit native assets. From this directory:

~~~powershell
npm.cmd install
.\scripts\start-local.ps1
~~~

The start script starts missing services in hidden windows and leaves existing listeners untouched. It does not verify an existing listener's identity. Alternatively, run npm.cmd run server and npm.cmd run dev separately. Both bind to 127.0.0.1: API 5193, frontend 5192.

For an isolated test workspace, set `MAKER_STORAGE` and `MAKER_API_PORT` on the
API process, `MAKER_API_URL` on each Vite process, and `VITE_MAKER_DESK_URL` on
ON3P. Non-default browser ports must be explicitly listed in the API's
comma-separated `MAKER_ALLOWED_ORIGINS` (for example
`http://127.0.0.1:5391,http://127.0.0.1:5392`). Only HTTP loopback origins are
accepted; unrelated origins remain rejected. These settings do not expose the
pilot publicly.

The handoff client accepts an optional 120-character `reference`. It is part of
retry/revision identity and the immutable record. ON3P uses it to retain an
unavailable visual binding's exact variant outside the priced configuration.
The full JSON export preserves this reference; a custom CSV mapping controls
which record fields a destination receives.

The persistent workspace is **../../work/maker-studio-builds/product-studio/workspace.json**, relative to this project. It includes drafts, immutable published versions, and the material library. Build snapshots are sibling JSON files in ../../work/maker-studio-builds/. Logs are in ../../work/table-demo/. Back up that workspace file along with the project. The editor requires an explicit **Save draft** or **Publish version**; unsaved browser edits do not survive an outage.

The actual power outage during development provided a restart check: the saved draft, first published walnut-study version and catalog were recovered successfully.

The existing registry and integration tests import the ON3P adapter from the sibling 2026-09-23/i/outputs/on3p-custom-shop directory. Keep that layout to run this complete demonstration. A portable table-only package would remove that registry entry and split its cross-family tests.

## What you can do

1. Pick a recipe or **Clone recipe**. A clone starts unpublished and quote-only.
2. Edit dimensions, standard sizes, custom preview limits, construction measurements, finish options, exclusion rules, reference price rows, source records, confidence notes, default choices and studio camera.
3. Inspect the live Studio / Dimensions / Construction preview. Invalid edits keep the last valid model and block saving.
4. Open **Material library** to edit reusable presets. Applying a preset copies it into the selected finish; it cannot silently change a published product. Wood grain, tint, roughness and grain scale are editable. The Materials tab can add a finish option; new combinations require a quote until a corresponding reference catalog is supplied.
5. **Save draft** persists edits. **Publish version** saves the current valid draft and creates a new local version. Existing version links remain reproducible. Conflicting saves from another window are rejected rather than overwritten.
6. **Preview storefront** opens the latest published version, not the unsaved draft. Customers can configure size/top/base, view dimensions/construction/detail, save a build, copy its version-pinned link and export a specification or recipe for Blender.

The 40-inch walnut/oxblood workspace study was created through the editor with no source changes. Version 1 preserves its original walnut material. Version 2 uses the Natural Walnut library preset at roughness 0.75. It is a demonstration variation, not an additional manufacturer catalog product.

## Architecture and scope

| Layer | Responsibility |
|---|---|
| packages/configurator-core/ | Existing category-independent configuration, validation, transitions, integer prices, snapshots and share links. **Unchanged in this milestone**, verified by SHA-256. |
| packages/product-recipes/index.mjs | Validates recipe JSON and compiles it into the existing product interface. |
| packages/product-recipes/geometry.mjs | Corner-leg rectangular and round steel-pedestal table templates. Produces meters/Y-up meshes, UVs, material descriptors and construction offsets. |
| packages/product-recipes/seeds.json | Two source-backed recipe seeds, option catalogs, confidence and prices/quote-only variants. |
| packages/product-recipes/materials.json | Initial visual presets. Edited library persists in the workspace. |
| server/recipe-store.mjs | Atomic local persistence, revision conflicts, cloning and immutable recipe publication. Single-process development store. |
| server/studio-routes.mjs | Recipe/library editing and published catalog routes; resolves exact recipe versions for quoting and snapshots. |
| src/studio/ | Recipe editor, generic table storefront and live scene wrapper. |
| src/scene/renderer.js | Renders scene descriptors without a Parsons-specific finish lookup. On-demand rendering and lazy-loaded Three.js. |
| blender/recipe_controls.py | Imports the same scene manifest, stores recipe metadata and exposes dimensions, finishes and construction separation. |

~~~mermaid
flowchart LR
  E[Recipe editor] --> D[Saved draft]
  D --> V[Immutable local version]
  V --> C[Recipe compiler + existing core]
  C --> Q[Server quote + build snapshot]
  C --> M[Shared mesh and materials]
  M --> W[Browser 3D preview]
  M --> B[Blender asset]
  Q --> B
~~~

Adding the first pedestal family required a geometry template and renderer material support. After that, variations within either template can be cloned and configured as data. An unrelated family, such as upholstered seating, still needs a geometry/presentation adapter. This is not yet a universal no-code modeling system or manufacturing CAD.

The ON3P UI retains its specialized flow and geometry. It consumes the shared core through its existing adapter; it is not edited through the table recipe editor. No ski source changes were made in this milestone.

## Maker sources and confidence

Official sources observed September 24, 2026:

- [ref. Parsons Dining Table](https://ref-co.ca/products/parsons-dining-table)
- [Vermont Farm Table Bistro Round — Mountain Green](https://www.vermontfarmtable.com/products/bistro-metal-round-mountain-green)
- [Bistro Round — Matte Black](https://www.vermontfarmtable.com/products/template-for-round-2025-copy)
- [Bistro Round — Oxblood Red](https://www.vermontfarmtable.com/products/bistro-metal-round-oxblood-red)
- [Bistro Round — White](https://www.vermontfarmtable.com/products/bistro-metal-round-white)

Original public Shopify payloads are preserved in reference/. The script scripts/seed-recipes.mjs regenerates recipe seeds from those snapshots; it does not scrape during a customer visit.

**Parsons:** 4 standard sizes × 12 finishes, 48 original variant IDs and CAD reference prices. Published dimensions include a 30-inch height, 4-inch corner legs and 3-inch apparent mitered edge. Hidden joinery and reinforcement placement are illustrative.

**Bistro Round:** 24- and 36-inch round tops, 11 wood finishes and 4 powder-coated bases: **88 catalog combinations**. The maker states pricing is available on request. Zero-dollar catalog placeholders are stored as unknown (null), never shown as free. Height (29 inches), top thickness (1.25 inches), base diameter (19.5 inches), column diameter (2.5 inches), and base thickness (0.5 inches) are visualization estimates. Concealed mounting details are illustrative.

Standard dimensions altered in the editor cannot inherit an old reference price. Workspace construction changes, new option combinations and custom sizes require a quote. Currency changes clear reference amounts rather than pretending to convert them. Reference prices exclude tax/shipping and remain historical, unapproved snapshots.

Local oak/walnut texture maps are generated visual approximations. Ash, rustic wood and maple use simplified grain proxies. Neither viewport nor swatches replace a physical sample. Browser and Blender share geometry and material parameters, but their lighting is not pixel-identical.

## Blender workflow

Open **blender/vft-bistro-parametric.blend**. Textures and the baseline recipe are packed/embedded.

1. In the Text Editor, select **START HERE — Product recipe controls.py**, then Run Script. No global auto-execution setting is required.
2. In the 3D Viewport sidebar (N), open **Maker**.
3. Choose a catalog size, or enter custom dimensions and top/base finishes, then regenerate.
4. Adjust **Construction reveal** on Product Recipe Controls to separate the top, mounting plate, column and foot.
5. Use **Import recipe or saved build**: first select an exported recipe JSON, then the matching build specification. Mismatched product/version files are rejected.
6. Try the verified browser example: import reference/example-bistro-recipe.json followed by reference/example-bistro-build.json. It restores a 42.25-inch round walnut top, 30-inch height and matte-black base.

Keep the native asset in this project's blender/ folder for regeneration. Viewing needs no server; editing needs Node.js and the project. The product collection is asset-marked; lights/camera are separate.

~~~powershell
node scripts/export-scene.mjs --product vft-bistro-round --out blender/vft-bistro-scene.json
node scripts/export-scene.mjs --recipe reference/example-bistro-recipe.json --config reference/example-bistro-build.json --out blender/custom-scene.json

& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python blender/build_recipe_asset.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background blender/vft-bistro-parametric.blend --python blender/verify_recipe_asset.py
~~~

The existing blender/ref-parsons-parametric.blend and static GLB remain available. The build_asset.py and verify_asset.py scripts rebuild/check that earlier asset. Generic controls can also import a published Parsons recipe. Blender is never spawned for every browser slider change.

## API

Product-studio routes now require the local maker session. /api/handoff/manage exposes catalog, bundle, contract, history, proposal validation/application, publication and connector-preview endpoints. /manage contains the keyboard-and-mouse UI and downloadable agent contract.

| Method | Route | Purpose |
|---|---|---|
| GET | /api/catalog | Latest published recipes |
| GET | /api/catalog/:id?version=N | Exact published recipe |
| GET | /api/studio/recipes | Recipe list |
| GET / PUT | /api/studio/recipes/:id | Read record / save recipe and revision |
| POST | /api/studio/recipes/:id/clone | Clone with id and title |
| POST | /api/studio/recipes/:id/publish | Publish at a revision |
| GET / PUT | /api/studio/materials | Read/save presets and revision |
| POST | /api/quote | Re-evaluate productId, productVersion and config |
| POST | /api/builds | Save immutable server-evaluated configuration |
| GET | /api/builds/:id | Read saved build |
| GET | /api/products | Earlier legacy registry: Parsons and ski adapter |

## Verification and remaining work

- **30 Maker Studio/core/API tests pass**, covering 48 priced Parsons variants, 88 quote-only Bistro variants, geometry, validation, exclusions, editing, persistence, concurrency conflicts, version preservation, safe sources and HTTP behavior.
- **43 existing ON3P tests pass** on the current sibling app.
- Production build succeeds. The lazy Three.js chunk is about 520 KB uncompressed; Vite still reports its size warning.
- Blender default/custom meshes: 4 parts, 1,944 source vertices, zero measured vertex error and UV parity. Construction driver tested.
- A browser-saved build was imported with its published recipe into Blender with zero measured vertex error. Wrong-version import was rejected.
- Desktop/mobile flows, saved-link reload, material preset application and outage recovery checked. See QA.md.

The local pilot now includes a maker login, protected recipe editing, a management UI at /manage, versioned quote price lists and availability rules, configurable file connectors, agent proposal validation/review, immutable SQLite build/quote/order records, and a retryable CSV/JSON handoff with receipt tracking. Start all three surfaces with scripts/start-workspace.ps1. Main handoff and management databases are in ../../work/maker-studio-builds/handoff/. Production stays on hold; no real factory BOM is inferred. Live ERP APIs, tenant isolation, hosted identity, inventory, payments and production release remain client-pilot work. Existing public /api/builds snapshots are demonstration records, separate from authenticated order handoffs.

Design direction/prompt: design/product-studio-design.md. Concept: design/product-studio-concept.png. Rendered evidence: product-studio-preview.png and bistro-storefront-preview.png.
