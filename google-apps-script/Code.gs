/**
 * Mamografía y equidad: receptor para un piloto de viñetas ficticias.
 * Sin claves en el navegador. No sirve para historias clínicas ni diagnóstico.
 * La configuración se guarda en Script Properties. Consultar docs/GOOGLE_SHEETS.md.
 */
var STUDY_VERSION = '1.0.0';
var CONSENT_VERSION = '1.0.0';
var MAX_BODY_BYTES = 48000;
var MAX_PAYLOAD_CHARS = 24000;
var MAX_ELAPSED_MS = 7200000;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var HEADERS = [
  'received_at', 'submission_id', 'study_version', 'consent_version', 'mode',
  'assignment', 'completed_trials', 'elapsed_ms', 'age_band',
  'healthcare_experience', 'gender', 'education', 'residence', 'trials_json', 'post_json', 'payload_hash'
];
var ALLOCATION_HEADERS = ['received_at', 'submission_id', 'study_version', 'consent_version',
  'mode', 'assignment', 'payload_hash'];

function fail_(code) {
  var error = new Error(code);
  error.publicCode = code;
  throw error;
}

function isObject_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys_(object, required, optional) {
  if (!isObject_(object)) fail_('INVALID_SCHEMA');
  var allowed = required.concat(optional || []);
  if (required.some(function (key) { return !Object.prototype.hasOwnProperty.call(object, key); }) ||
      Object.keys(object).some(function (key) { return allowed.indexOf(key) < 0; })) {
    fail_('INVALID_SCHEMA');
  }
}

function member_(value, allowed) {
  if (allowed.indexOf(value) < 0) fail_('INVALID_VALUE');
}

function integer_(value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail_('INVALID_VALUE');
}

/** Strict, pure validation: all fields required, no free text or unknown fields. */
function validatePayload_(payload) {
  keys_(payload, ['submission_id', 'study_version', 'consent_version', 'mode', 'consent',
    'assignment', 'elapsed_ms', 'age_band', 'healthcare_experience', 'gender', 'education', 'residence',
    'trials', 'post'], []);
  if (typeof payload.submission_id !== 'string' || !UUID_RE.test(payload.submission_id)) fail_('INVALID_ID');
  if (payload.study_version !== STUDY_VERSION || payload.consent_version !== CONSENT_VERSION) fail_('INVALID_VERSION');
  if (payload.mode !== 'pilot') fail_('INVALID_MODE');
  if (payload.consent !== true) fail_('CONSENT_REQUIRED');
  if (typeof payload.assignment !== 'string' || !/^P[01]-D[01]-B[01]$/.test(payload.assignment)) fail_('INVALID_ASSIGNMENT');
  integer_(payload.elapsed_ms, 1000, MAX_ELAPSED_MS);
  member_(payload.age_band, ['18-39', '40-59', '60+']);
  member_(payload.healthcare_experience, ['yes', 'no']);
  member_(payload.gender, ['woman', 'man', 'nonbinary', 'other']);
  member_(payload.education, ['primary_or_less', 'secondary', 'vocational', 'university']);
  member_(payload.residence, ['urban', 'rural']);
  if (!Array.isArray(payload.trials) || payload.trials.length !== 1) fail_('INVALID_TRIAL_COUNT');
  var trial = payload.trials[0];
  keys_(trial, ['scenario_id', 'image_id', 'policy', 'delay', 'barrier', 'ability', 'intention',
    'fairness', 'trust', 'responsibility', 'elapsed_ms'], []);
  if (trial.scenario_id !== payload.assignment || trial.image_id !== 'mammogram-01') fail_('INVALID_ASSIGNMENT');
  ['policy', 'delay', 'barrier'].forEach(function (key) { integer_(trial[key], 0, 1); });
  if ('P' + trial.policy + '-D' + trial.delay + '-B' + trial.barrier !== payload.assignment) fail_('INVALID_ASSIGNMENT');
  ['ability', 'intention'].forEach(function (key) { integer_(trial[key], 0, 100); });
  ['fairness', 'trust'].forEach(function (key) { integer_(trial[key], 1, 7); });
  member_(trial.responsibility, ['service', 'shared', 'patient']);
  integer_(trial.elapsed_ms, 1, MAX_ELAPSED_MS);
  if (trial.elapsed_ms > payload.elapsed_ms) fail_('INVALID_DURATION');
  keys_(payload.post, ['check_uncertainty', 'check_wait', 'check_policy'], []);
  member_(payload.post.check_uncertainty, ['not_diagnosis', 'cancer', 'all_clear', 'unsure']);
  member_(payload.post.check_wait, ['7', '28', 'unsure']);
  member_(payload.post.check_policy, ['self', 'assigned', 'unsure']);
  // Answers to comprehension questions are retained even when incorrect.
  return payload;
}

