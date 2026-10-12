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

## Checkpoint 1 of 4

Available: three curated decision maps, keyboard-selectable assumption and strategy nodes, an evidence inspector, zoom controls, a roadmap dialog, responsive layout, and local workspace persistence with recovery from corrupt or unavailable storage.

The current strategy descriptions and numbers are illustrative examples. They are not simulated predictions. The next checkpoint adds a transparent, reproducible scenario engine.

No Vercel or Supabase services are used. The application runs locally. Browser storage retains only the selected example, selected node, and zoom level. No external requests, analytics, or remote fonts are used.

See [the build plan](docs/BUILD_PLAN.md) and [checkpoint status](docs/STATUS.md) for continuation instructions.
