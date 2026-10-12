import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, defaultState, normalizeState, readState, writeState } from '../src/model.js';
test('corrupt and incompatible saved workspaces recover to a usable default', () => {
  for (const input of [null, {}, { version: 99 }, { version: 1, scenarioId: 'missing' }]) assert.deepEqual(normalizeState(input), defaultState());
  assert.deepEqual(readState({getItem: () => '{broken'}), defaultState());
  assert.deepEqual(readState(null), defaultState());
});
test('selection cannot leak between scenarios and zoom remains usable', () => {
  assert.deepEqual(normalizeState({version: 1, scenarioId: 'resilience', selectedId: 'reliability', zoom: 100}), {version: 1, scenarioId: 'resilience', selectedId: 'load', zoom: 1.4});
  assert.equal(normalizeState({version: 1, scenarioId: 'launch', selectedId: 'pilot', zoom: NaN}).zoom, 1);
});
test('workspace round-trips and denied storage does not throw', () => {
  let saved;
  const storage = {setItem: (_key, value) => { saved = value; }, getItem: () => saved};
  const state = {version: 1, scenarioId: 'transition', selectedId: 'gain', zoom: 1.2};
  assert.equal(writeState(storage, state), true);
  assert.deepEqual(readState(storage), state);
  assert.equal(writeState({setItem: () => { throw new Error('quota'); }}, state), false);
});
test('each example has uniquely selectable nodes and valid numerical baselines', () => {
  for (const s of scenarios) {
    const ids = ['decision', ...s.assumptions.map(a => a.id), ...s.outcomes.map(o => o.id)];
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(s.assumptions.length, 4);
    assert.equal(s.outcomes.length, 3);
    for (const a of s.assumptions) assert.ok(a.baseline >= a.min && a.baseline <= a.max);
  }
});
