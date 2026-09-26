import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const submissionId = '33333333-3333-4333-8333-333333333333';
const nonce = '44444444-4444-4444-8444-444444444444';
const origin = 'https://example.github.io';

function payload() {
  return {
    submission_id: submissionId, study_version: '1.0.0', consent_version: '1.0.0',
    mode: 'pilot', consent: true, assignment: 'P1-D0-B1', elapsed_ms: 50000,
    age_band: '40-59', healthcare_experience: 'no',
    gender: 'other', education: 'university', residence: 'rural',
    trials: [{ scenario_id: 'P1-D0-B1', image_id: 'mammogram-01', policy: 1, delay: 0,
      barrier: 1, ability: 70, intention: 85, fairness: 4, trust: 5,
      responsibility: 'service', elapsed_ms: 32000 }],
    post: { check_uncertainty: 'not_diagnosis', check_wait: '7', check_policy: 'assigned' }
  };
}

function allocation(value = payload()) {
  const { submission_id, study_version, consent_version, mode, consent, assignment } = value;
  return { event: 'allocation', submission_id, study_version, consent_version, mode, consent, assignment };
}

function request(value = payload(), overrides = {}) {
  const fields = { payload: JSON.stringify(value), nonce, return_origin: origin, ...overrides };
  const contents = new URLSearchParams(fields).toString();
  return { contentLength: contents.length, parameter: fields,
    parameters: Object.fromEntries(Object.entries(fields).map(([key, val]) => [key, [val]])),
    postData: { type: 'application/x-www-form-urlencoded', contents, length: contents.length } };
}

function harness() {
  const state = { locked: false, releases: 0, writes: 0, flushes: 0, failFlushOnce: false, onWrite: null };
  const properties = new Map([
    ['SPREADSHEET_ID', 'test_sheet_identifier_12345'],
    ['ALLOWED_ORIGINS', JSON.stringify([origin])]
  ]);
  const sheets = new Map();
  function createSheet() {
    const sheet = {
      cells: [], maxRows: 1000,
      getLastRow() { return this.cells.length; },
      getLastColumn() { return Math.max(0, ...this.cells.map(row => row.length)); },
      getMaxRows() { return this.maxRows; },
      insertRowsAfter(_after, count) { this.maxRows += count; },
      setFrozenRows() {},
      getRange(row, col, height, width) {
        return {
          getValues() {
            return Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) =>
              sheet.cells[row - 1 + r]?.[col - 1 + c] ?? ''));
          },
          setValues(values) {
            assert.equal(values.length, height);
            for (let r = 0; r < height; r++) {
              assert.equal(values[r].length, width);
              const target = sheet.cells[row - 1 + r] ??= [];
              for (let c = 0; c < width; c++) target[col - 1 + c] = values[r][c];
            }
            state.writes++;
            state.onWrite?.();
          }
        };
      }
    };
    return sheet;
  }
  const book = {
    getSheetByName: name => sheets.get(name),
    insertSheet(name) { const sheet = createSheet(); sheets.set(name, sheet); return sheet; }
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties.get(key) ?? null,
      setProperty: (key, val) => properties.set(key, val)
    }) },
    LockService: { getScriptLock: () => ({
      tryLock() { if (state.locked) return false; state.locked = true; return true; },
      releaseLock() { assert.equal(state.locked, true); state.locked = false; state.releases++; }
    }) },
    SpreadsheetApp: { openById: () => book, flush() {
      state.flushes++;
      if (state.failFlushOnce) { state.failFlushOnce = false; throw new Error('simulated quota error'); }
    } },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (_algorithm, value) => [...createHash('sha256').update(value).digest()]
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createHtmlOutput: html => ({ html, setXFrameOptionsMode(mode) { this.frameMode = mode; return this; } })
    },
    ContentService: {
      MimeType: { TEXT: 'text/plain' },
      createTextOutput: text => ({ text, setMimeType() { return this; } })
    }
  });
  vm.runInContext(source, context);
  context.setup();
  return { context, state, properties, sheets, sheet: sheets.get('Responses'),
    enable() { properties.set('LIVE_ENABLED', 'true'); },
    enroll(value = payload()) {
      properties.set('LIVE_ENABLED', 'true');
      context.persist_(allocation(value), context.config_());
    } };
}

function ack(result) {
  const match = result.html.match(/window\.top\.postMessage\((\{.*?\}),"https:\/\/example\.github\.io"\);/);
  assert.ok(match, 'returns an acknowledgement to the allowlisted origin');
  return JSON.parse(match[1]);
}

test('setup creates exact headers and keeps collection closed; repeated setup preserves data', () => {
  const h = harness();
  assert.equal(h.properties.get('LIVE_ENABLED'), 'false');
  assert.equal(h.sheet.cells[0].join(','), [...h.context.HEADERS].join(','));
  h.enroll();
  h.context.persist_(payload(), h.context.config_());
  h.context.setup();
  assert.equal(h.sheet.cells.length, 2);
  assert.equal(h.properties.get('LIVE_ENABLED'), 'true');
});

