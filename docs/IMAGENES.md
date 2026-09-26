# Estímulo mamográfico sintético

## Estímulo incorporado

Archivo: `assets/mammogram-msynth-01.jpg`. JPEG de 2000 × 1500 píxeles, 89.554 bytes. Se ha descargado sin modificación de un ejemplo público de M-SYNTH (DIDSR/FDA). Se conserva el archivo original, sin recortar, rotar, cambiar contraste ni añadir marcas. La escala de presentación en HTML no debe alterar la relación de aspecto.

M-SYNTH se obtiene mediante simulaciones de rayos X Monte Carlo sobre fantomas digitales del sistema VICTRE. No es una mamografía adquirida de una paciente real. Es un recurso científico preexistente, no una salida de un modelo generativo creada para esta encuesta. Fuentes primarias: [catálogo FDA](https://cdrh-rst.fda.gov/m-synth-dataset-comparative-evaluation-mammography-ai), [ficha del dataset del equipo](https://huggingface.co/datasets/didsr/msynth), [repositorio oficial](https://github.com/DIDSR/msynth-release).

## Procedencia fija y licencia

- Repositorio y revisión: `DIDSR/msynth-release`, commit `549d5e3ae8dda703c71c3eb031b66edbead5f9e3`.
- Ruta original: `docs/images/P100_Dhetero_L7.0_X4.08e09.jpg`.
- [Descarga del original fijada al commit](https://raw.githubusercontent.com/DIDSR/msynth-release/549d5e3ae8dda703c71c3eb031b66edbead5f9e3/docs/images/P100_Dhetero_L7.0_X4.08e09.jpg).
- Licencia: [CC0 1.0 Universal del repositorio](https://github.com/DIDSR/msynth-release/blob/549d5e3ae8dda703c71c3eb031b66edbead5f9e3/LICENSE.txt). La ficha del dataset confirma CC0. Se incluye una copia literal en `assets/LICENSE-M-SYNTH-CC0.txt`.
- SHA-256 de la imagen: `35a96c139285b29be17533a51a791599535ef9d63d1dfeb0c143e07ad08cbbdb`.
- Blob Git SHA-1: `946d68abc82ab154bb31500a6986171db385b946`; el hash calculado sobre los bytes descargados coincide con el del repositorio.
- SHA-256 de la licencia: `5537d4d10b76b81b6e8dfd8b644480a4b1efa332fbb0cdb61126c5be781ef7b4`.
- Verificación y descarga: 2026-09-26.

La licencia permite reutilización y redistribución. Conservar esta atribución científica: Sizikova E., Saharkhiz N., Sharma D., Lago M., Sahiner B., Delfino J. G. y Badano A. (2023). *Knowledge-based in silico models and dataset for the comparative evaluation of mammography AI for a range of breast characteristics, lesion conspicuities and doses*. Advances in Neural Information Processing Systems. [Artículo](https://arxiv.org/abs/2310.18494). El uso del recurso no implica respaldo de la FDA al estudio.

## Selección, inspección y uso experimental

El ejemplo seleccionado es el fantoma número 100, con código de densidad `hetero`. La ficha del dataset indica que los identificadores pares corresponden a ejemplos sin lesión insertada. El registro del visor conserva un parámetro nominal `lesion_size: 7`; no se interpreta como un hallazgo en esta imagen ni como un diagnóstico de una persona. Los metadatos originales se guardan en `assets/mammogram-msynth-01.provenance.json`. La palabra `patient_id` en esos metadatos designa el identificador sintético del repositorio.

La inspección visual confirmó una única proyección en escala de grises, sin flechas, recuadros de lesión, texto diagnóstico, nombres ni marcas de institución. El fondo y los rasgos de la simulación se conservan. No se ha realizado una evaluación radiológica ni un pretest con participantes. La pertenencia a un dataset publicado acredita procedencia y método, no la validez de esta encuesta ni la respuesta de una IA clínica.

Usar **exactamente este mismo archivo en los ocho brazos**. La imagen aporta contexto, no constituye una manipulación diagnóstica. No pedir al participante que diagnostique ni vincular las respuestas a una verdad clínica del píxel. La derivación de IA, los plazos y las barreras son hechos de la viñeta, no resultados calculados sobre la imagen.

Leyenda de presentación sugerida: «Mamografía sintética de un fantoma digital, procedente de M-SYNTH (DIDSR/FDA, CC0). No pertenece a una paciente real. Se muestra como contexto del escenario; no tienes que interpretarla ni hacer un diagnóstico».

Antes del estudio confirmatorio, realizar un pretest de comprensión y pertinencia contextual y documentar sus resultados. Mantener el estímulo fijo limita la generalización a otras apariencias mamográficas; no afirmar que la encuesta evalúa precisión diagnóstica, lectura radiológica ni mortalidad por cáncer.

## Registro histórico del intento inicial de generación

Antes de localizar este recurso publicado, la primera solicitud al generador integrado fue rechazada por el sistema de seguridad (HTTP 400; `moderation_blocked`; categoría `sexual`; etapa `output`). Identificador: `44eba407-5953-49dc-afac-5775bb957b00`. No se reintentó, reformuló ni usó otro generador. No produjo un archivo.

### Procedimiento inicialmente previsto, no realizado

Modo: herramienta integrada `image_gen.imagegen`, sin imágenes de referencia ni datos de pacientes. Habilidad consultada: `/Users/anibalmonasterioastobiza/.codex/skills/.system/imagegen/SKILL.md`.

Una imagen por solicitud. El plan inicial era comenzar por un único estímulo con dos paneles en escala de grises. La intervención experimental no debía estar codificada visualmente en el estímulo. Las variantes, si se crearan posteriormente, requerirían contrabalanceo independiente de condiciones, igualación aproximada de composición y luminancia y un pretest de saliencia y comprensión.

### Prompt exacto del intento fallido

```text
Use case: scientific-educational
Asset type: fictional radiology stimulus for an online research survey about equitable access to human review after AI abstention; entirely illustrative, not for diagnosis, no real patient source.
Primary request: Create one completely fictional grayscale mammography-like raster image, two equal breast radiograph panels side by side. This is a synthetic illustration rather than an actual medical scan.
Scene/backdrop: uniformly black background; slim black separation between panels.
Subject: two neutral, mammography-like grayscale projections with realistic-looking delicate branching and softly mottled fibrous textures within breast silhouettes, mirrored left/right composition and balanced average luminance, no salient focal finding.
Style/medium: restrained grayscale radiographic texture, broad dynamic range without harsh white hotspots, neutral and non-dramatic.
Composition/framing: landscape 3:2 image; two evenly sized upright projections, comfortably contained inside the frame and visually balanced.
Text: none.
Constraints: Entirely invented imagery. No patient identifiers, dates, scanner branding, letters, labels, arrows, circles, heatmaps, annotations, diagnostic categories, pathology labels or conspicuous lesion. No educational overlays. Do not imply clinically validated anatomy or any clinical ground truth. Outer HTML will display the fictional-image notice.
```

### Comprobaciones del intento fallido

- Origen: solicitado como completamente inventado, sin paciente ni imagen de referencia.
- Salida recibida: ninguna; no ha sido posible la inspección visual.
- Identificadores personales: no incluidos en la solicitud.
- Etiquetas clínicas, BI-RADS, probabilidad de malignidad y marcas de lesiones: excluidas del estímulo solicitado.
- Verdad clínica o validación diagnóstica: no existe y no debe afirmarse.
- Uso previsto: ilustración de viñetas sobre distribución de acceso a revisión humana, no tarea de diagnóstico para población general.
- Revisión pendiente para material futuro: comprobar relevancia, plausibilidad visual y ausencia de señales que confundan la manipulación; documentar la evaluación humana sin presentarla como validación de diagnóstico.
