import { CONFIG } from './config.js';
import { ALL_ARMS, scenario, randomArm, readiness, validateTrial } from './study.js';
import { sendToSheets } from './transport.js';

const app = document.querySelector('#app');
const storageKey = `mamografia:${CONFIG.studyVersion}`;
const missing = readiness(CONFIG);
const isPilot = CONFIG.mode === 'pilot' && missing.length === 0;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let state = null;
let imageLoaded = false;
let busy = false;
const previewArm = !isPilot && ALL_ARMS.includes(new URLSearchParams(location.search).get('scenario'))
  ? new URLSearchParams(location.search).get('scenario') : null;

function pilotSession() { return state?.mode === 'pilot'; }
function persist() {
  try {
    sessionStorage.setItem(`${storageKey}:${state.mode}`, JSON.stringify(state));
    const legacy = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (legacy?.id === state.id) sessionStorage.removeItem(storageKey);
  } catch { /* can continue in memory */ }
}
function clear() {
  const previous = state; state = null;
  try {
    if (previous) sessionStorage.removeItem(`${storageKey}:${previous.mode}`);
    const legacy = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (previous && legacy?.id === previous.id) sessionStorage.removeItem(storageKey);
  } catch {}
}
function paint(html) { app.innerHTML = html; app.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
function progress(n) { return `<div class="stepbar" aria-label="Paso ${n} de 4">${[1,2,3,4].map(i => `<span class="${i <= n ? 'active' : ''}"></span>`).join('')}</div>`; }
function action(id, fn) { document.getElementById(id)?.addEventListener('click', fn); }
function abort() {
  if (busy) return;
  const registered = (state?.allocated || state?.allocationAttempted) && pilotSession();
  clear();
  paint(`<h1>Has salido del cuestionario.</h1><p class="lead">Las respuestas que no has enviado se han borrado de esta pestaña.</p>${registered ? `<p>Puede haberse registrado tu asignación aleatoria para contabilizar cuestionarios no completados, tal como se explicó al comenzar. No incluye datos identificativos.</p><p><a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a></p>` : ''}<a class="button secondary" href="./">Volver al inicio</a>`);
}
function option(name, value, text, required = true) { return `<label class="option"><input type="radio" name="${name}" value="${value}" ${required ? 'required' : ''}><span>${text}</span></label>`; }
function likert(name, title, low, high) { return `<fieldset class="question"><legend>${title}</legend><div class="scale">${Array.from({length:7},(_,i)=>`<label><input type="radio" name="${name}" value="${i+1}" required><span>${i+1}</span></label>`).join('')}</div><div class="scale-ends"><span>1 · ${low}</span><span>7 · ${high}</span></div></fieldset>`; }
function percent(name, title) { return `<fieldset class="question"><legend>${title}</legend><p>Escribe un número entre 0 (nada probable) y 100 (completamente probable).</p><div class="number-row"><label><span class="sr-label">Tu respuesta: </span><input type="number" name="${name}" min="0" max="100" step="1" inputmode="numeric" required aria-label="${esc(title)}"> / 100</label><div class="range-preview" aria-hidden="true"><span id="bar-${name}"></span></div></div></fieldset>`; }

function welcome() {
  paint(`<div class="welcome-grid"><section><p class="eyebrow">Un escenario · Tu perspectiva</p><h1>Una mamografía.<br>El siguiente paso.</h1><p class="lead">Lee una situación ficticia sobre el seguimiento de una mamografía y responde cómo valorarías esa situación.</p><div class="flow-line"><span>Información</span>→<span>Escenario</span>→<span>Tu valoración</span></div><p>No necesitas conocimientos médicos. No te pediremos que interpretes una imagen ni que compartas información sobre tu salud.</p><div class="actions"><button id="begin" class="button">${isPilot ? 'Leer la información del estudio' : 'Explorar la demo'} <span aria-hidden="true">→</span></button></div>${!isPilot ? '<p class="technical">Modo de revisión: esta versión no recoge participantes ni envía datos.</p>' : ''}</section><aside class="info-panel"><p class="eyebrow">Antes de empezar</p><div class="fact"><strong>4–6 min</strong><span>Duración estimada</span></div><div class="fact"><strong>18+</strong><span>Personas adultas</span></div><div class="fact"><strong>Ficticio</strong><span>Sin resultados médicos reales</span></div><p class="technical" style="margin-top:20px">Puedes dejar el cuestionario antes de enviar las respuestas.</p></aside></div>${!isPilot ? demoSelector() : ''}`);
  action('begin', consent);
  bindDemoSelect();
}
function demoSelector() { return `<div class="demo-tools"><details><summary>Revisar las ocho versiones del escenario</summary><p class="technical">Esta herramienta solo está disponible en la demo. Cada participante del estudio verá una única versión asignada al azar.</p><label for="arm-select">Versión</label><br><select id="arm-select">${ALL_ARMS.map(id => { const s=scenario(id);return `<option value="${id}" ${id===previewArm?'selected':''}>${id} · ${s.policy?'Cita asignada':'Solicitar cita'} · ${s.days} días · Barreras ${s.barrier?'altas':'bajas'}</option>`; }).join('')}</select><button id="preview" class="button secondary">Ver esta versión</button></details></div>`; }
function bindDemoSelect() { action('preview', () => { location.href = `./?scenario=${document.querySelector('#arm-select').value}`; }); }
function consent() {
  paint(`${progress(1)}<p class="eyebrow">Información y consentimiento</p><h2>Participar desde una situación imaginada</h2><div class="consent-copy"><p>En este estudio leerás una situación sobre una mujer de 52 años a la que se solicita una evaluación complementaria después de una mamografía. Contestarás desde esa perspectiva, aunque no coincida con tu situación personal.</p><ul><li>Todos los datos del caso son ficticios. No debes interpretar la imagen ni tomar decisiones sobre tu salud a partir de ella.</li><li>El tema puede resultar incómodo. Puedes salir antes de enviar tus respuestas, sin necesidad de explicar el motivo.</li><li>No solicitamos nombre, correo electrónico, historia clínica ni respuestas de texto libre. Las preguntas demográficas utilizan categorías amplias y son obligatorias para completar el cuestionario; puedes salir antes de enviarlo.</li><li>${isPilot ? 'Tras aceptar, se registra un código aleatorio y la versión que recibirás. Esto permite contabilizar cuestionarios no completados. Las valoraciones se guardan solo cuando pulses «Enviar respuestas».' : 'En esta demo no se envía nada. La pestaña conserva temporalmente tus avances para permitir que revises el recorrido.'}</li></ul>${isPilot ? `<p><strong>Responsable:</strong> ${esc(CONFIG.researcher)}, ${esc(CONFIG.institution)}. <a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>.</p><p><strong>Conservación:</strong> ${esc(CONFIG.retention)}.</p><p>${esc(CONFIG.ethicsStatement)}</p><p>Las respuestas del estudio no incluyen identificadores personales. <a href="${esc(CONFIG.privacyUrl)}" target="_blank" rel="noopener noreferrer">Información completa de privacidad</a>. Puedes contactar con el investigador si tienes preguntas sobre tu participación.</p>` : '<div class="notice">Prototipo para revisar. Contacto: <a href="mailto:amastobiza@ugr.es">Aníbal Astobiza · amastobiza@ugr.es</a>. El estímulo visual y las condiciones definitivas del estudio están en preparación.</div>'}<form id="consent-form"><label class="check-row"><input type="checkbox" name="adult" required><span>Confirmo que tengo 18 años o más.</span></label><label class="check-row"><input type="checkbox" name="consent" required><span>He leído la información y acepto ${isPilot ? 'participar voluntariamente, incluido el registro de mi asignación después de este consentimiento' : 'continuar en esta demostración local'}.</span></label><div id="consent-error" role="alert"></div><div class="actions"><button class="button" type="submit">Continuar al escenario →</button><button id="exit" class="text-button" type="button">Salir</button></div></form></div>`);
  action('exit', abort);
  document.querySelector('#consent-form').addEventListener('submit', async e => {
    e.preventDefault(); if (busy) return;
    if (!state) state = { id: crypto.randomUUID(), arm: previewArm || randomArm(), consentedAt: Date.now(), stage: 'allocation', mode: isPilot ? 'pilot' : 'demo', allocated: false, receiverEndpoint: isPilot ? CONFIG.endpoint : '' };
    persist(); await allocate();
  });
}
async function allocate() {
  if (!isPilot) { state.allocated = false; state.stage = 'scenario'; persist(); showScenario(); return; }
  state.allocationAttempted = true; persist();
  busy = true;
  paint(`${progress(1)}<h2>Preparando tu escenario…</h2><p>Esperamos la confirmación del registro de tu asignación.</p>`);
  try {
    const allocation = { event: 'allocation', submission_id: state.id, study_version: CONFIG.studyVersion, consent_version: CONFIG.consentVersion, mode: 'pilot', consent: true, assignment: state.arm };
    await sendToSheets(allocation, CONFIG.endpoint);
    state.allocated = true; state.stage = 'scenario'; persist(); busy=false; showScenario();
  } catch {
    busy=false;
    paint(`<h2>No se ha confirmado la conexión.</h2><p>El registro podría haberse recibido, pero no tenemos confirmación. Aún no has visto el escenario. Puedes reintentar sin crear otra asignación.</p><div class="actions"><button id="retry-allocation" class="button">Reintentar</button><button id="exit" class="text-button">Salir</button></div>`);
    action('retry-allocation', allocate); action('exit', abort);
  }
}
function stimulus() {
  return CONFIG.imagePath ? `<img id="stimulus" class="case-image" src="${esc(CONFIG.imagePath)}" alt="Imagen de mamografía completamente ficticia usada como contexto; no se debe interpretar."><p class="image-caption">Imagen ficticia. No contiene información clínica validada y es igual en las ocho condiciones.</p>` : `<div class="visual-slot"><svg viewBox="0 0 44 44" aria-hidden="true"><rect x="8" y="4" width="28" height="36" rx="2"/><path d="M14 15h16M14 22h16M14 29h10"/></svg><p>Estímulo visual pendiente</p><small>La demo permite revisar el texto. Aún no incluye una mamografía sintética.</small></div><p class="image-caption">No se ha creado ni validado una imagen clínica para esta versión.</p>`;
}
function showScenario() {
  const s=scenario(state.arm);
  if (!state.scenarioStartedAt) state.scenarioStartedAt=Date.now();
  state.stage='scenario'; persist(); imageLoaded=!CONFIG.imagePath;
  paint(`${progress(2)}<p class="eyebrow">Una situación ficticia</p><h2>El centro solicita una evaluación complementaria</h2><div class="scenario-grid"><section class="case-card"><p>${s.common}</p><div class="detail"><span class="tag">Cómo se gestiona</span><p>${s.policyText}</p></div><div class="detail"><span class="tag">Cuándo</span><p>${s.delayText}</p></div><div class="detail"><span class="tag">Tu situación en este caso</span><p>${s.barrierText}</p></div><p class="fixed-note">Estos detalles pertenecen al escenario imaginado. El plazo descrito no es una recomendación médica. No necesitas decidir si hay cáncer.</p></section><aside>${stimulus()}<div class="aside-note"><div class="day-number">${s.days}<small> días</small></div>Hasta la primera cita disponible en esta situación.</div></aside></div><div id="image-error" role="alert"></div><div class="actions"><button id="rate" class="button">Responder sobre esta situación →</button><button id="exit" class="text-button">Salir</button></div>`);
  const img=document.querySelector('#stimulus');
  if(img){
    if(isPilot) document.querySelector('#rate').disabled=true;
    const loaded=()=>{imageLoaded=true;document.querySelector('#rate').disabled=false;};
    img.addEventListener('load',loaded);
    img.addEventListener('error',()=>{ imageLoaded=false;document.querySelector('#image-error').innerHTML='<div class="error">No se ha podido cargar el estímulo visual. Recarga la página para volver a intentarlo. La participación no avanzará sin el material.</div>'; if(isPilot) document.querySelector('#rate').disabled=true;});
    if(img.complete && img.naturalWidth>0) loaded();
  }
  action('rate',()=>{ if(!isPilot || imageLoaded) questions(); }); action('exit',abort);
}
function questions() {
  const s=scenario(state.arm);
  paint(`${progress(3)}<p class="eyebrow">Tu valoración</p><h2>Contesta desde la perspectiva de la persona del caso</h2><div class="summary"><span>${s.policy?'Cita asignada por el centro':'Debes solicitar la cita'}</span><span>Primera cita: ${s.days} días</span></div><details><summary>Volver a leer el escenario</summary><p>${s.common}</p><p>${s.policyText}</p><p>${s.delayText}</p><p>${s.barrierText}</p></details><form id="questions-form">${percent('ability','En esta situación, ¿qué probabilidad crees que tendrías de poder acudir a la evaluación complementaria en la primera fecha disponible?')}${percent('intention','En esta situación, ¿qué probabilidad crees que tendrías de intentar completar la evaluación complementaria?')}${likert('fairness','¿Hasta qué punto te parece justa esta forma de organizar el seguimiento?','Nada justa','Muy justa')}${likert('trust','¿Cuánta confianza te inspira que el centro se encargue de tu seguimiento?','Ninguna','Mucha')}<fieldset class="question"><legend>¿Quién debería encargarse principalmente de que la evaluación complementaria llegue a realizarse?</legend>${option('responsibility','service','El servicio de salud')}${option('responsibility','shared','El servicio y la paciente, de forma compartida')}${option('responsibility','patient','La paciente')}</fieldset><div class="actions"><button class="button" type="submit">Continuar →</button><button id="exit" class="text-button" type="button">Salir</button></div></form>`);
  for(const key of ['ability','intention']) document.querySelector(`[name="${key}"]`).addEventListener('input', e=>{document.querySelector(`#bar-${key}`).style.width=`${Math.max(0,Math.min(100,Number(e.target.value)))}%`;});
  const form=document.querySelector('#questions-form');
  if(state.trial){for(const [key,value] of Object.entries(state.trial)){const input=form.querySelector(`[name="${key}"]`);if(input?.type==='number')input.value=value;else form.querySelector(`[name="${key}"][value="${value}"]`)?.click();}}
  form.addEventListener('submit',e=>{
    e.preventDefault(); const d=new FormData(form);
    const trial={scenario_id:state.arm,image_id:'mammogram-01',policy:s.policy,delay:s.delay,barrier:s.barrier,ability:Number(d.get('ability')),intention:Number(d.get('intention')),fairness:Number(d.get('fairness')),trust:Number(d.get('trust')),responsibility:d.get('responsibility'),elapsed_ms:Date.now()-state.scenarioStartedAt};
    if(!validateTrial(trial,state.arm)){ alert('Comprueba las respuestas. Si han pasado más de dos horas, inicia una nueva revisión.');return; }
    state.trial=trial;state.stage='post';persist();postQuestions();
  });
  action('exit',abort);
}
function postQuestions() {
  paint(`${progress(4)}<p class="eyebrow">Últimas preguntas</p><h2>Sobre lo que has leído</h2><p>Estas preguntas nos ayudan a interpretar el cuestionario. Al final se solicitan datos demográficos en categorías amplias. Todas las respuestas son obligatorias para completar el envío.</p><form id="post-form"><fieldset class="question"><legend>¿Qué significa la incertidumbre de la IA en este caso?</legend>${option('check_uncertainty','not_diagnosis','Por sí sola, no indica si hay cáncer')}${option('check_uncertainty','cancer','Confirma que hay cáncer')}${option('check_uncertainty','all_clear','Confirma que no hay cáncer')}${option('check_uncertainty','unsure','No lo recuerdo o no estoy seguro/a')}</fieldset><fieldset class="question"><legend>¿Cuándo era la primera cita disponible?</legend>${option('check_wait','7','Dentro de 7 días')}${option('check_wait','28','Dentro de 28 días')}${option('check_wait','unsure','No lo recuerdo')}</fieldset><fieldset class="question"><legend>¿Cómo se obtenía la cita?</legend>${option('check_policy','self','La paciente debía solicitarla')}${option('check_policy','assigned','El centro asignaba una cita')}${option('check_policy','unsure','No lo recuerdo')}</fieldset><fieldset class="question"><legend>Tu edad</legend>${option('age_band','18-39','18–39 años')}${option('age_band','40-59','40–59 años')}${option('age_band','60+','60 años o más')}</fieldset><fieldset class="question"><legend>¿Con qué género te identificas?</legend>${option('gender','woman','Mujer')}${option('gender','man','Hombre')}${option('gender','nonbinary','No binario')}${option('gender','other','Otra identidad de género')}</fieldset><fieldset class="question"><legend>¿Cuál es tu nivel de estudios más alto completado?</legend>${option('education','primary_or_less','Educación primaria o inferior')}${option('education','secondary','Educación secundaria o bachillerato')}${option('education','vocational','Formación profesional')}${option('education','university','Estudios universitarios')}</fieldset><fieldset class="question"><legend>¿Cómo describirías tu entorno habitual de residencia?</legend>${option('residence','urban','Urbano (ciudad o área metropolitana)')}${option('residence','rural','Rural (pueblo o entorno rural)')}</fieldset><fieldset class="question"><legend>¿Tienes experiencia profesional sanitaria?</legend>${option('healthcare_experience','yes','Sí')}${option('healthcare_experience','no','No')}</fieldset><p class="technical">${isPilot?'Al enviar se guardarán tus respuestas en la hoja privada del estudio. Espera a ver la confirmación antes de cerrar.':'La demo terminará sin enviar respuestas.'}</p><div class="actions"><button class="button" type="submit">${isPilot?'Enviar respuestas':'Finalizar demo'} →</button><button id="back" class="text-button" type="button">Revisar mis valoraciones</button><button id="exit" class="text-button" type="button">Salir</button></div></form>`);
  const form=document.querySelector('#post-form');
  form.addEventListener('submit',e=>{
    e.preventDefault();const d=new FormData(form);
    state.payload={submission_id:state.id,study_version:CONFIG.studyVersion,consent_version:CONFIG.consentVersion,mode:'pilot',consent:true,assignment:state.arm,elapsed_ms:Date.now()-state.consentedAt,age_band:d.get('age_band'),healthcare_experience:d.get('healthcare_experience'),gender:d.get('gender'),education:d.get('education'),residence:d.get('residence'),trials:[state.trial],post:{check_uncertainty:d.get('check_uncertainty'),check_wait:d.get('check_wait'),check_policy:d.get('check_policy')}};
    if(state.payload.elapsed_ms>7200000){alert('Han pasado más de dos horas. Contacta con el equipo si necesitas ayuda. No se han enviado las respuestas.');return;}
    state.stage='pending';persist();submit();
  });
  action('back',questions);action('exit',abort);
}
async function submit() {
  if(busy)return;
  if(!pilotSession()){state.stage='done';persist();done();return;}
  busy=true;paint(`<h2>Guardando tus respuestas…</h2><p>Estamos esperando la confirmación del servidor.</p>`);
  try{
    const endpoint = state.receiverEndpoint || CONFIG.endpoint;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) throw new Error('RECEIVER_UNAVAILABLE');
    await sendToSheets(state.payload,endpoint);
    state.stage='done';persist();busy=false;done();
  }catch{
    busy=false;
    paint(`<h2>No tenemos confirmación del guardado.</h2><p>El envío podría haberse recibido. Mantén esta pestaña abierta y reintenta para confirmar que tus respuestas se han guardado.</p><div class="actions"><button class="button" id="retry">Reintentar el envío</button></div><p>Si necesitas ayuda, contacta con <a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>.</p>`);
    action('retry',submit);
  }
}
function done(){
  const pilot = pilotSession();
  paint(`<div class="completion-icon" aria-hidden="true">✓</div><h1>Gracias por tu participación.</h1><p class="lead">${pilot?'Tus respuestas se han guardado.':'Has completado una demo. No se ha enviado ninguna respuesta.'}</p>${!pilot?'<div class="actions"><button id="restart" class="text-button">Volver a explorar</button></div>':''}`);
  action('restart',()=>{clear();welcome();});
}

