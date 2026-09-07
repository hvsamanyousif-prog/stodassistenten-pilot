const assert = require("node:assert/strict");
const wiring = require("./public-pilot-wiring.js");

function enabledSurface() {
  return {
    runMatchBasic(callback) {
      return { executed: true, value: callback() };
    },
    runSourceDetails(callback) {
      return { executed: true, value: callback() };
    },
  };
}

function disabledMatchSurface() {
  return {
    runMatchBasic(_callback) {
      return { executed: false, value: undefined };
    },
    runSourceDetails(_callback) {
      return { executed: false, value: undefined };
    },
  };
}

function sourceDisabledSurface() {
  return {
    runMatchBasic(callback) {
      return { executed: true, value: callback() };
    },
    runSourceDetails(_callback) {
      return { executed: false, value: undefined };
    },
  };
}

(function testEnabledCapabilitiesPreserveExactMarkup() {
  const runtime = { getSurface: enabledSurface };
  const originalCard = '<article class="result"><b>Test</b><a class="source" target="_blank" rel="noopener" href="https://example.test">↗ Source</a><div>Feedback</div></article>';
  const originalResults = '<section>RESULTS-UNCHANGED</section>';
  const bindings = wiring.createBindings({
    runtime,
    originalResults: () => originalResults,
    originalResultCard: () => originalCard,
    getLanguage: () => "sv",
  });

  assert.equal(bindings.gatedResults(), originalResults);
  assert.equal(bindings.gatedResultCard([], 0), originalCard);
})();

(function testMatchBasicFailsClosedWithoutExecutingResults() {
  let calls = 0;
  const runtime = { getSurface: disabledMatchSurface };
  const bindings = wiring.createBindings({
    runtime,
    originalResults: () => {
      calls += 1;
      return "SHOULD-NOT-RENDER";
    },
    originalResultCard: () => "card",
    getLanguage: () => "ar",
  });

  const html = bindings.gatedResults();
  assert.equal(calls, 0);
  assert.match(html, /تعذر تحميل مطابقة الدعم/);
  assert.doesNotMatch(html, /SHOULD-NOT-RENDER/);
})();

(function testSourceDetailsCanBeRemovedWithoutChangingRestOfCard() {
  const runtime = { getSurface: sourceDisabledSurface };
  const originalCard = '<article class="result"><b>Test</b><p>Why</p><a class="source" target="_blank" rel="noopener" href="https://example.test">↗ Source</a><div class="feedback">Feedback</div></article>';
  const bindings = wiring.createBindings({
    runtime,
    originalResults: () => "results",
    originalResultCard: () => originalCard,
    getLanguage: () => "fa",
  });

  const html = bindings.gatedResultCard([], 0);
  assert.doesNotMatch(html, /class="source"/);
  assert.match(html, /<b>Test<\/b><p>Why<\/p><div class="feedback">Feedback<\/div>/);
})();

(function testLocalizedFallbacksAndLanguageNormalization() {
  assert.match(wiring.fallbackHtml("sv-SE"), /Stödmatchningen kunde inte laddas säkert/);
  assert.match(wiring.fallbackHtml("ar"), /تعذر تحميل مطابقة الدعم/);
  assert.match(wiring.fallbackHtml("fa-IR"), /تطبیق حمایت/);
  assert.match(wiring.fallbackHtml("unknown"), /Stödmatchningen kunde inte laddas säkert/);
})();

(function testMissingBrowserDependenciesFailClosed() {
  assert.deepEqual(wiring.wireBrowser({}), {
    wired: false,
    reason: "dependencies_unavailable",
  });
})();

console.log("public-pilot-wiring tests: OK");