test('collection gate rejects new allocations until deliberately enabled', () => {
  const h = harness();
  const message = ack(h.context.doPost(request(allocation())));
  assert.equal(message.ok, false);
  assert.equal(message.code, 'COLLECTION_CLOSED');
  assert.equal(h.sheet.cells.length, 1);
});

test('closed collection confirms existing events without permitting new rows or overwrites', () => {
  const h = harness(); h.enroll();
  assert.equal(ack(h.context.doPost(request())).status, 'saved');
  h.properties.set('LIVE_ENABLED', 'false');
  const writesBefore = h.state.writes;
  assert.equal(ack(h.context.doPost(request(allocation()))).status, 'duplicate');
  assert.equal(ack(h.context.doPost(request())).status, 'duplicate');
  const changed = payload(); changed.trials[0].ability = 69;
  assert.equal(ack(h.context.doPost(request(changed))).code, 'CONFLICT');
  const another = payload(); another.submission_id = '77777777-7777-4777-8777-777777777777';
  assert.equal(ack(h.context.doPost(request(allocation(another)))).code, 'COLLECTION_CLOSED');
  assert.equal(ack(h.context.doPost(request(another))).code, 'ALLOCATION_REQUIRED');
  assert.equal(h.state.writes, writesBefore);
  assert.equal(h.sheet.cells.length, 2);
  assert.equal(h.sheets.get('Allocations').cells.length, 2);
});

test('closed enrollment still accepts the final response of an existing allocation', () => {
  const h = harness(); h.enroll();
  h.properties.set('LIVE_ENABLED', 'false');
  assert.equal(ack(h.context.doPost(request(allocation()))).status, 'duplicate');
  assert.equal(ack(h.context.doPost(request())).status, 'saved');
  assert.equal(h.sheet.cells.length, 2);
});

test('896 allocations close enrollment without losing any reserved final response', () => {
  const h = harness(); h.enable();
  h.properties.set('MAX_ROWS', '896');
  const cases = Array.from({ length: 896 }, (_, index) => {
    const p = payload();
    p.submission_id = `${(index + 1).toString(16).padStart(8, '0')}-2222-4222-8222-222222222222`;
    return p;
  });
  for (const p of cases) assert.equal(h.context.persist_(allocation(p), h.context.config_()).status, 'saved');
  assert.equal(ack(h.context.doPost(request(allocation()))).code, 'CAPACITY_REACHED');
  h.properties.set('LIVE_ENABLED', 'false');
  // A late administrator adjustment must not discard already accepted sessions.
  h.properties.set('MAX_ROWS', '1');
  for (const p of cases) assert.equal(h.context.persist_(p, h.context.config_()).status, 'saved');
  assert.equal(h.sheets.get('Allocations').cells.length, 897);
  assert.equal(h.sheet.cells.length, 897);
  assert.equal(h.context.persist_(cases[895], h.context.config_()).status, 'duplicate');
});

test('allocation is recorded before exposure and can remain without a final response', () => {
  const h = harness(); h.enable();
  const first = ack(h.context.doPost(request(allocation())));
  assert.equal(first.event, 'allocation');
  assert.equal(first.status, 'saved');
  assert.equal(h.sheets.get('Allocations').cells.length, 2);
  assert.equal(h.sheet.cells.length, 1);
  const second = ack(h.context.doPost(request(allocation())));
  assert.equal(second.status, 'duplicate');
  assert.equal(h.sheets.get('Allocations').cells.length, 2);
  const changed = allocation(); changed.assignment = 'P0-D0-B0';
  assert.equal(ack(h.context.doPost(request(changed))).code, 'CONFLICT');
});

test('response requires a prior allocation with the same assignment', () => {
  const h = harness(); h.enable();
  assert.equal(ack(h.context.doPost(request())).code, 'ALLOCATION_REQUIRED');
  h.context.doPost(request(allocation()));
  const changed = payload(); changed.assignment = 'P0-D0-B1';
  Object.assign(changed.trials[0], { scenario_id: changed.assignment, policy: 0 });
  assert.equal(ack(h.context.doPost(request(changed))).code, 'ALLOCATION_MISMATCH');
  assert.equal(h.sheet.cells.length, 1);
  assert.equal(ack(h.context.doPost(request())).ok, true);
});

