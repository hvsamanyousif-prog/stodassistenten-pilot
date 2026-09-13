from pathlib import Path
html = Path('person-pilot.html').read_text(encoding='utf-8')
duplicate = '<p>${r[1]}</p><div class="info"><b>${tr(\'why\')}</b><br>${r[1]}</div>'
if duplicate in html:
    raise SystemExit('duplicate result description is back')
if '<div class="info"><b>${tr(\'why\')}</b><br>${r[1]}</div>' not in html:
    raise SystemExit('result explanation missing')
print('result-card copy regression: OK')
