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

  explicitHelperRole = function (text) {
    return existingExplicitHelperRole(text) || boundedSwedishDirectSpouse(text) || boundedSwedishHelpOutClosePerson(text);
  };
})();
