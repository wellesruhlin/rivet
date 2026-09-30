# Claude instructions for Arc

Read `README.md` first: it maps the apps and how they depend on each other.
Then read `docs/ROADMAP.md` for the current phase and what it's trying to prove.
Then read the specific app's `README.md` and handoff file (`AGENT-HANDOFF.md`,
`HANDOFF.md`) before changing it.

- **Work in this repo, not the old Codex day folders.** The copies under
  `Documents/Codex/2026-09-2x/` on Welles's PC are the pre-import originals.
- **One workspace.** Install and test from the root (`npm install`, `npm test`).
  Shared code lives in `packages/*`, brand data in `brands/*`; import them by
  package name, never by relative path across folders. `apps/site` is outside
  the workspace.
- **Geometry changes are checked against golden output.** The kernel is shared by
  every brand, the lab, Blender exports and Fall Line. If
  `labs/on3p-ski-lab/test/golden.json` fails, the change moved real geometry.
- **`work/maker-studio-builds` is saved user data.** Never delete or reset it;
  tests use their own temporary folders.
- **Makers' artwork and names are not ours.** The repo stays private. Do not
  publish, deploy publicly, or contact a maker without Welles saying so.
- **The site deploys through ChatGPT Sites.** Changing `apps/site` here does not
  deploy it; see its README for packaging.
- Commit completed, tested work and push to `origin`. Never force-push.
- Before claiming a change works, run the affected app's tests (and build for
  UI changes). Say which checks you ran.
- **Keep the roadmap current.** When work changes a stage's status or passes an
  exit criterion in `docs/ROADMAP.md`, update it in the same commit. Record
  decisions Welles makes in its decision log with the date.
