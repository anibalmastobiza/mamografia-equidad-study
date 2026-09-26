# Estímulos radiológicos ficticios

## Estado

No se han creado imágenes. La primera solicitud al generador integrado fue rechazada por el sistema de seguridad (HTTP 400; `moderation_blocked`; categoría `sexual`; etapa `output`). Identificador de solicitud: `44eba407-5953-49dc-afac-5775bb957b00`.

No se ha reformulado la petición para eludir el bloqueo, no se ha utilizado otro generador y no se han descargado imágenes de pacientes. No existen los archivos previstos `assets/mammogram-01.png`, `mammogram-02.png` o `mammogram-03.png`.

La demostración web debe mostrar una indicación explícita de imagen pendiente, sin atribuir un hallazgo radiológico a un archivo inexistente. El estudio con imágenes permanece pendiente de incorporar material ficticio autorizado y revisado por el equipo clínico. Mientras no exista ese material, la demostración únicamente permite revisar el flujo y el texto de las viñetas.

## Procedimiento previsto

Modo: herramienta integrada `image_gen.imagegen`, sin imágenes de referencia ni datos de pacientes. Habilidad consultada: `/Users/anibalmonasterioastobiza/.codex/skills/.system/imagegen/SKILL.md`.

Una imagen por solicitud. El plan inicial era comenzar por un único estímulo con dos paneles en escala de grises. La intervención experimental no debía estar codificada visualmente en el estímulo. Las variantes, si se crearan posteriormente, requerirían contrabalanceo independiente de condiciones, igualación aproximada de composición y luminancia y un pretest de saliencia y comprensión.

## Prompt exacto enviado

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

## Comprobaciones

- Origen: solicitado como completamente inventado, sin paciente ni imagen de referencia.
- Salida recibida: ninguna; no ha sido posible la inspección visual.
- Identificadores personales: no incluidos en la solicitud.
- Etiquetas clínicas, BI-RADS, probabilidad de malignidad y marcas de lesiones: excluidas del estímulo solicitado.
- Verdad clínica o validación diagnóstica: no existe y no debe afirmarse.
- Uso previsto: ilustración de viñetas sobre distribución de acceso a revisión humana, no tarea de diagnóstico para población general.
- Revisión pendiente para material futuro: comprobar relevancia, plausibilidad visual y ausencia de señales que confundan la manipulación; documentar la evaluación humana sin presentarla como validación de diagnóstico.

## Incorporación futura

Aceptar únicamente material inventado aportado o autorizado para este proyecto, con procedencia documentada. Añadir una leyenda visible en HTML: «Imagen completamente ficticia para esta investigación. No procede de una paciente y no permite realizar un diagnóstico». Mantener el texto clínico experimental como única fuente de los hechos del caso. Si el equipo aporta una imagen derivada de una paciente real, no usar esa leyenda: revisar primero procedencia, permisos y diseño de protección de datos.

