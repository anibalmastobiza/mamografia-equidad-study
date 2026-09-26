# Análisis reproducible y planificación de potencia

Contacto del proyecto: **Aníbal Astobiza — amastobiza@ugr.es**. Este documento es para el equipo investigador. No forma parte del texto mostrado a participantes.

## Qué mide este prototipo

Una persona responde a una única viñeta aleatoria. El resultado primario `ability` es la probabilidad subjetiva, de 0 a 100, de **poder acudir a la evaluación complementaria en la primera fecha disponible**, adoptando la situación de la persona ficticia. `intention` mide intención de intentar completar la evaluación, también de 0 a 100. Son constructos distintos. `fairness` mide justicia percibida, de 1 a 7.

La ilustración es contextual y fija; no se interpreta ni clasifica. Las respuestas no son diagnósticos, conducta asistencial, cáncer detectado ni demostración de daño causado por IA.

`trust` (1–7), atribución de `responsibility` y las comprobaciones de comprensión son exploratorios. Las comprobaciones se administran después de los factores experimentales y nunca excluyen respuestas del análisis primario. No hay un brazo sin IA; el experimento no aísla un efecto causal específico de la IA.

## Contrato y datos mínimos

El programa lee exportaciones CSV de las pestañas privadas `Responses` y `Allocations`, utilizando las cabeceras del receptor y una sola entrada en `trials_json`. La asignación se registra tras el consentimiento y antes de mostrar la viñeta; el mismo identificador aleatorio enlaza el envío final. No existe una tabla que vincule ese identificador con nombre o correo de participantes.

Los cinco campos demográficos son obligatorios para enviar, conforme al diseño solicitado; no tienen valores por defecto. La persona puede salir antes del envío. Se usan categorías amplias:

| Campo | Valores admitidos |
|---|---|
| `age_band` | `18-39`, `40-59`, `60+` |
| `gender` | `woman`, `man`, `nonbinary`, `other` |
| `education` | `primary_or_less`, `secondary`, `vocational`, `university` |
| `residence` | `urban`, `rural` |
| `healthcare_experience` | `yes`, `no` |

No se recogen nombre, correo, fecha de nacimiento, código postal, ubicación precisa, IP en el conjunto de análisis ni historia clínica. El equipo no dispone de un puente con la identidad; no debe prometer anonimato absoluto respecto de todos los metadatos que puedan tratar los proveedores. En análisis se muestran únicamente distribuciones marginales demográficas, sin cruces pequeños ni pruebas confirmatorias de moderación demográfica. Se suprimen recuentos de 1–4 y, cuando sea necesario, una categoría adicional para impedir reconstrucción por diferencia. Con menos de diez respuestas no se muestran distribuciones demográficas.

El validador detiene la ejecución si encuentra cabeceras inesperadas o repetidas, identificadores duplicados —incluso filas idénticas—, versiones mezcladas, un modo distinto de `pilot`, JSON incorrecto, valores fuera del contrato, huellas de contenido incoherentes, respuestas sin asignación o una asignación contradictoria. No limpia problemas silenciosamente. Resolverlos en el origen y conservar un registro de cualquier corrección.

Las versiones esperadas son estudio `1.0.0` y consentimiento `1.0.0`; una revisión del protocolo o del estímulo exige revisar la versión antes de recoger otra cohorte. `mode=pilot` permite ensayar la recogida, pero no hace confirmatorio un piloto: **no mezclar sus datos con la cohorte principal**. Para esta última deben congelarse materiales, versión y prerregistro.

## Cómo ejecutar

Los requisitos están en `analysis/requirements.txt`. No se instalan dependencias automáticamente. Con un entorno que tenga pandas, NumPy y statsmodels:

```bash
python3 analysis/analysis.py \
  --responses /ruta/privada/Responses.csv \
  --allocations /ruta/privada/Allocations.csv \
  --output /ruta/privada/resultado-v1 \
  --data-kind collected
```

`--data-kind collected` es una declaración de procedencia del investigador, no una certificación técnica. Para ensayos de software usar `--data-kind synthetic-test`; las salidas quedarán rotuladas como pruebas. El programa no genera respuestas de participantes y no estima efectos sin CSV de entrada.

La carpeta de salida debe estar vacía. Se producen `results.json`, `cells-and-attrition.csv` y `report.md`; incluyen versiones de dependencias y huellas de los archivos de entrada. No exportan filas individuales ni identificadores. No subir CSV de entrada ni salidas sin revisión a un repositorio público. El código y el cálculo prospectivo de potencia pueden compartirse; los datos requieren su política de acceso.

## Estimando, modelo y lectura

Con P=1 cita asignada, B=1 barreras altas, D=1 espera de 28 días:

`ψ = ½ Σd [(μ11d − μ01d) − (μ10d − μ00d)]`.

Se centra cada factor en −0,5/+0,5 y se ajusta el modelo saturado:

