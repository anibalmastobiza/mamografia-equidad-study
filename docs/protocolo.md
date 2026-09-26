# Cuando la IA no concluye: acceso a la evaluación complementaria en mamografía

**Protocolo de trabajo, versión 0.1 — 26 de septiembre de 2026.** Documento de diseño científico; no presenta resultados de participantes. No se atribuye una aprobación ética no acreditada. Población: personas adultas de la población general que leen español. Contacto: **Aníbal Astobiza, amastobiza@ugr.es**.

## 1. Pregunta, tesis e impacto

**Pregunta:** cuando un proceso de mamografía apoyado por IA requiere evaluación complementaria, ¿facilitar la cita mejora la capacidad percibida de completar el seguimiento especialmente si existen obstáculos de transporte y cuidados?

**Tesis normativa:** una derivación es una medida de seguridad incompleta si la institución traslada a la persona la carga de conseguir una atención accesible. La evaluación ética de la IA debe seguir el recorrido hasta la atención recibida. La premisa es igualdad de oportunidades efectivas de atención ante igual necesidad, no simplemente igualdad de mensajes o de reglas administrativas.

La analogía procede de sistemas con respaldo: derivar una tarea a otro componente solo protege si ese componente puede recibirla. Se trasladan las relaciones entre derivación, capacidad y carga; no se equipara a las personas con paquetes informáticos. El artículo de Shen et al. inspira la búsqueda de esta estructura, pero no demuestra nuestra tesis [1].

**Contribución empírica delimitada:** un experimento estima efectos causales de descripciones de organización asistencial sobre expectativas y juicios. No mide cáncer detectado, seguridad clínica, congestión real ni asistencia efectiva. Sus resultados permiten seleccionar una intervención para un ensayo posterior y hacer explícitas las condiciones de acceso que la ciudadanía considera relevantes.

CoDoC estudia la complementariedad IA–profesionales [2]; MASAI aporta evidencia clínica de cribado apoyado por IA [3]. La navegación de pacientes ya cuenta con ensayos de seguimiento [4,5], y existen encuestas aleatorizadas sobre comunicación de IA en mamografía [6]. La originalidad candidata es **la interacción entre gestión de la cita y barreras prácticas, manteniendo constante la necesidad clínica y la demora disponible**, en un proceso con derivación de IA. Debe confirmarse mediante revisión específica antes de afirmar prioridad.

## 2. Escenario común: separar lectura humana y nueva visita

Todos reciben el mismo caso de una persona ficticia de 52 años y el mismo estímulo mamográfico sintético de un fantoma digital M-SYNTH, sin imagen adquirida de una paciente. Se presenta como contexto sin valor diagnóstico. Procedencia, licencia CC0 y hash fijo en [IMAGENES.md](IMAGENES.md).

> Imagine que está en la situación de esta persona. Su mamografía forma parte de un programa que utiliza IA. La IA no ofrece una conclusión suficientemente fiable y remite las imágenes al equipo de radiología. Tras una revisión inicial, el equipo considera necesaria una evaluación complementaria presencial para completar el estudio. Todavía no hay diagnóstico. La imagen solo ilustra el escenario; no permite determinar si hay cáncer.

**Distinción esencial:** la lectura humana de imágenes existentes no exige por sí misma que la persona vuelva al centro. El desplazamiento del escenario corresponde a una evaluación complementaria indicada por el equipo, no al acto de abstención de la IA. La incertidumbre algorítmica no equivale a mayor probabilidad de cáncer. No se asignan BI-RADS, probabilidades de malignidad ni etiquetas de tumor a la ilustración.

## 3. Diseño factorial entre participantes: 2 × 2 × 2

Cada persona recibe **una sola viñeta**, asignada con probabilidad 1/8. La versión de recogida no permite elegir condición ni ofrece un recorrido de demostración. La herramienta interna de revisión local puede inspeccionar los ocho escenarios sin transmitir respuestas.

| Factor | Nivel 0 | Nivel 1 |
|---|---|---|
| P: organización | La persona debe solicitar una cita; puede solicitarla o cambiarla por teléfono, sin internet. | El centro asigna una cita; puede confirmarla o solicitar un cambio por teléfono, sin internet. |
| B: barreras prácticas | Puede desplazarse con facilidad y tiene resueltos los cuidados durante la visita. | Necesita transporte con dos transbordos y organizar el cuidado de una persona dependiente. |
| D: demora disponible | Evaluación en 7 días. | Evaluación en 28 días. |

