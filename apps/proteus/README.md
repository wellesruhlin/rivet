# Proteus Custom Shop — fan concept

An independent configurator concept for Proteus Snowboards, made in appreciation. It builds one Proteus board (size, graphic, build, extras) in a 3D studio, and lets you try the patented Adjustable Camber the way a rider would on the hill. Nothing here is affiliated with or endorsed by Proteus, and nothing takes orders or payment.

## Run

From the workspace root: `npm ci`, then `npm run dev:proteus` (http://127.0.0.1:5182). Tests: `npm test`. Browser pass: `npm run qa:proteus` with the dev server running. Build: `npm run build` → `apps/proteus/dist` (static, relative paths, about 15 MB with artwork).

## The steps

| Step | What it does |
| --- | --- |
| Size | Eleven sizes, regular and wide, from Proteus's sizing chart. Enter a rider weight to mark the sizes the chart fits; the chosen size shows its effective edge, sidecut, waist, stance and binding size. A size is required and never chosen for you. |
| Graphics | 53 designs (13 Proteus, 40 artist and rider collaborations, three marked new) in 217 colorways, shown top and base like a board wall; collaborations add $25. Ready-to-ride boards in the same colorway are pointed out, and an exact match says it's in stock. **Your own artwork** (+$50 processing): upload an image onto the 13 × 68 in template with a print-resolution check, and color the base in Proteus's own template. |
| Build | Flex, Soft (+$15), Standard (+$30) and Stiff (+$45), with Proteus's gauge and each build's glass. The Inside view shows the layup. |
| Camber | Proteus's six settings (Full Camber, Mid Camber, Flat, Full Rocker, Mid S Curve, Full S Curve) and a screw per end, from full camber to full rocker. The 3D board changes shape and rests on the snow line with heights exaggerated four times; a side profile in the panel shows the same. Camber is never priced: every board adjusts with the included wrench. |
| Extras | Snow Stopper ($25), All Temp Board Wax ($20), the Adjustment Wrench (included), and up to twelve letters or numbers printed on the sidewall at no charge, shown on the 3D sidewall. |
| Review | Every choice with edit links, the price card, copy link and build sheet download. |

Views: Front, Back, Sidewall, 3D, Camber, Inside and Tech Specs.

## Sources

All from proteussnowboards.com, observed September 25, 2026 (pages cached in `art-source/pages/`, imported by `scripts/import-catalog.mjs` into `src/brand/data/catalog.json`):

- **Designs, colorways, prices, sizes, accessories and sidewall text** from the 53 made-to-order board pages (WooCommerce variations and product add-ons). Every design is $749 in Flex; collaborations are $774. Sidewall text is limited to 12 letters and numbers, free. The shop listed boards as “Production Paused”; the concept says so in the build sheet and How it works.
- **Ready-to-ride boards** (148 Flex Mt. Fuji, 148 Soft New Day, 157 Stiff Mt. Fuji, 159 Standard New Day at $699; 161 Sharknado, used, $499) from their product pages' board details.
- **Sizing chart** (rider weight, effective edge, sidecut radius, waist, binding size, stance) from the chart image on every board page, transcribed in `src/brand/specs.js`.
- **Stiffness Guide** (glass per build, the gauge positions) and **Adjustable Camber** (the six settings, the indicator, “up to 1.2 inches per side at the end of your effective edge”) from the Tech page; how the screws work and the daily return to full camber from the FAQ.
- **Construction** from “Inside a Proteus Snowboard” on the Tech page.
- **Custom boards** ($749 plus a $50 graphic processing fee, the 68 × 13 in template, file and placement guidelines, 2–8 weeks, Lakewood, Colorado) from the custom snowboard page and the deposit page.

## Artwork

- `scripts/fetch-art.mjs` downloads each colorway's product image (all share one 800 × 1200 mockup: topsheet left, base right).
- `scripts/build-art.mjs` finds the board silhouette from the per-pixel variation across all 222 images, writes the traced outline (`data/outline.json`) and crops every topsheet and base to the board, extending edge pixels past the outline so no background shows.
- `scripts/build-template.mjs` recovers what every design shares: the base template's bands, the trident symbol and the PROTEUS wordmark as color masks (averaged over the ~180 bases whose colors contrast), the topsheet hardware (insert groups and the adjustment port) from Machina Arctic Orange, which leaves the middle of the board bare, and the header mark from Proteus's logo.

Custom uploads are cropped to the template's shape from the center (landscape art is turned so its left edge is the nose), kept at texture resolution in the page session only, and never sent anywhere. Links and saves keep the file name, not the image.

## The 3D board

`src/brand/geometry.js`, through the pack's `model3d` adapter (`model3d.js`):

- **Planform:** the published waist, sidecut radius and effective edge give a circular sidecut between the contact points; the nose and tail follow the traced outline, averaged into a true twin and scaled to meet the sidecut.
- **Camber:** the molded board has half the adjustment travel as camber. Tensioning an end bends that half evenly (a constant moment between the center and the end of the effective edge) and turns the nose or tail with it, so each end moves 30.5 mm from full camber through flat to full rocker. The board then rests on flat snow on its lowest points under its center, so S curves tilt slightly as a real board would. Flat is taken as mid-travel because Proteus marks it with the indicator's center line; Proteus doesn't publish its molded heights.
- **Estimates, labelled as such:** kick height (about 50 mm), thickness (9.5 mm underfoot, 3.8 mm at the tips), the 2 × 2.2 mm edges and the 1.3 mm base.
- **Inside** (`construction.js`): PiO2 topsheet; Thru-Stitch Kevlar rows; the build's biax or triax sheets top and bottom; calculated carbon from each binding to the edges; 19 oz triax patches underfoot to the effective edge; the Adjustable Camber housing, screws and tension members in sleeves (illustrative: the internals aren't published); poplar and paulownia planks with UHMWPE tipfill; polyurethane sidewalls; VDS rubber; full-wrap edges; one-piece ISO 7500 base; and the Snow Stopper when chosen. Thicknesses and positions are illustrative.

## Tests

`src/brand/pack.test.js`: artwork for every colorway, every design × build price against the board pages, size gating, defaults, links (sanitized sidewall text, no rider weight), ready-board matching, planform against the published sidecut, camber travel and resting, closed meshes with one topology per size (so settings animate), a closed layup whose legend covers every layer, and the recovered base template.

Artwork, photographs and logos belong to Proteus and its artists. They are used to demonstrate the concept, with no claim of ownership.
