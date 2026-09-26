# GitHub Pages → Google Sheets: configuración de la recogida

La versión actual está preparada para participación real. El modo interno `pilot` envía una asignación después del consentimiento y una respuesta final al terminar. El modo `demo` se conserva únicamente para revisión local sin transmisión y no se ofrece como alternativa cuando la recogida real está cerrada. La hoja de cálculo permanece privada: publicar GitHub Pages no requiere compartirla con participantes.

El receptor actualizado está desplegado en la revisión 2. Un POST HTTP real de asignación y otro de respuesta recibieron `saved`; un reintento idéntico recibió `duplicate`. La lectura posterior de la hoja privada de prueba confirmó una sola fila de respuesta. Esto verifica recepción y escritura reales, sin mezclar pruebas con la cohorte. El navegador integrado bloqueó el intento con `ERR_BLOCKED_BY_CLIENT`, por lo que todavía no se observó el recorrido completo iframe → `postMessage` dentro de ese navegador. No equiparar la prueba HTTP a una prueba integral de interfaz. El estado de apertura del destino del estudio se mantiene en [VERIFICACION.md](VERIFICACION.md). No introducir registros de pacientes ni imágenes clínicas en este sistema.

## 1. Preparar la hoja y el proyecto

1. Crear una Google Sheet privada dedicada al estudio, o utilizar la hoja preparada para este proyecto. No usar una hoja con datos de otros estudios. El identificador es el segmento situado entre `/d/` y `/edit` en su URL.
2. Crear un proyecto Apps Script asociado a esa hoja o independiente, y copiar `google-apps-script/Code.gs`. En Configuración del proyecto, activar la visualización del manifiesto y copiar `google-apps-script/appsscript.json`.
3. En **Configuración del proyecto → Propiedades del script**, establecer:

| Propiedad | Valor de ejemplo | Función |
|---|---|---|
| `SPREADSHEET_ID` | Identificador de la hoja privada | Destino de escritura del servidor |
| `ALLOWED_ORIGINS` | `["https://anibalmastobiza.github.io"]` | Orígenes exactos que pueden recibir la confirmación |
| `LIVE_ENABLED` | `false` | Cierra nuevas asignaciones; conserva respuestas finales de sesiones ya asignadas y confirmaciones de reintento |
| `MAX_ROWS` | `896` | Máximo de asignaciones aceptadas, excluyendo encabezado; cada una reserva una respuesta final |

En `ALLOWED_ORIGINS` no incluir la ruta del repositorio ni una barra final. Un sitio `https://anibalmastobiza.github.io/estudio/` tiene origen `https://anibalmastobiza.github.io`. Para pruebas locales puede añadirse temporalmente `http://localhost:8000`; se exige coincidencia exacta de protocolo, dominio y puerto. La propiedad contiene una lista JSON, no una cadena separada por comas. Eliminar los orígenes de prueba cuando ya no hagan falta.

4. Ejecutar `setup` manualmente desde el editor y autorizar el acceso a Sheets de la cuenta investigadora. Crea `Responses` y `Allocations` si faltan; comprueba encabezados existentes sin sobrescribirlos. Si encuentra una estructura diferente, devuelve `SCHEMA_MISMATCH`. No eliminar registros para resolverlo: restaurar encabezados o usar una hoja nueva y dedicada. `setup` conserva un valor de `LIVE_ENABLED` que ya exista; no activa la recogida por sí mismo.
5. Desplegar como **Aplicación web**, ejecutada por la cuenta responsable. Para participantes sin cuenta Google se requiere acceso de «Cualquier persona», si la política de la organización lo permite. Utilizar la URL que termina en `/exec`; `/dev` solo sirve para editores. El manifiesto solicita acceso a hojas de cálculo para que Apps Script escriba en el destino configurado; este permiso se concede a la cuenta ejecutora, nunca se transmite al navegador.

No se debe poner el identificador de la hoja, tokens OAuth ni credenciales en el repositorio público. El único dato de integración que necesita el navegador es la URL pública `/exec`. Esa URL no es una contraseña.

## 2. Conectar y habilitar la recogida

