#!/usr/bin/env python3
from pathlib import Path

def require(condition, message):
    if not condition:
        raise AssertionError(message)

index = Path('index.html').read_text(encoding='utf-8')
person = Path('person-pilot.html').read_text(encoding='utf-8')
company = Path('company-pilot.html').read_text(encoding='utf-8')

require('function howSection()' in index, 'shared shell must explain the product journey')
require("const actorType=queryParams.get('actor_type')" in person, 'person module must preserve actor context')
require("const requestedLang=queryParams.get('lang')" in person, 'person module must preserve shell language')
require('function actionPlan()' in person, 'person results must include a concrete next-step plan')
require('const FEEDBACK_ENDPOINT=' in company, 'company module must expose structured feedback')
require("flow:'company'" in company, 'company feedback must be distinguishable from person flows')
require('function companyFeedback()' in company, 'company feedback UI missing')
require('function readinessScore()' in company, 'company result depth/readiness missing')
payload_start = company.index('const payload={app_version:APP_VERSION', company.index('submitCompanyFeedback'))
payload_end = company.index('};try', payload_start)
payload = company[payload_start:payload_end]
for forbidden in ('description','sector','geography','capacity','references','docs'):
    require(forbidden not in payload, f'company feedback must not send {forbidden}')
print('platform depth + company feedback tests: OK')
