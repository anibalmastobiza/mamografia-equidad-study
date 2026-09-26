import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ALL_ARMS, scenario, readiness, validateTrial } from '../site/study.js';

const source = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const baseKey = 'mamografia:1.0.0';
const receiver = 'https://script.google.com/macros/s/original_deployment/exec';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function session(stage = 'pending') {
  return { id, arm: 'P1-D0-B1', mode: 'pilot', stage, allocated: true,
    consentedAt: Date.now() - 86400000, receiverEndpoint: receiver,
    payload: { submission_id: id, mode: 'pilot', elapsed_ms: 30000 } };
}

async function run(entries, { reply = 'duplicate', overrides = {} } = {}) {
  const store = new Map(Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)]));
  const app = { innerHTML: '', focus() {} };
  const banner = { textContent: '' };
  const passiveElement = { addEventListener() {}, hidden: false };
  const calls = [];
  const context = vm.createContext({
    CONFIG: { mode: 'demo', studyVersion: '1.0.0', consentVersion: '1.0.0',
      endpoint: '', researcher: 'Aníbal Astobiza', contactEmail: 'amastobiza@ugr.es',
      institution: '', privacyUrl: '', retention: '', ethicsStatement: '',
      recruitmentOpen: false, imagePath: '', imageApproved: false, ...overrides },
    ALL_ARMS, scenario, readiness, validateTrial,
    randomArm() { throw new Error('must not make another allocation while recovering'); },
    async sendToSheets(payload, endpoint) {
      calls.push({ payload, endpoint });
      if (reply === 'error') throw new Error('NO_RECEIPT');
      return { status: reply, ok: true };
    },
    document: {
      querySelector(selector) {
        if (selector === '#app') return app;
        if (selector === '#mode-banner') return banner;
        if (selector === '#stimulus') return null;
        return passiveElement;
      },
      getElementById() { return { addEventListener() {} }; }
    },
    window: { scrollTo() {} }, location: { search: '' }, URLSearchParams,
    sessionStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: key => store.delete(key)
    }
  });
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { app, banner, calls, store };
}

test('pending pilot survives expired exposure and a closed or incomplete configuration', async () => {
  const value = session();
  const h = await run({ [`${baseKey}:pilot`]: value }, { reply: 'error', overrides: { mode: 'pilot' } });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].endpoint, receiver);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].payload)), value.payload);
  assert.equal(JSON.parse(h.store.get(`${baseKey}:pilot`)).stage, 'pending');
  assert.match(h.app.innerHTML, /No tenemos confirmación/);
  assert.doesNotMatch(h.app.innerHTML, /Demo finalizada/);
  assert.match(h.banner.textContent, /PARTICIPACIÓN EN CURSO/);
});

test('only a real recovered ACK turns the preserved pilot submission into confirmed', async () => {
  const h = await run({ [`${baseKey}:pilot`]: session() });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].payload.event, undefined);
  assert.equal(JSON.parse(h.store.get(`${baseKey}:pilot`)).stage, 'done');
  assert.match(h.app.innerHTML, /Gracias por tu participación/);
  assert.match(h.app.innerHTML, /Tus respuestas se han guardado/);
  assert.doesNotMatch(h.app.innerHTML, /Has completado una demo|descarg|download/);
});

test('legacy completed receipt migrates and remains visible after collection closes', async () => {
  const h = await run({ [baseKey]: session('done') });
  assert.equal(h.calls.length, 0);
  assert.equal(h.store.has(baseKey), false);
  assert.equal(JSON.parse(h.store.get(`${baseKey}:pilot`)).id, id);
  assert.match(h.app.innerHTML, /Tus respuestas se han guardado/);
  assert.doesNotMatch(h.app.innerHTML, new RegExp(id));
  assert.doesNotMatch(h.app.innerHTML, /id="restart"/);
});

test('demo state cannot overwrite an existing active pilot state when collection is closed', async () => {
  const pilot = session('post');
  const demo = { ...session('done'), id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', mode: 'demo' };
  const h = await run({ [`${baseKey}:pilot`]: pilot, [`${baseKey}:demo`]: demo });
  assert.equal(h.calls.length, 0);
  assert.deepEqual(JSON.parse(h.store.get(`${baseKey}:pilot`)), pilot);
  assert.equal(JSON.parse(h.store.get(`${baseKey}:demo`)).id, demo.id);
  assert.match(h.app.innerHTML, /Has completado una demo/);
  assert.doesNotMatch(h.app.innerHTML, /descarg|download/);
});

test('unavailable receiver preserves the pending response without claiming success', async () => {
  const value = session(); delete value.receiverEndpoint;
  const h = await run({ [baseKey]: value });
  assert.equal(h.calls.length, 0);
  assert.equal(JSON.parse(h.store.get(`${baseKey}:pilot`)).stage, 'pending');
  assert.match(h.app.innerHTML, /No tenemos confirmación/);
  assert.doesNotMatch(h.app.innerHTML, /Tus respuestas se han guardado|descarg|download/);
});

test('closed live collection never falls back to a saved demo', async () => {
  const demo = { ...session('done'), mode: 'demo' };
  const h = await run({ [`${baseKey}:demo`]: demo }, { overrides: { mode: 'pilot' } });
  assert.equal(h.calls.length, 0);
  assert.match(h.app.innerHTML, /no admite nuevas participaciones/);
  assert.doesNotMatch(h.app.innerHTML, /Explorar la demo|Has completado una demo|Revisar las ocho/);
});

test('consented active response can continue after new recruitment closes', async () => {
  const active = { ...session('post'), consentedAt: Date.now() - 30000 };
  const h = await run({ [`${baseKey}:pilot`]: active }, { overrides: {
    mode: 'pilot', recruitmentOpen: false, imageApproved: true, imagePath: './assets/mammogram-01.svg'
  } });
  assert.equal(h.calls.length, 0);
  assert.equal(JSON.parse(h.store.get(`${baseKey}:pilot`)).id, id);
  assert.match(h.app.innerHTML, /Enviar respuestas/);
  assert.doesNotMatch(h.app.innerHTML, /Finalizar revisión|Finalizar demo|no admite nuevas participaciones/);
});