if(isPilot)document.querySelector('#mode-banner').textContent='ESTUDIO PILOTO · Participación voluntaria';
else if(CONFIG.mode==='pilot') document.querySelector('#mode-banner').textContent='PILOTO NO ACTIVADO · Configuración incompleta · No se envían respuestas';
try {
  const saved = [`${storageKey}:pilot`, `${storageKey}:demo`, storageKey].map(key => {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
  }).filter(s => s?.id && ALL_ARMS.includes(s.arm));
  // A changed configuration cannot turn an unconfirmed pilot response into a demo
  // or erase its receipt. Prefer recovery over starting another assignment.
  state = saved.find(s => s.mode === 'pilot' && ['pending','done'].includes(s.stage))
    || saved.find(s => s.mode === (isPilot ? 'pilot' : 'demo')
      && (['pending','done'].includes(s.stage) || Date.now() - s.consentedAt < 7200000)
      && (!previewArm || previewArm === s.arm)) || null;
  if (state) persist();
}catch{}
if (pilotSession() && !isPilot) document.querySelector('#mode-banner').textContent = 'RECUPERACIÓN DEL PILOTO · No se crean nuevas asignaciones';
if(state){
  if(state.stage==='done')done();
  else if(state.stage==='pending')submit();
  else if(state.stage==='post')postQuestions();
  else if(state.stage==='allocation')consent();
  else showScenario();
}else welcome();
