export const VERSION = '1.0.0';
export const ALL_ARMS = Object.freeze(Array.from({ length: 8 }, (_, n) => `P${(n >> 2) & 1}-D${(n >> 1) & 1}-B${n & 1}`));
export function parseArm(id) {
  const m = /^P([01])-D([01])-B([01])$/.exec(id);
  if (!m) throw new Error('Asignación no válida');
  return { policy: Number(m[1]), delay: Number(m[2]), barrier: Number(m[3]) };
}
export function randomArm(cryptoApi = globalThis.crypto) {
  const byte = new Uint8Array(1);
  cryptoApi.getRandomValues(byte);
  return ALL_ARMS[byte[0] & 7]; // 256 is divisible by 8: no modulo bias.
}
export function scenario(id) {
  const factors = parseArm(id);
  return {
    id, ...factors,
    days: factors.delay ? 28 : 7,
    common: 'Imagina que eres una mujer de 52 años que ha acudido a una mamografía de cribado. La IA no puede ofrecer una conclusión fiable y deriva las imágenes al equipo de radiología. Tras una revisión inicial, el equipo considera necesaria una evaluación complementaria presencial. Todavía no hay un diagnóstico. La incertidumbre de la IA no permite saber si hay cáncer.',
    policyText: factors.policy
      ? 'El centro te asigna una cita para la evaluación complementaria. Puedes confirmarla o solicitar un cambio por teléfono, sin necesidad de utilizar internet.'
      : 'El centro te indica que solicites una cita para la evaluación complementaria. Puedes solicitarla o cambiarla por teléfono, sin necesidad de utilizar internet.',
    delayText: `La primera cita disponible es dentro de ${factors.delay ? 28 : 7} días, tanto si la asigna el centro como si la solicitas tú.`,
    barrierText: factors.barrier
      ? 'Para llegar al centro necesitas dos transbordos de autobús. Además, cuidas habitualmente a una persona dependiente y necesitarías organizar quién la atiende durante tu ausencia.'
      : 'Puedes llegar al centro con un trayecto directo y sencillo. No necesitas organizar el cuidado de otra persona durante tu ausencia.',
  };
}
export function readiness(config) {
  const missing = [];
  for (const key of ['researcher', 'contactEmail', 'privacyUrl', 'retention']) {
    if (!config[key]?.trim()) missing.push(key);
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.endpoint)) missing.push('endpoint');
  if (!/^https:\/\//.test(config.privacyUrl)) missing.push('privacyUrl_https');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail)) missing.push('contactEmail_format');
  if (!config.imageApproved || !config.imagePath) missing.push('image_review');
  if (!config.recruitmentOpen) missing.push('recruitmentOpen');
  return missing;
}
export function validateTrial(trial, assignment) {
  const a = parseArm(assignment);
  if (trial.scenario_id !== assignment || trial.image_id !== 'mammogram-01') return false;
  if (['policy', 'delay', 'barrier'].some(k => trial[k] !== a[k])) return false;
  for (const k of ['ability', 'intention']) if (!Number.isInteger(trial[k]) || trial[k] < 0 || trial[k] > 100) return false;
  for (const k of ['fairness', 'trust']) if (!Number.isInteger(trial[k]) || trial[k] < 1 || trial[k] > 7) return false;
  return ['service', 'shared', 'patient'].includes(trial.responsibility) && Number.isInteger(trial.elapsed_ms) && trial.elapsed_ms >= 1 && trial.elapsed_ms <= 7200000;
}
export function validAckOrigin(origin) {
  return origin === 'https://script.google.com' || origin === 'https://script.googleusercontent.com' || /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin);
}
export function validAck(event, id, nonce, expectedEvent) {
  const d = event.data;
  return validAckOrigin(event.origin) && d?.type === 'mamografia:submission' && d.submissionId === id && d.nonce === nonce && d.event === expectedEvent && typeof d.ok === 'boolean';
}
