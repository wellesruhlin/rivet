# Ski Studio — custom configurators for ON3P, Praxis and Proteus

Independent, appreciative concepts for two ski makers and a snowboard maker, built on one shared configurator. Nothing here is affiliated with, commissioned or endorsed by ON3P, Praxis or Proteus, and nothing takes orders or payment.

```
packages/configurator   brand-agnostic engine, session state and React UI
apps/on3p               ON3P Custom Shop (configurator only)
apps/praxis             Praxis storefront with the configurator at #/custom
apps/proteus            Proteus Custom Shop: one snowboard, Adjustable Camber in 3D
qa/                     scripted browser passes and the screenshot script
screenshots/            presentation screenshots of ON3P and Praxis
```

## Run

Node.js 22.12 or newer. From this folder:

```sh
npm ci
npm test                 # engine, ON3P, Praxis and Proteus tests
npm run dev:on3p         # http://127.0.0.1:5180
npm run dev:praxis       # http://127.0.0.1:5181
npm run dev:proteus      # http://127.0.0.1:5182
npm run build            # builds every app into apps/*/dist
```

With the dev servers running, `npm run qa:praxis` (48 checks), `npm run qa:on3p` (34 checks) and `npm run qa:proteus` (54 checks) drive Chrome through each app's main paths and fail on any console error; `npm run screenshots` retakes the images in `screenshots/`. They use the installed Chrome (set `CHROME_PATH` if it isn't at the default Windows location).

Each app's `dist/` is a static site with relative asset paths; it can be served from any host or sub-path. All use hash routes.

## The shared configurator

A brand is described by a **pack**: steps, ordered option groups, a context function and a few presentation hooks. `createEngine(pack)` turns it into validation, pricing, a bill of materials, weight estimates, share links and a text build sheet. `<Configurator>` renders the studio stage, option panels, build bar and dialogs for any pack.

Every entry point — customer edits, restored saves, shared links, bag items — runs through the same `normalize`, group by group, so dependent choices are always checked against the ones before them. When a choice has to change, `apply` explains why (for example “Flex: #3 → #4, the standard flex for the GPO at 182 cm”).

Group types: `category`, `model`, `length`, `choice` (cards, segmented, list, compact or swatches), `gallery`, `toggle`, `text`, `binding`, `number` (a value within `min`–`max`, such as Proteus's camber settings). A group can declare `options`, `reason` (why an option is unavailable), `fixed` (an included part), `default`, `price` (a number or `{quote: [min, max]}`), `format`, `resets` (cleared when the group changes, unless the same edit sets them), `bom` (`false`, or a function to list the group only when it applies), `sanitize` (cleans a text value) and `ui` hints. `ui.widget` swaps in a pack's own React field (Proteus's size finder, design gallery and camber tuner); `ui.bare` drops the field label; `ui.size` with `ui.barLabel` names a size group that isn't a numeric length in the build bar. A gallery option marked `extra` (Praxis's “No artwork”) is listed without counting as a design. Packs may add `beforeNormalize`, `explain`, `ready`, `orderRequirements`, `weight`, `copy`, `review`, `stage`, `art`, `specs` and `fileName`. `copy.firstStep`, `copy.loading`, `copy.linkNote` and `copy.backLabel` replace the ski wording where a pack sells something else.

Presentation hints keep decisions visible and explanations on demand: `ui.collapse` folds a chosen category into a one-line summary with **Change**, a model's description sits behind **About this ski**, the `compact` display shows options in two columns with the selection's details on demand, and consecutive groups that share a `ui.fold` label (Praxis's width and profile) fold into one disclosure that opens when something in it has changed.

A `binding` group is one choice for the step: skis only, or one pair. Its `reason` decides whether a pair can be ordered for the ski; a pair that can't still mounts on the skis as a labelled visual test that stays out of the price, saves and links. The `<Configurator>` keeps that visual test, carries the choice through edits to the groups in `ui.carryOn`, and posts `ui.notices` when the pair leaves or rejoins the total. `ui.products`, `ui.fit`, `ui.waist` and `ui.details` feed the step's panel.

### 3D studio

A pack that provides `model3d` gets the three.js studio (`src/studio3d`, lazy loaded) instead of the 2D stage: Front, Back, Sidewall, 3D, Bindings, Inside (exploded construction with hover, legend and layer cards) and Tech Specs, ported from the ON3P configurator. The adapter supplies `shape` (widths, rocker, thickness and mount as functions along the ski, for `kernel.js`), `surfaces` (the same art-layer lists the 2D stage draws, painted per ski), `construction` (a layer stack for `construction.js`, and its legend), `binding` (colorway and caption for the GLB in `bindingModel`), `heading`, `techSpecs` and `disclosure`. `viewForField(field, step)` chooses the view each step opens. `@ski-studio/configurator/studio3d/kernel` and `/construction` are Node-safe for tests.

For boards and other single items, `model3d` can also set `pair: false` (one item, centered and framed larger), `views` (its own view list, for example Proteus's Camber view: a side profile over a snow line with heights exaggerated 4×), `animateShape` (shape changes with the same topology glide over half a second), `parts` (raised prisms on the topsheet, such as the Snow Stopper), `detailSpan` (how much of the item the Inside view frames), `copy` (the studio's own wording) and `surfaces().sidewallText` (text printed on the sidewall, with the shape's `sidewallText: {span}`). Art layers may fill rectangles (`{fill, x, y, width, height}`) and recolor alpha masks (`{href, tint}`), in 3D and in the 2D swatches.

Money prints whole dollars without cents and keeps cents when a price has them (binding pairs such as $499.95); totals add in cents.

Weight estimates are `{unit, per, base, items}`. Quantified items shift the range; items a maker describes without a number (“softer skis are lighter”) only bound it, so the estimate never invents precision (`< 8.9 lb / pair`).

Adding a brand: write a pack (see `apps/praxis/src/configurator/pack.js` for a full example), theme the `--cfg-*` variables, and mount `<Configurator engine={createEngine(pack)} />`. Keep the pack's data and rules in the brand's app; the package holds no brand data.

## Where things came from

- ON3P: see `apps/on3p/README.md` and `apps/on3p/PRODUCT-RELATIONSHIPS.md`.
- Praxis: see `apps/praxis/README.md`, which lists every source, date and data conflict.
- Proteus: see `apps/proteus/README.md` for sources, the artwork pipeline and what is estimated.

Artwork, photographs and logos belong to their makers and artists. They are used to demonstrate the concepts, with no claim of ownership.