test('allocation schema rejects missing consent, extra data and unknown event', () => {
  const h = harness(); h.enable();
  for (const mutation of [
    x => { x.consent = false; }, x => { x.mode = 'demo'; },
    x => { x.event = 'response'; }, x => { x.email = 'someone@example.org'; },
    x => { delete x.assignment; }, x => { x.assignment = 'P2-D0-B0'; }
  ]) {
    const value = allocation(); mutation(value);
    assert.equal(ack(h.context.doPost(request(value))).ok, false);
  }
  assert.equal(h.sheets.get('Allocations').cells.length, 1);
  assert.equal(h.sheet.cells.length, 1);
});

test('saves one complete session with hash and ACK only after flush', () => {
  const h = harness(); h.enroll();
  const before = h.state.flushes;
  const result = h.context.doPost(request());
  assert.deepEqual(ack(result), { type: 'mamografia:submission', ok: true,
    submissionId, nonce, status: 'saved', event: 'response' });
  assert.equal(result.frameMode, 'ALLOWALL');
  assert.equal(h.state.flushes, before + 1);
  assert.equal(h.sheet.cells.length, 2);
  assert.equal(h.sheet.cells[1][6], 1);
  assert.equal(h.sheet.cells[1][5], 'P1-D0-B1');
  assert.equal(h.sheet.cells[1][15].length, 64);
  assert.equal(JSON.parse(h.sheet.cells[1][13])[0].ability, 70);
  assert.deepEqual(h.sheet.cells[1].slice(10, 13), ['other', 'university', 'rural']);
  assert.equal(h.state.locked, false);
});

test('retry with a fresh nonce is idempotent; altered payload cannot overwrite', () => {
  const h = harness(); h.enroll();
  h.context.doPost(request());
  const freshNonce = '55555555-5555-4555-8555-555555555555';
  const duplicate = ack(h.context.doPost(request(payload(), { nonce: freshNonce })));
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.nonce, freshNonce);
  const changed = payload(); changed.trials[0].ability = 69;
  assert.equal(ack(h.context.doPost(request(changed))).code, 'CONFLICT');
  assert.equal(h.sheet.cells.length, 2);
  assert.equal(JSON.parse(h.sheet.cells[1][13])[0].ability, 70);
});

test('deduplication canonicalizes object key order', () => {
  const h = harness(); h.enroll();
  h.context.doPost(request());
  const reordered = Object.fromEntries(Object.entries(payload()).reverse());
  assert.equal(ack(h.context.doPost(request(reordered))).status, 'duplicate');
});

test('lock serializes overlapping writes; the waiting attempt can retry without duplication', () => {
  const h = harness(); h.enroll();
  let concurrent;
  h.state.onWrite = () => {
    h.state.onWrite = null;
    concurrent = ack(h.context.doPost(request()));
  };
  assert.equal(ack(h.context.doPost(request())).status, 'saved');
  assert.equal(concurrent.code, 'BUSY');
  assert.equal(ack(h.context.doPost(request())).status, 'duplicate');
  assert.equal(h.sheet.cells.length, 2);
  assert.equal(h.state.locked, false);
});

test('ambiguous failure after write never announces success; retry reconciles saved data', () => {
  const h = harness(); h.enroll(); h.state.failFlushOnce = true;
  const first = ack(h.context.doPost(request()));
  assert.equal(first.ok, false);
  assert.equal(first.code, 'SERVER_ERROR');
  assert.equal(h.state.locked, false);
  assert.equal(ack(h.context.doPost(request())).status, 'duplicate');
  assert.equal(h.sheet.cells.length, 2);
});

test('row limit rejects new sessions but still acknowledges existing ones', () => {
  const h = harness(); h.enroll(); h.properties.set('MAX_ROWS', '1');
  h.context.doPost(request());
  const another = payload(); another.submission_id = '66666666-6666-4666-8666-666666666666';
  assert.equal(ack(h.context.doPost(request(allocation(another)))).code, 'CAPACITY_REACHED');
  assert.equal(ack(h.context.doPost(request())).status, 'duplicate');
  assert.equal(h.sheet.cells.length, 2);
});

test('mismatched headers are rejected and never overwritten', () => {
  const h = harness(); h.enroll();
  h.sheet.cells[0][0] = 'renamed';
  assert.throws(() => h.context.setup(), /SCHEMA_MISMATCH/);
  assert.equal(ack(h.context.doPost(request())).code, 'SCHEMA_MISMATCH');
  assert.equal(h.sheet.cells[0][0], 'renamed');
  assert.equal(h.sheet.cells.length, 1);
  assert.equal(h.state.locked, false);
});

test('corrupt duplicate identifiers are detected without adding another row', () => {
  const h = harness(); h.enroll();
  h.context.doPost(request());
  h.sheet.cells.push([...h.sheet.cells[1]]);
  assert.equal(ack(h.context.doPost(request())).code, 'INTEGRITY_ERROR');
  assert.equal(h.sheet.cells.length, 3);
});

