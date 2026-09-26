# Verificación de la versión de recogida

Fecha: 26 de septiembre de 2026. Los envíos descritos en las pruebas son ficticios; no son participantes ni resultados científicos.

## Preparación local

- Aplicación configurada con `mode:'pilot'`, `recruitmentOpen:true` y comprobación de preparación sin campos pendientes. El modo interno `pilot` corresponde a participación con envío real, no a la demo.
- Contacto: Aníbal Astobiza, amastobiza@ugr.es. Consentimiento y privacidad incluyen finalidad, voluntariedad, demográficos obligatorios, acceso y criterio de conservación. No se atribuyen institución ni aprobación ética.
- Se incorporó un ejemplo mamográfico sintético de M-SYNTH: `assets/mammogram-msynth-01.jpg`, con licencia CC0 y procedencia fijada a revisión. [Archivo de procedencia y límites](IMAGENES.md). No contiene una imagen adquirida de una paciente y no se ha validado como prueba diagnóstica.
- El mismo estímulo se utiliza en las ocho condiciones. No se pide al participante interpretar la imagen. El enlace al diseño y la posibilidad de elegir condición permanecen ocultos en recogida.
- Sin descargas, códigos visibles ni explicaciones de infraestructura en el recorrido de participación. El cierre muestra agradecimiento y confirmación solo después del acuse.

## Pruebas automatizadas

- Se superaron 39 pruebas JavaScript que cubren el contrato de datos, rangos, consentimiento, duplicados, acuses, recuperación, cierre y construcción del sitio.
- Siete pruebas de recuperación de sesión superadas: incluyen respuestas pendientes, recuperación después de cerrar nuevas inscripciones y ausencia de una caída al modo demo cuando la recogida está cerrada.
- Ocho pruebas Python superadas con casos sintéticos temporales: validación de entradas, contraste conocido, datos ausentes, conservación de respuestas con fallos de comprensión y ejecución completa del análisis. No son resultados empíricos.
- El cálculo de potencia se ejecutó con semilla fija y guarda su salida rotulada como simulación prospectiva. No garantiza la potencia del futuro estudio.

## Receptor y escritura real comprobada

- El receptor se actualizó a la revisión desplegada 2. La versión del contrato del estudio y del consentimiento permanece en `1.0.0`; no confundir revisión de despliegue y versión científica.
- Se efectuó un POST HTTP real con formato de formulario, enviando una asignación de prueba. El receptor devolvió un acuse `saved` para la asignación.
- Se efectuó un segundo POST con la respuesta ficticia correspondiente. El receptor devolvió un acuse `saved` para la respuesta.
- La lectura posterior de la hoja privada de prueba confirmó una fila de respuesta. Se utilizó un destino de prueba separado, sin publicar su identificador ni el identificador del envío.
- Se repitió el POST de respuesta con el mismo identificador y contenido. El receptor devolvió `duplicate`; la lectura posterior confirmó que continuaba existiendo una única fila. Se verificó así la idempotencia contra el despliegue real, además de las pruebas locales.

## Transporte desde navegador: límite de lo verificado

El intento desde el navegador integrado encontró `ERR_BLOCKED_BY_CLIENT`. No se observó el recorrido completo formulario → iframe → acuse `postMessage` dentro de ese navegador. La prueba HTTP anterior sí confirma recepción, validación y escritura del receptor con posterior lectura, pero **no demuestra por sí sola la recepción del acuse por la aplicación en un navegador**.

Queda pendiente una prueba completa desde un navegador permitido, incluida la confirmación visual del envío y un reintento sin nueva fila, usando exclusivamente el destino de prueba. No describir el sistema como validado de extremo a extremo en navegador mientras falte esa observación.

## Destino del estudio y apertura

**Recogida activada:** las propiedades guardadas del receptor apuntan al destino privado del estudio, permiten el origen público del cuestionario, habilitan la recogida y limitan a 896 las nuevas asignaciones. El destino del estudio estaba vacío durante la comprobación y se mantiene separado de la hoja utilizada para pruebas. Esta versión publica el cuestionario con envío real. Los identificadores de ambas hojas y los datos de prueba no forman parte del repositorio.

La configuración aplicada limita a 896 las nuevas asignaciones consentidas y permite recibir respuestas de asignaciones existentes después de alcanzarse el límite. Antes del estudio confirmatorio deben fijarse materiales, versión, regla de cierre y análisis. La decisión sobre el procedimiento ético corresponde al ámbito efectivo del proyecto; aquí no se inventa una aprobación ni una exención.

[Cuestionario público](https://anibalmastobiza.github.io/mamografia-equidad-study/).