function validateAllocation_(payload) {
  keys_(payload, ['event', 'submission_id', 'study_version', 'consent_version', 'mode', 'consent', 'assignment'], []);
  if (payload.event !== 'allocation') fail_('INVALID_SCHEMA');
  if (typeof payload.submission_id !== 'string' || !UUID_RE.test(payload.submission_id)) fail_('INVALID_ID');
  if (payload.study_version !== STUDY_VERSION || payload.consent_version !== CONSENT_VERSION) fail_('INVALID_VERSION');
  if (payload.mode !== 'pilot') fail_('INVALID_MODE');
  if (payload.consent !== true) fail_('CONSENT_REQUIRED');
  if (typeof payload.assignment !== 'string' || !/^P[01]-D[01]-B[01]$/.test(payload.assignment)) fail_('INVALID_ASSIGNMENT');
  return payload;
}

function canonical_(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical_).join(',') + ']';
  if (isObject_(value)) {
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + canonical_(value[key]);
    }).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

// Every value is schema-restricted; this is defense in depth against formula cells.
function safeCell_(value) {
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(value)) return "'" + value;
  return value;
}

function config_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId || !/^[A-Za-z0-9_-]{15,120}$/.test(spreadsheetId)) fail_('NOT_CONFIGURED');
  var origins;
  try { origins = JSON.parse(props.getProperty('ALLOWED_ORIGINS') || '[]'); }
  catch (error) { fail_('NOT_CONFIGURED'); }
  if (!Array.isArray(origins) || !origins.length || origins.some(function (origin) {
    return typeof origin !== 'string' || !/^(https:\/\/[a-z0-9.-]+(?::\d{1,5})?|http:\/\/(localhost|127\.0\.0\.1)(?::\d{1,5})?)$/.test(origin);
  })) fail_('NOT_CONFIGURED');
  var maxRows = Number(props.getProperty('MAX_ROWS') || '896');
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 50000) fail_('NOT_CONFIGURED');
  return {
    spreadsheetId: spreadsheetId,
    origins: origins,
    liveEnabled: props.getProperty('LIVE_ENABLED') === 'true',
    maxRows: maxRows,
    pilotSheet: 'Responses',
    allocationSheet: 'Allocations'
  };
}

