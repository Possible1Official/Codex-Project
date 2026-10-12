import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalizeInputs, normalizeSeed, readSimulationState, saveSimulationState, seededRandom, uncertaintyBounds, triangular, evaluate, simulate, sensitivity, STRATEGIES } from '../src/simulation.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test('central launch result matches an independently calculated balance sheet', () => {
  const r = evaluate(defaults(), 'accelerate');
  // 62,000 attempted tasks; 6% fail before review; 30% reviewed; review catches 90%.
  close(r.tasks, 62000);
  close(r.failures, 2715.6);
  close(r.successes, 59284.4);
  close(r.inferenceCost, 11160);
  close(r.reviewCost, 6510);
  close(r.failureLoss, 16293.6);
  close(r.net, 23320.8);
});
test('strategy policies change reach, review floor, reliability, and investment', () => {
  const inputs = { ...defaults(), adoption: 100, reliability: 99, trust: 0 };
  const broad = evaluate(inputs, 'accelerate');
  const pilot = evaluate(inputs, 'pilot');
  const strengthen = evaluate(inputs, 'defer');
  close(broad.tasks, 100000); close(pilot.tasks, 25000); close(strengthen.tasks, 65000);
  close(pilot.reviewCost, 25000 * 0.6 * 0.35);
  close(strengthen.failures, 0); // uplift cannot exceed 100% reliability.
  close(strengthen.fixedCost, 8000);
  close(evaluate({...inputs, trust: 100}, 'pilot').reviewCost, 25000 * 0.35);
});
test('higher reliability improves net and reduces failures; higher cost reduces net', () => {
  for (const s of STRATEGIES) {
    const base = evaluate({ ...defaults(), reliability: 80 }, s.id);
    const reliable = evaluate({ ...defaults(), reliability: 90 }, s.id);
    const expensive = evaluate({ ...defaults(), reliability: 80, cost: 0.5 }, s.id);
    assert.ok(reliable.net > base.net); assert.ok(reliable.failures < base.failures);
    assert.ok(expensive.net < base.net); close(expensive.failures, base.failures);
  }
});
test('review has a cost-benefit tradeoff rather than an automatic positive effect', () => {
  const reliable = { ...defaults(), reliability: 100 };
  assert.ok(evaluate({ ...reliable, trust: 100 }, 'accelerate').net < evaluate({ ...reliable, trust: 0 }, 'accelerate').net);
  const risky = { ...defaults(), reliability: 50 };
  assert.ok(evaluate({ ...risky, trust: 100 }, 'accelerate').net > evaluate({ ...risky, trust: 0 }, 'accelerate').net);
});
test('zero adoption incurs only strategy investment; maximum boundaries remain finite', () => {
  for (const s of STRATEGIES) {
    const empty = evaluate({ ...defaults(), adoption: 0 }, s.id);
    close(empty.net, -s.fixedCost); close(empty.failures, 0); close(empty.reviewCost, 0);
    const high = evaluate({adoption: 100, reliability: 100, cost: 1, trust: 100}, s.id);
    assert.ok(Number.isFinite(high.net)); close(high.failures, 0);
    assert.throws(() => evaluate(defaults(), 'unknown'), RangeError);
  }
});
test('identical seeds reproduce all outputs, changed seeds change samples, inputs are not mutated', () => {
  const input = defaults(); const before = { ...input };
  const a = simulate(input, {seed: 0});
  assert.deepEqual(a, simulate(input, {seed: 0}));
  assert.notDeepEqual(a, simulate(input, {seed: 1}));
  assert.deepEqual(input, before);
  assert.equal(a.samples, 1000); assert.equal(a.seed, 0);
});
test('quantiles are ordered, sampled net stays within analytical extrema, and common draws preserve cost shifts', () => {
  const input = defaults(); const run = simulate(input);
  for (const r of run.strategies) {
    assert.ok(r.p10 <= r.median && r.median <= r.p90);
    assert.ok(r.positiveShare >= 0 && r.positiveShare <= 1);
    assert.ok(r.meanFailures >= 0);
    const best = evaluate({adoption: 74, reliability: 98, cost: 0.135, trust: 30}, r.id).net;
    const worst = evaluate({adoption: 50, reliability: 90, cost: 0.225, trust: 30}, r.id).net;
    assert.ok(r.p10 >= worst && r.p90 <= best);
  }
  const expensive = simulate({ ...input, cost: 0.5 });
  run.strategies.forEach((r, i) => { assert.ok(expensive.strategies[i].mean < r.mean); close(expensive.strategies[i].meanFailures, r.meanFailures); });
});
test('triangular draws respect bounds, deterministic policies stay fixed, and clipped modes are explicit', () => {
  const random = seededRandom(123);
  for (let n = 0; n < 2000; n++) {
    for (const [low, mode, high] of [[0, 0, 12], [96, 100, 100], [0.01, 0.01, 0.0125], [5,5,5]]) {
      const value = triangular(random, low, mode, high);
      assert.ok(value >= low && value <= high);
    }
  }
  assert.deepEqual(uncertaintyBounds('trust', defaults()), {low:30, mode:30, high:30});
  assert.deepEqual(uncertaintyBounds('adoption', {...defaults(), adoption:0}), {low:0, mode:0, high:12});
});
test('sensitivity holds other inputs fixed, has correct direction, and ranks by stated-range swing', () => {
  const inputs = defaults(); const rows = sensitivity(inputs, 'accelerate');
  assert.equal(rows.length, 4);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].swing >= rows[i].swing);
  const base = evaluate(inputs, 'accelerate').net;
  for (const r of rows) {
    close(r.lowDelta, evaluate({...inputs, [r.id]:r.low}, 'accelerate').net - base);
    close(r.highDelta, evaluate({...inputs, [r.id]:r.high}, 'accelerate').net - base);
  }
  assert.ok(rows.find(r => r.id === 'cost').highDelta < 0);
  assert.ok(rows.find(r => r.id === 'reliability').highDelta > 0);
  const clipped = sensitivity({...inputs, reliability:100}, 'accelerate').find(r => r.id === 'reliability');
  close(clipped.highDelta, 0);
});
test('invalid input storage, numeric limits, seeds, and sample sizes recover or reject safely', () => {
  assert.deepEqual(normalizeInputs({adoption:NaN, cost:'0.4', trust:Infinity}), defaults());
  assert.equal(normalizeInputs({adoption:-10}).adoption, 0);
  assert.equal(normalizeInputs({reliability:1000}).reliability, 100);
  assert.equal(normalizeSeed(4294967295), 4294967295);
  for (const seed of [-1, 1.5, NaN, Infinity, 4294967296]) assert.equal(normalizeSeed(seed), 12345);
  for (const samples of [0,99,10001,1.5,NaN]) assert.throws(() => simulate(defaults(), {samples}), RangeError);
  for (const storage of [null,{getItem:()=>'{bad'},{getItem:()=>JSON.stringify({version:99})}]) assert.deepEqual(readSimulationState(storage), {inputs:defaults(),seed:12345});
  let saved;
  const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value;}};
  assert.equal(saveSimulationState(storage, {...defaults(),adoption:75}, 72), true);
  assert.equal(readSimulationState(storage).inputs.adoption, 75); assert.equal(readSimulationState(storage).seed,72);
  assert.equal(saveSimulationState({setItem:()=>{throw Error('denied');}},defaults(),1), false);
});
