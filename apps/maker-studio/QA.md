# Product Studio v1 verification — September 24, 2026

## Functional evidence

| Area | Result |
|---|---|
| Shared core | Both core files retain their pre-milestone SHA-256 hashes. No new furniture branches were added to the core. |
| Automated suite | 20 Maker Studio/core/API tests pass. All 48 Parsons reference prices and 88 Bistro quote-only combinations checked. |
| Existing ski app | 43 current tests pass; no ski source edits in this milestone. |
| Production build | Pass. Three.js loads lazily; approximately 520 KB uncompressed renderer chunk still produces Vite's size warning. |
| Data-only onboarding | Cloned Bistro Round in the UI as bistro-walnut-study; changed diameter to 40, height to 30, default top to Walnut and base to Oxblood Red; published version 1. No source changes for this variation. |
| Material library | Changed Natural Walnut preset roughness to 0.75, saved library, applied its snapshot to the walnut study and published version 2. Earlier recipe versions remain unchanged. |
| Storefront | Published version 2 opened with the expected geometry and defaults. Changed to custom diameter 42.25 and Matte Black base, reviewed and saved through the local API. |
| Save/share | Saved build bc09731f-8491-47bb-80f8-3b051d246031. Copied version-pinned URL; reload restored 42.25 × 42.25 × 30, Walnut/Matte Black, version 2 and quote-only status. |
| Validation | UI rejected diameter 0, disabled Publish and kept the last valid scene. Correcting to 40 restored a valid draft. Automated checks cover malformed recipes, unsafe texture/source URLs, impossible construction, exclusions, unknown options, stale revisions and foreign write origins. |
| Version isolation | Store and HTTP tests verify that draft edits/publication do not change old published recipes. Concurrent saves at one revision produce exactly one winner. Restart reads the saved version and material library. |
| Outage recovery | Actual machine shutdown interrupted QA. Restart recovered both seed products and the saved/published workspace variation. Local web/API services restored; no persisted recipe loss observed. |
| Desktop | 1536 × 1024 checked. Document width equals viewport width. Editor dimensions, sources, materials, publication and camera modes exercised. |
| Mobile | 390 × 844 checked. No horizontal page overflow. Editor stacks preview above fields; horizontal product navigation remains scrollable. Customer custom controls, review and actions reachable. Long title/model overlap and tab scrollbar were corrected. |
| 3D | Round tabletop, independent powder-coated base, dimensional labels and construction separation checked in the browser. Keyboard rotation is exposed on focusable canvases. |
| Parsons regression | Original storefront loads with its model and CAD $5,399 default. Recipe storefront changes from 72 × 38 / CAD $5,399 to 96 × 44 / CAD $6,599 and renders the construction reveal. No observed browser warnings or errors. |
| Blender baseline/custom | 4 mesh parts, 1,944 source vertices. Zero measured vertex error, UV parity and reveal-driver check in vft-verification.json. |
| Actual browser → Blender | Imported example-bistro-recipe.json and browser-saved example-bistro-build.json into the reopened native asset. Exact dimensions/top/base/version retained; zero measured vertex error. Deliberately mismatched recipe version rejected. |
| Runtime logs | No observed errors or warnings in the tested editor/customer browser sessions. |
| Download limitation | Saved server records and CLI/Blender import were verified directly. This pass does not claim that the in-app browser's OS download destination was verified. JSON data remains accessible through saved record URLs and local storage files. |

## Concept comparison and copy audit

The accepted concept and final editor screenshot were opened side-by-side with the image viewer at native 1536 × 1024 resolution.

| Concept target | Final implementation / assessment |
|---|---|
| Dark 70–72px header, serif Maker Studio | Matches structure, color and hierarchy. Header section centered; working preview/publish actions at right. |
| Ivory left product rail around 240–256px | 248px rail, selected product treatment, clone action and material library. A third real UI-created workspace variation intentionally appears. |
| Large serif Bistro Round / maker identity | Matched. Small recipe eyebrow and right-aligned draft indicator are functional additions. |
| Overview / Dimensions / Materials / Pricing / Sources | Exact tab labels preserved. All sections implemented with editable recipe data. |
| Form beside dark live preview | Matched composition. Dimensions are paired to reduce height; construction fields use compact horizontal rows. Advanced catalog/limit controls add scrollable content. |
| Oak top, green steel pedestal | Uses actual parameterized meshes and material settings. Top/base proportions track recipe changes. Grain, edge treatment, lighting and shadows are less photographic than the generated concept. |
| Studio / Dimensions / Construction | Exact labels, active state and functional views. Added accessible reset-camera action. |
| Quote required and local status footer | Preserved. Round size uses diameter notation. Save draft, error and version messages are necessary functional states. |

Primary copy retained: Maker Studio, Product recipes, Preview storefront, Publish version, Clone recipe, Material library, all five tabs, Size & geometry, Standard sizes, Diameter, Height, Construction, Top thickness, Base diameter, Column diameter, Photo-derived geometry, Changes update the preview, Quote required, Saved locally, No live orders.

Intentional deviations: shape is read-only per template (cloning does not reinterpret one construction family as another); publishing is local; advanced size controls extend the form; initial catalog count is three after the data-only proof; stage uses real meshes rather than a static concept image. Footer help can require form scrolling. The generated render is a direction, not a claim of calibrated photography. Overall visual fidelity: approximately 8/10; remaining gap is chiefly material/lighting realism and denser functional form content.

## Artifacts

- product-studio-preview.png — final desktop editor.
- bistro-storefront-preview.png — actual maker demo storefront.
- design/product-studio-concept.png — accepted direction.
- design/product-studio-design.md — design prompt and implementation constraints.
- blender/vft-bistro-parametric.blend — packed native asset with embedded recipe/controls.
- blender/vft-bistro-preview.png — native Blender render.
- blender/vft-verification.json — mesh/UV/reveal verification.
- blender/browser-roundtrip-verification.json — actual browser-build import proof.
- reference/example-bistro-recipe.json and example-bistro-build.json — matching reproducible pair.
- Additional mobile/construction screenshots remain in ../../work/product-studio/.

Blender reported an unavailable global thumbnail-cache path during headless save. The native file saved, reopened and passed import/mesh checks; no system cache settings were changed.

No maker messages, real purchases, external quote submissions or public storefront publication were performed.
