import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ARMS, parseArm, randomArm, scenario, readiness, validateTrial, validAck, validAckOrigin } from '../site/study.js';
import { CONFIG } from '../site/config.js';

test('eight unique factorial cells; allocation is exactly uniform for uniform byte',()=>{
  assert.equal(new Set(ALL_ARMS).size,8);
  const counts=Object.fromEntries(ALL_ARMS.map(a=>[a,0]));
  for(let i=0;i<256;i++) counts[randomArm({getRandomValues(a){a[0]=i;return a;}})]++;
  assert.deepEqual(Object.values(counts),Array(8).fill(32));
});
test('clinical narrative remains constant; waiting and access factors vary independently',()=>{
  const cases=ALL_ARMS.map(scenario);
  assert.equal(new Set(cases.map(s=>s.common)).size,1);
  assert.match(cases[0].common,/Tras una revisión inicial/);
  for(const s of cases){assert.match(s.policyText,/por teléfono/);assert.match(s.policyText,/sin necesidad de utilizar internet/);assert.equal(s.days,s.delay?28:7);}
  assert.equal(new Set(cases.filter(s=>s.policy===0).map(s=>s.policyText)).size,1);
});
test('arm format does not admit out-of-design values',()=>{
  for(const a of ['P2-D0-B0','P0-D1-B0<script>','P0-D0',''])assert.throws(()=>parseArm(a));
});
test('default config is closed and missing real image',()=>{
  assert.equal(CONFIG.mode,'demo');assert.equal(CONFIG.recruitmentOpen,false);assert.equal(CONFIG.imageApproved,false);
  assert.ok(readiness(CONFIG).includes('endpoint'));assert.ok(readiness(CONFIG).includes('image_review'));
});
test('trial respects ranges, assignment, and integer responses',()=>{
  const t={scenario_id:'P0-D0-B0',image_id:'mammogram-01',policy:0,delay:0,barrier:0,ability:0,intention:100,fairness:1,trust:7,responsibility:'service',elapsed_ms:1000};
  assert.equal(validateTrial(t,t.scenario_id),true);
  for(const patch of [{ability:NaN},{ability:101},{fairness:0},{policy:1},{trust:2.1},{elapsed_ms:7200001}])assert.equal(validateTrial({...t,...patch},t.scenario_id),false);
});
test('receipt needs trusted origin, matching attempt and event',()=>{
  const ev={origin:'https://example-script.googleusercontent.com',data:{type:'mamografia:submission',submissionId:'s',nonce:'n',event:'response',ok:true,status:'saved'}};
  assert.equal(validAck(ev,'s','n','response'),true);
  assert.equal(validAck(ev,'s','wrong','response'),false);
  assert.equal(validAck(ev,'s','n','allocation'),false);
  assert.equal(validAck({...ev,origin:'https://evil.example'},'s','n','response'),false);
  assert.equal(validAckOrigin('https://example-script.googleusercontent.com.evil.example'),false);
  assert.equal(validAckOrigin('null'),false);
});
