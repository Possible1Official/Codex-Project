# Release verification — v0.4.0

Verified on 2026-10-12 in Chromium 154.0.8037.57 (Debian) through Python Playwright. The app ran locally without credentials or external application services.

## Automated application checks

- `npm run check`: all six browser modules, server, and build script parse successfully.
- `npm test`: 23/23 tests pass. Coverage includes numerical balance sheets/policies, repeatability, boundaries, sensitivity, safe import validation, text preservation, active/library state, storage denial/capacity, stale/forged result rejection, and complete HTTP module delivery.
- `npm run build`: produces eight application files plus release.json in dist/.
- `git diff --check`: passes.

## Real-browser checks

The tracked `scripts/browser-check.py` passed all 14 check groups against both the Node development server and the generated static build served at `/Codex-Project/`:

1. Pending draft edits block simulation, local save, model export, and brief export.
2. Editing and applying context/economics/evidence produces results and updates the inspector. HTML-like evidence remains literal text and does not execute.
3. Local save, actual JSON download, import, deterministic rerun, actual plain-text brief download, and same-file reimport work. Exported model JSON matches the brief's reproducible snapshot.
4. Malformed, unsupported-version, and oversized imports preserve the current model and results.
5. Negative, blank, fractional, and out-of-range seeds block actions; zero seed runs; keyboard slider edits hide stale results and disable brief export.
6. Loading saved models and reloading the page preserve inputs, context, and reproducible results. Reload requires a new run.
7. Keyboard map-node activation works and retains focus. The roadmap dialog closes with Escape and restores focus. Unsupported explorations show their labels and hide numerical controls.
8. Discarding drafts restores applied fields and allows rerunning.
9. No page-level horizontal overflow at 320, 360, 390, 768, or 1440 CSS pixels. Mobile node picker selects map nodes. Screenshots were captured and inspected at desktop and mobile sizes; wide maps/tables scroll within their regions.
10. axe-core 4.10.3 WCAG 2 A/AA and 2.1 AA scans report zero violations on the model editor/results screen at all five widths.
11. The skip link reaches the workspace; the quick-start action focuses the launch run control.
12. No browser pageerror events in the main flow.
13. Corrupt storage recovers to a usable default model and empty library.
14. Denied storage leaves simulation usable, reports save failure, and permits JSON download.

Screenshots, actual downloads, raw axe reports, and compact browser reports were retained as local QA artifacts. The screenshot review led to fixing skip-link positioning, contrast, readability, map navigation, and scrolling-region access. The same workflow passed on the static package with relative asset paths.

## Limits

This verifies a release candidate in Chromium, not universal browser compatibility or full WCAG conformance. No physical-device, screen-reader, Firefox, or Safari testing was performed. Automated accessibility scans cover the specified editor/results screens, not every possible user state. The GitHub verification workflow is supplied; local results do not imply that remote CI has passed.

No site is deployed. The release branch/PR is intentionally reviewable and unmerged. Only launch-v1 has a numerical engine; resilience and AI-transition explorations remain illustrative. Model outputs are planning calculations under unverified assumptions, not calibrated predictions. Evidence and confidence are user-entered metadata, and local storage has no cloud synchronization.
