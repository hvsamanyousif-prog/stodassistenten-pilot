(() => {
  if (typeof explicitHelperRole !== 'function') return;

  const existingExplicitHelperRole = explicitHelperRole;
  const boundedSwedishDirectSpouse = text => {
    const x = String(text || '').toLocaleLowerCase();
    return /\bjag\s+hjälper\s+min\s+(?:sambo|make|maka)\b/u.test(x) && !/\bjag\s+hjälper\s+inte\b/u.test(x);
  };
  const boundedSwedishHelpOutClosePerson = text => {
    const x = String(text || '').toLocaleLowerCase();
    return /\bjag\s+hjälper\s+till\s+(?:(?:hemma\s+)?hos|med|för)\s+(?:mitt\s+barn|min\s+(?:barn|son|dotter|mamma|pappa|mor|far|partner|sambo|make|maka|syster|bror|syskon|vän)|henne|honom)\b/u.test(x);
  };
  const boundedSwedishMixedFactTargets = text => {
    const x = String(text || '').toLocaleLowerCase();
    const helper = /\bjag\s+hjälper\s+min\s+(?:syster|bror|syskon|mamma|pappa|mor|far|partner|sambo|make|maka|son|dotter|vän)\b/u.test(x);
    const ownFoodNeed = /\bjag\s+behöver\s+hjälp\s+med\s+(?:mat|maten|livsmedel)\b/u.test(x);
    const helpedScholarship = /\b(?:hon|han|hen)\s+söker\s+stipendium\b/u.test(x);
    return helper && ownFoodNeed && helpedScholarship;
  };

  explicitHelperRole = function (text) {
    return existingExplicitHelperRole(text) || boundedSwedishDirectSpouse(text) || boundedSwedishHelpOutClosePerson(text);
  };

  const analyzeButton = document.getElementById('analyzeBtn');
  const situation = document.getElementById('situation');
  const results = document.getElementById('engineResults');
  if (!analyzeButton || !situation || !results) return;

  function preserveMixedFactTargets() {
    const lang = String(document.documentElement.lang || 'sv').toLocaleLowerCase();
    const text = String(situation.value || '');
    if (lang !== 'sv' || !boundedSwedishMixedFactTargets(text)) return;

    results.innerHTML = [
      '<div class="interpret" data-target-ownership-choice="true">Du nämner både ett behov som gäller dig och ett stipendium som gäller personen du hjälper. Välj vad du vill börja med – jag blandar inte ihop dem.</div>',
      '<a class="route" data-fact-target="self-need" href="person-pilot.html?actor_type=private_person&need_context=essential_costs&lang=sv"><span><strong>Mitt eget behov</strong><small>Fortsätt med mat och andra nödvändiga vardagskostnader som gäller dig.</small></span><span class="arrow" aria-hidden="true">→</span></a>',
      '<a class="route" data-fact-target="helped-person-funding" href="person-pilot.html?actor_type=relative&funding_intent=scholarship&lang=sv"><span><strong>Stipendium för personen jag hjälper</strong><small>Behåll hjälparrollen och fortsätt med stipendiespåret för henne, honom eller hen.</small></span><span class="arrow" aria-hidden="true">→</span></a>'
    ].join('');
    results.hidden = false;
  }

  function queuePreserveMixedFactTargets() {
    queueMicrotask(preserveMixedFactTargets);
  }

  // The funding router intentionally stops propagation on the button itself.
  // Observe the gesture earlier on document capture, then repair only this
  // bounded mixed-target family after the synchronous router has rendered.
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('#analyzeBtn')) {
      queuePreserveMixedFactTargets();
    }
  }, true);
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && event.target === situation) {
      queuePreserveMixedFactTargets();
    }
  }, true);
})();
