# Decision workbench

## Workflow

1. Select the launch exploration. The workbench is intentionally available only for the supported launch-v1 model.
2. Open the model editor. Set a title, decision question, economics, and evidence/confidence for each assumption.
3. Apply the draft. Adjust the numerical assumption sliders and seed, then run the model.
4. Save the applied model locally, or export model JSON for a portable copy.
5. Export the decision brief after a current run. The brief includes the exact model, evidence, seed, policies, uncertainty, numerical results, sensitivity, equations, and limitations.

Draft edits block running, saving, and exports until applied or discarded. Applying edits, loading/importing a model, changing a slider, or changing the seed invalidates old results. Confidence is descriptive metadata; it does not change the distributions. Evidence is recorded as plain text. Sources are not fetched or independently verified.

The default model remains an illustrative example. Custom title/question/economics provide context for a launch decision; they do not turn launch-v1 into a general causal engine.

## Supported JSON schema

A model is a JSON object with exactly these fields:

```json
{
  "schemaVersion": 1,
  "modelVersion": "launch-v1",
  "title": "My launch decision",
  "question": "Should we launch this quarter?",
  "inputs": {"adoption":62,"reliability":94,"cost":0.18,"trust":30},
  "seed": 12345,
  "constants": {
    "eligibleTasks":100000,
    "valuePerSuccess":1,
    "lossPerFailure":6,
    "reviewCost":0.35,
    "reviewEffectiveness":0.9
  },
  "evidence": {
    "adoption":{"note":"Pilot activation data, 2026-10-12","confidence":"Medium"},
    "reliability":{"note":"Representative task evaluation needed","confidence":"Low"},
    "cost":{"note":"Measured cost per attempt","confidence":"Medium"},
    "trust":{"note":"Proposed review policy","confidence":"High"}
  }
}
```

No arbitrary formulas, executable code, custom policies, unknown fields, or other model/schema versions are accepted. Input units, ranges, numerical steps, uncertainty, and fixed strategy policies are defined in docs/SIMULATION.md. Adoption, reliability, and oversight use whole percentage points; cost uses $0.01 steps.

| Custom constant | Range | Step / units |
| --- | --- | --- |
| eligibleTasks | 1–10,000,000 | Whole tasks per quarter |
| valuePerSuccess | 0–10,000 | $0.01 / successful task |
| lossPerFailure | 0–100,000 | $0.01 / unresolved failure |
| reviewCost | 0–10,000 | $0.01 / reviewed task |
| reviewEffectiveness | 0–1 | 0.01 fraction |

Title must contain non-whitespace text and be at most 100 characters. Question must contain non-whitespace text and be at most 500 characters. Each evidence note is at most 3,000 characters; blank notes are allowed and disclosed as missing evidence. Confidence is exactly Low, Medium, or High. Seed is an integer from 0 to 4,294,967,295.

Imports are limited to 64 KiB of UTF-8 JSON. Values are checked without silently clamping, coercing strings into numbers, or interpreting formulas. Validation produces a detached copy before application. Malformed or unsupported files leave the applied model, draft, library, and results unchanged. An import that finishes after a newer edit/load/new-model action is ignored. Same-file reimports are supported by clearing the file input after completion.

## Persistence

The current applied model is automatically saved in `signal-atlas:active-model:v1`, separately from the foundation's map/selection/zoom state and Step 2's inputs/seed. Existing Step 2 inputs migrate into a default launch model when no valid active model exists. Invalid stored active models recover to the legacy/default model.

The named library uses `signal-atlas:library:v1`, with at most 20 models. Save captures the applied model and current valid inputs/seed. The same exact title replaces its saved version. Saved versions remain independent of subsequent applied-model edits. A full library rejects a new title without overwriting stored data. Corrupt or inaccessible library storage recovers to an empty library. Denied/full storage is reported; export model JSON to preserve the session. There is no cloud synchronization.

## Exports

- **Model JSON:** `signal-atlas-model.json`, containing validated applied context, constants, inputs, evidence, and seed. Import this file to recreate the model, then run again.
- **Decision brief:** `signal-atlas-decision-brief.txt`, a plain UTF-8 text document. It includes full-precision results, central balance sheets, all three strategies' sensitivity, uncertainty bounds, fixed policies, and the complete model JSON. Rendering tools never treat user text as HTML/Markdown in the application or exported brief.

Before creating the brief, the exporter validates the model and reruns its seed/sample count/constants. It requires an exact result match. Changed inputs, constants, seed, or forged results are rejected. Evidence and confidence come from the same current applied snapshot. Each brief includes the model version and limitations, so its outputs remain interpretable. Browser Blob downloads require a modern browser. Actual JSON and brief downloads were verified in Chromium during the release checkpoint.

## Validation

Tests cover custom economics propagation, model JSON round trips, text preservation, unsupported/malformed/oversized imports, numeric/text boundaries, active-state recovery, library persistence/replacement/capacity, denied storage, stale/altered result rejection, and reproducible brief snapshots. HTTP tests follow the browser's complete module import graph. The full browser import/download/workbench flow passed in Chromium; see docs/VERIFICATION.md for exact evidence and limits.
