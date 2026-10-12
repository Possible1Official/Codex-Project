# Launch simulation v1

This is a transparent illustrative planning model, not a validated forecast. Only the autonomous product launch exploration has a numerical model. The resilience and AI-transition maps remain illustrative.

## Horizon and inputs

The horizon is one quarter with 100,000 eligible tasks. Adoption is the percentage of eligible user/task volume using the product; this assumes equal task volume across users. Reliability is the percentage of attempted tasks that succeed without review. Operating cost is USD per attempted task, incurred for successful and failed attempts alike. Human oversight is the percentage of tasks reviewed before action. Percentages become fractions in the equations.

| Input | Central example | Valid range | Monte Carlo uncertainty | Sensitivity perturbation |
| --- | --- | --- | --- | --- |
| Adoption | 62% | 0–100% | Central mode ±12 percentage points | ±10 percentage points |
| Reliability | 94% | 50–100% | Central mode ±4 percentage points | ±3 percentage points |
| Operating cost | $0.18 / attempt | $0.01–$1.00 | Central mode ±25% of cost | ±$0.05 / attempt |
| Human oversight | 30% | 0–100% | None; fixed policy | ±10 percentage points |

Each uncertain input uses an independent triangular distribution, defined by lower bound, central mode, and upper bound. Bounds are clipped to the valid ranges. At an edge, the distribution becomes asymmetric: the central value is a **mode**, not necessarily the sampled mean. For example, 0% adoption yields an uncertain range from 0% to 12%, rather than guaranteeing no adoption. Oversight has no sampled uncertainty. Confidence labels on the map are illustrative metadata; they do not dynamically set the uncertainty widths.

## Constants and strategy policies

Every successful task creates $1 of value. Every unresolved failure incurs an additional $6 loss. Each reviewed task costs $0.35. Review catches and corrects 90% of the failures within reviewed tasks. A corrected task counts as successful. Review allocation is assumed independent of task failure.

| Strategy | Fraction of quarterly reach | Reliability uplift | Review policy | Fixed investment |
| --- | --- | --- | --- | --- |
| Accelerate | 100% | None | Oversight input | $2,000 |
| Controlled pilot | 25% | None | Greater of input or 60% | $1,000 |
| Strengthen first | 65% | +4 percentage points, capped at 100% | Oversight input | $8,000 |

Strengthen first represents a delayed launch: reduced quarterly reach and an assumed reliability improvement. It does not simulate training or engineering success. Pilot learning benefits and all later-quarter benefits are excluded. These policies, costs, and constants are invented examples.

## Equations

For each strategy and sampled set of inputs:

```text
T = 100,000 × adoption_fraction × reach_fraction
R = min(1, reliability_fraction + strategy_uplift)
H = max(oversight_fraction, strategy_review_floor)
F = T × (1 − R) × (1 − H × 0.90)
S = T − F

Gross value    = S × $1
Inference cost = T × operating_cost
Review cost    = T × H × $0.35
Failure loss   = F × $6
Net value      = gross value − inference cost − review cost − failure loss − fixed investment
```

Task counts are expected counts conditional on the sampled inputs. They may be fractional; the model does not sample individual task successes or failures. The view rounds counts and USD for readability; calculations retain full precision. The central-input breakdown uses the entered modes, not averages from the simulation.

At the example central inputs, Accelerate has 62,000 attempted tasks, 2,715.6 unresolved failures, and $23,320.80 quarterly net value. The balance-sheet test checks these quantities independently.

## Reproducibility and comparisons

The browser runs 1,000 draws. The pure engine supports 100–10,000 draws and rejects invalid counts. Seed is an unsigned 32-bit integer, including zero. A deterministic Mulberry32 generator and inverse triangular distribution produce the draws. The same sampled adoption, reliability, cost, and fixed oversight are applied to all three strategies within each draw (common random numbers). Each run resets the generator; same inputs, seed, sample count, and model version reproduce the outputs.

Results contain mean net value, median, interpolated P10/P90, positive-net run frequency, and mean unresolved failures. The chart shows P10–P90 lines and median dots. P10–P90 describes the middle 80% of sampled net values. It is not a statistical confidence interval. Positive-run frequency is a model-dependent sample fraction, not a calibrated real-world success probability. There is no automatic recommendation or winner.

Editing a slider or seed invalidates and hides the previous result. The inputs and seed persist locally; results are intentionally rerun after reload. Invalid seed entry disables running. Scenario selection, map focus, and zoom retain their existing persistence.

## Sensitivity

For a selected strategy, evaluate the entered central inputs without sampling. Vary one input up and down by the table's perturbation, clipping to its valid bounds, while holding all others fixed. Report the net-value change from baseline for each endpoint. Rank rows by the absolute net-value swing between endpoints.

The input ranges have different units and widths. This analysis is a local stress test over stated ranges, not a causal attribution, normalized elasticity, or ranking of probabilistic uncertainty. Interactions are not attributed. Pilot's review floor and the reliability cap may produce flat portions of a sensitivity range.

## Limitations and validation

No external data calibrates this model. It excludes correlated uncertainty, catastrophic events, demand dynamics, repeated attempts, reliability learning curves, queueing and review capacity, taxes, discounting, revenue dynamics, and subsequent quarters. Monetary valuation of failures may not capture safety or reputational harm. Uncertainty widths are fixed examples, not derived from evidence.

Automated tests cover independent balance-sheet calculations, strategy policies, directional behavior, review tradeoffs, extrema, reproducibility, finite boundaries, uncertainty bounds, sensitivity endpoints, corrupt/denied persistence, and HTTP delivery of the complete browser module graph. The release browser flow and visual review passed in Chromium; see docs/VERIFICATION.md for evidence and limits.

## Checkpoint 3: custom constants

The workbench now accepts validated custom task volume, successful-task value, failure loss, review cost, and review effectiveness. The equations above generalize their example literals to the corresponding constants. Strategy policies, input ranges, uncertainty widths, and sensitivity perturbations remain fixed. Each calculated result now contains its own detached constants snapshot; sensitivity and brief reproduction use that snapshot. The disclosed current constants update with the applied model. Confidence remains metadata.

See docs/WORKBENCH.md for the supported schema and ranges. Legacy default-model outputs are numerically unchanged. The example values above remain examples, not fixed constants for custom models.
