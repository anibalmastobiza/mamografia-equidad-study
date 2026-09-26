# Después de la mamografía

Aplicación de investigación en español: ocho viñetas ficticias, una por participante, sobre gestión de citas, espera y barreras prácticas después de un cribado mamográfico con IA.

**Versión preparada para recogida:** el sitio está configurado en modo de participación real, con consentimiento, privacidad, cinco demográficos obligatorios y un estímulo mamográfico sintético documentado. El receptor actualizado ha confirmado por HTTP el registro de una asignación y una respuesta en una hoja de prueba separada; la lectura posterior confirmó una fila de respuesta y el reintento devolvió `duplicate` sin añadir otra fila. El transporte completo desde el navegador integrado no pudo verificarse por `ERR_BLOCKED_BY_CLIENT`. No se presenta esa prueba HTTP como una prueba completa del recorrido en navegador.

**Recogida activada:** el receptor admite participaciones desde el dominio público del cuestionario, con un límite de 896 asignaciones consentidas. Esta versión está configurada para enviar y guardar respuestas reales. El destino del estudio permanece separado de los registros de prueba. [Enlace del cuestionario](https://anibalmastobiza.github.io/mamografia-equidad-study/). Estado detallado y límites de comprobación en [VERIFICACION.md](docs/VERIFICACION.md).

Contacto del estudio: **Aníbal Astobiza — amastobiza@ugr.es**. No se atribuyen una afiliación institucional ni una aprobación ética no acreditadas.

## Pregunta e impacto

¿Asignar una cita mejora la capacidad percibida de acudir más entre personas con barreras prácticas altas? La propuesta estudia la responsabilidad organizativa del seguimiento, no la precisión diagnóstica de IA. El beneficio social potencial es diseñar circuitos que ayuden a completar el seguimiento sin descargar toda la gestión sobre quien tiene menos recursos.

La necesidad de visita es indicada por el equipo de radiología tras revisar las imágenes: una segunda lectura por sí sola no exige desplazarse. El riesgo y la información clínica permanecen iguales en todas las condiciones.

## Materiales preparados

- Consentimiento y [privacidad](site/privacidad.html), responsable identificado y criterio explícito de conservación: completar el análisis y la verificación científica; después, eliminar registros individuales y conservar agregados.
- Una imagen M-SYNTH de un fantoma digital, sin datos de pacientes, reutilizada bajo CC0. Procedencia, licencia, inspección y hashes en [IMAGENES.md](docs/IMAGENES.md). Se muestra el mismo archivo en los ocho brazos y no se pide interpretarlo.
- Preguntas demográficas obligatorias, sin opciones preseleccionadas: edad por intervalos, género, estudios, entorno urbano/rural y experiencia profesional sanitaria.
- Asignación aleatoria mediante Web Crypto, conservada durante la sesión. Una viñeta por persona; no se presupone balance exacto con aleatorización simple. En recogida real se ignoran los parámetros de asignación en la URL.
- Confirmación del guardado, reintentos sin duplicación y recuperación de respuestas pendientes. No se muestran códigos ni se ofrecen descargas al participante.
- En modo de recogida, si falta configuración no se ofrece una demo como alternativa: se informa de que no se admiten nuevas participaciones. El enlace al diseño experimental queda oculto durante la participación.

La inspección del archivo sintético confirma su procedencia y uso contextual; no constituye evaluación radiológica ni validación empírica del cuestionario.

## Comprobación local

Con Node 22 o posterior y Python 3:

```sh
npm test
npm run build
npm run serve
```

Abrir `http://localhost:8765`. **La configuración actual es de recogida real:** no completar pruebas contra el destino del estudio. Para revisar sin transmitir, usar una copia local con `mode:'demo'`; para verificar persistencia, usar exclusivamente el destino privado de prueba y su origen autorizado. Nunca incluir respuestas de prueba en el análisis científico.

Se superaron 39 pruebas JavaScript y ocho pruebas Python. Los tests JavaScript no necesitan dependencias externas. Para el análisis Python, las dependencias están en `analysis/requirements.txt`:

```sh
python3 -m unittest discover -s analysis -p 'test_*.py' -v
node analysis/power.mjs
```

Las pruebas Python crean únicamente casos sintéticos temporales. `power-sensitivity.json` contiene simulaciones prospectivas de supuestos, no resultados de personas.

## Material científico

- [Protocolo](docs/protocolo.md): hipótesis, estimandos, reclutamiento y límites.
- [Referencias](docs/referencias.md): antecedentes verificados y novedad delimitada.
- [Imagen](docs/IMAGENES.md): procedencia y licencia del estímulo.
- [Receptor](docs/GOOGLE_SHEETS.md): esquema, configuración y prueba de sincronización.
- [Análisis](docs/ANALISIS.md): modelo primario, demográficos agregados y sensibilidad a desenlaces ausentes.
- `analysis/`: scripts para analizar CSV exportados y explorar potencia.
- [Verificación](docs/VERIFICACION.md): pruebas realizadas y comprobaciones pendientes.

## Registro privado y confirmación de persistencia

Después del consentimiento se registra una fila en `Allocations`. Solo cuando se confirma esa asignación se muestra el estímulo. Al terminar se guarda una fila en `Responses`, con una viñeta serializada en `trials_json`. Ambas tablas se unen mediante un identificador aleatorio, sin relación con nombre o correo, para conocer el denominador y la falta de respuesta por condición.

La página envía un formulario al receptor y espera un acuse `postMessage` vinculado al identificador, evento y nonce del envío. Un envío opaco con `no-cors` no se considera éxito. La respuesta permanece en la pestaña si no se confirma el guardado; eso no equivale a persistencia remota. Tras la confirmación solo se muestra un agradecimiento breve.

La configuración del receptor prevé un máximo de **896 nuevas asignaciones**. Una participación ya asignada puede enviar su respuesta después de alcanzarse ese límite; la recogida de nuevas asignaciones y la recepción de respuestas existentes tienen controles separados. El límite definitivo debe fijarse y documentarse antes del estudio confirmatorio.

El acceso a las respuestas individuales está restringido al responsable. No se solicitan nombre, correo, historia clínica, ubicación precisa ni texto libre. Los proveedores pueden procesar metadatos técnicos, por lo que no se promete anonimato absoluto. Los registros individuales y los identificadores de las hojas privadas no deben publicarse.

## Publicación

[Repositorio del proyecto](https://github.com/anibalmastobiza/mamografia-equidad-study). `.github/workflows/pages.yml` ejecuta pruebas, construye `dist` y publica únicamente ese directorio. En Settings → Pages se utiliza GitHub Actions. Las rutas internas son compatibles con la subcarpeta del proyecto. No subir exportaciones de respuestas, credenciales ni identificadores de hojas privadas.

Antes de la apertura definitiva, confirmar el destino privado, la política de recogida del receptor y un envío de prueba completo en un navegador permitido. El consentimiento y los materiales deben quedar fijados en una versión; un cambio sustantivo posterior requiere versionado y separación de cohortes. El procedimiento ético aplicable se documentará según el ámbito efectivo del proyecto, sin inventar aprobación o exención.

La recogida mediante enlace público no tiene autenticación fuerte ni asegura que cada persona responda una sola vez. El identificador aleatorio evita duplicar reintentos de un envío, pero no impide participaciones repetidas desde nuevas sesiones.

## Límites de interpretación

La encuesta mide acceso percibido, intención y valoraciones, no cáncer detectado, asistencia efectiva ni mortalidad. La IA figura en todas las condiciones: no se estima su efecto específico frente a lectura exclusivamente humana. Los plazos de 7 y 28 días son manipulaciones ficticias, no estándares de seguridad clínica. No se solicita interpretar la mamografía.
