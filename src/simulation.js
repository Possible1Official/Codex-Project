// Launch model v1. All constants and equations are documented in docs/SIMULATION.md.
export const MODEL_VERSION = 'launch-v1';
export const INPUTS = [
  { id: 'adoption', label: 'User adoption', min: 0, max: 100, step: 1, baseline: 62, unit: '%', spread: 12, sensitivity: 10 },
  { id: 'reliability', label: 'System reliability', min: 50, max: 100, step: 1, baseline: 94, unit: '%', spread: 4, sensitivity: 3 },
  { id: 'cost', label: 'Operating cost', min: 0.01, max: 1, step: 0.01, baseline: 0.18, unit: '$/attempt', spread: 0.25, sensitivity: 0.05 },
  { id: 'trust', label: 'Human oversight', min: 0, max: 100, step: 1, baseline: 30, unit: '%', spread: 0, sensitivity: 10 }
];
export const STRATEGIES = [
  { id: 'accelerate', title: 'Accelerate', reach: 1, reliabilityGain: 0, reviewFloor: 0, fixedCost: 2000, color: 'mint' },
  { id: 'pilot', title: 'Controlled pilot', reach: 0.25, reliabilityGain: 0, reviewFloor: 0.6, fixedCost: 1000, color: 'violet' },
  { id: 'defer', title: 'Strengthen first', reach: 0.65, reliabilityGain: 0.04, reviewFloor: 0, fixedCost: 8000, color: 'amber' }
];
export const CONSTANTS = Object.freeze({ eligibleTasks: 100000, valuePerSuccess: 1, lossPerFailure: 6, reviewCost: 0.35, reviewEffectiveness: 0.9 });
export const CONSTANT_FIELDS = [
  {id:'eligibleTasks', label:'Eligible tasks / quarter', min:1, max:10000000, step:1},
  {id:'valuePerSuccess', label:'Value / successful task (USD)', min:0, max:10000, step:0.01},
  {id:'lossPerFailure', label:'Loss / unresolved failure (USD)', min:0, max:100000, step:0.01},
  {id:'reviewCost', label:'Review cost / task (USD)', min:0, max:10000, step:0.01},
  {id:'reviewEffectiveness', label:'Review effectiveness (fraction)', min:0, max:1, step:0.01}
];
export function validateConstants(candidate = CONSTANTS) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || Object.keys(candidate).length !== CONSTANT_FIELDS.length) throw new TypeError('Supply all five supported model constants');
  return Object.fromEntries(CONSTANT_FIELDS.map(f => {
    const value = candidate[f.id];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < f.min || value > f.max || Math.abs(value / f.step - Math.round(value / f.step)) > 1e-7) throw new RangeError(`Invalid ${f.label}`);
    return [f.id, value];
  }));
}
export function defaults() { return Object.fromEntries(INPUTS.map(i => [i.id, i.baseline])); }
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
export function normalizeInputs(candidate = {}) {
  return Object.fromEntries(INPUTS.map(i => [i.id, typeof candidate?.[i.id] === 'number' && Number.isFinite(candidate[i.id]) ? clamp(candidate[i.id], i.min, i.max) : i.baseline]));
}
export function normalizeSeed(seed) { return Number.isInteger(seed) && seed >= 0 && seed <= 4294967295 ? seed : 12345; }
export function readSimulationState(storage) {
  try {
    const saved = JSON.parse(storage.getItem('signal-atlas:simulation:v1'));
    if (saved?.version !== 1) return { inputs: defaults(), seed: 12345 };
    return { inputs: normalizeInputs(saved.inputs), seed: normalizeSeed(saved.seed) };
  } catch { return { inputs: defaults(), seed: 12345 }; }
}
export function saveSimulationState(storage, inputs, seed) {
  try { storage.setItem('signal-atlas:simulation:v1', JSON.stringify({ version: 1, inputs: normalizeInputs(inputs), seed: normalizeSeed(seed) })); return true; } catch { return false; }
}
export function formatInput(id, value) { return id === 'cost' ? `$${value.toFixed(2)}` : `${Math.round(value)}%`; }
export function seededRandom(seed) {
  let n = normalizeSeed(seed);
  return () => {
    n = (n + 0x6D2B79F5) >>> 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function uncertaintyBounds(id, inputs) {
  const input = INPUTS.find(i => i.id === id);
  if (!input) throw new RangeError('Unknown assumption');
  const value = normalizeInputs(inputs)[id];
  const spread = id === 'cost' ? value * input.spread : input.spread;
  return { low: clamp(value - spread, input.min, input.max), mode: value, high: clamp(value + spread, input.min, input.max) };
}
export function triangular(random, low, mode, high) {
  if (low === high) return low;
  const u = random();
  const split = (mode - low) / (high - low);
  return u < split ? low + Math.sqrt(u * (high - low) * (mode - low)) : high - Math.sqrt((1 - u) * (high - low) * (high - mode));
}
export function evaluate(inputs, strategyId, constants = CONSTANTS) {
  const c = validateConstants(constants);
  const x = normalizeInputs(inputs);
  const strategy = STRATEGIES.find(s => s.id === strategyId);
  if (!strategy) throw new RangeError('Unknown strategy');
  const tasks = c.eligibleTasks * x.adoption / 100 * strategy.reach;
  const reliability = Math.min(1, x.reliability / 100 + strategy.reliabilityGain);
  const review = Math.max(x.trust / 100, strategy.reviewFloor);
  const failures = tasks * (1 - reliability) * (1 - review * c.reviewEffectiveness);
  const successes = tasks - failures;
  const inferenceCost = tasks * x.cost;
  const reviewCost = tasks * review * c.reviewCost;
  const failureLoss = failures * c.lossPerFailure;
  const grossValue = successes * c.valuePerSuccess;
  return { tasks, failures, successes, inferenceCost, reviewCost, failureLoss, grossValue, fixedCost: strategy.fixedCost, net: grossValue - inferenceCost - reviewCost - failureLoss - strategy.fixedCost };
}
export function quantile(sorted, p) {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}
export function simulate(inputs, { seed = 12345, samples = 1000, constants = CONSTANTS } = {}) {
  if (!Number.isInteger(samples) || samples < 100 || samples > 10000) throw new RangeError('Use 100–10000 samples');
  const snapshot = normalizeInputs(inputs);
  const c = validateConstants(constants);
  const random = seededRandom(seed);
  const draws = STRATEGIES.map(() => []);
  const failures = STRATEGIES.map(() => 0);
  const bounds = INPUTS.map(i => uncertaintyBounds(i.id, snapshot));
  for (let run = 0; run < samples; run++) {
    const draw = Object.fromEntries(INPUTS.map((i, j) => [i.id, triangular(random, bounds[j].low, bounds[j].mode, bounds[j].high)]));
    STRATEGIES.forEach((s, j) => { const result = evaluate(draw, s.id, c); draws[j].push(result.net); failures[j] += result.failures; });
  }
  return {
    modelVersion: MODEL_VERSION, constants: c, inputs: snapshot, seed: normalizeSeed(seed), samples,
    strategies: STRATEGIES.map((s, j) => {
      const sorted = draws[j].sort((a, b) => a - b);
      return { id: s.id, mean: sorted.reduce((a, b) => a + b, 0) / samples, p10: quantile(sorted, 0.1), median: quantile(sorted, 0.5), p90: quantile(sorted, 0.9), positiveShare: sorted.filter(n => n > 0).length / samples, meanFailures: failures[j] / samples, baseline: evaluate(snapshot, s.id, c) };
    })
  };
}
export function sensitivity(inputs, strategyId, constants = CONSTANTS) {
  const snapshot = normalizeInputs(inputs);
  const baseline = evaluate(snapshot, strategyId, constants).net;
  return INPUTS.map(i => {
    const low = clamp(snapshot[i.id] - i.sensitivity, i.min, i.max);
    const high = clamp(snapshot[i.id] + i.sensitivity, i.min, i.max);
    const lowNet = evaluate({ ...snapshot, [i.id]: low }, strategyId, constants).net;
    const highNet = evaluate({ ...snapshot, [i.id]: high }, strategyId, constants).net;
    return { id: i.id, label: i.label, low, high, lowNet, highNet, lowDelta: lowNet - baseline, highDelta: highNet - baseline, swing: Math.abs(highNet - lowNet) };
  }).sort((a, b) => b.swing - a.swing);
}
