# Product relationships and configuration audit

Verified against ON3P's public sources on September 24, 2026 UTC (September 23 in Denver). This is a rule snapshot for a fan prototype, not a live manufacturing or inventory integration.

## Source precedence

- [ON3P main navigation](https://www.on3pskis.com): Park, Freestyle, Freeride, Touring. Reserve and On Sale are merchandising collections, not custom shape categories.
- [Custom ski page](https://www.on3pskis.com/products/custom-skis): 26.27 build-sheet specifications, revision September 19, 2026, and ski-family descriptions.
- [Public live customizer](https://on3pskis.gokickflip.com/customize/startingpoint/5efa948ddf8c2800107ea775?shopid=5d657d9d412775ef6a2e38a1&lang=en&currency=USD&rate=1.0): current answer IDs, conditions and permitted/restricted answers. Rules were read from public initialData, not inferred from marketing labels. Only rule IDs referenced by the active product root were considered. Old natural-language rule summaries are stale; actual answer IDs determine relationships.

`src/compatibility.json` preserves the model mappings and rule IDs behind the matrix. The app uses one normalization path for selections, restored builds, and shared links. This snapshot covers the options exposed by this prototype, not every Kickflip feature.

## Shape hierarchy

Park contains Mango 90/102/114 and Oski 102. Freestyle contains Jeffrey 92/98/106/112/118/124. Freeride contains Woodsman 92/100/108, Billy Goat 102/108/114/118 and Cease & Desist. Additional custom shapes are retained from the custom ski catalog even when absent from the main navigation's current submenu.

Touring is an entry route to Woodsman 100/108 and Billy Goat 102/108/114, matching the five shapes in ON3P's Touring submenu. Choosing a model on this route presets the custom Tour layup (+$150). It does not invent a separate SKU or claim a factory Tour package price. Users can change construction afterward. Lengths follow the custom builder, not the narrower stock touring product assortment.

## Compatibility matrix

A dash means no verified Ripper offer. Mango 114 is held to the documented stock setup rather than interpreting missing model rules as universal compatibility.

| Model | Available lengths, cm | Ripper lengths, cm | Layups | Park detune | Skin clip |
|---|---|---|---|---|---|
| Jeffrey 124 | 181, 186, 191 | - | Stock, LITE, 50/50, Tour, Leaf Spring | No | Optional +$50 |
| Jeffrey 118 | 181, 186, 191 | - | Stock, LITE, 50/50, Tour, Leaf Spring | No | Optional +$50 |
| Jeffrey 112 | 176, 181, 186, 191 | 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | Yes | Optional +$50 |
| Jeffrey 106 | 161, 166, 171, 176, 181, 186, 191 | 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | Yes | Optional +$50 |
| Jeffrey 98 | 161, 166, 171, 176, 181, 186, 191 | 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | Yes | Optional +$50 |
| Jeffrey 92 | 171, 176, 181, 186 | 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | Yes | Optional +$50 |
| Mango 114 | 176, 181, 186 | - | Stock | No | Needs confirmation |
| Mango 102 | 161, 166, 171, 176, 181, 186 | 176, 181, 186 | Stock | Yes | Unavailable |
| Mango 90 | 161, 166, 171, 176, 181, 186 | 176, 181, 186 | Stock | Yes | Unavailable |
| Oski 102 | 171, 176, 181, 186 | 176, 181, 186 | Stock, LITE, 50/50, Tour, Leaf Spring | Yes | Optional +$50 |
| Cease & Desist | 181, 186, 191 | - | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | No | Optional +$50 |
| Billy Goat 118 | 176, 181, 186, 191 | - | Stock, LITE, 50/50, Tour, Leaf Spring | No | Optional +$50 |
| Billy Goat 114 | 176, 181, 186, 191 | - | Stock, LITE, 50/50, Tour, Leaf Spring | No | Optional +$50 |
| Billy Goat 102 | 176, 181, 186 | - | Stock, LITE, 50/50, Tour, Leaf Spring | No | Optional +$50 |
| Billy Goat 108 | 176, 181, 186 | - | Stock, LITE, 50/50, Tour, Leaf Spring | No | Required, included |
| Woodsman 108 | 161, 166, 171, 176, 181, 186, 191 | 171, 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | No | Optional +$50 |
| Woodsman 100 | 161, 166, 171, 176, 181, 186, 191 | 171, 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | No | Optional +$50 |
| Woodsman 92 | 171, 176, 181, 186 | 171, 176, 181, 186 | Stock, LITE, 50/50, Tour, Torsion Bar, Leaf Spring | No | Optional +$50 |

Torsion Bar requires Stock flex. The other enabled layups permit Stock, Soft, Double Soft and Stiff for these adult shapes, except Mango 114, whose customization is held for confirmation. Mango 90/102 are Stock layup only. A model change retains compatible choices, clears incompatible ones, and explains each dependent change. An unavailable length becomes unselected; no nearest-length substitution is made.

## Source discrepancies and deliberate holds

1. **Mango 114:** present in the live model picker, but no model-specific dependency rules. Direct browser inspection showed four Signature and two Ripper buttons. The prototype exposes its documented lengths and stock build, with custom rocker/construction held for ON3P confirmation. This is an explicit prototype policy, not a claim that ON3P cannot make those options.
2. **Woodsman 92 / 166 cm:** appears in the specification table; the live customizer only authorizes 171/176/181/186. The prototype withholds 166 and explains why.
3. **Jeffrey 112 / 171 cm:** authorized by the customizer but absent from the published build-sheet table. The prototype uses the intersection and starts at 176.
4. **191 cm timing:** Woodsman 100/108 and Billy Goat 118 use the live builder's special “191cm + ~40 Days” answer. Selecting these lengths shows that timing note without interpreting it as a guaranteed shipping date.
5. **Stock rocker labels:** some spec rows call the factory profile Ripper while the custom builder exposes separate Signature/Ripper choices with size restrictions. Custom option availability follows the builder; no factory stock label is used to bypass those restrictions. Rendered profiles remain schematic.

## Quote and build-sheet behavior

- One ten-line bill of materials drives the drawer, total, review pricing and text export: ski pair, length, rocker, topsheet, base, sidewalls, layup, flex, edges, tail.
- Included parts display Included instead of disappearing. Required Billy Goat 108 skin clips are included at zero cost.
- Wood topsheet charges (+$250) are taken from the live artwork-price mapping and appear both on gallery tiles and the quote. The wood lead-time note is displayed with selected wood artwork.
- Metal uses the published regular $150 upgrade, deliberately excluding the temporary $100 introductory offer. Other promotions, bindings, shipping and tax are excluded.
- Starting graphics and Stock construction are visible defaults. Section review status is explicit; simply jumping ahead does not complete prior sections. Changed choices reopen affected reviews.
- Save/restore preserves review status after validation. Shared links revalidate configuration, explain repairs, and ask the recipient to review their own sections.
- The drawer can be collapsed; every line links back to its section. Base/sidewall links open the relevant graphics tab.
- Graphic order is stable, keyed by original artwork ID. Selection changes only the chosen state and stage image. Search/filter/pagination change the visible set, and Find in gallery reveals the selected tile in its original position.

## Verification

Production build and 13 configuration tests passed, including source-specific fixtures and 3,024 normalized model/length/layup/flex combinations. Browser checks covered category/model/length progression, forbidden sizes, automatic rocker and flex repair, the required free skin clip, fixed graphics order, wood charges, build-sheet editing, reviewed progress and local save/restore. Desktop and mobile screenshots are provided separately. No live purchase or message was sent.
