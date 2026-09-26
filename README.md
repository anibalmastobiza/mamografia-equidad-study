# Después de la mamografía

Prototipo de investigación en español: ocho viñetas ficticias, una por participante, sobre gestión de citas, espera y barreras prácticas después de un cribado mamográfico con IA.

**Estado:** demo local revisable; no reclutamiento abierto. La generación integrada de una mamografía ficticia fue bloqueada y no existe aún imagen. La aplicación lo indica de forma visible. Los datos institucionales y el endpoint de Apps Script están vacíos. Ninguna respuesta de demo se envía ni se mezcla con datos de participantes. No se ha demostrado sincronización real hasta desplegar y verificar el recolector.

## Pregunta e impacto

¿Asignar una cita mejora la capacidad percibida de acudir más entre personas con barreras prácticas altas? La propuesta estudia una responsabilidad organizativa del seguimiento, no la precisión diagnóstica de IA. El beneficio social potencial es diseñar circuitos que ayuden a completar el seguimiento sin descargar toda la gestión sobre quien tiene menos recursos.

La necesidad de visita es indicada por el equipo de radiología tras revisar las imágenes: una segunda lectura por sí sola no exige desplazarse. El riesgo y la información clínica permanecen iguales en todas las condiciones.

## Revisión local

Con Node 22 o posterior y Python 3 (sin dependencias JS):

```sh
npm test
npm run build
npm run serve
```

Abrir `http://localhost:8765`. En la demo puede elegirse cualquiera de las ocho condiciones; el piloto ignora parámetros de asignación en la URL. Cada participante recibe una asignación mediante Web Crypto, conservada durante la sesión. No se presupone balance exacto con aleatorización simple.

## Material científico

- `docs/protocolo.md`: hipótesis, estimandos, reclutamiento, límites y ética.
- `docs/referencias.md`: antecedentes verificados y novedad delimitada.
- `docs/IMAGENES.md`: estado real, prompt y criterios para el estímulo visual.
- `docs/GOOGLE_SHEETS.md`: recolector, esquema, configuración y prueba de sincronización.
- `docs/ANALISIS.md`: análisis y sensibilidad a datos ausentes.
- `analysis/`: scripts para analizar CSV exportados y explorar potencia bajo supuestos.

## Google Sheets: privado, con confirmación de persistencia

Después del consentimiento se registra una fila en `Allocations`. Solo cuando el servidor confirma esa asignación se muestra el estímulo. Al terminar se guarda una fila en `Responses`, con una viñeta serializada en `trials_json`. Se unen ambas tablas mediante un UUID seudónimo para conocer el denominador y el abandono por condición.

La página estática envía un formulario a Apps Script; recibe un acuse `postMessage` con identificador, evento y nonce. No considera éxito un envío opaco con `no-cors`. Los reintentos son idempotentes. La respuesta permanece en la pestaña si falta confirmación y puede descargarse; ello no equivale a guardado remoto.

Los proveedores pueden conservar registros técnicos: no se promete anonimato absoluto. El cuestionario no solicita nombre, correo, historia clínica, localización ni texto libre. No se guardan datos antes del consentimiento. La hoja nunca debe hacerse pública para permitir los envíos.

## GitHub Pages

Subir **solo este proyecto** a un repositorio nuevo o al repositorio indicado por el investigador, sin datos exportados ni credenciales. `.github/workflows/pages.yml` ejecuta pruebas, construye `dist` y publica únicamente ese directorio. En Settings → Pages elegir GitHub Actions. Todas las rutas del sitio son relativas, compatibles con subcarpetas de proyecto.

Repositorio del proyecto: https://github.com/anibalmastobiza/mamografia-equidad-study. El workflow no requiere bibliotecas externas ni claves. La versión pública permanece en modo demo hasta completar los materiales y verificar la recogida.

Contacto del estudio: **Aníbal Astobiza — amastobiza@ugr.es**. Los cinco campos demográficos son obligatorios y utilizan categorías cerradas: edad, género, estudios, entorno de residencia y experiencia profesional sanitaria.

## Pasar de demo a piloto

1. Revisar el protocolo, cuestionario y procedimiento ético aplicable. Completar responsables, contacto, privacidad y conservación sin inventar aprobación.
2. Incorporar un estímulo completamente ficticio con procedencia documentada y revisión pertinente; usar **el mismo archivo en las ocho condiciones**. No inferir patología de un generador de imágenes. Congelar su hash antes de recoger datos.
3. Crear el Apps Script de `google-apps-script/`, conectar la hoja privada, configurar orígenes permitidos y habilitar recogida según `docs/GOOGLE_SHEETS.md`.
4. Completar `site/config.js`, poner `mode:'pilot'`, `imageApproved:true`, `recruitmentOpen:true` únicamente cuando los materiales estén preparados. No poner claves en ese archivo público.
5. Verificar un recorrido con datos **de prueba**, asignación + respuesta, acuse real y un reintento sin duplicación. Usar un workbook de prueba separado. Verificar navegadores y móvil. Mantener datos de prueba fuera del análisis.
6. Prerregistrar, fijar el número de asignaciones y congelar la versión antes de analizar resultados. Un cambio sustantivo de estímulo/población requiere otra versión.

La recogida pública no tiene autenticación fuerte ni impide que una persona responda varias veces. Para panel remunerado o reclutamiento amplio, prever identificadores de invitación verificados por el servidor y una infraestructura institucional adecuada; no improvisar llaves públicas como protección.

## Límites de interpretación

La encuesta mide acceso percibido, intención y valoraciones, no cáncer detectado, asistencia efectiva ni mortalidad. La IA figura en todas las condiciones: el estudio no estima un efecto específico de IA frente a lectura exclusivamente humana. Los plazos de 7 y 28 días son manipulaciones ficticias, no estándares de seguridad clínica. No se solicita interpretar la mamografía.
