# Verificación de la versión de revisión

Fecha: 26 de septiembre de 2026. No se han reclutado participantes.

- Sitio público publicado con despliegue automatizado: https://anibalmastobiza.github.io/mamografia-equidad-study/.
- Recorrido de demo comprobado en navegador: consentimiento, escenario, valoraciones, controles de comprensión, cinco demográficos obligatorios y cierre. El formulario rechaza respuestas incompletas y no ofrece descargas.
- Contacto público: Aníbal Astobiza, amastobiza@ugr.es. No se solicitan identificadores personales ni campos libres.
- 35 pruebas JavaScript superadas: contrato, rangos, consentimiento, deduplicación, acuses, recuperación, cierre y versionado de recursos. Ocho pruebas Python superadas con datos sintéticos, incluido análisis de extremo a extremo. No constituyen resultados empíricos.
- Se creó una hoja privada vacía con cabeceras `Responses` (16 columnas) y `Allocations` (7 columnas). El identificador de la hoja no se publica.
- Se creó y desplegó el receptor. Su función `setup` se ejecutó sin errores contra la hoja del estudio. El sitio tiene su URL pública configurada, pero permanece en demo.
- Se intentó la prueba de transporte desde un navegador con datos totalmente ficticios y una hoja de prueba separada. No se recibió acuse ni aparecieron filas. La navegación directa a la URL desplegada devolvió `ERR_BLOCKED_BY_CLIENT`. No se ha verificado el guardado mediante el formulario ni el reintento real. Las pruebas locales del contrato no sustituyen esa comprobación.
- Tras el intento se restauró el destino del estudio, el origen del sitio público y `LIVE_ENABLED=false`. La hoja de prueba no se utiliza para análisis.
- Falta el estímulo de mamografía ficticia: la herramienta de generación bloqueó la solicitud. No hay imagen de paciente ni imagen diagnóstica validada. La interfaz informa de esta ausencia y la apertura del piloto exige imagen revisada.

## Antes de recoger datos

Completar el estímulo y las condiciones del estudio; verificar el consentimiento y el procedimiento ético aplicable; realizar una prueba real de asignación, envío y reintentos en una hoja separada; fijar versión y prerregistro. Mantener la recogida cerrada hasta completar estas tareas. La propuesta de 896 asignaciones no se aplica automáticamente por el límite técnico actual de 5000 filas.
