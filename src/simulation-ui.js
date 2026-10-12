import { createWorkbench } from './workbench-ui.js';
import { defaultModel, readActiveModel, saveActiveModel, validateModel } from './workbench.js';
import { INPUTS, STRATEGIES, readSimulationState, saveSimulationState, formatInput, uncertaintyBounds, simulate, sensitivity } from './simulation.js';
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const percent = value => `${(value * 100).toFixed(1)}%`;
const ns = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, text) {
  const el = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
export function createSimulationWorkspace({ storage, onChange }) {
  let { inputs, seed } = readSimulationState(storage);
  const savedModel = readActiveModel(storage);
  let model;
  try { model = savedModel || validateModel(defaultModel(inputs, seed)); } catch { model = defaultModel(); inputs = {...model.inputs}; seed = model.seed; }
  if (savedModel) { inputs = {...savedModel.inputs}; seed = savedModel.seed; }
  let pendingDraft = false;
  let workbench;
  let result = null;
  let strategyId = 'accelerate';
  let activeScenario = 'launch';
  const controls = $('assumption-controls');
  for (const input of INPUTS) {
    const field = document.createElement('div');
    field.className = 'assumption-field';
    field.innerHTML = `<div class="input-heading"><label for="input-${input.id}">${input.label}</label><output id="value-${input.id}" for="input-${input.id}"></output></div><input id="input-${input.id}" type="range" min="${input.min}" max="${input.max}" step="${input.step}" aria-describedby="range-${input.id}"><p id="range-${input.id}" class="range-description"></p>`;
    controls.append(field);
    const slider = $(`input-${input.id}`);
    slider.value = inputs[input.id];
    slider.addEventListener('input', () => {
      workbench?.cancelPendingImport();
      inputs[input.id] = Number(slider.value);
      invalidate('Inputs changed. Run again to compare these assumptions.');
      updateControls(); persist(); onChange();
    });
  }
  $('simulation-seed').value = seed;
  function snapshot() { return validateModel({...model, inputs: {...inputs}, seed}); }
  function persist() {
    const savedInputs = saveSimulationState(storage, inputs, seed);
    const savedModel = saveActiveModel(storage, snapshot());
    $('simulation-storage').textContent = savedInputs && savedModel ? 'Applied model saved on this device' : 'Session only: export model JSON to keep your work';
    $('model-current-name').textContent = `Applied model: ${model.title}`;
    const c = model.constants;
    $('model-constants-current').textContent = `Current model: ${c.eligibleTasks.toLocaleString('en-US')} eligible tasks; $${c.valuePerSuccess} per success; $${c.lossPerFailure} per unresolved failure; $${c.reviewCost} per review; ${(c.reviewEffectiveness * 100).toFixed(0)}% review effectiveness.`;
  }
  function updateControls() {
    for (const input of INPUTS) {
      const slider = $(`input-${input.id}`);
      const bounds = uncertaintyBounds(input.id, inputs);
      $(`value-${input.id}`).textContent = formatInput(input.id, inputs[input.id]);
      slider.setAttribute('aria-valuetext', `${formatInput(input.id, inputs[input.id])}${input.id === 'cost' ? ' per attempted task' : ''}`);
      $(`range-${input.id}`).textContent = input.id === 'trust' ? 'Policy choice · held fixed in every draw' : `Triangular uncertainty: ${formatInput(input.id, bounds.low)} → ${formatInput(input.id, bounds.high)}`;
    }
  }
  function invalidate(message) {
    result = null;
    $('simulation-results').hidden = true;
    $('simulation-empty').hidden = false;
    $('simulation-empty').textContent = message;
    $('run-status').textContent = message;
    workbench?.refresh();
  }
  $('simulation-seed').addEventListener('input', () => {
    workbench?.cancelPendingImport();
    const field = $('simulation-seed');
    const valid = field.value.trim() !== '' && field.checkValidity();
    $('simulation-run').disabled = !valid || pendingDraft;
    invalidate(valid ? 'Seed changed. Run again to use it.' : 'Enter a whole-number seed from 0 to 4294967295.');
    if (valid) { seed = Number(field.value); persist(); }
  });
  $('simulation-reset').addEventListener('click', () => {
    workbench?.cancelPendingImport();
    inputs = Object.fromEntries(INPUTS.map(i => [i.id, i.baseline])); seed = 12345;
    for (const input of INPUTS) $(`input-${input.id}`).value = inputs[input.id];
    $('simulation-seed').value = seed; $('simulation-run').disabled = pendingDraft;
    invalidate('Example assumptions restored. Run to explore their tradeoffs.');
    updateControls(); persist(); onChange();
  });
  $('simulation-run').addEventListener('click', () => {
    if (pendingDraft || !$('simulation-seed').checkValidity() || $('simulation-seed').value.trim() === '') return;
    try {
      seed = Number($('simulation-seed').value);
      result = simulate(inputs, { seed, constants: model.constants });
      $('simulation-empty').hidden = true; $('simulation-results').hidden = false;
      renderResults(); persist(); workbench?.refresh();
      $('run-status').textContent = `Completed ${number(result.samples)} draws using seed ${result.seed}. Results match the current inputs.`;
    } catch {
      invalidate('The run could not complete. Reset the example inputs and try again.');
    }
  });
  $('sensitivity-strategy').addEventListener('change', () => { strategyId = $('sensitivity-strategy').value; if (result) renderSensitivity(); });
  function renderResults() {
    $('run-caption').textContent = `${model.title} · ${result.modelVersion} · ${number(result.samples)} paired draws · seed ${result.seed} · one quarter`;
    const body = $('comparison-body'); body.replaceChildren();
    for (const r of result.strategies) {
      const strategy = STRATEGIES.find(s => s.id === r.id);
      const row = document.createElement('tr');
      row.innerHTML = `<th scope="row"><i class="result-dot ${strategy.color}"></i>${strategy.title}</th><td>${money(r.mean)}</td><td>${money(r.p10)} to ${money(r.p90)}</td><td>${percent(r.positiveShare)}</td><td>${number(r.meanFailures)}</td>`;
      body.append(row);
    }
    renderDistribution(); renderSensitivity();
    $('cost-breakdown').replaceChildren();
    for (const r of result.strategies) {
      const s = STRATEGIES.find(s => s.id === r.id);
      const card = document.createElement('div'); card.className = `cost-card ${s.color}`;
      card.innerHTML = `<h4>${s.title}</h4><dl><dt>Successful-task value</dt><dd>${money(r.baseline.grossValue)}</dd><dt>Inference</dt><dd>−${money(r.baseline.inferenceCost)}</dd><dt>Human review</dt><dd>−${money(r.baseline.reviewCost)}</dd><dt>Failure losses</dt><dd>−${money(r.baseline.failureLoss)}</dd><dt>Strategy investment</dt><dd>−${money(r.baseline.fixedCost)}</dd><dt>Net at central inputs</dt><dd>${money(r.baseline.net)}</dd></dl>`;
      $('cost-breakdown').append(card);
    }
  }
  function renderDistribution() {
    const chart = $('outcome-chart'); chart.replaceChildren();
    chart.append(svg('title', {}, 'Quarterly net value: 10th to 90th percentile range and median. Exact ranges appear in the comparison table.'));
    const low = Math.min(0, ...result.strategies.map(r => r.p10));
    const high = Math.max(0, ...result.strategies.map(r => r.p90));
    const span = Math.max(1, high - low); const pad = span * 0.08;
    const x = v => 180 + (v - low + pad) / (span + pad * 2) * 510;
    const zero = x(0);
    chart.append(svg('line', { x1: zero, y1: 15, x2: zero, y2: 155, class: 'zero-line' }));
    chart.append(svg('text', { x: zero, y: 180, 'text-anchor': 'middle', class: 'axis-label' }, '$0'));
    result.strategies.forEach((r, i) => {
      const s = STRATEGIES.find(s => s.id === r.id); const y = 35 + i * 49;
      chart.append(svg('text', { x: 8, y: y + 4, class: 'chart-label' }, s.title));
      chart.append(svg('line', { x1: x(r.p10), y1: y, x2: x(r.p90), y2: y, class: `interval-line ${s.color}` }));
      for (const v of [r.p10, r.p90]) chart.append(svg('line', { x1: x(v), y1: y - 6, x2: x(v), y2: y + 6, class: `interval-cap ${s.color}` }));
      chart.append(svg('circle', { cx: x(r.median), cy: y, r: 5, class: `median-dot ${s.color}` }));
    });
    chart.append(svg('text', { x: 180, y: 202, class: 'axis-label' }, 'LINE: P10–P90 · DOT: MEDIAN · USD / QUARTER'));
  }
  function renderSensitivity() {
    $('sensitivity-strategy').value = strategyId;
    const rows = sensitivity(result.inputs, strategyId, result.constants);
    const max = Math.max(1, ...rows.flatMap(r => [Math.abs(r.lowDelta), Math.abs(r.highDelta)]));
    const body = $('sensitivity-body'); body.replaceChildren();
    for (const r of rows) {
      const row = document.createElement('tr');
      const chartCell = document.createElement('td');
      const bar = svg('svg', { viewBox: '0 0 220 26', class: 'sensitivity-bar', role: 'img', 'aria-label': `${r.label}: low input changes net by ${money(r.lowDelta)}, high input by ${money(r.highDelta)}` });
      bar.append(svg('line', { x1: 110, y1: 0, x2: 110, y2: 26, class: 'zero-line' }));
      for (const [delta, y, name] of [[r.lowDelta, 8, 'low-bar'], [r.highDelta, 18, 'high-bar']]) {
        const width = Math.abs(delta) / max * 100;
        bar.append(svg('rect', { x: delta < 0 ? 110 - width : 110, y, width, height: 6, rx: 2, class: name }));
      }
      row.innerHTML = `<th scope="row">${r.label}<small>${formatInput(r.id, r.low)} → ${formatInput(r.id, r.high)}</small></th><td>${money(r.lowDelta)}</td><td>${money(r.highDelta)}</td>`;
      chartCell.append(bar); row.append(chartCell); body.append(row);
    }
    $('sensitivity-note').textContent = `Largest net-value swing: ${rows[0].label} (${money(rows[0].swing)} over the stated range). Each row varies one input while holding the others at their central values. These ranges differ by assumption; this is not a causal attribution or uncertainty ranking.`;
  }
  workbench = createWorkbench({
    storage, getModel: snapshot, getResult: () => result,
    canUseModel: () => $('simulation-seed').checkValidity() && $('simulation-seed').value.trim() !== '',
    onDraft: dirty => {
      pendingDraft = dirty;
      $('simulation-run').disabled = dirty || !$('simulation-seed').checkValidity();
      if (dirty) invalidate('Model edits pending. Apply or discard the draft before running.');
      else if (!result) invalidate('Applied model ready. Run to compare its strategies.');
    },
    applyModel: candidate => {
      const valid = validateModel(candidate);
      model = valid; inputs = {...valid.inputs}; seed = valid.seed;
      for (const i of INPUTS) $(`input-${i.id}`).value = inputs[i.id];
      $('simulation-seed').value = seed;
      invalidate('Model changed. Run again to compare its strategies.');
      updateControls(); persist(); onChange();
    }
  });
  updateControls(); persist();
  return {
    metadata: () => snapshot(),
    confidence: (id, fallback) => activeScenario === 'launch' ? model.evidence[id]?.confidence || fallback : fallback,
    evidence: (id, fallback) => activeScenario === 'launch' ? model.evidence[id]?.note || 'No evidence recorded for this assumption.' : fallback,
    value: (id, fallback) => activeScenario === 'launch' && id in inputs ? formatInput(id, inputs[id]) : fallback,
    render: (scenarioId, selectedId) => {
      activeScenario = scenarioId;
      const supported = scenarioId === 'launch';
      $('simulation-supported').hidden = !supported;
      $('workbench-section').hidden = !supported;
      $('simulation-unsupported').hidden = supported;
      if (STRATEGIES.some(s => s.id === selectedId)) { strategyId = selectedId; if (result) renderSensitivity(); }
      $('simulation-model-badge').textContent = supported ? 'LAUNCH MODEL V1' : 'EXPLORATION ONLY';
    }
  };
}