Configurar en `site/config.js` la URL `/exec` como `CONFIG.endpoint`, seleccionar `CONFIG.mode: 'pilot'` y completar responsable, contacto, privacidad y conservación. La versión preparada contiene esos datos, `imageApproved:true` y `recruitmentOpen:true`; su comprobación local de preparación no tiene campos pendientes. `imageApproved` confirma la revisión del estímulo como material contextual sintético, no una validación clínica. `institution` y `ethicsStatement` son opcionales y solo deben mostrarse cuando se disponga de información acreditada: no son requisitos automáticos ni permiten atribuir al estudio una institución o una aprobación. Para aceptar nuevas asignaciones también debe estar habilitado `LIVE_ENABLED=true` en el receptor y seleccionado el destino privado del estudio. Las pruebas se efectúan en un destino separado; el modo demo se reserva para revisión local sin transmisión.

Los nombres concretos del objeto de configuración del sitio se describen en el README del proyecto. No basta con cambiar el modo en el navegador: el servidor mantiene una segunda compuerta independiente. Con `MAX_ROWS=896`, el receptor admite exactamente hasta 896 asignaciones distintas y rechaza la siguiente como `CAPACITY_REACHED`. Las respuestas finales de las sesiones ya asignadas siguen admitiéndose, incluso al llegar a ese límite. No se repone a quienes abandonan con nuevas asignaciones: el objetivo cuenta asignaciones, no respuestas completas.

Para cerrar manualmente nuevas incorporaciones, volver a `LIVE_ENABLED=false`. Las personas ya asignadas pueden terminar y sus reintentos idénticos siguen recibiendo `duplicate`, sin escribir otra fila. Reducir posteriormente `MAX_ROWS` tampoco cancela esas plazas reservadas. No cambiar la hoja ni eliminar asignaciones durante ese periodo; una respuesta sin asignación previa válida se rechaza. Este cierre gradual evita convertir sesiones en curso en pérdidas por un cambio administrativo. El análisis final debe utilizar la fecha de cierre y la ventana de recepción previstas en el protocolo. Para una interrupción total excepcional puede desactivarse la implementación, lo que también impide confirmar o completar sesiones.

Cuando se modifica `Code.gs` hay que actualizar la implementación a una nueva versión en **Gestionar implementaciones**. Editar el archivo local o el editor no actualiza por sí solo la versión publicada `/exec`. Las propiedades del script se leen en cada ejecución.

## 3. Contrato de transporte y confirmación

El cliente envía un formulario `POST` con codificación `application/x-www-form-urlencoded` hacia un `iframe` temporal. El formulario contiene exactamente tres campos:

| Campo | Contenido |
|---|---|
| `payload` | JSON del evento definido abajo |
| `nonce` | UUID v4 nuevo para cada intento de entrega |
| `return_origin` | `window.location.origin`, incluido en la lista del servidor |

Apps Script devuelve un `HtmlService` con `XFrameOptionsMode.ALLOWALL`. El script de respuesta ejecuta `window.top.postMessage(...)` con el origen exacto de retorno. El receptor no usa `fetch(..., {mode:'no-cors'})`: una respuesta opaca de ese tipo no demostraría que se haya guardado la sesión.

Confirmación de éxito:

```json
{
  "type": "mamografia:submission",
  "ok": true,
  "submissionId": "33333333-3333-4333-8333-333333333333",
  "nonce": "44444444-4444-4444-8444-444444444444",
  "status": "saved",
  "event": "allocation"
}
```

`event` es `allocation` o `response`. `status` es `saved` o `duplicate`; ambos confirman el mismo contenido ya persistido. En un error autenticable por el canal se devuelve `ok:false` y `code`; no se declara éxito. Si el origen o el sobre son inválidos no se emite `postMessage`. El cliente tendrá que gestionar el agotamiento del tiempo de espera.

El cliente debe comprobar conjuntamente `type`, `event`, `submissionId`, `nonce` y el origen del mensaje: HTTPS en `script.google.com`, `script.googleusercontent.com` o un subdominio de `script.googleusercontent.com`, con comprobación de nombre de dominio, no una coincidencia parcial de texto. Rechazar orígenes `null`, HTTP, dominios similares y confirmaciones antiguas. Apps Script puede introducir un iframe interior propio; por ello no se puede exigir que `event.source` coincida siempre con el `contentWindow` del iframe exterior. El nonce impredecible une la confirmación al intento pendiente. Nunca usar `'*'` como origen de destino.

