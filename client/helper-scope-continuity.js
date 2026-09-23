(() => {
  if (typeof explicitHelperRole !== 'function') return;

  const existingExplicitHelperRole = explicitHelperRole;
  const boundedSwedishHelpOutClosePerson = text => {
    const x = String(text || '').toLocaleLowerCase();
    return /\bjag\s+hjälper\s+till\s+(?:(?:hemma\s+)?hos|med|för)\s+(?:mitt\s+barn|min\s+(?:barn|son|dotter|mamma|pappa|mor|far|partner|syster|bror|syskon|vän)|henne|honom)\b/u.test(x);
  };

  explicitHelperRole = function (text) {
    return existingExplicitHelperRole(text) || boundedSwedishHelpOutClosePerson(text);
  };
})();
