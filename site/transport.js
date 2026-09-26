import { validAck } from './study.js';

// A dispatched request is NOT a persisted response. Resolve only on a validated ACK.
export function sendToSheets(payload, endpoint, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const expectedEvent = payload.event === 'allocation' ? 'allocation' : 'response';
    const frame = document.createElement('iframe');
    frame.name = `receipt_${nonce}`;
    frame.title = 'Confirmación del envío';
    frame.hidden = true;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.target = frame.name;
    form.hidden = true;
    for (const [name, value] of Object.entries({ payload: JSON.stringify(payload), nonce, return_origin: location.origin })) {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = name; input.value = value; form.append(input);
    }
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      frame.remove(); form.remove();
    };
    const receive = event => {
      if (!validAck(event, payload.submission_id, nonce, expectedEvent)) return;
      cleanup();
      if (event.data.ok && ['saved', 'duplicate'].includes(event.data.status)) resolve(event.data);
      else reject(new Error(event.data.code || 'SERVER_REJECTED'));
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('NO_RECEIPT')); }, timeoutMs);
    window.addEventListener('message', receive);
    document.body.append(frame, form);
    try { form.submit(); } catch (e) { cleanup(); reject(e); }
  });
}
