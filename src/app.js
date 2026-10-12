import { createSimulationWorkspace } from './simulation-ui.js';
import { scenarios, readState, writeState } from './model.js';
const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let state = readState(storage);
const simulation = createSimulationWorkspace({ storage, onChange: () => { render(); } });
const svgNS = 'http://www.w3.org/2000/svg';
function svgElement(tag, attrs, text) {
  const el = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function scenario() { return scenarios.find(s => s.id === state.scenarioId); }
function save() { $('storage-status').textContent = writeState(storage, state) ? 'Saved on this device · no account needed' : 'Session only · browser storage unavailable'; }
function selectNode(id) { state.selectedId = id; simulation.render(state.scenarioId, id); renderGraph(); renderInspector(); renderPaths(); save(); }
function renderScenarios() {
  $('scenario-list').replaceChildren();
  scenarios.forEach((s, i) => {
    const button = document.createElement('button');
    button.className = `scenario-button ${s.id === state.scenarioId ? 'active' : ''}`;
    button.setAttribute('aria-pressed', String(s.id === state.scenarioId));
    button.innerHTML = `<span class="scenario-number">0${i + 1}</span><span><strong>${s.title}</strong><small>${s.category.toLowerCase()}</small></span><span class="scenario-arrow">↗</span>`;
    button.addEventListener('click', () => { state.scenarioId = s.id; state.selectedId = s.assumptions[0].id; render(); save(); });
    $('scenario-list').append(button);
  });
}
function renderGraph() {
  const s = scenario();
  const graph = $('graph');
  const focused = document.activeElement?.getAttribute('data-node');
  graph.replaceChildren();
  const defs = svgElement('defs', {});
  const pattern = svgElement('pattern', { id: 'dots', width: 24, height: 24, patternUnits: 'userSpaceOnUse' });
  pattern.append(svgElement('circle', { cx: 1, cy: 1, r: 0.8, fill: '#293539' }));
  defs.append(pattern); graph.append(defs, svgElement('rect', { width: 800, height: 490, fill: 'url(#dots)' }));
  const group = svgElement('g', { transform: `translate(400 245) scale(${state.zoom}) translate(-400 -245)` });
  graph.append(group);
  const coordinates = [[36, 66], [36, 162], [36, 258], [36, 354]];
  const outcomeY = [91, 219, 347];
  s.assumptions.forEach((a, i) => {
    const y = coordinates[i][1] + 30;
    group.append(svgElement('path', { d: `M 215 ${y} C 270 ${y}, 274 249, 330 249`, class: `connection ${state.selectedId === a.id || state.selectedId === 'decision' ? 'lit' : ''}` }));
  });
  s.outcomes.forEach((o, i) => {
    const y = outcomeY[i] + 30;
    group.append(svgElement('path', { d: `M 470 249 C 530 249, 530 ${y}, 583 ${y}`, class: `connection outcome-line ${state.selectedId === o.id || state.selectedId === 'decision' ? 'lit' : ''}` }));
  });
  function addNode(id, x, y, width, title, sub, kind) {
    const selected = state.selectedId === id;
    const node = svgElement('g', { transform: `translate(${x} ${y})`, tabindex: 0, role: 'button', 'aria-label': `${title}, ${sub}`, 'aria-pressed': String(selected), 'data-node': id, class: `node ${kind} ${selected ? 'selected' : ''}` });
    node.append(svgElement('rect', { width, height: 60, rx: 12, class: 'node-box' }));
    node.append(svgElement('circle', { cx: 17, cy: 20, r: 3, class: 'node-dot' }));
    node.append(svgElement('text', { x: 29, y: 24, class: 'node-title' }, title));
    node.append(svgElement('text', { x: 17, y: 44, class: 'node-sub' }, sub));
    node.addEventListener('click', () => selectNode(id));
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(id); } });
    group.append(node);
  }
  s.assumptions.forEach((a, i) => addNode(a.id, ...coordinates[i], 179, a.title, `${simulation.value(a.id, a.value)}  ·  ${simulation.confidence(a.id, a.confidence)} confidence`, 'assumption'));
  group.append(svgElement('circle', { cx: 400, cy: 249, r: 87, class: 'decision-halo' }));
  addNode('decision', 330, 219, 140, 'Your decision', s.decision, 'decision');
  s.outcomes.forEach((o, i) => addNode(o.id, 583, outcomeY[i], 181, o.title, o.subtitle, 'outcome'));
  $('zoom-label').textContent = `${Math.round(state.zoom * 100)}%`;
  $('zoom-out').disabled = state.zoom <= 0.8;
  $('zoom-in').disabled = state.zoom >= 1.4;
  if (focused) graph.querySelector(`[data-node="${focused}"]`)?.focus();
}
function renderInspector() {
  const s = scenario();
  const a = s.assumptions.find(a => a.id === state.selectedId);
  const o = s.outcomes.find(o => o.id === state.selectedId);
  if (a) {
    $('inspector-content').innerHTML = `<p class="eyebrow inspector-type">ASSUMPTION / ${String(s.assumptions.indexOf(a) + 1).padStart(2, '0')}</p><h2>${a.title}</h2><div class="big-value">${simulation.value(a.id, a.value)}</div><div class="confidence"><i class="${simulation.confidence(a.id, a.confidence).toLowerCase()}"></i>${simulation.confidence(a.id, a.confidence)} confidence <span>EXAMPLE</span></div><p class="detail">${a.description}</p><div class="evidence"><p class="eyebrow">EVIDENCE TO LOOK FOR</p><p id="inspector-evidence"></p></div><p class="connected-label">CONNECTED TO</p><button id="follow-decision" class="connection-button">${s.decision}<span>→</span></button>`;
    $('inspector-evidence').textContent = simulation.evidence(a.id, a.evidence);
    $('follow-decision').addEventListener('click', () => selectNode('decision'));
  } else if (o) {
    $('inspector-content').innerHTML = `<p class="eyebrow inspector-type">STRATEGY PATH</p><h2>${o.title}</h2><div class="strategy-icon ${o.color}" aria-hidden="true">↗</div><p class="strategy-value">${o.value}</p><p class="detail">${o.detail}</p><div class="evidence"><p class="eyebrow">WHAT THIS MEANS</p><p>${s.id === 'launch' ? 'Run the launch model below to compare calculated net value and failure exposure. The strategy policy and constants are illustrative.' : 'This strategy is illustrative. This exploration has no numerical simulation yet.'}</p></div>`;
  } else {
    $('inspector-content').innerHTML = `<p class="eyebrow inspector-type">DECISION NODE</p><h2>${s.decision}</h2><div class="strategy-icon mint" aria-hidden="true">◎</div><p id="inspector-question" class="detail"></p><div class="evidence"><p class="eyebrow">THE SYSTEM VIEW</p><p>Four assumptions connect to this decision. Explore each one, then inspect the three alternative strategies.</p></div><p class="detail">${s.summary}</p>`;
    $('inspector-question').textContent = s.id === 'launch' ? simulation.metadata().question : s.question;
  }
}
function renderPaths() {
  $('paths').replaceChildren();
  scenario().outcomes.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = `path-card ${o.color} ${state.selectedId === o.id ? 'chosen' : ''}`;
    b.setAttribute('aria-pressed', String(state.selectedId === o.id));
    b.innerHTML = `<div class="path-top"><span>PATH 0${i + 1}</span><span>↗</span></div><h3>${o.title}</h3><p>${o.detail}</p><div class="path-value"><i></i>${o.value}</div>`;
    b.addEventListener('click', () => selectNode(o.id));
    $('paths').append(b);
  });
}
function render() {
  simulation.render(state.scenarioId, state.selectedId);
  renderScenarios();
  $('category').textContent = scenario().category;
  $('question').textContent = state.scenarioId === 'launch' ? simulation.metadata().question : scenario().question;
  $('scenario-summary').textContent = scenario().summary;
  renderGraph(); renderInspector(); renderPaths();
}
function zoom(delta) { state.zoom = Math.round(Math.max(0.8, Math.min(1.4, state.zoom + delta)) * 10) / 10; renderGraph(); save(); }
$('zoom-in').addEventListener('click', () => zoom(0.1));
$('zoom-out').addEventListener('click', () => zoom(-0.1));
$('zoom-reset').addEventListener('click', () => { state.zoom = 1; renderGraph(); save(); });
$('roadmap-open').addEventListener('click', () => $('roadmap').showModal());
$('roadmap-close').addEventListener('click', () => $('roadmap').close());
render(); save();
