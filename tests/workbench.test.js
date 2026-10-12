import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel, validateModel, parseModel, readActiveModel, saveActiveModel, readLibrary, saveToLibrary, buildBrief, briefText, MAX_FILE_BYTES } from '../src/workbench.js';
import { simulate, evaluate, sensitivity, CONSTANTS, validateConstants } from '../src/simulation.js';
const storage = () => {const values=new Map(); return {getItem:k=>values.get(k) ?? null,setItem:(k,v)=>values.set(k,v)};};
const copy = x => JSON.parse(JSON.stringify(x));
test('model round-trip retains economics, evidence, confidence, seed, and text without interpretation', () => {
  const model=defaultModel(); model.title='<img src=x onerror=alert(1)>'; model.question='Should we launch?'; model.seed=0;
  model.inputs.adoption=75; model.constants.eligibleTasks=250000;
  model.evidence.reliability={note:'<script>alert(1)</script>\nPilot result: 98/100 tasks.',confidence:'High'};
  assert.deepEqual(parseModel(JSON.stringify(model)),model);
  const valid=validateModel(model); valid.inputs.adoption=10;
  assert.equal(model.inputs.adoption,75); // validation returns a detached copy.
});
test('malformed, oversized, unsupported, and unknown-field imports reject without changing the applied model', () => {
  const applied=defaultModel(); const before=copy(applied);
  const cases=['{bad', 'x'.repeat(MAX_FILE_BYTES+1), JSON.stringify({...applied,schemaVersion:2}),JSON.stringify({...applied,modelVersion:'javascript'}),JSON.stringify({...applied,formula:'alert(1)'}),JSON.stringify({...applied,inputs:{...applied.inputs,adoption:101}}),JSON.stringify({...applied,seed:1.5})];
  for (const source of cases) {assert.throws(()=>parseModel(source)); assert.deepEqual(applied,before);}
  assert.throws(()=>parseModel(JSON.stringify({...applied,title:' '})));
  assert.throws(()=>parseModel(JSON.stringify({...applied,evidence:{...applied.evidence,cost:{note:'',confidence:'Certain'}}})));
  assert.throws(()=>parseModel(JSON.stringify({...applied,inputs:{...applied.inputs,adoption:62.5}})));
  assert.throws(()=>parseModel(JSON.stringify({...applied,constants:{...applied.constants,reviewEffectiveness:1.1}})));
});
test('numeric and text boundaries are validated rather than silently clamped', () => {
  assert.throws(()=>validateModel({...defaultModel(),seed:Infinity}));
  assert.throws(()=>validateModel({...defaultModel(),title:'a'.repeat(101)}));
  const model=defaultModel(); model.evidence.trust.note='a'.repeat(3001); assert.throws(()=>validateModel(model));
  for (const constants of [{...CONSTANTS,eligibleTasks:0},{...CONSTANTS,eligibleTasks:1.5},{...CONSTANTS,reviewCost:NaN},{...CONSTANTS,lossPerFailure:'6'},{...CONSTANTS,reviewEffectiveness:0.333},{...CONSTANTS,extra:1}]) assert.throws(()=>validateConstants(constants));
  const boundary=defaultModel(); boundary.inputs={adoption:0,reliability:100,cost:1,trust:100}; boundary.seed=4294967295;
  assert.deepEqual(validateModel(boundary),boundary);
});
test('custom economics affect every run, baseline, and sensitivity without changing fixed policies', () => {
  const model=defaultModel(); model.constants.valuePerSuccess=2;
  const base=simulate(model.inputs,{seed:model.seed});
  const custom=simulate(model.inputs,{seed:model.seed,constants:model.constants});
  for (let i=0;i<custom.strategies.length;i++) {
    assert.ok(custom.strategies[i].mean>base.strategies[i].mean);
    assert.equal(custom.strategies[i].meanFailures,base.strategies[i].meanFailures);
    assert.equal(custom.strategies[i].baseline.fixedCost,base.strategies[i].baseline.fixedCost);
  }
  assert.deepEqual(custom.constants,model.constants);
  assert.deepEqual(custom,simulate(model.inputs,{seed:model.seed,constants:model.constants}));
  const r=evaluate(model.inputs,'accelerate',model.constants);
  assert.ok(Math.abs(r.net-(23320.8+59284.4))<1e-6);
  assert.notDeepEqual(sensitivity(model.inputs,'accelerate',model.constants),sensitivity(model.inputs,'accelerate'));
});
test('active model and named library persist independently; corrupt/denied storage recovers safely', () => {
  const db=storage(); const model=defaultModel(); model.title='Pilot decision';
  assert.equal(saveActiveModel(db,model),true); assert.deepEqual(readActiveModel(db),model);
  let library=saveToLibrary(db,[],model); assert.deepEqual(readLibrary(db),[model]);
  const updated=copy(model); updated.inputs.adoption=80;
  library=saveToLibrary(db,library,updated); assert.equal(library.length,1); assert.deepEqual(readLibrary(db),[updated]);
  assert.deepEqual(readActiveModel(db),model); // saved versions do not mutate the applied model.
  const denied={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('quota')}};
  assert.equal(readActiveModel(denied),null); assert.deepEqual(readLibrary(denied),[]);
  assert.equal(saveActiveModel(denied,model),false); assert.throws(()=>saveToLibrary(denied,[],model),/Export model JSON/);
  assert.equal(readActiveModel({getItem:()=>'{bad'}),null); assert.deepEqual(readLibrary({getItem:()=>'{bad'}),[]);
});
test('a full library rejects additions atomically but permits replacing a saved title', () => {
  const db=storage(); let library=[];
  for(let i=0;i<20;i++) library=saveToLibrary(db,library,{...defaultModel(),title:`Model ${i}`});
  const before=db.getItem('signal-atlas:library:v1');
  assert.throws(()=>saveToLibrary(db,library,{...defaultModel(),title:'Extra'}),/full/);
  assert.equal(db.getItem('signal-atlas:library:v1'),before);
  library=saveToLibrary(db,library,{...defaultModel(),title:'Model 0',seed:72});
  assert.equal(library.length,20); assert.equal(readLibrary(db).at(-1).seed,72);
});
test('brief contains exact reproducible results and rejects stale or altered results', () => {
  const model=defaultModel(); model.constants.eligibleTasks=200000; model.evidence.adoption.note='Pilot activation 620/1000; 2026-10-12';
  const result=simulate(model.inputs,{seed:model.seed,constants:model.constants});
  const brief=buildBrief(model,result);
  assert.deepEqual(brief.result,result); assert.deepEqual(brief.model,model);
  assert.equal(brief.policies.length,3); assert.ok(brief.limitations.includes('not a validated forecast'));
  assert.deepEqual(brief.sensitivity.accelerate,sensitivity(model.inputs,'accelerate',model.constants));
  assert.throws(()=>buildBrief({...model,inputs:{...model.inputs,adoption:70}},result),/Run again/);
  assert.throws(()=>buildBrief({...model,seed:1},result),/Run again/);
  assert.throws(()=>buildBrief({...model,constants:{...model.constants,valuePerSuccess:2}},result),/Run again/);
  const forged=copy(result); forged.strategies[0].mean+=1; assert.throws(()=>buildBrief(model,forged),/Run again/);
  assert.throws(()=>buildBrief(model,null),/Run the current model/);
  brief.model.evidence.adoption.note='mutated'; assert.equal(model.evidence.adoption.note,'Pilot activation 620/1000; 2026-10-12');
});
test('plain-text brief contains evidence, units, limits, equations, and reimportable model snapshot', () => {
  const model=defaultModel(); model.evidence.cost.note='<img src=x onerror=alert(1)>\nMeasured cost: $0.18';
  const brief=buildBrief(model,simulate(model.inputs,{seed:model.seed,constants:model.constants}));
  const output=briefText(brief);
  for(const marker of ['CALCULATED RESULTS','ONE-AT-A-TIME SENSITIVITY','EQUATIONS','LIMITATIONS','USD / QUARTER','<img src=x onerror=alert(1)>']) assert.ok(output.includes(marker));
  assert.deepEqual(parseModel(output.split('REPRODUCIBLE MODEL JSON\n')[1]),model);
});