La interfaz solo debe mostrar «guardado» después de esta confirmación. Si se pierde la respuesta, conservar el mismo UUID y contenido, reintentar con nonce nuevo y no generar otra sesión. El hash canónico excluye el nonce y el origen de transporte. Un UUID ya presente con contenido diferente devuelve `CONFLICT`; no se sobrescribe. No hay una garantía de entrega ante un cierre del navegador o un fallo prolongado del proveedor.

## 4. Datos aceptados

### Asignación previa a la viñeta

Se envía **después del consentimiento y antes de mostrar la viñeta**. El navegador espera su confirmación para continuar:

```json
{
  "event": "allocation",
  "submission_id": "33333333-3333-4333-8333-333333333333",
  "study_version": "1.0.0",
  "consent_version": "1.0.0",
  "mode": "pilot",
  "consent": true,
  "assignment": "P1-D0-B1"
}
```

### Respuesta final

Contiene exactamente una viñeta. La respuesta final no incluye la clave `event`; el receptor la interpreta como `response`:

```json
{
  "submission_id": "33333333-3333-4333-8333-333333333333",
  "study_version": "1.0.0",
  "consent_version": "1.0.0",
  "mode": "pilot",
  "consent": true,
  "assignment": "P1-D0-B1",
  "elapsed_ms": 50000,
  "age_band": "40-59",
  "healthcare_experience": "no",
  "gender": "other",
  "education": "university",
  "residence": "rural",
  "trials": [{
    "scenario_id": "P1-D0-B1",
    "image_id": "mammogram-01",
    "policy": 1,
    "delay": 0,
    "barrier": 1,
    "ability": 70,
    "intention": 85,
    "fairness": 4,
    "trust": 5,
    "responsibility": "service",
    "elapsed_ms": 32000
  }],
  "post": {
    "check_uncertainty": "not_diagnosis",
    "check_wait": "7",
    "check_policy": "assigned"
  }
}
```

No enviar este ejemplo a una hoja de recogida real. Es documentación sintética.

| Elemento | Valores admitidos |
|---|---|
| `submission_id` | UUID v4 aleatorio, sin vínculo con nombre ni identidad clínica |
| `study_version`, `consent_version` | `1.0.0` |
| `mode` | Únicamente `pilot`; `demo` se rechaza |
| `assignment` | `P0-D0-B0` hasta `P1-D1-B1` |
| `policy`, `delay`, `barrier` | Enteros `0` o `1`; deben coincidir con los bits de la asignación |
| `scenario_id`, `image_id` | Asignación idéntica a la sesión; imagen `mammogram-01` |
| `ability`, `intention` | Enteros `0–100` |
| `fairness`, `trust` | Enteros `1–7` |
| `responsibility` | `service`, `shared`, `patient` |
| `age_band` | `18-39`, `40-59`, `60+` |
| `healthcare_experience` | `yes`, `no` |
| `gender` | `woman`, `man`, `nonbinary`, `other` |
| `education` | `primary_or_less`, `secondary`, `vocational`, `university` |
| `residence` | `urban`, `rural`; nunca localidad ni código postal |
| Duración total | Entero `1000–7200000` ms |
| Duración de viñeta | Entero `1–7200000` ms, nunca superior al total |
| `check_uncertainty` | `not_diagnosis`, `cancer`, `all_clear`, `unsure` |
| `check_wait` | Cadenas `7`, `28`, `unsure` |
| `check_policy` | `self`, `assigned`, `unsure` |

Todos los campos indicados, incluidos los demográficos, son obligatorios para enviar la respuesta final. El sitio no selecciona valores por defecto: cada categoría debe elegirse expresamente. Se mantiene el derecho a no participar y a salir antes del envío. La categoría de género `other` es una opción cerrada, sin descripción de texto libre. El servidor rechaza `prefer_not`, datos omitidos, claves adicionales, texto libre, nombres, correos y archivos. Una respuesta incorrecta a una comprobación de comprensión es una observación válida: se guarda, no se excluye automáticamente. La comparación por asignación y el análisis de sensibilidad se definen en el protocolo.

La respuesta final exige una asignación previa con el mismo UUID, condición, modo y versiones. Esa comprobación impide cambiar de brazo entre los dos eventos, pero no demuestra quién respondió ni que una persona solo haya abierto una sesión.

