(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODFamilyHousingGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product presentation/ranking guard for the existing general person flow.
  // Canonical truth remains in data/supports and is still NEEDS_REVIEW. This
  // module never decides eligibility, amount, deadline or which 2027 rule applies.
  const FAMILY_HOUSING_URL = 'https://www.forsakringskassan.se/privatperson/familj-och-barn/bostadsbidrag-for-barnfamiljer/ansok-om-bostadsbidrag-for-barnfamiljer';

  const COPY = Object.freeze({
    sv: Object.freeze({
      title: 'Bostadsbidrag för barnfamiljer – värt att kontrollera',
      body: 'Eftersom det finns barn i hushållet, ekonomin är pressad och boendekostnaden tar stor plats kan bostadsbidrag för barnfamiljer vara en relevant väg att kontrollera. Försäkringskassan behöver bedöma bland annat barnets boende, hushållet, bostaden och aktuell inkomstperiod. Stödassistenten avgör inte rätt eller belopp.'
    }),
    ar: Object.freeze({
      title: 'بدل السكن للعائلات التي لديها أطفال – يستحق التحقق',
      body: 'بما أن هناك أطفالاً في الأسرة والوضع المالي ضاغط وتكلفة السكن مرتفعة، فقد يكون بدل السكن للعائلات التي لديها أطفال مساراً مناسباً للتحقق. تحتاج Försäkringskassan إلى تقييم أمور منها إقامة الطفل وتكوين الأسرة والسكن وفترة الدخل المعمول بها. Stödassistenten لا يقرر الاستحقاق أو المبلغ.'
    }),
    fa: Object.freeze({
      title: 'کمک‌هزینه مسکن برای خانواده‌های دارای فرزند – ارزش بررسی دارد',
      body: 'چون در خانوار فرزند وجود دارد، وضعیت مالی تحت فشار است و هزینه مسکن سهم بزرگی دارد، کمک‌هزینه مسکن خانواده‌های دارای فرزند می‌تواند مسیری مناسب برای بررسی باشد. Försäkringskassan باید از جمله محل زندگی کودک، وضعیت خانوار، مسکن و دوره درآمد مربوط را ارزیابی کند. Stödassistenten درباره استحقاق یا مبلغ تصمیم نمی‌گیرد.'
    })
  });

  function languageCode(value) {
    const normalized = String(value || 'sv').toLowerCase().split('-')[0];
    return Object.prototype.hasOwnProperty.call(COPY, normalized) ? normalized : 'sv';
  }

  function shouldSurface(options) {
    const opts = options || {};
    return opts.general === true &&
      opts.children === 'yes' &&
      opts.housing === 'yes' &&
      (opts.money === 'tight' || opts.money === 'some');
  }

  function isFamilyHousingRow(row) {
    if (!Array.isArray(row)) return false;
    return row[2] === FAMILY_HOUSING_URL || String(row[0] || '').toLowerCase().includes('bostadsbidrag för barnfamiljer');
  }

  function rewriteRows(rows, options) {
    const baseRows = Array.isArray(rows) ? rows.slice() : [];
    const opts = options || {};
    if (!shouldSurface(opts) || baseRows.some(isFamilyHousingRow)) return baseRows;

    const copy = COPY[languageCode(opts.language)];
    const candidate = [copy.title, copy.body, FAMILY_HOUSING_URL];
    const insertAt = opts.work === 'unemployed' || opts.work === 'akassa' ? 1 : 0;
    const next = baseRows.slice();
    next.splice(Math.min(insertAt, next.length), 0, candidate);
    return next.slice(0, 4);
  }

  function runtimeLanguage(root) {
    try {
      if (typeof lang !== 'undefined') return languageCode(lang);
    } catch (_error) {
      // Fall back to document language below.
    }
    return languageCode(root && root.document && root.document.documentElement
      ? root.document.documentElement.lang
      : 'sv');
  }

  function runtimeContext() {
    try {
      if (typeof scenario === 'undefined' || scenario !== 'general') return null;
      if (typeof answers === 'undefined' || !answers) return null;
      return {
        general: true,
        work: answers.work || null,
        money: answers.money || null,
        children: answers.children || null,
        housing: answers.housing || null
      };
    } catch (_error) {
      return null;
    }
  }

  function init(root) {
    if (!root || !root.document || root.__stodFamilyHousingV81 === true) {
      return Object.freeze({ wired: false, reason: 'not_applicable_or_already_wired' });
    }
    try {
      if (typeof getRows !== 'function') {
        return Object.freeze({ wired: false, reason: 'person_rows_unavailable' });
      }
      const originalGetRows = getRows;
      getRows = function () {
        const context = runtimeContext();
        if (!context) return originalGetRows();
        context.language = runtimeLanguage(root);
        return rewriteRows(originalGetRows(), context);
      };
      root.__stodFamilyHousingV81 = true;
      try {
        if (typeof render === 'function') render();
      } catch (_error) {
        // A ranking guard must never break an already rendered pilot.
      }
      return Object.freeze({ wired: true });
    } catch (_error) {
      return Object.freeze({ wired: false, reason: 'fail_closed' });
    }
  }

  return Object.freeze({
    FAMILY_HOUSING_URL,
    COPY,
    languageCode,
    shouldSurface,
    rewriteRows,
    init
  });
});