/** Run manually from the editor. It never enables pilot collection. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('LIVE_ENABLED') === null) props.setProperty('LIVE_ENABLED', 'false');
  if (props.getProperty('MAX_ROWS') === null) props.setProperty('MAX_ROWS', '896');
  var cfg = config_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) fail_('BUSY');
  try {
    var book = SpreadsheetApp.openById(cfg.spreadsheetId);
    [[cfg.pilotSheet, HEADERS], [cfg.allocationSheet, ALLOCATION_HEADERS]].forEach(function (spec) {
      var name = spec[0];
      var headers = spec[1];
      var sheet = book.getSheetByName(name) || book.insertSheet(name);
      if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      }
      assertHeaders_(sheet, headers);
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function assertHeaders_(sheet, headers) {
  headers = headers || HEADERS;
  if (!sheet || sheet.getLastColumn() !== headers.length || sheet.getLastRow() < 1) fail_('SCHEMA_MISMATCH');
  var actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (headers.some(function (header, index) { return header !== actual[index]; })) fail_('SCHEMA_MISMATCH');
}

function readEnvelope_(event, cfg) {
  if (!event || !event.postData || event.contentLength > MAX_BODY_BYTES ||
      event.postData.length > MAX_BODY_BYTES || event.postData.contents.length > MAX_BODY_BYTES) fail_('INVALID_REQUEST');
  if (!/^application\/x-www-form-urlencoded(?:;|$)/.test(event.postData.type || '')) fail_('INVALID_REQUEST');
  keys_(event.parameter, ['payload', 'nonce', 'return_origin'], []);
  if (Object.keys(event.parameters || {}).some(function (key) {
    return event.parameters[key].length !== 1;
  })) fail_('INVALID_REQUEST');
  var fields = event.parameter;
  if (!UUID_RE.test(fields.nonce) || cfg.origins.indexOf(fields.return_origin) < 0 ||
      typeof fields.payload !== 'string' || fields.payload.length > MAX_PAYLOAD_CHARS) fail_('INVALID_REQUEST');
  var payload;
  try { payload = JSON.parse(fields.payload); }
  catch (error) { fail_('INVALID_REQUEST'); }
  return { payload: payload, nonce: fields.nonce, origin: fields.return_origin };
}

function findSubmission_(sheet, id, width) {
  var last = sheet.getLastRow();
  var matches = [];
  if (last > 1) {
    sheet.getRange(2, 2, last - 1, 1).getValues().forEach(function (row, index) {
      if (row[0] === id) matches.push(index + 2);
    });
  }
  if (matches.length > 1) fail_('INTEGRITY_ERROR');
  return matches.length ? sheet.getRange(matches[0], 1, 1, width).getValues()[0] : null;
}

function assertAllocation_(payload, allocation) {
  if (!allocation) fail_('ALLOCATION_REQUIRED');
  if (allocation[2] !== payload.study_version || allocation[3] !== payload.consent_version ||
      allocation[4] !== payload.mode || allocation[5] !== payload.assignment) fail_('ALLOCATION_MISMATCH');
}

function persist_(payload, cfg) {
  var eventType = payload && payload.event === 'allocation' ? 'allocation' : 'response';
  if (eventType === 'allocation') validateAllocation_(payload);
  else validatePayload_(payload);
  var hash = sha256_(canonical_(payload));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) fail_('BUSY');
  try {
    var book = SpreadsheetApp.openById(cfg.spreadsheetId);
    var allocationSheet = book.getSheetByName(cfg.allocationSheet);
    assertHeaders_(allocationSheet, ALLOCATION_HEADERS);
    var allocation = eventType === 'response'
      ? findSubmission_(allocationSheet, payload.submission_id, ALLOCATION_HEADERS.length) : null;
    var sheet = eventType === 'allocation' ? allocationSheet : book.getSheetByName(cfg.pilotSheet);
    var headers = eventType === 'allocation' ? ALLOCATION_HEADERS : HEADERS;
    assertHeaders_(sheet, headers);
    var existing = findSubmission_(sheet, payload.submission_id, headers.length);
    if (existing) {
      if (existing[headers.length - 1] !== hash) fail_('CONFLICT');
      if (eventType === 'response') assertAllocation_(payload, allocation);
      // Closing recruitment must not prevent reconciliation of a lost receipt.
      return { status: 'duplicate', event: eventType };
    }
    if (eventType === 'allocation' && !cfg.liveEnabled) fail_('COLLECTION_CLOSED');
    if (eventType === 'response') assertAllocation_(payload, allocation);
    var last = sheet.getLastRow();
    // The enrollment limit applies only to allocations. Each accepted allocation
    // reserves one final response, including after closure or a lowered limit.
    if (eventType === 'allocation' && last - 1 >= cfg.maxRows) fail_('CAPACITY_REACHED');
    var row = eventType === 'allocation' ? allocationRow_(payload, hash) : row_(payload, hash);
    if (last + 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    // One session, one range write. No separate trial writes that could be partial.
    sheet.getRange(last + 1, 1, 1, headers.length).setValues([row]);
    SpreadsheetApp.flush();
    var persisted = sheet.getRange(last + 1, 2, 1, headers.length - 1).getValues()[0];
    if (persisted[0] !== payload.submission_id || persisted[persisted.length - 1] !== hash) fail_('WRITE_UNCONFIRMED');
    return { status: 'saved', event: eventType };
  } finally {
    lock.releaseLock();
  }
}

function allocationRow_(payload, hash) {
  return [new Date().toISOString(), payload.submission_id, payload.study_version,
    payload.consent_version, payload.mode, payload.assignment, hash].map(safeCell_);
}

function row_(payload, hash) {
  return [
    new Date().toISOString(), payload.submission_id, payload.study_version,
    payload.consent_version, payload.mode, payload.assignment,
    payload.trials.length, payload.elapsed_ms, payload.age_band || '',
    payload.healthcare_experience || '', payload.gender, payload.education, payload.residence,
    canonical_(payload.trials),
    canonical_(payload.post), hash
  ].map(safeCell_);
}

function ack_(message, origin) {
  // Escaping '<' also prevents any supplied JSON string from closing the script.
  var json = JSON.stringify(message).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  var target = JSON.stringify(origin).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' + json + ',' + target + ');</script><p>Puede cerrar esta ventana.</p>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(event) {
  var envelope;
  try {
    var cfg = config_();
    envelope = readEnvelope_(event, cfg);
    var result = persist_(envelope.payload, cfg);
    return ack_({ type: 'mamografia:submission', ok: true, submissionId: envelope.payload.submission_id,
      nonce: envelope.nonce, status: result.status, event: result.event }, envelope.origin);
  } catch (error) {
    // Never send a postMessage to an unvalidated origin. Do not log submitted data.
    if (envelope && isObject_(envelope.payload) && UUID_RE.test(envelope.payload.submission_id)) {
      return ack_({ type: 'mamografia:submission', ok: false, submissionId: envelope.payload.submission_id,
        nonce: envelope.nonce, code: error.publicCode || 'SERVER_ERROR',
        event: envelope.payload.event === 'allocation' ? 'allocation' : 'response' }, envelope.origin);
    }
    return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><p>Solicitud no aceptada. Compruebe la configuración del estudio.</p>');
  }
}

function doGet() {
  // Deliberately does not expose data, configuration or spreadsheet identifiers.
  return ContentService.createTextOutput('Receptor del piloto de mamografía: utilice el formulario del estudio.')
    .setMimeType(ContentService.MimeType.TEXT);
}
