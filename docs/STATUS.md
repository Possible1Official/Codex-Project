# Build status

- Current checkpoint: 2 — Simulation completed.
- Next checkpoint: 3 — Workbench.
- Repository: https://github.com/Possible1Official/Codex-Project
- Product: Signal Atlas, v0.2.0.

## Completed

- All foundation maps, inspectors, keyboard-selectable SVG nodes, strategy cards, zoom, and local workspace persistence remain available.
- Launch-model assumption sliders update the map and inspector; inputs and seed persist with corrupt/denied storage recovery.
- Seeded, paired Monte Carlo comparison across three explicit launch policies (1,000 draws in the UI).
- Quarterly net-value P10–P90/median chart, mean net, positive-net run frequency, and expected unresolved failures.
- Per-strategy one-at-a-time sensitivity table and diverging bars; strategy selection follows map/card selections.
- Central-input cost breakdown, disclosure of equations and limitations, and docs/SIMULATION.md.
- Changed inputs or seed hide old results and require a fresh run. Invalid seed entry disables running.
- Unsupported resilience and AI-transition explorations explicitly retain illustrative maps without simulation.
- No external dependencies, API keys, Vercel, or Supabase.

## Validation

- PASS: npm run check — app, model, simulation engine, simulation UI, and server syntax.
- PASS: npm test — 15/15 tests: four foundation state/model tests, ten simulation tests, and one HTTP integration test.
- Numerical checks include independent balance sheet, policy effects, directional behavior, review tradeoffs, boundaries, repeatability, uncertainty limits, sensitivity, and persistence recovery.
- HTTP integration follows every browser module import from app.js, verifies JavaScript/CSS/HTML delivery, and checks unlisted files return 404.
- Example seed 12345 produces mean quarterly net values of approximately $23,223 (Accelerate), $5,439 (Controlled pilot), and $16,462 (Strengthen first). These are illustrative model outputs, not forecasts.
- Browser visual and interaction verification remains pending: no browser-control tool is available in this session. No deployed site is claimed.

## Step 3 instructions

Implement only the workbench checkpoint in docs/BUILD_PLAN.md. Read docs/SIMULATION.md before extending the model. Add validated custom decision models within an explicit supported schema (prefer adapting launch-v1 inputs/constants/policies rather than accepting arbitrary executable formulas), editable evidence and confidence, local save/import, and a portable decision brief export containing the input snapshot, model version, assumptions, evidence, seed, calculated results, and limitations. Treat imported/user-entered text as text, never executable HTML. Reject malformed or unsupported imports safely and preserve the previous workspace. Test validation, persistence, round trips, and brief consistency. Preserve map, inspector, keyboard access, seed reproducibility, and invalidation behavior. Update this file with actual checks, save to GitHub, then schedule exactly one Step 4 task seven minutes later after a successful harmless GitHub read. Do not duplicate an existing scheduled continuation. No Vercel or Supabase.
