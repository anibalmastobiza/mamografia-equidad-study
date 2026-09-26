#!/usr/bin/env python3
"""Analyse explicitly supplied CSVs; never generates participant responses.

Inputs must be unchanged CSV exports of the private Responses and Allocations
tabs. Output contains aggregates, not participant-level identifiers or records.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels
import statsmodels.formula.api as smf
from statsmodels.stats.multitest import multipletests

BASE = ['received_at', 'submission_id', 'study_version', 'consent_version', 'mode', 'assignment']
ALLOCATION_HEADERS = BASE + ['payload_hash']
DEMOGRAPHICS = {
    'age_band': ['18-39', '40-59', '60+'],
    'gender': ['woman', 'man', 'nonbinary', 'other'],
    'education': ['primary_or_less', 'secondary', 'vocational', 'university'],
    'residence': ['urban', 'rural'],
    'healthcare_experience': ['yes', 'no'],
}
RESPONSE_HEADERS = BASE + ['completed_trials', 'elapsed_ms', *DEMOGRAPHICS,
    'trials_json', 'post_json', 'payload_hash']
TRIAL_KEYS = {'scenario_id', 'image_id', 'policy', 'delay', 'barrier', 'ability',
    'intention', 'fairness', 'trust', 'responsibility', 'elapsed_ms'}
POST_KEYS = {'check_uncertainty', 'check_wait', 'check_policy'}
UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)
ARM_RE = re.compile(r'^P([01])-D([01])-B([01])$')
ARMS = [f'P{p}-D{d}-B{b}' for p, d, b in itertools.product((0, 1), repeat=3)]
PRIMARY_TERM = 'policy_c:barrier_c'


def fail(message: str):
    raise ValueError(message)


def int_value(value, low, high, field, json_value=False):
    if json_value:
        valid = type(value) is int
    else:
        valid = isinstance(value, str) and bool(re.fullmatch(r'\d+', value))
    if not valid or not low <= int(value) <= high:
        fail(f'Valor inválido en {field}; no se ha excluido silenciosamente la fila.')
    return int(value)


def exact_keys(value, keys, field):
    if not isinstance(value, dict) or set(value) != set(keys):
        fail(f'Estructura JSON no admitida en {field}.')


def parse_json(value, field):
    def unique_pairs(pairs):
        obj = {}
        for key, item in pairs:
            if key in obj:
                fail(f'Clave JSON duplicada en {field}.')
            obj[key] = item
        return obj
    try:
        return json.loads(value, object_pairs_hook=unique_pairs,
            parse_constant=lambda _: fail(f'Número no finito en {field}.'))
    except (json.JSONDecodeError, TypeError):
        fail(f'JSON inválido en {field}.')


def payload_hash(payload):
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def read_table(path, headers, study_version, consent_version):
    # csv.reader detects duplicate header names before pandas can rename them.
    with Path(path).open(encoding='utf-8-sig', newline='') as handle:
        actual = next(csv.reader(handle), None)
    if actual is None or len(actual) != len(set(actual)) or set(actual) != set(headers):
        fail(f'{Path(path).name}: cabecera distinta del contrato; exporte la pestaña completa sin modificarla.')
    table = pd.read_csv(path, dtype=str, keep_default_na=False, encoding='utf-8-sig')
    duplicate = table['submission_id'].duplicated(keep=False)
    if duplicate.any():
        repeated = table.loc[duplicate]
        conflict = any(len(group.drop_duplicates()) > 1 for _, group in repeated.groupby('submission_id'))
        fail(f'{Path(path).name}: identificadores repetidos ({"con conflicto" if conflict else "filas idénticas"}); resolver en el origen.')
    for row in table.to_dict('records'):
        if not UUID_RE.fullmatch(row['submission_id']):
            fail('Identificador inválido.')
        if not ARM_RE.fullmatch(row['assignment']):
            fail('Asignación inválida.')
        if row['study_version'] != study_version or row['consent_version'] != consent_version:
            fail('Mezcla de versiones o versión inesperada: separar los estudios, no agruparlos automáticamente.')
        if row['mode'] != 'pilot':
            fail('Modo distinto de pilot: las demostraciones no son participantes del estudio.')
        if not re.fullmatch(r'[a-f0-9]{64}', row['payload_hash']):
            fail('Huella de integridad inválida.')
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z', row['received_at']):
            fail('Fecha inválida: conservar ISO UTC en los CSV exportados.')
    try:
        table['_received'] = pd.to_datetime(table['received_at'], utc=True, errors='raise')
    except (ValueError, TypeError):
        fail('Fecha no interpretable en la exportación.')
    return table


def load_data(responses_path, allocations_path, study_version='1.0.0', consent_version='1.0.0'):
    allocations = read_table(allocations_path, ALLOCATION_HEADERS, study_version, consent_version)
    responses = read_table(responses_path, RESPONSE_HEADERS, study_version, consent_version)
    if allocations.empty:
        fail('No hay asignaciones: no se ha calculado ningún resultado.')
    for row in allocations.to_dict('records'):
        allocation = {key: row[key] for key in ['submission_id', 'study_version', 'consent_version', 'mode', 'assignment']}
        allocation.update(event='allocation', consent=True)
        if payload_hash(allocation) != row['payload_hash']:
            fail('La huella de una asignación no coincide con su contenido.')

    parsed = []
    for row in responses.to_dict('records'):
        if row['completed_trials'] != '1':
            fail('El estudio admite exactamente una viñeta por persona.')
        elapsed = int_value(row['elapsed_ms'], 1000, 7200000, 'elapsed_ms')
        for key, allowed in DEMOGRAPHICS.items():
            if row[key] not in allowed:
                fail(f'Categoría demográfica inválida en {key}.')
        trials = parse_json(row['trials_json'], 'trials_json')
        post = parse_json(row['post_json'], 'post_json')
        if not isinstance(trials, list) or len(trials) != 1:
            fail('trials_json debe contener una sola viñeta.')
        trial = trials[0]
        exact_keys(trial, TRIAL_KEYS, 'trial')
        exact_keys(post, POST_KEYS, 'post')
        if trial['scenario_id'] != row['assignment'] or trial['image_id'] != 'mammogram-01':
            fail('Escenario o imagen incoherente con la asignación.')
        for key in ['policy', 'delay', 'barrier']:
            int_value(trial[key], 0, 1, key, True)
        expected = f"P{trial['policy']}-D{trial['delay']}-B{trial['barrier']}"
        if expected != row['assignment']:
            fail('Factores incoherentes con la asignación.')
        for key in ['ability', 'intention']:
            int_value(trial[key], 0, 100, key, True)
        for key in ['fairness', 'trust']:
            int_value(trial[key], 1, 7, key, True)
        if trial['responsibility'] not in ['service', 'shared', 'patient']:
            fail('Valor de responsabilidad inválido.')
        int_value(trial['elapsed_ms'], 1, elapsed, 'trial.elapsed_ms', True)
        if post['check_uncertainty'] not in ['not_diagnosis', 'cancer', 'all_clear', 'unsure']:
            fail('Comprobación de incertidumbre inválida.')
        if post['check_wait'] not in ['7', '28', 'unsure'] or post['check_policy'] not in ['self', 'assigned', 'unsure']:
            fail('Comprobación de comprensión inválida.')
        original = {key: row[key] for key in ['submission_id', 'study_version', 'consent_version', 'mode', 'assignment', *DEMOGRAPHICS]}
        original.update(consent=True, elapsed_ms=elapsed, trials=trials, post=post)
        if payload_hash(original) != row['payload_hash']:
            fail('La huella de una respuesta no coincide: el CSV puede haber sido editado.')
        checks = [post['check_uncertainty'] == 'not_diagnosis',
            post['check_wait'] == ('28' if trial['delay'] else '7'),
            post['check_policy'] == ('assigned' if trial['policy'] else 'self')]
        parsed.append({**{k: row[k] for k in [*BASE, *DEMOGRAPHICS]}, '_received': row['_received'],
            **trial, 'checks_correct': sum(checks), 'comprehension_all_correct': all(checks)})

    outcome_columns = BASE + list(DEMOGRAPHICS) + ['_received'] + sorted(TRIAL_KEYS - {'scenario_id'}) + ['checks_correct', 'comprehension_all_correct']
    outcomes = pd.DataFrame(parsed) if parsed else pd.DataFrame(columns=outcome_columns)
    unknown = set(outcomes['submission_id']) - set(allocations['submission_id'])
    if unknown:
        fail('Hay respuestas sin asignación consentida registrada.')
    check = allocations.merge(outcomes, on='submission_id', how='inner', suffixes=('_a', '_r'), validate='one_to_one')
    for key in ['study_version', 'consent_version', 'mode', 'assignment']:
        if not check[f'{key}_a'].eq(check[f'{key}_r']).all():
            fail('Una respuesta contradice el registro original de asignación.')
    if not check['_received_r'].ge(check['_received_a']).all():
        fail('Una respuesta tiene fecha anterior a su asignación.')
    for key in ['policy', 'delay', 'barrier']:
        if not outcomes.empty:
            outcomes[f'{key}_c'] = outcomes[key].astype(float) - 0.5
    allocations['completed'] = allocations['submission_id'].isin(outcomes['submission_id'])
    return outcomes, allocations


def describe_cells(outcomes, allocations):
    rows = []
    for arm in ARMS:
        assigned = allocations[allocations.assignment == arm]
        group = outcomes[outcomes.assignment == arm]
        n_a, n = len(assigned), len(group)
        p, d, b = map(int, ARM_RE.fullmatch(arm).groups())
        row = dict(assignment=arm, policy=p, delay=d, barrier=b, allocated=n_a,
            completed=n, missing=n_a-n, completion_rate=n/n_a if n_a else None)
        for outcome in ['ability', 'intention', 'fairness', 'trust']:
            values = group[outcome].astype(float)
            row[f'{outcome}_mean'] = float(values.mean()) if n else None
            row[f'{outcome}_sd'] = float(values.std(ddof=1)) if n > 1 else None
            row[f'{outcome}_sum'] = float(values.sum())
        row['comprehension_all_correct_n'] = int(group['comprehension_all_correct'].sum()) if n else 0
        rows.append(row)
    return pd.DataFrame(rows)


def contrast(outcomes, outcome):
    counts = outcomes.groupby('assignment').size().reindex(ARMS, fill_value=0)
    if (counts < 2).any():
        return {'status': 'not_estimated', 'reason': 'HC3 requiere al menos dos respuestas en cada una de las ocho celdas.'}
    if outcomes[outcome].nunique() < 2:
        return {'status': 'not_estimated', 'reason': 'Resultado sin variación.'}
    model = smf.ols(f'{outcome} ~ policy_c * barrier_c * delay_c', data=outcomes).fit(cov_type='HC3', use_t=True)
    interval = model.conf_int().loc[PRIMARY_TERM]
    if not np.isfinite([model.params[PRIMARY_TERM], model.bse[PRIMARY_TERM], *interval]).all() or model.bse[PRIMARY_TERM] <= 0:
        return {'status': 'not_estimated', 'reason': 'Varianza insuficiente o covarianza no finita.'}
    return {'status': 'estimated', 'outcome': outcome, 'term': PRIMARY_TERM,
        'estimate': float(model.params[PRIMARY_TERM]), 'standard_error_HC3': float(model.bse[PRIMARY_TERM]),
        'ci95_lower': float(interval.iloc[0]), 'ci95_upper': float(interval.iloc[1]),
        'p_two_sided': float(model.pvalues[PRIMARY_TERM]), 'df_residual': float(model.df_resid),
        'n_observed': int(model.nobs), 'scale': 'original; sin normalizar',
        'contrast': 'promedio de D con peso 1/2; (P1-P0 en B1) - (P1-P0 en B0)',
        'interpretation': 'Efecto sobre valoración declarada entre respuestas observadas; la falta de respuesta puede sesgarlo.'}


def missing_sensitivity(cells):
    if (cells.allocated == 0).any():
        return {'status': 'not_estimated', 'reason': 'Hay celdas sin asignaciones.'}
    low, high = 0.0, 0.0
    bounds = []
    for row in cells.to_dict('records'):
        weight = 0.5 if row['policy'] == row['barrier'] else -0.5
        lo = row['ability_sum'] / row['allocated']
        hi = (row['ability_sum'] + 100*row['missing']) / row['allocated']
        low += weight * (lo if weight > 0 else hi)
        high += weight * (hi if weight > 0 else lo)
        bounds.append({'assignment': row['assignment'], 'weight': weight, 'mean_lower': lo, 'mean_upper': hi})
    shifts = []
    if (cells.completed > 0).all():
        for delta in range(-100, 101, 5):
            psi = 0.0
            for row in cells.to_dict('records'):
                weight = 0.5 if row['policy'] == row['barrier'] else -0.5
                # Prespecified scenario: signs of shifts follow signs of contrast.
                missing_mean = float(np.clip(row['ability_mean'] + np.sign(weight)*delta, 0, 100))
                mean = (row['ability_sum'] + row['missing']*missing_mean)/row['allocated']
                psi += weight*mean
            shifts.append({'signed_missing_shift_points': delta, 'psi': psi})
    return {'status': 'estimated', 'scale_limits': [0, 100], 'psi_lower': low, 'psi_upper': high,
        'type': 'Límites descriptivos de identificación para desenlaces ausentes; NO son intervalos de confianza.',
        'assumptions': 'Ninguna restricción sobre ausentes salvo rango 0–100; igual peso de las ocho condiciones.',
        'cell_bounds': bounds, 'shift_scenarios': shifts,
        'shift_definition': 'Media de ausentes = media observada de su celda + signo del peso × delta, limitada a 0–100. Escenarios, no imputaciones verificadas.'}


def demographic_summary(responses):
    if len(responses) < 10:
        return {'status': 'suppressed', 'reason': 'Menos de diez respuestas; no se muestran categorías demográficas.'}
    result = {}
    for key, levels in DEMOGRAPHICS.items():
        counts = responses[key].value_counts().reindex(levels, fill_value=0)
        suppressed = set(counts[(counts > 0) & (counts < 5)].index)
        if len(suppressed) == 1:
            remaining = counts[(counts > 0) & ~counts.index.isin(suppressed)]
            if len(remaining):
                suppressed.add(remaining.idxmin())
        result[key] = {level: ('suppressed' if level in suppressed else int(counts[level])) for level in levels}
    return {'status': 'aggregate_only', 'counts': result,
        'rule': 'Suprimir recuentos 1–4; si solo hay uno, suprimir otro recuento no nulo para evitar reconstrucción por diferencia. Sin cruces de variables ni contrastes de subgrupos.'}


def analyse(responses, allocations):
    cells = describe_cells(responses, allocations)
    primary = contrast(responses, 'ability')
    secondary = {key: contrast(responses, key) for key in ['intention', 'fairness']}
    valid = [key for key, result in secondary.items() if result['status'] == 'estimated']
    if len(valid) == 2:
        adjusted = multipletests([secondary[key]['p_two_sided'] for key in valid], method='holm')[1]
        for key, p in zip(valid, adjusted):
            secondary[key]['p_Holm_secondary_family'] = float(p)
    # Post-treatment comprehension is described but never used to exclude primary outcomes.
    return cells, {'primary': primary, 'secondary': secondary, 'demographics': demographic_summary(responses),
        'missing_sensitivity': missing_sensitivity(cells),
        'comprehension': {'observed_n': len(responses),
            'all_correct_n': int(responses.comprehension_all_correct.sum()) if len(responses) else 0,
            'used_for_primary_exclusion': False},
        'exploratory': {'trust': 'Solo descriptivos por celda.',
            'responsibility_counts': {str(k): int(v) for k, v in responses.responsibility.value_counts().items()},
            'delay_and_three_way_interaction': 'No se realizan pruebas confirmatorias adicionales.'}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--responses', type=Path, required=True)
    parser.add_argument('--allocations', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--data-kind', choices=['collected', 'synthetic-test'], required=True,
        help='Declaración explícita de procedencia. El programa no verifica que una persona real produjo las respuestas.')
    parser.add_argument('--study-version', default='1.0.0')
    parser.add_argument('--consent-version', default='1.0.0')
    args = parser.parse_args()
    try:
        responses, allocations = load_data(args.responses, args.allocations, args.study_version, args.consent_version)
        cells, results = analyse(responses, allocations)
    except (ValueError, OSError, pd.errors.ParserError) as error:
        parser.exit(2, f'Validación detenida: {error}\n')
    if args.output.exists() and any(args.output.iterdir()):
        parser.exit(2, 'La carpeta de salida no está vacía; utilice otra para conservar trazabilidad.\n')
    args.output.mkdir(parents=True, exist_ok=True)
    label = 'CSV de encuesta aportados; origen declarado por quien ejecuta' if args.data_kind == 'collected' else 'PRUEBA SINTÉTICA: no son resultados de participantes'
    results.update(data_kind=args.data_kind, label=label,
        versions={'study': args.study_version, 'consent': args.consent_version, 'pandas': pd.__version__, 'numpy': np.__version__, 'statsmodels': statsmodels.__version__},
        input_sha256={name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in [('responses', args.responses), ('allocations', args.allocations)]},
        counts={'allocated': len(allocations), 'completed': len(responses), 'without_final_response': len(allocations)-len(responses)},
        limitations=['No mide diagnóstico, asistencia, cáncer ni tiempos reales de atención.',
            'El azar actúa sobre descripciones; no identifica un efecto específico de IA sin brazo de comparación humano.',
            'Las asignaciones sin respuesta final incluyen abandono y fallos técnicos; no prueban exposición al escenario.',
            'Identificadores aleatorios permiten detectar envíos repetidos, no garantizan una única persona por navegador o enlace abierto.'])
    (args.output/'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')
    cells.to_csv(args.output/'cells-and-attrition.csv', index=False)
    summary = [f'# Análisis de viñetas — {label}', '',
        f'Asignaciones: {len(allocations)}. Respuestas finales: {len(responses)}. Sin respuesta final: {len(allocations)-len(responses)}.', '',
        'El contraste primario mide una diferencia de diferencias sobre capacidad percibida de acudir en la primera fecha disponible. No mide seguimiento realizado.']
    if results['primary']['status'] == 'estimated':
        r = results['primary']
        summary += ['', f"Estimación: {r['estimate']:.2f} puntos; IC95 % HC3 [{r['ci95_lower']:.2f}, {r['ci95_upper']:.2f}]; p bilateral {r['p_two_sided']:.4g}.",
            'Una estimación positiva significa mayor efecto de la cita asignada bajo barreras altas. Examinar también brechas, medias por celda y falta de respuesta.']
    else:
        summary += ['', 'Contraste no estimado: '+results['primary']['reason']]
    summary += ['', 'La tabla de falta de respuesta utiliza todas las asignaciones consentidas. Los límites para desenlaces ausentes son límites descriptivos, no intervalos de confianza. Los fallos de comprensión permanecen en el análisis principal.', '',
        'Los archivos no deben publicarse sin revisar tamaños pequeños, procedencia y riesgo de identificación. Ningún resultado se ha generado sin CSV de entrada.']
    (args.output/'report.md').write_text('\n'.join(summary)+'\n', encoding='utf-8')
    print(f'Análisis terminado. {label}. Salida agregada: {args.output}')


if __name__ == '__main__':
    main()
