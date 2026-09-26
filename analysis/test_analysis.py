"""Synthetic software checks only; these are not participant observations."""
import csv
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import uuid

SPEC = importlib.util.spec_from_file_location('study_analysis', Path(__file__).with_name('analysis.py'))
analysis = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(analysis)


def fixtures(folder):
    allocations, responses = [], []
    for arm in analysis.ARMS:
        p, d, b = map(int, analysis.ARM_RE.fullmatch(arm).groups())
        for i in range(9):
            identity = str(uuid.uuid4())
            common = dict(submission_id=identity, study_version='1.0.0', consent_version='1.0.0', mode='pilot', assignment=arm)
            allocations.append(dict(received_at='2026-09-26T10:00:00.000Z', **common,
                payload_hash=analysis.payload_hash(dict(**common, event='allocation', consent=True))))
            if i == 8:
                continue  # Exactly one missing final response in each condition.
            trial = dict(scenario_id=arm, image_id='mammogram-01', policy=p, delay=d, barrier=b,
                ability=50 + 8*p - 12*b - 3*d + 10*p*b + (-7+2*i),
                intention=65 + p - b + (-7+2*i), fairness=2+i % 4, trust=4,
                responsibility='shared', elapsed_ms=2000)
            post = dict(check_uncertainty='unsure', check_wait='unsure', check_policy='unsure')
            demographics = dict(age_band='40-59', gender='woman', education='university', residence='urban', healthcare_experience='no')
            payload = dict(**common, **demographics, consent=True, elapsed_ms=3000, trials=[trial], post=post)
            responses.append(dict(received_at='2026-09-26T10:00:03.000Z', **common,
                completed_trials='1', elapsed_ms='3000', **demographics,
                trials_json=json.dumps([trial]), post_json=json.dumps(post), payload_hash=analysis.payload_hash(payload)))
    def write(path, headers, rows):
        with path.open('w', newline='', encoding='utf-8') as handle:
            writer = csv.DictWriter(handle, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
    a_path, r_path = folder/'Allocations.csv', folder/'Responses.csv'
    write(a_path, analysis.ALLOCATION_HEADERS, allocations)
    write(r_path, analysis.RESPONSE_HEADERS, responses)
    return r_path, a_path, responses, allocations, write


class AnalysisChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='mamografia-synthetic-test-')
        self.folder = Path(self.temp.name)
        self.r, self.a, self.responses, self.allocations, self.write = fixtures(self.folder)

    def tearDown(self):
        self.temp.cleanup()

    def test_known_contrast_and_missing_bounds(self):
        responses, allocations = analysis.load_data(self.r, self.a)
        cells, results = analysis.analyse(responses, allocations)
        self.assertEqual(len(responses), 64)
        self.assertEqual(len(allocations), 72)
        self.assertAlmostEqual(results['primary']['estimate'], 10, places=9)
        self.assertAlmostEqual(results['missing_sensitivity']['psi_lower'], -40/3, places=9)
        self.assertAlmostEqual(results['missing_sensitivity']['psi_upper'], 280/9, places=9)
        self.assertTrue((cells.completed == 8).all())
        self.assertEqual(results['comprehension']['all_correct_n'], 0)
        self.assertEqual(results['primary']['n_observed'], 64)  # Incorrect checks retained.

    def test_duplicate_id_stops(self):
        self.write(self.r, analysis.RESPONSE_HEADERS, self.responses+[self.responses[0]])
        with self.assertRaisesRegex(ValueError, 'repetidos'):
            analysis.load_data(self.r, self.a)

    def test_tampered_score_stops(self):
        trial = json.loads(self.responses[0]['trials_json'])
        trial[0]['ability'] += 1
        self.responses[0]['trials_json'] = json.dumps(trial)
        self.write(self.r, analysis.RESPONSE_HEADERS, self.responses)
        with self.assertRaisesRegex(ValueError, 'huella'):
            analysis.load_data(self.r, self.a)

    def test_boolean_is_not_integer_score(self):
        trial = json.loads(self.responses[0]['trials_json'])
        trial[0]['ability'] = True
        self.responses[0]['trials_json'] = json.dumps(trial)
        self.write(self.r, analysis.RESPONSE_HEADERS, self.responses)
        with self.assertRaisesRegex(ValueError, 'ability'):
            analysis.load_data(self.r, self.a)

    def test_wrong_version_stops(self):
        self.responses[0]['study_version'] = '0.0.0'
        self.write(self.r, analysis.RESPONSE_HEADERS, self.responses)
        with self.assertRaisesRegex(ValueError, 'versiones'):
            analysis.load_data(self.r, self.a)

    def test_missing_allocation_stops(self):
        self.write(self.a, analysis.ALLOCATION_HEADERS, self.allocations[1:])
        with self.assertRaisesRegex(ValueError, 'sin asignación'):
            analysis.load_data(self.r, self.a)

    def test_empty_responses_described_without_inference(self):
        self.write(self.r, analysis.RESPONSE_HEADERS, [])
        responses, allocations = analysis.load_data(self.r, self.a)
        cells, results = analysis.analyse(responses, allocations)
        self.assertEqual(results['primary']['status'], 'not_estimated')
        self.assertEqual(results['missing_sensitivity']['psi_lower'], -200)
        self.assertEqual(results['missing_sensitivity']['psi_upper'], 200)
        self.assertEqual(int(cells.missing.sum()), 72)

    def test_cli_labels_synthetic_and_does_not_export_ids(self):
        destination = self.folder/'output'
        run = subprocess.run([sys.executable, str(Path(__file__).with_name('analysis.py')),
            '--responses', str(self.r), '--allocations', str(self.a), '--output', str(destination),
            '--data-kind', 'synthetic-test'], capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        result = (destination/'results.json').read_text()
        self.assertEqual(json.loads(result)['data_kind'], 'synthetic-test')
        self.assertIn('PRUEBA SINTÉTICA', result)
        for row in self.responses:
            self.assertNotIn(row['submission_id'], result)


if __name__ == '__main__':
    unittest.main()