## 5. Pestañas y análisis de abandono

`Responses` contiene, en este orden:

```text
received_at,submission_id,study_version,consent_version,mode,assignment,completed_trials,elapsed_ms,age_band,healthcare_experience,gender,education,residence,trials_json,post_json,payload_hash
```

`Allocations` contiene, en este orden:

```text
received_at,submission_id,study_version,consent_version,mode,assignment,payload_hash
```

`received_at` es hora UTC del servidor. `completed_trials` vale 1. Las respuestas y comprobaciones se guardan como JSON en la misma fila final; no hay una secuencia de escrituras por pregunta que pueda quedar a medias. El consentimiento afirmativo es una precondición de ambos eventos y se conserva su versión. No se almacena una casilla de consentimiento negativa: esas personas no se asignan ni envían información.

El registro de asignaciones proporciona el denominador de sesiones consentidas asignadas. Una unión izquierda por UUID permite calcular `respuesta_recibida` y comparar su frecuencia entre brazos. Un registro sin respuesta **no revela si la persona abandonó deliberadamente, perdió la conexión o encontró un fallo técnico**. Tampoco mide abandonos anteriores al consentimiento. La confirmación de asignación antecede a la exposición, de modo que alguna sesión registrada puede no llegar a ver la viñeta si falla el navegador justo después.

Informar el flujo de sesiones y la pérdida por condición. Las comparaciones de resultados disponibles no se convierten automáticamente en un análisis completo por intención de tratar: no hay un desenlace observado para las sesiones sin respuesta. Conservar esas sesiones en el denominador y analizar la ausencia de datos y su sensibilidad según el plan; no imputar cero ni una respuesta media por defecto. No sumar las dos pestañas como si fueran dos participantes.

El servidor usa `LockService.getScriptLock()` durante la consulta de duplicados y la escritura. Verifica el hash al reintentar, escribe una fila, ejecuta `SpreadsheetApp.flush()` y comprueba UUID y hash leídos antes de confirmar. Esto ofrece idempotencia por evento y sesión dentro de este receptor; **Sheets no se convierte en una base de datos transaccional**. Un operador que edite filas o dos proyectos Apps Script independientes escribiendo en la misma hoja invalidarían los supuestos. Usar un solo receptor y restringir la edición de las pestañas; hacer el análisis en copias o pestañas separadas.

## 6. Verificación realizada y comprobaciones complementarias

Ya se verificaron, contra el despliegue real y en una hoja de prueba separada: POST de asignación (`saved`), POST de respuesta (`saved`), repetición idéntica (`duplicate`) y lectura que confirmó una única fila. No se publican identificadores de hojas ni del envío de prueba.

El intento de interfaz en el navegador integrado encontró `ERR_BLOCKED_BY_CLIENT`. Queda por observar el acuse `postMessage` y la confirmación visual en un navegador permitido; el éxito HTTP no sustituye esa comprobación. Los pasos siguientes son una guía de verificación y regresión, no una afirmación de que todos se hayan ejecutado. Siempre usar una copia de la hoja o un destino de ensayo con datos ficticios, sin mezclarlos con la cohorte.

1. Con `LIVE_ENABLED=false` y una hoja de ensayo vacía, comprobar que no se admiten asignaciones nuevas.
2. Activar la recogida de ensayo; abrir la URL de GitHub Pages en una ventana privada sin sesión Google y repetir en un móvil. Una revisión local en modo demo no debe generar filas.
3. Consentir y comprobar que aparece una fila en `Allocations` antes de mostrar la viñeta. Abandonar esa sesión y confirmar que no aparece en `Responses`.
4. Completar otra sesión: una fila en cada pestaña, mismo UUID y asignación, `completed_trials=1`, todas las escalas presentes. Comprobar que el estado de la interfaz corresponde al ACK real.
5. Reintentar el mismo evento con el mismo contenido e identificador: el resultado será `duplicate`, sin fila adicional. En un entorno de ensayo, cambiar contenido conservando UUID debe devolver `CONFLICT`.
   Repetir con `LIVE_ENABLED=false`: los eventos existentes deben seguir devolviendo `duplicate` y las nuevas asignaciones deben recibir `COLLECTION_CLOSED`. Una respuesta final aún no guardada, perteneciente a una asignación previa, debe aceptarse. Una respuesta sin asignación nunca se acepta.
   En la hoja de ensayo, un límite reducido de asignaciones permite comprobar el cierre automático por capacidad y que las sesiones ya asignadas puedan terminar. Restaurar `MAX_ROWS=896` para el estudio.
