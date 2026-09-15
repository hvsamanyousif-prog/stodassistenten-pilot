#!/usr/bin/env python3
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
TRUTH = EVAL / 'fritidskortet_truth_guard_v89.json'
SCENARIOS = EVAL / 'scenario_lab_fritidskort_deadline_v90.json'
FAQ_URL = 'https://www.fritidskortet.se/fragor-och-svar/'
REMISS_URL = 'https://www.ehalsomyndigheten.se/om-ehalsomyndigheten/remisser/'
EXPECTED = {
    'lab-fritidskort-deadline-current-v90-01',
    'lab-fritidskort-deadline-rumour-v90-02',
    'lab-fritidskort-deadline-ar-v90-03',
    'lab-fritidskort-deadline-fa-v90-04',
}


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def require(value, message):
    if not value:
        raise AssertionError(message)


def validate_deadline_boundary(truth):
    require(truth.get('truth_status') == 'NEEDS_REVIEW', 'Fritidskortet truth must remain review-gated')
    require(truth.get('human_review_required') is True, 'human review must remain required')
    require(truth.get('material_fields_verified') == [], 'AI must not verify material fields')
    sources = truth.get('current_primary_sources', [])
    require(FAQ_URL in sources, 'current Fritidskortet FAQ source missing')
    require(REMISS_URL in sources, 'E-hälsomyndigheten consultation source missing')
    boundary = truth.get('guarded_current_facts', {}).get('use_by_date', '')
    low = boundary.lower()
    for token in ['30 november', '7 december', 'consultation', 'not implementation evidence', 'final']:
        require(token in low, f'deadline change boundary missing: {token}')
    require('consultation_proposal_is_active_deadline' in truth.get('must_not_infer', []), 'proposal-vs-active guard missing')
    require('7 december as active' in low, 'must explicitly forbid presenting proposed 7 December as active')


truth = load(TRUTH)
scenarios = load(SCENARIOS)
validate_deadline_boundary(truth)

cases = scenarios.get('cases', [])
by_id = {case.get('case_id'): case for case in cases}
require(len(cases) == 4 and set(by_id) == EXPECTED, 'v90 must contain exactly four deadline regressions')
for case in cases:
    require(case.get('source_requirements'), f"missing source requirement: {case.get('case_id')}")
    require('7_december_is_confirmed_active_deadline' in case.get('must_not_claim', []), f"7 Dec guard missing: {case.get('case_id')}")
require(by_id['lab-fritidskort-deadline-current-v90-01'].get('language') == 'sv', 'Swedish deadline case missing')
require(by_id['lab-fritidskort-deadline-ar-v90-03'].get('language') == 'ar', 'Arabic deadline parity missing')
require(by_id['lab-fritidskort-deadline-fa-v90-04'].get('language') == 'fa', 'Persian deadline parity missing')
require('news_or_remiss_equals_implementation' in by_id['lab-fritidskort-deadline-rumour-v90-02'].get('must_not_claim', []), 'remiss/news implementation falsification missing')

# Red Team: a proposed date may not silently become active truth.
promoted = copy.deepcopy(truth)
promoted['guarded_current_facts']['use_by_date'] = 'The active deadline is 7 December 2026.'
try:
    validate_deadline_boundary(promoted)
except AssertionError:
    pass
else:
    raise AssertionError('red-team mutation: consultation proposal was accepted as active deadline')

# Preserve one product / one learning system. No deadline-specific app, matcher or truth store.
forbidden = [
    ROOT / 'fritidskort-deadline-app.html',
    ROOT / 'client' / 'fritidskort-deadline-matcher.js',
    ROOT / 'data' / 'fritidskort_deadline_truth_store.json',
]
require(not any(path.exists() for path in forbidden), 'parallel deadline artifact detected')

print('v90 Fritidskortet deadline change-intelligence guard: OK')
print('cases=4 truth=NEEDS_REVIEW proposal_7_december=NOT_ACTIVE_WITHOUT_FINAL_CONFIRMATION')
