# Verification — September 24, 2026

The flow tested was: load the local geometry study → select ON3P model and length → inspect top/base/side/detail views → edit dimensions → reset → inspect original-image overlays and confidence notes.

Environment: `http://127.0.0.1:5190/`, Codex in-app browser. Desktop viewport approximately 1265 × 712; mobile override 390 × 844 (375 px content width after scrollbar). No external-browser fallback was needed. Native screenshot evidence was captured in the task during the checks.

| Check | Result |
| --- | --- |
| Page identity / meaningful initial render | Pass — ON3P Geometry study and visible 3D ski pair |
| Framework/error overlays | Pass — none |
| Browser console | Pass — no captured application errors or warnings |
| Model and size selection | Pass — Woodsman 108, 181 cm showed 137 / 108 / 127 mm and the scaled-profile confidence note |
| Camera presets | Pass — pair, top, base, true-scale side and underfoot detail inspected |
| Artwork orientation | Initial mirrored UV orientation corrected; top/base rereviewed |
| Live parameter edit | Pass — Jeffrey 106 waist changed to 115 mm, then camber to 6 mm; dimensions and profile updated, hypothetical-geometry notice appeared |
| Reset | Pass — restored 134 / 106 / 127 mm and reference profile |
| Neutral surface / sidewall inspection | Pass — material changed while geometry remained visible |
| Source overlay | Pass — original pixels, fitted outline and paired-profile trace displayed; neighboring image regions clipped out |
| Source conflict disclosure | Pass — Jeffrey 112 reuse of the 106 composite profile disclosed |
| Mobile | Pass — top view and model selection worked; document scroll width equaled content width, no horizontal overflow |
| Published geometry constraints | Pass — all 18 model/length combinations; detailed numeric results in data/verification.json |
| Blender parity | Pass — all six objects match canonical source positions within floating-point tolerance |
| GLB roundtrip | Pass — three pairs reimport with matching coordinates, UVs and four material groups |
| Blender dimension controls | Pass — generated pair, changed waist to 112 mm, regenerated pair in place |

The final cross-section includes separate base-height and steel-height stations. Node and Blender checks were rerun after that geometry change, and the browser sidewall and source views were checked again.

Key commands: `node scripts/verify.mjs`, `node scripts/export-mesh.mjs`, Blender background execution of `scripts/blender_build.py` and `scripts/verify_blender.py`. Browser verification used DOM snapshots, semantic control interactions, screenshots, viewport overrides and console logs; the temporary mobile override was reset.

Limitations: no manufacturer measurements or calibrated camera data were available. No physical accuracy tolerance is claimed. No loaded-flex simulation, Safari/Firefox pass, low-end-device performance benchmark, or forced WebGL-failure test was performed. This pilot has not been integrated into the main Ski Studio application. Asset Browser preferences have not been changed. The original-source artwork retains its printed reference-model/size labels when the geometry is edited.

Blender's system thumbnail-cache write failed in this environment; the saved library, packed textures, GLBs, reimports and panel regeneration passed. The `.blend` remains usable; a system thumbnail preview may be absent.