6. Desconectar la red durante la entrega: la interfaz no debe anunciar éxito. Reconectar y reintentar conservando el UUID y el contenido. Probar las políticas de los navegadores previstos para participantes. Si el iframe falla en ellos, resolver el transporte o delimitar los navegadores admitidos antes de ampliar el reclutamiento; no confundir restricciones del navegador integrado de trabajo con compatibilidad demostrada en todos los navegadores.
7. Verificar exportación y unión de las pestañas. Comprobar que el repositorio no contiene la hoja exportada ni datos de participantes.

Pruebas locales reproducibles desde la carpeta del proyecto:

```sh
node --test tests/backend.test.mjs
```

Son pruebas de contrato y persistencia con dobles de Apps Script: no verifican permisos de Google, cuotas actuales, entrega real de `postMessage` ni simultaneidad del servicio en producción. El ensayo de concurrencia verifica la lógica de rechazo durante un bloqueo y de reintento idempotente.

## 7. Alcance operativo y privacidad

La lista de orígenes controla a dónde se envía la confirmación; **no autentica al remitente ni impide un POST fabricado**. El endpoint es público y el cliente es modificable. UUID, hash y nonce evitan colisiones accidentales y confusiones entre intentos; no son un control de personas únicas, una firma de las respuestas ni un sistema contra bots. El tope de filas, la validación estricta, el límite de tamaño y la compuerta de recogida reducen problemas operativos, pero no detienen una denegación de servicio.

Esta arquitectura automatiza la recogida con los controles y límites descritos; no acredita por sí misma adecuación institucional, capacidad de servicio ni unicidad de participantes. Si el reclutamiento requiere control de admisión, incorporar invitaciones verificadas por el servidor y cuotas adecuadas manteniendo el mismo esquema científico. No introducir una «clave secreta» en JavaScript público: no solucionaría el problema.

El código no consulta ni escribe IP, correo, nombre o cuenta del participante. Tampoco recoge fecha de nacimiento, localidad, historial clínico ni respuestas de texto libre. Google y GitHub pueden procesar metadatos de acceso en su infraestructura; por eso no se debe prometer anonimato absoluto. El contacto del investigador —Aníbal Astobiza, amastobiza@ugr.es— es información pública de responsabilidad del estudio y no una variable de los participantes. El consentimiento y la página de privacidad identifican al responsable, explican acceso restringido, finalidad, conservación hasta completar análisis y verificación científica, eliminación posterior de registros individuales, conservación de agregados y consultas o derechos cuando correspondan. La página de privacidad describe categorías de servicios técnicos sin introducir detalles de infraestructura en el cuestionario. No atribuyen una afiliación ni aprobación ética no acreditadas. El UUID es un identificador interno para unir asignación y respuesta y evitar duplicados; no se muestra ni se entrega como archivo al participante. No reutilizarlo fuera de este estudio ni intentar reidentificar personas. La pantalla final muestra únicamente un agradecimiento y la confirmación de guardado, sin ofrecer descargas. El hash de integridad se conserva únicamente en la hoja privada: el receptor no lo devuelve en el ACK ni expone consultas públicas de registros. Las combinaciones demográficas se analizarán y comunicarán con agregación suficiente para evitar describir grupos minúsculos.

Consultar las [cuotas vigentes de Apps Script](https://developers.google.com/apps-script/guides/services/quotas): varían por cuenta y pueden cambiar; el agotamiento interrumpe la ejecución. No se declara una capacidad de participantes garantizada ni un nivel de servicio.

Fuentes técnicas oficiales: [publicación de aplicaciones web](https://developers.google.com/apps-script/guides/web), [restricciones del iframe de HtmlService](https://developers.google.com/apps-script/guides/html/restrictions), [XFrameOptionsMode](https://developers.google.com/apps-script/reference/html/x-frame-options-mode), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service) y [SpreadsheetApp.flush](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#flush()).
