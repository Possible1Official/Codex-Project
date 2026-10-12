import { INPUTS, STRATEGIES, CONSTANTS, MODEL_VERSION, defaults, validateConstants, simulate, sensitivity, uncertaintyBounds } from './simulation.js';
import { scenarios } from './model.js';
export const MAX_FILE_BYTES = 65536;
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, expected, label) {
  if (!object(value) || Object.keys(value).length !== expected.length || expected.some(k => !Object.hasOwn(value, k))) throw new TypeError(`Unsupported ${label} fields`);
}
function text(value, label, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new TypeError(`${label} must be ${required ? 'nonempty text' : 'text'} of at most ${max} characters`);
  return value;
}
export function defaultModel(inputs = defaults(), seed = 12345) {
  return { schemaVersion: 1, modelVersion: MODEL_VERSION, title: 'Autonomous product launch', question: scenarios[0].question, inputs: {...inputs}, seed, constants: {...CONSTANTS}, evidence: Object.fromEntries(scenarios[0].assumptions.map(a => [a.id, { note: '', confidence: a.confidence }])) };
}
export function validateModel(value) {
  keys(value, ['schemaVersion','modelVersion','title','question','inputs','seed','constants','evidence'], 'model');
  if (value.schemaVersion !== 1 || value.modelVersion !== MODEL_VERSION) throw new TypeError('Only schema 1 / launch-v1 models are supported');
  text(value.title, 'Title', 100); text(value.question, 'Decision question', 500);
  keys(value.inputs, INPUTS.map(i => i.id), 'input');
  for (const i of INPUTS) {
    const n = value.inputs[i.id];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < i.min || n > i.max || Math.abs(n / i.step - Math.round(n / i.step)) > 1e-7) throw new RangeError(`${i.label} is outside its supported range or step`);
  }
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 4294967295) throw new RangeError('Seed must be a whole number from 0 to 4294967295');
  validateConstants(value.constants);
  keys(value.evidence, INPUTS.map(i => i.id), 'evidence');
  for (const i of INPUTS) {
    keys(value.evidence[i.id], ['note','confidence'], 'evidence entry');
    text(value.evidence[i.id].note, `${i.label} evidence`, 3000, false);
    if (!['Low','Medium','High'].includes(value.evidence[i.id].confidence)) throw new TypeError('Confidence must be Low, Medium, or High');
  }
  return copy(value);
}
export function parseModel(source) {
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_FILE_BYTES) throw new RangeError('Model file must be at most 64 KiB');
  let value;
  try { value = JSON.parse(source); } catch { throw new TypeError('Model file is not valid JSON'); }
  return validateModel(value);
}
export function readActiveModel(storage) {
  try { const value = storage.getItem('signal-atlas:active-model:v1'); return value ? parseModel(value) : null; } catch { return null; }
}
export function saveActiveModel(storage, model) {
  try { storage.setItem('signal-atlas:active-model:v1', JSON.stringify(validateModel(model))); return true; } catch { return false; }
}
export function readLibrary(storage) {
  try {
    const values = JSON.parse(storage.getItem('signal-atlas:library:v1'));
    if (!Array.isArray(values) || values.length > 20) return [];
    return values.map(validateModel);
  } catch { return []; }
}
export function saveToLibrary(storage, library, model) {
  const valid = validateModel(model);
  const next = library.map(validateModel).filter(m => m.title !== valid.title);
  if (next.length >= 20) throw new RangeError('Library is full (20 models). Use an existing title to replace one.');
  next.push(valid);
  try { storage.setItem('signal-atlas:library:v1', JSON.stringify(next)); } catch { throw new Error('Browser storage is unavailable or full. Export model JSON to keep a copy.'); }
  return next;
}
export const LIMITATIONS = 'Illustrative launch-v1 planning model, not a validated forecast or recommendation. Independent triangular uncertainty; confidence is metadata and does not alter distributions. No correlations, catastrophic events, retries, review-capacity constraints, learning dynamics, or later-quarter benefits. P10–P90 is a sampled range, not a confidence interval; positive-run frequency is not a real-world success probability.';
export function buildBrief(model, result) {
  const snapshot = validateModel(model);
  if (!result) throw new Error('Run the current model before exporting a decision brief.');
  const verified = simulate(snapshot.inputs, {seed:snapshot.seed, samples:result.samples, constants:snapshot.constants});
  if (JSON.stringify(result) !== JSON.stringify(verified)) throw new Error('Results do not match the current model. Run again before exporting.');
  return {
    briefVersion: 1, model: snapshot, result: copy(result),
    policies: copy(STRATEGIES),
    uncertainty: Object.fromEntries(INPUTS.map(i => [i.id, uncertaintyBounds(i.id, snapshot.inputs)])),
    sensitivity: Object.fromEntries(STRATEGIES.map(s => [s.id, sensitivity(snapshot.inputs, s.id, snapshot.constants)])),
    limitations: LIMITATIONS
  };
}
export function briefText(brief) {
  // Plain-text output intentionally never interprets evidence as HTML or Markdown.
  const lines = ['SIGNAL ATLAS — DECISION BRIEF', brief.model.title, brief.model.question, '', `Model: ${brief.model.modelVersion} · schema ${brief.model.schemaVersion}`, `Seed: ${brief.result.seed} · draws: ${brief.result.samples} · horizon: one quarter`, '', 'ASSUMPTIONS AND EVIDENCE'];
  for (const i of INPUTS) {
    const e = brief.model.evidence[i.id];
    lines.push(`${i.label}: ${brief.model.inputs[i.id]} ${i.unit} | confidence: ${e.confidence}`, `Evidence: ${e.note || 'No evidence recorded.'}`);
  }
  lines.push('', 'MODEL CONSTANTS', JSON.stringify(brief.model.constants, null, 2), '', 'STRATEGY POLICIES', JSON.stringify(brief.policies, null, 2), '', 'UNCERTAINTY BOUNDS', JSON.stringify(brief.uncertainty, null, 2), '', 'CALCULATED RESULTS (USD / QUARTER; EXPECTED TASK COUNTS)', JSON.stringify(brief.result, null, 2), '', 'ONE-AT-A-TIME SENSITIVITY', JSON.stringify(brief.sensitivity, null, 2), '', 'EQUATIONS', 'T = eligibleTasks × adoption/100 × reach', 'R = min(1, reliability/100 + reliabilityGain)', 'H = max(trust/100, reviewFloor)', 'F = T × (1−R) × (1−H×reviewEffectiveness)', 'Net = (T−F)×valuePerSuccess − T×cost − T×H×reviewCost − F×lossPerFailure − fixedCost', '', 'LIMITATIONS', brief.limitations, '', 'REPRODUCIBLE MODEL JSON', JSON.stringify(brief.model, null, 2));
  return lines.join('\n');
}
