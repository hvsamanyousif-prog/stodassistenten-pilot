#!/usr/bin/env python3
"""Browser regression for the family age gate: unknown must not mean no.

This is bounded browser/DOM/routing evidence for the existing person-family flow.
It does not prove eligibility, human comprehension, physical Safari/assistive-tech
behaviour, model quality or feedback storage.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
EVIDENCE = Path(sys.argv[2] if len(sys.argv) > 2 else 'family-age-unknown-browser.json').resolve()
ENGINE = os.environ.get('BROWSER_ENGINE', 'chromium').strip().lower()
WIDTHS = (390, 1280)
LANGS = ('sv', 'ar', 'fa')


def no_overflow(page) -> bool:
    return bool(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"))


def serve(directory: Path):
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(directory), **kwargs)
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f'http://127.0.0.1:{server.server_port}'


def record(results, *, case_id, ok, details=None):
    results.append({'case_id': case_id, 'ok': bool(ok), 'details': details or {}})


def run_case(page, base_url: str, lang: str, width: int, branch: str, results):
    case_id = f'{lang}-{branch}-{width}'
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.set_viewport_size({'width': width, 'height': 900})
    page.goto(f'{base_url}/person-pilot.html?focus=family&lang={lang}', wait_until='networkidle')
    page.locator('.choice').nth({'yes': 0, 'no': 1, 'unknown': 2}[branch]).click()
    state = page.evaluate("({screen, scenario, child: answers.child || null})")
    marker_count = page.locator('[data-family-age-unknown="true"]').count()
    action_count = page.locator('[data-family-age-action="change"]').count()
    overflow_ok = no_overflow(page)

    if branch == 'unknown':
        ok = (
            state == {'screen': 'familyAgeUnknown', 'scenario': 'family', 'child': 'unsure'}
            and marker_count == 1
            and action_count == 1
            and overflow_ok
            and not errors
        )
        if action_count:
            page.locator('[data-family-age-action="change"]').click()
            returned = page.evaluate("screen") == 'family1'
        else:
            returned = False
        ok = ok and returned
    elif branch == 'no':
        ok = (
            state == {'screen': 'general1', 'scenario': 'general', 'child': 'no'}
            and marker_count == 0
            and overflow_ok
            and not errors
        )
        returned = None
    else:
        ok = (
            state == {'screen': 'family2', 'scenario': 'family', 'child': 'yes'}
            and marker_count == 0
            and overflow_ok
            and not errors
        )
        returned = None

    record(
        results,
        case_id=case_id,
        ok=ok,
        details={
            'state': state,
            'unknown_marker_count': marker_count,
            'change_action_count': action_count,
            'returned_to_age_question': returned,
            'no_horizontal_overflow': overflow_ok,
            'console_errors': errors,
        },
    )


def main() -> int:
    results = []
    with tempfile.TemporaryDirectory(prefix='stod-family-age-') as tmp:
        site = Path(tmp) / 'site'
        subprocess.run(
            [sys.executable, str(ROOT / 'scripts' / 'build_public_pilot.py'), '--source', str(ROOT), '--output', str(site)],
            cwd=ROOT,
            check=True,
        )
        server, base_url = serve(site)
        try:
            with sync_playwright() as p:
                browser_type = getattr(p, ENGINE)
                browser = browser_type.launch(headless=True)
                try:
                    for lang in LANGS:
                        for width in WIDTHS:
                            for branch in ('unknown', 'no', 'yes'):
                                page = browser.new_page()
                                try:
                                    run_case(page, base_url, lang, width, branch, results)
                                except Exception as exc:
                                    record(results, case_id=f'{lang}-{branch}-{width}', ok=False, details={'exception': repr(exc)})
                                finally:
                                    page.close()
                finally:
                    browser.close()
        finally:
            server.shutdown()
            server.server_close()

    passed = sum(1 for item in results if item['ok'])
    payload = {
        'engine': ENGINE,
        'scope': 'family-age-unknown-is-not-no',
        'total': len(results),
        'passed': passed,
        'failed': len(results) - passed,
        'results': results,
    }
    EVIDENCE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"family age unknown browser ({ENGINE}): {passed}/{len(results)} PASS")
    for item in results:
        if not item['ok']:
            print('FAIL', item['case_id'], json.dumps(item['details'], ensure_ascii=False))
    return 0 if passed == len(results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
