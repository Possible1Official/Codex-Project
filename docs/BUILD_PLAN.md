# Signal Atlas — build plan

## Product direction

Build a decision lab for product and engineering teams evaluating uncertain changes. The distinctive experience is an explorable causal map coupled with reproducible simulations, sensitivity analysis, and an evidence trail. Avoid presenting unsupported certainty or an invented AI capability.

The final workspace uses a dark mission-control aesthetic with mint assumption nodes, violet strategy nodes, connected paths, a contextual inspector, editable inputs, and comparative outcome distributions. A decision brief records inputs, model limitations, evidence, and results.

## Constraints

- Work in Possible1Official/Codex-Project.
- Do not use the user's Vercel or Supabase, including tools, deployments, databases, or integrations.
- Build one checkpoint per turn, then schedule the next checkpoint once, 7 minutes after completion.
- Persist progress in the repository so future tasks can resume even without the current workspace.
- Keep core operation local and free of external credentials.
- Never describe illustrative data as a forecast or completed simulation.

## Checkpoints

1. Foundation: build the visual workspace, three example maps, selection and inspector, zoom, persistence, and roadmap. Verify storage recovery and HTTP delivery.
2. Simulation: introduce an explicit numerical model for the product-launch exploration first; add assumption sliders, seeded Monte Carlo runs, comparisons, and one-at-a-time sensitivity analysis. Document equations, units, uncertainty distributions, and limitations. Other explorations should clearly indicate whether simulations are supported. Test repeatability, boundaries, and expected directional behavior. Preserve foundation interactions.
3. Workbench: add validated custom decision models using an explicit supported model schema, editable evidence and confidence, local save/import, and a portable decision brief export. Reject invalid imports safely. Ensure user-entered text never becomes executable HTML.
4. Release: review accessibility and responsive layouts, verify complete model-to-export flow, improve empty/error states, document limitations and deployment options, and create a reviewable release/PR in GitHub. Do not use Vercel or Supabase. Do not claim browser QA or a deployed site without actual evidence. Finish without scheduling another build.

## Continuation protocol

Read README.md, docs/STATUS.md, and this plan from the GitHub repository. Inspect any applicable AGENTS.md before edits. Reuse or clone the repository, verify the latest commit, implement ONLY the next checkpoint, and update docs/STATUS.md with completed features and actual validation. Commit changes to GitHub. Then create one one-time automation for the next checkpoint with dtstart_offset_json {"minutes":7}; perform a harmless GitHub read first. If task creation fails, report the failure clearly without claiming the next step is scheduled.