`ability ~ policy_c * barrier_c * delay_c`.

El coeficiente `policy_c:barrier_c` equivale exactamente al contraste de medias con igual peso en ambos niveles de demora, también si los tamaños observados no son iguales. El programa utiliza covarianza HC3 y referencia t con N−8 grados de libertad; presenta puntos originales de la escala, intervalo bilateral del 95 % y p bilateral. El modelo no normaliza respuestas ni elimina comprobaciones incorrectas. Requiere al menos dos respuestas por celda para estimar HC3; con un resultado constante no presenta inferencia artificial.

Una interacción positiva significa mayor efecto de la cita asignada en la situación con barreras altas. **No equivale a eliminar la brecha**, ni necesariamente a mejorar a todos los grupos. Revisar ocho medias, diferencias simples y dimensiones absolutas de la diferencia. La media sobre D corresponde a una distribución experimental 50/50, no a una distribución observada de servicios sanitarios.

Para `intention` y `fairness`, se repite el contraste como familia secundaria con ajuste Holm de las dos pruebas. El análisis de `fairness` trata la escala numéricamente y debe complementarse, en el plan definitivo, con una sensibilidad ordinal previamente especificada; este script no estima un modelo ordinal. Confianza, responsabilidad y demográficos permanecen descriptivos. No interpretar un análisis secundario como corroboración independiente de la hipótesis principal.

## Falta de respuesta y límites de interpretación

El denominador por condición es toda asignación consentida; el numerador, toda respuesta final válida de esa condición. La ausencia de envío puede deberse a abandono, obstáculos de carga o conexión, o falta de confirmación antes de ver el escenario. **No es automáticamente rechazo del estudio ni prueba de exposición al texto.** El registro no revela cuáles de esos mecanismos operaron.

La regresión usa las respuestas observadas por asignación original. Si hay desenlaces ausentes no constituye una estimación completa por intención de tratar y puede tener sesgo de selección. Además de tasas de falta de respuesta por brazo, se calculan límites por celda:

`media mínima = suma observada / N asignado`

`media máxima = (suma observada + 100 × número ausente) / N asignado`.

Se combinan los extremos según el signo de los pesos ±½ del contraste primario. Los límites permiten cualquier valor ausente entre 0 y 100: **son límites descriptivos de identificación, no intervalos de confianza** ni solución de los sesgos de reclutamiento.

Se incluyen escenarios de desplazamiento para los ausentes: media de su celda más un cambio de −100 a +100 puntos, con signo acorde al peso del contraste y limitada a la escala. Esto permite localizar cuándo cambia el signo de ψ. Son supuestos transparentes; el escenario de cero desplazamiento tampoco está probado. Si alguna celda no tiene respuestas no se ejecuta esta sensibilidad relativa a medias observadas. No declarar ausencia de inequidad a partir de un p no significativo o de límites muy amplios.

## Potencia: simulación de diseño, no resultados

```bash
node analysis/power.mjs
```

El cálculo, sin dependencias externas, usa semilla fija y guarda `analysis/power-sensitivity.json`. Compara N completos de 512, 800, 1.024 y 1.232; desviaciones estándar de 20 y 25; y diferencias de diferencias de 8 y 10 puntos. Hay 20.000 réplicas por combinación, simulando medias y varianzas de ocho muestras normales independientes. El contraste reproduce la varianza HC3 de un modelo saturado y una aproximación muy precisa al umbral t con estos grados de libertad. Se informa incertidumbre Monte Carlo, distinta de la incertidumbre de un futuro estudio.

La aproximación analítica es `N ≈ 16σ²(z0,975 + zpotencia)²/δ²`; se muestran objetivos de 80 % y 90 %. El supuesto de referencia es 800 respuestas completas, σ=25 y δ=10. La propuesta de cierre es **896 asignaciones consentidas**, con unas 806 respuestas esperadas si completa el 90 %. Son expectativas; no reemplazar selectivamente abandonos ni continuar porque el resultado no alcance significación.

La distribución simulada es normal **sin truncar**. Las respuestas verdaderas están entre 0 y 100; efectos techo/suelo, heterocedasticidad, desequilibrios y abandono pueden alterar potencia y validez. El piloto sirve para revisar estas características y comprensión; no para elegir a posteriori un efecto grande y reducir la muestra. Confirmar el efecto mínimo relevante con usuarios, actualizar supuestos antes del prerregistro y separar claramente piloto, simulación y estudio principal.

## Comunicación de resultados

Presentar primero interacción con intervalo, medias y falta de respuesta; después resultados secundarios. Informar composición y forma de reclutamiento, sin afirmar representatividad de población general por usar un enlace público. No extrapolar una expectativa de asistencia a casos de cáncer evitados, vidas salvadas o resultados clínicos. Una fase posterior necesita observar citas realmente completadas y su distribución social.
