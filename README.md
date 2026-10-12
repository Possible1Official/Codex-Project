# Signal Atlas

A local-first decision laboratory: make assumptions visible, explore competing strategies, and understand which questions need evidence.

## Run

Requires Node.js 22 or later. No dependencies, API keys, or accounts.

```sh
npm start
# Open http://localhost:3000
npm test
npm run check
```

## Checkpoint 3 of 4

Available: three curated decision maps, keyboard-selectable assumption and strategy nodes, evidence inspector, zoom controls, local persistence, and a launch simulation workbench.

For the launch exploration, adjust adoption, reliability, operating cost, and oversight; choose a seed; and run 1,000 reproducible Monte Carlo draws. Compare strategy net-value ranges and failure exposure, inspect one-at-a-time sensitivity, and follow a central-input cost breakdown. Input changes invalidate old results. Other explorations are clearly marked as having no numerical model.

The decision workbench adds editable model context, five economic constants, evidence and confidence, a named local library, validated model JSON import/export, and a portable plain-text decision brief. Brief export verifies the exact current run by reproducing it from the model snapshot. Draft edits block running/export until applied or discarded.

See [the workbench guide](docs/WORKBENCH.md) for the supported schema and import/export workflow.

The equations, strategy policies, uncertainty distributions, units, and limits are documented in [the simulation specification](docs/SIMULATION.md) and in the application's model disclosure. Constants and distributions are illustrative; the output is not a validated forecast or recommendation.

No Vercel or Supabase services are used. The application runs locally. Browser storage retains the selected example, selected node, zoom level, applied launch model (including evidence), saved model library, inputs, and seed. No external requests, analytics, or remote fonts are used.

See [the build plan](docs/BUILD_PLAN.md) and [checkpoint status](docs/STATUS.md) for continuation instructions.
