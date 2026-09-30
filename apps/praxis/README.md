# Praxis — Wood. Snow. Soul.

An independent storefront concept for Praxis Skis, made in appreciation. The stock collection is presented on a warm graphite studio floor with Praxis's own photographs, and every custom-order shape can be built in the configurator at `#/custom`. Nothing here is affiliated with or endorsed by Praxis; the bag is saved on the device and orders continue on praxisskis.com.

## Run

From the workspace root: `npm ci`, then `npm run dev:praxis` (http://127.0.0.1:5181). Tests: `npm test`. Build: `npm run build` → `apps/praxis/dist`.

## Where things live

This app is the storefront (`src/site`, `src/App.jsx`, `src/styles`). Everything Praxis-specific that a configurator needs (the custom catalog and rules, the in-stock catalog, traced shapes, bindings, the import and art scripts, `art-source/` and `public/`) is the brand pack in [`brands/praxis`](../../brands/praxis), imported as `@arc/brand-praxis`. File paths below under `src/configurator`, `src/catalog`, `scripts`, `art-source` and `public` are relative to that folder.

## What's here

| Route | What it does |
| --- | --- |
| `#/` | Hero with the real GPO and EXP, featured stock skis, custom-build feature (three pairs rendered by the configurator), wood and workshop stories |
| `#/skis` | Fourteen stock skis, terrain filters, sorting, compare up to three |
| `#/skis/:id` | Gallery (studio cutout plus every original photograph), length choice with published specs, add to bag, **Build it your way** into the configurator, and a to-scale technical drawing plus spec table from Praxis's chart |
| `#/custom` | The configurator: 22 shapes → top material and artwork → flex, core, width and profile → LOOK bindings → rider details → review and **Add to bag**, with the build shown in 3D throughout (Front, Back, Sidewall, 3D, Bindings, Inside and Tech Specs) |
| `#/bag` | Stock skis and custom builds with totals; custom builds show their rendered pair, estimated weight, build sheet download and **Edit build** (opens the build at review and updates it in place) |
| `#/compare`, `#/materials`, `#/workshop`, `#/support` | Comparison from published charts, veneer species, construction details, help and flex guide |

Search covers the stock collection and custom-only models. Optional WebMCP browser tools (feature-detected) can read the catalog, open ski pages and stage the demo bag; none can purchase.

## Custom configurator rules

All prices and options come from the order forms on Praxis's 22 custom-ski pages (praxisskis.com/custom-skis/…), observed September 24, 2026:

- $1,600 for every model; lengths per model; 157 library graphics on every model plus three signature graphics limited to their model (Eagles Nest → FRD, Jedi → Jedi Mind Sticks, Quixote Art → Quixote).
- Six veneers at +$100. Graphics on veneer are drawn with a multiply blend, so white areas show bare grain, as Praxis describes. Each ski of a pair gets its own half of the veneer sample, like a bookmatched pair.
- Core prices are per model as listed: for example Enduro is included on the GPO but +$50 on the Heavy Hitter models; Ultra Light with carbon is +$150 everywhere, including the BC, EXP and Yeti whose standard edition uses it.
- Flex #1–#5; the standard flex follows the model and, for the GPO, BC and MVP 94, the length. Flex and core follow the standard edition until the customer picks something else, and changes are explained.
- ±10 mm width at +$200 changes every width by 10 mm and the length by 1 cm (per Praxis's GPO example); the preview outline, dimensions and technical drawing update.
- Custom camber/rocker molding is a $200–$500 quote, shown separately from the reference total.
- Skier ability is required to order (the Praxis form marks it required); the review and bag say so, and **Add to bag** steers to it. Height/weight, where you ski and style are optional, kept on the device and in the downloaded build sheet, and left out of share links.

### 3D studio

The configurator uses the shared three.js studio in `packages/configurator/src/studio3d` (ported from the ON3P configurator), through the pack's `model3d` adapter (`src/configurator/model3d.js`).

- **Shape** (`geometry.js`): the traced outline, corrected piecewise so tip, waist and tail equal the published widths (the ±10 mm option moves all three, and the length by 1 cm). Rocker and camber come from the spec chart at that length: tip and tail rocker lengths and heights, camber height and contact. An uncharted length borrows the nearest charted row. The nine models without a chart use a profile for the molding Praxis describes (recurve, tip rocker, compound camber with two pods meeting the snow underfoot, or continuous rocker), labelled as an estimate. The boot center is the chart's; thickness (17 mm underfoot), the 2.5 × 2.5 mm edges and the 1.8 mm base are estimates.
- **Surfaces:** the same recipe as the 2D preview. A veneer half per ski (bookmatched) with the artwork multiplied in, or artwork printed on nylon; satin wood or satin nylon finishes; black UHMW sidewalls; the base is shown in black because Praxis doesn't publish its color. Artwork and veneer come from the order-form images, which are small (graphics about 88 × 540 px), so close-ups are soft.
- **Inside** (`construction.js`): the layup from Praxis's construction notes (praxisskis.com/ski/construction/). Cores of hard maple, ash, aspen and paulownia: an ash frame at the center and perimeter, a maple block under the binding, and aspen (Enduro), paulownia (Ultra Light) or only maple and ash (Heavy Hitter); carbon above and below the core on carbon cores; stitched tri-axial glass; the Rubber Dampening System (rubber over the edges, full sheets in the tip and tail, a perforated sheet in the binding zone); UHMW tip and tail spacers; pre-bonded UHMW sidewalls, pulled out so the core shows; the extra-thick 4001 sintered base; and oversized edges that wrap 360°. Hover, focus or tap a layer, or use the numbered legend, to highlight it and read what it does. Thicknesses, strip widths and zone lengths are illustrative.
- **Views:** each step opens the view that shows it (Build opens Inside; Bindings opens the binding close-up; the molding option opens Tech Specs). Tech Specs shows the side profile at true proportions with the chart's figures.

### Bindings

`scripts/import-bindings.mjs` (`npm run bindings`, `-- --fetch` to refresh) builds `data/bindings-catalog.json` from Praxis's binding pages, cached in `art-source/pages/bindings/`, observed September 25, 2026: the LOOK Pivot 2.0 18, 15, 13 and 11 GW and CAST's Pivot-based Freetour 2.0 15 and 18, each color a Praxis product with 95, 105, 115 and 130 mm brakes, prices and in-stock widths from the store. Product photographs are in `public/art/bindings/`.

- One choice for the step: skis only, or one pair. Choosing a model mounts it on the skis at once.
- A pair joins the build and the price when it is listed in stock and passes a conservative brake screen: at least as wide as the waist and no more than 15 mm wider. For the nine models without published dimensions the waist is estimated from the drawing, and the fit text says so. Anything else stays on the skis as a labelled visual test that adds no cost; it isn't saved, shared, downloaded or put in the bag.
- The choice travels with the build: after a change to model, length or width it is re-checked, and a notice explains when it leaves or rejoins the total. A visual test stays mounted through Review.
- The 3D model is the Blender LOOK Pivot 15 study from the ON3P workspace (`public/models/look-pivot-15.glb`), painted in the chosen colorway. It stands in, labelled, for the Pivot 18, 13 and 11 and for the Freetour in alpine mode (CAST's touring toe isn't modeled). SPX, the Freetour upgrade kit and other brands aren't offered because they aren't modeled; the step links to Praxis for them.

### Weight

The estimate starts from Praxis's published standard-edition weight for the chosen length (lb per pair) and adds only what Praxis quantifies: a veneer top saves 4–8 oz per pair (published weights are treated as nylon-top builds), and adding or removing carbon within the standard core's wood family changes it by about 3 oz per ski. Changing core family, flex or width, which Praxis describes without figures, only bounds the range (`< 8.9 lb / pair`). Lengths or models without a chart show no weight.

## Sources and data

| Data | Source | Notes |
| --- | --- | --- |
| `src/configurator/data/custom-catalog.json` | The 22 custom-ski pages, parsed by `scripts/import-catalog.mjs` from saved copies in `art-source/pages/` | Prices, lengths, options and BigCommerce product IDs |
| `src/catalog/specs.js` | Praxis spec chart images (links in the file), transcribed by hand | 13 models; charts dated 2018–2022 |
| `src/configurator/data/outlines.json` | Shape drawings from the custom pages, traced by `scripts/trace-outlines.mjs` | The drawings are to scale: for all 13 charted models, the traced width-to-length ratio falls inside the range published across that model's lengths |
| `src/catalog/products.js` | The September 2026 stock snapshot from the first Praxis concept | Copy paraphrased; prices are not live |
| `public/art/stock`, `public/art/details` | Praxis's original product photographs, cut out by `scripts/build-art.mjs` | A flood fill from the photo's edges removes the white studio background and the white fringe on edge pixels. The skis aren't retouched, and no imagery is generated. The Slugger, FRD and SND have no full-length photograph, so their covers show the tips rising from the card's lower edge (`src/catalog/covers.js`) |
| `public/art/graphics`, `public/art/veneers` | Artwork and veneer images from the order forms | Re-encoded as WebP at their native resolution; each veneer is also split into left and right halves |
| `src/configurator/data/bindings-catalog.json`, `public/art/bindings` | Praxis's LOOK binding pages, parsed by `scripts/import-bindings.mjs` from saved copies in `art-source/pages/bindings/` | Prices, brake widths, in-stock widths (one storefront availability request per product), photographs and product IDs |
| `public/models/look-pivot-15.glb` | The Blender LOOK Pivot 15 study (revision 3) from `2026-09-23/i/outputs/on3p-custom-shop` | An approximate visual study, not factory CAD |
| Construction layers | praxisskis.com/ski/construction/ and the custom-order information page, saved in `art-source/pages/` | Materials and placement as described; dimensions illustrative |

`npm run import` rebuilds the catalog from the cached pages (`-- --fetch` re-downloads them). `npm run art` caches artwork, traces outlines and rebuilds the images; outputs newer than their sources are skipped.

### Conflicts and prototype policies

- **SND standard flex:** the order form says #4; the description says #5 twice. The configurator uses #5.
- **FRD standard core:** the description mentions carbon; the form's standard (no-charge) core is Heavy Hitter without carbon. Prices follow the form.
- **Unpublished figures:** no chart for the 9 D, BPS, Concept, GPO JR, Piste Jib, Powderboard, Quixote, Ullr or Yeti, and no row for the MVP 94 at 154, FRD 164, FRS 194 or the MVP 108's 120 and 130 cm Jr lengths. These show their traced outline and a schematic profile, with no dimensions or weight.
- **Quixote:** Praxis describes left- and right-foot-specific outlines, but its drawing shows one; the preview mirrors it and says so.
- **No artwork:** the form's artwork is optional, so a plain top can be ordered. The configurator offers **No artwork**; on veneer the grain is the graphic, and on nylon it notes that Praxis confirms how a plain top is finished.
- **Categories** (Carving, All mountain, Freeride, Powder, Touring) are a concept grouping drawn from Praxis's descriptions, not Praxis's own navigation.
- **Previews** are illustrative: artwork is fitted to a traced outline, and veneer grain comes from small samples.
- **3D profiles** for the nine uncharted models, and thickness, edge and base sizes everywhere, are estimates; the Tech Specs view and "About this preview" say which.
- **Binding copy:** Praxis's Pivot 2.0 11 and 13 pages repeat LOOK's Pivot 15 description (an aluminum Race toe), so the configurator shows only the rating from the product name for those two; release ranges are given where Praxis states them (8–18 and 6–15 on the Freetour pages).
- **Binding weight** isn't added to the ski weight estimate, which stays a per-pair ski figure.

## Before production

Live prices, availability and lead times; a real cart (the pages' product IDs and option names are in the cached HTML for mapping to BigCommerce); Praxis's approval of copy, imagery and the typographic wordmark (the real logo isn't used); image optimization for the original photographs; proper routes, metadata and analytics with consent. The earlier vanilla concept and its private hosted preview (`2026-09-23/go-x20/outputs/praxis-site`) were not modified.