La disponibilidad temporal es la misma para ambas modalidades de gestión dentro de cada nivel D. La cita facilitada no promete resolver transporte o cuidados. P evalúa un paquete administrativo; B, un paquete de obstáculos. No identifica el efecto separado de cada componente. Los plazos son valores experimentales para contrastar esperas y **no representan límites clínicos universales de seguridad**.

Se mantienen iguales la imagen, la necesidad clínica, la información sobre incertidumbre, el coste asistencial, la calidad y la prioridad clínica. No se afirma igualdad de costes organizativos entre P=0 y P=1, ni se estima coste-efectividad. Evitar redacción que elogie una modalidad. Revisar extensión, legibilidad y tono.

## 4. Medidas e hipótesis

**Resultado primario único:** capacidad percibida de acudir a la evaluación complementaria en la primera fecha disponible, 0–100, con extremos «nada probable» y «completamente probable». La pregunta pide adoptar las condiciones del personaje. Es una expectativa subjetiva; no una probabilidad clínica calibrada. El formulario pide respuesta numérica; se puede salir antes de enviar sin justificarlo.

**H1:** el efecto de la cita facilitada sobre esa capacidad percibida es mayor con barreras altas que con barreras bajas. Primario: interacción P×B, promediada con igual peso sobre D. El efecto podría ser nulo o adverso: una cita asignada puede percibirse como rígida y no resolver obstáculos materiales.

**Secundarios:** justicia percibida del procedimiento (1–7) e intención declarada de intentar completar el seguimiento (0–100). Confianza (1–7) y atribución de responsabilidad son exploratorios. Son ítems de nueva elaboración, no escalas validadas. La demora, P×D, B×D y P×B×D serán exploratorios salvo nuevo dimensionamiento previo al estudio. No inferir causalidad mediadora a partir de correlaciones entre respuestas.

Después de los resultados, comprobar comprensión de quién organiza la cita, el plazo y la ausencia de diagnóstico. No pedir interpretar la imagen. El análisis principal conserva respuestas con fallos de comprensión; la restricción a quienes comprendieron será sensibilidad, porque la comprensión puede depender del tratamiento.

## 5. Preparación, participantes y potencia

Realizar 8–12 entrevistas cognitivas con diversidad de alfabetización y edad: pedir que expliquen el escenario, distingan incertidumbre y cáncer, identifiquen la acción requerida e interpreten los extremos de respuesta. Revisar con radiología y representantes de personas usuarias. Después, piloto técnico y cognitivo de 60–100 personas, separado del análisis confirmatorio. Revisar abandonos, tiempos, problemas móviles, distribución de respuestas y posibles efectos techo.

Inclusión: 18 años o más, comprensión del español y consentimiento. No exigir diagnóstico, experiencia de cáncer ni información sanitaria personal. Reclutar mediante panel o canales comunitarios diversos; registrar el canal. La muestra abierta de conveniencia permite inferencias experimentales internas, pero no estimar preferencias representativas de toda España. El estudio posterior puede centrarse en población convocada a cribado, con protocolo propio.

Dimensionar para **la interacción**, no para el efecto principal. Con asignación equilibrada, desviación estándar σ y diferencia de diferencias δ, la aproximación es:

`N ≈ 16 × σ² × (z[0,975] + z[potencia])² / δ²`.

Para 80 % de potencia y α bilateral 0,05, σ=20–25 puntos y δ=8–10 puntos dan aproximadamente **504–1.232 respuestas analizables**, redondeando a múltiplos de ocho. Como referencia operativa, **800 completas** serían unas 100 por celda y corresponderían aproximadamente a σ=25 y δ=10. Son supuestos, no resultados ni garantía de potencia. Se proponen **896 asignaciones consentidas**: con 10 % de falta de respuesta se esperan unas 806 completas. No reponer selectivamente participantes por brazo. Validar mediante simulación de escala limitada, desequilibrios y falta de respuesta; fijar δ con usuarios antes de observar efectos del piloto. No reducir la muestra porque el efecto piloto parezca grande. Prerregistrar tamaño, cierre y análisis.

## 6. Estimando y análisis

Sea μ[p,b,d] la media potencial del resultado primario en la condición indicada. El estimando confirmatorio es:

`ψ = ½ Σd { (μ[1,1,d] − μ[0,1,d]) − (μ[1,0,d] − μ[0,0,d]) }`.