test('all eight legal assignments pass validation', () => {
  const h = harness();
  for (const policy of [0, 1]) for (const delay of [0, 1]) for (const barrier of [0, 1]) {
    const value = payload();
    value.assignment = `P${policy}-D${delay}-B${barrier}`;
    Object.assign(value.trials[0], { policy, delay, barrier, scenario_id: value.assignment });
    assert.equal(h.context.validatePayload_(value), value);
  }
});

test('incorrect comprehension answers are recorded, not treated as invalid submissions', () => {
  const h = harness(); h.enroll();
  const value = payload();
  value.post = { check_uncertainty: 'cancer', check_wait: '28', check_policy: 'self' };
  assert.equal(ack(h.context.doPost(request(value))).ok, true);
  assert.equal(JSON.parse(h.sheet.cells[1][14]).check_uncertainty, 'cancer');
});

test('strict schema rejects consent, identity, assignment, range and duration violations', () => {
  const h = harness();
  const mutations = [
    x => { x.consent = false; }, x => { x.consent = 'true'; },
    x => { x.mode = 'demo'; }, x => { x.study_version = '2'; },
    x => { x.consent_version = '2'; }, x => { x.email = 'name@example.org'; },
    x => { x.submission_id = 'not-a-uuid'; }, x => { x.assignment = 'P1-D2-B1'; },
    x => { x.trials = []; }, x => { x.trials.push(x.trials[0]); },
    x => { x.trials[0].policy = 0; }, x => { x.trials[0].policy = '1'; },
    x => { x.trials[0].scenario_id = 'P0-D0-B0'; },
    x => { x.trials[0].image_id = 'uploaded-scan'; },
    x => { x.trials[0].ability = -1; }, x => { x.trials[0].ability = 100.5; },
    x => { x.trials[0].intention = 101; }, x => { x.trials[0].fairness = 0; },
    x => { x.trials[0].trust = 8; }, x => { x.trials[0].elapsed_ms = 0; },
    x => { x.trials[0].elapsed_ms = x.elapsed_ms + 1; }, x => { x.elapsed_ms = 999; },
    x => { x.elapsed_ms = 7200001; }, x => { x.age_band = '17'; },
    x => { x.healthcare_experience = null; }, x => { x.trials[0].note = '=IMPORTRANGE(...)'; },
    x => { delete x.gender; }, x => { x.gender = 'free text'; },
    x => { x.education = 'school name'; }, x => { x.residence = 'Madrid'; },
    x => { delete x.trials[0].responsibility; }, x => { x.post.check_wait = 7; },
    x => { x.post.check_uncertainty = '=HYPERLINK(...)'; }
  ];
  for (const mutate of mutations) {
    const value = payload(); mutate(value);
    assert.throws(() => h.context.validatePayload_(value), undefined, mutate.toString());
  }
});

test('all demographics are required with controlled categories and no opt-out placeholder', () => {
  const h = harness();
  for (const key of ['age_band', 'healthcare_experience', 'gender', 'education', 'residence']) {
    for (const value of [undefined, '', null, 'prefer_not']) {
      const p = payload();
      if (value === undefined) delete p[key]; else p[key] = value;
      assert.throws(() => h.context.validatePayload_(p), undefined, `${key}: ${value}`);
    }
  }
  const p = payload(); p.gender = 'other';
  assert.equal(h.context.validatePayload_(p), p);
});

test('unallowlisted origins, duplicate form fields and oversize requests are never acknowledged', () => {
  const h = harness(); h.enroll();
  const wrongOrigin = request(payload(), { return_origin: 'https://attacker.example' });
  const duplicate = request(); duplicate.parameters.payload.push('{}');
  const oversized = request(); oversized.contentLength = 50000;
  const noNonce = request(payload(), { nonce: 'not-uuid' });
  const jsonBody = request(); jsonBody.postData.type = 'application/json';
  for (const event of [wrongOrigin, duplicate, oversized, noNonce, jsonBody]) {
    assert.doesNotMatch(h.context.doPost(event).html, /postMessage/);
  }
  assert.equal(h.sheet.cells.length, 1);
});

test('formula defense and acknowledgement script escaping', () => {
  const h = harness();
  assert.equal(h.context.safeCell_('=1+1'), "'=1+1");
  assert.equal(h.context.safeCell_('\t@SUM(1)'), "'\t@SUM(1)");
  assert.equal(h.context.safeCell_('P1-D0-B1'), 'P1-D0-B1');
  const html = h.context.ack_({ probe: '</script><script>alert(1)</script>' }, origin).html;
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /\\u003c/);
});

test('GET returns no submitted records or spreadsheet configuration', () => {
  const h = harness(); h.enroll(); h.context.doPost(request());
  const result = h.context.doGet().text;
  assert.doesNotMatch(result, new RegExp(`${submissionId}|test_sheet_identifier|ALLOWED_ORIGINS`));
});
