const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

(function testIndexLoadsCapabilityWiringAfterExistingPilotScript() {
  const indexPath = path.join(__dirname, "..", "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  const inlineEnd = html.indexOf("render();\n</script>");
  const capabilities = html.indexOf('<script src="client/capabilities.js"></script>');
  const surface = html.indexOf('<script src="client/pilot-surface.js"></script>');
  const gate = html.indexOf('<script src="client/public-pilot-ui-gate.js"></script>');
  const wiringTag = html.indexOf('<script src="client/public-pilot-wiring.js"></script>');

  assert.ok(inlineEnd >= 0, "existing pilot inline script must remain present");
  assert.ok(capabilities > inlineEnd, "capability client must load after existing pilot script");
  assert.ok(surface > capabilities, "pilot surface must load after capability client");
  assert.ok(gate > surface, "UI gate must load after pilot surface");
  assert.ok(wiringTag > gate, "wiring must load last");
  assert.match(html, /\.rtl\{direction:rtl;text-align:right\}/, "RTL behavior marker must remain present");
  assert.match(html, /if\(screen\.endsWith\('R'\)\)main\(\)\.innerHTML=results\(\)/, "result route must still call results()");
})();

console.log("public-pilot-wiring tests: OK");