ψ positivo significa que el beneficio percibido de facilitar la cita es mayor bajo barreras altas. Un ψ positivo no garantiza cerrar la brecha: mostrar también las ocho medias, efectos simples e intervalos de confianza. El promedio usa la distribución experimental de demoras, no una distribución asistencial conocida.

Ajustar un modelo saturado P×B×D y calcular el contraste marginal definido, con errores robustos HC3 e intervalo bilateral del 95 %. La unidad independiente es la persona. Mostrar resultados en puntos de escala; tratar por separado los secundarios, con corrección de Holm si se presentan como familia inferencial. Para justicia, complementar con modelo ordinal. No seleccionar modelos por significación.

Analizar por asignación original. Excluir solo duplicados verificables, envíos de prueba y registros técnicamente inválidos según reglas previas. Respuestas rápidas o fallos de comprensión no justifican exclusión automática. Registrar consentimiento y asignación antes de mostrar el estímulo permite calcular falta de respuesta y abandono por condición. Contrastar análisis observado con sensibilidad a desenlaces ausentes: límites de la escala y escenarios de desviación hasta el punto en que cambia la conclusión. No llamar intención de tratar completa a una muestra que omite desenlaces ausentes. El inicio se registra únicamente tras consentir; si no se confirma, no se muestra la viñeta como participación válida.

## 7. Consentimiento, datos y trazabilidad

El procedimiento ético aplicable debe documentarse según el ámbito efectivo del proyecto; este archivo no presupone una aprobación concreta ni una exención. No atribuir al estudio una institución o un aval no acreditados. El responsable del estudio es Aníbal Astobiza (amastobiza@ugr.es). La información de participación explica finalidad, voluntariedad, acceso, conservación y limitaciones para localizar respuestas individuales. Se advierte del contenido ficticio relacionado con cáncer de mama y se permite salir sin justificarlo. No existe beneficio clínico ni diagnóstico personal.

Recoger identificador aleatorio, consentimiento y versión, versión de protocolo, asignación, respuestas y tiempos necesarios. `Allocations` conserva inicios consentidos; `Responses` conserva envíos finales unidos mediante ese código, sin puente con identidad. Edad por bandas, género, educación, residencia urbana/rural y experiencia profesional sanitaria son obligatorios para enviar, sin valores por defecto; siempre se puede salir. No se piden nombre, correo, fecha de nacimiento, código postal, ubicación precisa, historia clínica ni texto libre. Describir demográficos únicamente de forma agregada, suprimiendo categorías pequeñas y sin cruces que faciliten identificación. El equipo no dispone de identificadores personales; no afirmar anonimato absoluto frente a metadatos técnicos de proveedores.

La información de privacidad está en `site/privacidad.html`. El acceso actual a los registros individuales está restringido al responsable. Se conservarán mientras sean necesarios para completar el análisis y la verificación científica; después se eliminarán y se mantendrán únicamente resultados agregados. GitHub Pages publica únicamente interfaz y materiales; Google Sheets debe permanecer privado. Conservar versiones y diccionario de datos, controlar acceso y exportar copias de análisis de solo lectura. No colocar respuestas ni credenciales en el repositorio. La sincronización debe confirmar recepción sin duplicar un envío reintentado. Registrar y separar pruebas; comprobar el recorrido completo con registros ficticios antes de abrir reclutamiento.

## 8. Qué aportaría y qué quedaría pendiente

El artículo puede mostrar si facilitar citas cambia de forma desigual expectativas de acceso, y si la población considera que una derivación formal es suficiente. No demostraría inequidad en cáncer, abandono real, ahorro de vidas o que la IA causó la demora. Al faltar un brazo sin IA, tampoco identifica un efecto específico de la IA frente a derivación exclusivamente humana. La imagen fija aporta contexto, no validación diagnóstica.

La siguiente fase sería un ensayo pragmático de seguimiento clínicamente indicado: asignación facilitada frente al procedimiento habitual, con tiempos hasta evaluación realizada, no asistencia, carga administrativa y diferencias según barreras reales. El plazo relevante lo definirían profesionales y usuarios para ese circuito. Su protocolo y recursos serían independientes.

**Salida social concreta:** especificación de una derivación que incluye responsable, cita accesible, mecanismo de cambio y comprobación de cierre; acompañada de evaluación de recursos y resultados reales antes de recomendar implantación. El argumento sobre obligaciones institucionales deberá defenderse normativamente: una encuesta informa sobre expectativas y aceptación, pero no decide por votación qué derechos existen.

Referencias numeradas y límites de cada antecedente en [referencias.md](referencias.md).
