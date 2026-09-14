#!/usr/bin/env python3
"""Static invariants for direct quick-help handoff from the situation engine."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'client/quick-help-guidance.js').read_text(encoding='utf-8')
BUILD=(ROOT/'scripts/build_public_pilot.py').read_text(encoding='utf-8')


def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)


def main() -> int:
    require('QUICK_GUIDANCE_PATH = "client/quick-help-guidance.js"' in BUILD, 'quick-help guidance path missing from build')
    runtime_line = next((line for line in BUILD.splitlines() if line.startswith('QUICK_RUNTIME_PATHS =')), '')
    require('QUICK_LEARNING_PATH' in runtime_line and 'QUICK_GUIDANCE_PATH' in runtime_line, 'quick-help core runtimes missing from build')
    require(runtime_line.index('QUICK_LEARNING_PATH') < runtime_line.index('QUICK_GUIDANCE_PATH'), 'quick-help learning must load before direct guidance')
    for token in (
        "dental:new Set(['cost','care','support','unsure'])",
        "vision:new Set(['home','tech','work','unsure'])",
        "guided-direct",
        "direct-summary",
        "data-direct-change",
        "Tolkat behov",
        "الحاجة التي فُهمت",
        "نیاز تشخیص‌داده‌شده",
        "results.before(summary)",
        "if(e.target.closest('.change'))revealChoices()",
    ):
        require(token in JS, f'direct quick-help invariant missing: {token}')
    for forbidden in ('fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'pilot-feedback'):
        require(forbidden not in JS, f'direct guidance must remain local-only: {forbidden}')
    print('quick-help direct guidance validation: OK')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
