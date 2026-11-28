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

(function testDisabilityFocusedModuleKeepsDomOwnershipAfterCapabilityLoad() {
  assert.equal(
    wiring.focusedModuleOwnsDom({ location: { search: "?focus=disability_home_support&support_need=personal_assistance" } }),
    true,
  );
  assert.equal(wiring.focusedModuleOwnsDom({ location: { search: "?focus=assistance" } }), false);
  assert.equal(wiring.focusedModuleOwnsDom({ location: { search: "" } }), false);
  assert.equal(wiring.focusedModuleOwnsDom({}), false);
})();

(function testMissingBrowserDependenciesFailClosed() {
  assert.deepEqual(wiring.wireBrowser({}), {
    wired: false,
    reason: "dependencies_unavailable",
  });
})();

// Drive the actual browser wiring with a deferred capability load, not just
// the ownership predicate. Generic match and source gates must still fail closed.
async function testLateCapabilityLoadPreservesOnlyFocusedModules() {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require.resolve("./public-pilot-wiring.js"), "utf8");
  const routes = [
    ["?actor_type=employee&focus=employee_sick&lang=sv", true],
    ["?actor_type=private_person&focus=unemployed_sick&lang=ar", true],
    ["?actor_type=private_person&focus=employee_sick&work_context=invoiced_worker&lang=fa", true],
    ["?focus=disability_home_support&support_need=personal_assistance", true],
    ["?focus=EMPLOYEE_SICK", false], ["?focus=assistance", false],
    ["?focus=unknown", false], ["", false],
  ];
  for (const [search, owns] of routes) {
    for (const valid of [true, false]) {
      let release, calls = 0, renders = 0, main = "focused-panel";
      const pending = new Promise(resolve => { release = resolve; });
      const disabled = () => ({ executed: false, value: undefined });
      const surface = {
        runMatchBasic: valid ? callback => ({ executed: true, value: callback() }) : disabled,
        runSourceDetails: disabled,
      };
      const sandbox = {
        URLSearchParams, location: { search }, document: { documentElement: { lang: "sv" } },
        results: () => "<section>generic match</section>",
        resultCard: () => '<a class="source" href="https://example.test">Source</a>',
        render() { renders++; main = "legacy-render"; },
        StodPublicPilotUiGate: { createRuntime: () => ({
          start() { calls++; return pending; }, getSurface: () => surface, getStatus: () => ({ valid }),
        }) },
      };
      vm.runInNewContext(source, sandbox);
      release();
      await sandbox.StodPublicPilotWiringState.started;
      assert.equal(calls, 1, search);
      assert.equal(renders, owns ? 0 : 1, search);
      assert.equal(main, owns ? "focused-panel" : "legacy-render", search);
      assert.match(sandbox.results(), valid ? /generic match/ : /Stödmatchningen kunde inte laddas säkert/);
      assert.doesNotMatch(sandbox.resultCard(), /class="source"/);
    }
  }
}
testLateCapabilityLoadPreservesOnlyFocusedModules().then(
  () => console.log("public-pilot-wiring tests: OK (16 late-load contrasts)"),
  error => { console.error(error); process.exitCode = 1; }
);
