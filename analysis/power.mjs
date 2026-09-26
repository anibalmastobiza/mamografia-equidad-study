#!/usr/bin/env node
/** Prospective power under explicit assumptions. NO participant data. */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SEED = 260926;
const REPLICATES = 20000;
let rngState = SEED >>> 0;
function uniform() {
  rngState = (rngState + 0x6D2B79F5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
let spare;
function normal() {
  if (spare !== undefined) { const result = spare; spare = undefined; return result; }
  const radius = Math.sqrt(-2 * Math.log(1 - uniform()));
  const angle = 2 * Math.PI * uniform();
  spare = radius * Math.sin(angle);
  return radius * Math.cos(angle);
}
// Marsaglia–Tsang gamma(shape, scale=1), used for exact normal sample variances.
function gamma(shape) {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const x = normal();
    const base = 1 + c * x;
    if (base <= 0) continue;
    const v = base ** 3;
    const u = uniform();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const Z975 = 1.959963984540054;
const Z80 = 0.8416212335729143;
const Z90 = 1.2815515655446004;
// Accurate expansion at the present df >= 504. It is not a general quantile API.
function t975(df) {
  const z = Z975;
  return z + (z ** 3 + z) / (4 * df)
    + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2)
    + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3);
}
function cdf(x) {
  const sign = x < 0 ? -1 : 1;
  const v = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * v);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-v * v);
  return (1 + sign * erf) / 2;
}
function analyticPower(n, sd, delta) {
  const noncentral = delta * Math.sqrt(n) / (4 * sd);
  return cdf(noncentral - Z975) + cdf(-noncentral - Z975);
}
function minimumN(sd, delta, zPower) {
  const unrounded = 16 * sd ** 2 * (Z975 + zPower) ** 2 / delta ** 2;
  return { raw_approximation: unrounded, rounded_multiple_8: 8 * Math.ceil(unrounded / 8) };
}
function monteCarlo(n, sd, delta) {
  const cellN = n / 8;
  const cellDf = cellN - 1;
  const critical = t975(n - 8);
  let significant = 0;
  for (let replicate = 0; replicate < REPLICATES; replicate++) {
    let psi = 0;
    let varianceHC3 = 0;
    for (let p = 0; p < 2; p++) for (let b = 0; b < 2; b++) for (let d = 0; d < 2; d++) {
      const weight = p === b ? 0.5 : -0.5;
      const populationMean = 55 + 2 * (p - 0.5) - 10 * (b - 0.5) - 3 * (d - 0.5)
        + delta * (p - 0.5) * (b - 0.5);
      const mean = populationMean + sd / Math.sqrt(cellN) * normal();
      const sampleVariance = sd ** 2 * (2 * gamma(cellDf / 2)) / cellDf;
      psi += weight * mean;
      // For a saturated cell-means regression, HC3 Var(mean) = s²/(n_cell - 1).
      varianceHC3 += weight ** 2 * sampleVariance / cellDf;
    }
    if (Math.abs(psi / Math.sqrt(varianceHC3)) > critical) significant++;
  }
  const power = significant / REPLICATES;
  const mcse = Math.sqrt(power * (1 - power) / REPLICATES);
  return { power, monte_carlo_standard_error: mcse,
    monte_carlo_interval_95: [Math.max(0, power - 1.96 * mcse), Math.min(1, power + 1.96 * mcse)] };
}
const rows = [];
for (const sd of [20, 25]) for (const delta of [8, 10]) for (const n of [512, 800, 1024, 1232]) {
  rows.push({ complete_responses: n, complete_per_cell: n / 8,
    assumed_sd_points: sd, assumed_interaction_points: delta,
    analytic_normal_power: analyticPower(n, sd, delta),
    monte_carlo_HC3: monteCarlo(n, sd, delta) });
}
const targets = [];
for (const sd of [20, 25]) for (const delta of [8, 10]) {
  targets.push({ assumed_sd_points: sd, assumed_interaction_points: delta,
    target_80: minimumN(sd, delta, Z80), target_90: minimumN(sd, delta, Z90) });
}
const result = {
  kind: 'PROSPECTIVE_POWER_SIMULATION_NOT_PARTICIPANT_RESULTS',
  explanation: 'Simulación de supuestos de planificación. No contiene respuestas ni estimaciones de personas reales.',
  seed: SEED, replicates_per_condition: REPLICATES, alpha_two_sided: 0.05,
  design: 'Una viñeta por persona; ocho celdas de igual tamaño; interacción P×B promediada igualmente sobre D.',
  analysis: 'Medias y varianzas muestrales normales independientes; contraste saturado con varianza HC3 y umbral t(df=N−8).',
  distribution_warning: 'Modelo normal SIN truncar. Las respuestas reales están limitadas a 0–100; techo, suelo, heterocedasticidad y abandono pueden cambiar la potencia.',
  formula: 'N ≈ 16*SD²*(z_0.975+z_potencia)²/delta²; aproxima potencia, no garantiza resultados.',
  recruitment_plan: { fixed_allocations: 896, assumed_completion_probability: 0.9,
    expected_complete_responses: 806.4, planning_reference_complete: 800,
    rule: 'Fijar 896 asignaciones consentidas; no reponer por brazo ni detener por resultados. Reevaluar supuestos antes de prerregistrar, no durante análisis confirmatorio.' },
  analytic_targets: targets, sensitivity: rows,
};
const output = fileURLToPath(new URL('./power-sensitivity.json', import.meta.url));
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Simulación de potencia (NO resultados de participantes): ${output}`);
console.table(rows.map(row => ({ N: row.complete_responses, SD: row.assumed_sd_points,
  delta: row.assumed_interaction_points, normal: row.analytic_normal_power.toFixed(3),
  HC3_MC: row.monte_carlo_HC3.power.toFixed(3), MC_SE: row.monte_carlo_HC3.monte_carlo_standard_error.toFixed(3) })));
