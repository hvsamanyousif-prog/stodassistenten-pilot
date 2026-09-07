"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const UiGate = require("./public-pilot-ui-gate.js");

const profile = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "config", "public_pilot_capabilities.json"), "utf8")
);

function okFetch(payload) {
  return async function fetchStub(url, options) {
    assert.strictEqual(url, "config/public_pilot_capabilities.json");
    assert.strictEqual(options.cache, "no-store");
    assert.strictEqual(options.credentials, "omit");
    assert.strictEqual(options.referrerPolicy, "no-referrer");
    return {
      ok: true,
      async json() {
        return payload;
      },
    };
  };
}

async function enabledProfilePreservesUiCallbacks() {
  const runtime = UiGate.createRuntime({ fetchFn: okFetch(profile) });
  const states = [];
  runtime.subscribe((state) => states.push(state.status));

  const initial = runtime.getSurface();
  assert.strictEqual(initial.runMatchBasic(() => "must-not-run").executed, false);
  assert.strictEqual(initial.runSourceDetails(() => "must-not-run").executed, false);

  const completed = await runtime.start();
  assert.strictEqual(completed.ready, true);
  assert.strictEqual(completed.matchBasicEnabled, true);
  assert.strictEqual(completed.sourceDetailsEnabled, true);

  const rows = [
    ["Bostadstillägg", "same description", "https://example.invalid/source"],
    ["Tandvårdsstöd", "same description", "https://example.invalid/source-2"],
  ];
  const match = runtime.getSurface().runMatchBasic(() => rows);
  assert.strictEqual(match.executed, true);
  assert.strictEqual(match.value, rows, "enabled gate must preserve the exact callback value");

  const sourceMarkup = '<a class="source">Officiell källa</a>';
  const source = runtime.getSurface().runSourceDetails(() => sourceMarkup);
  assert.strictEqual(source.executed, true);
  assert.strictEqual(source.value, sourceMarkup, "enabled source gate must preserve markup unchanged");
  assert.deepStrictEqual(states, ["loading", "ready"]);
}

async function disabledCapabilityDoesNotExecuteCallback() {
  const disabled = {
    schema_version: "0.1.0",
    capabilities: [
      { capability_id: "match_basic", enabled: false },
      { capability_id: "source_details", enabled: true },
    ],
  };
  const runtime = UiGate.createRuntime({ fetchFn: okFetch(disabled) });
  await runtime.start();

  let matchCalls = 0;
  let sourceCalls = 0;
  assert.strictEqual(
    runtime.getSurface().runMatchBasic(() => {
      matchCalls += 1;
    }).executed,
    false
  );
  assert.strictEqual(
    runtime.getSurface().runSourceDetails(() => {
      sourceCalls += 1;
    }).executed,
    false
  );
  assert.strictEqual(matchCalls, 0);
  assert.strictEqual(sourceCalls, 0, "source_details must also require match_basic");
}

async function malformedAndNetworkFailureStayClosed() {
  for (const fetchFn of [
    okFetch({ schema_version: "broken", capabilities: [] }),
    async function networkFailure() {
      throw new Error("synthetic network error");
    },
    async function badResponse() {
      return { ok: false, json: async () => profile };
    },
  ]) {
    const runtime = UiGate.createRuntime({ fetchFn });
    const completed = await runtime.start();
    assert.strictEqual(completed.status, "unavailable");
    assert.strictEqual(completed.ready, false);
    assert.strictEqual(completed.matchBasicEnabled, false);
    assert.strictEqual(completed.sourceDetailsEnabled, false);
    assert.strictEqual(runtime.getSurface().runMatchBasic(() => 1).executed, false);
    assert.strictEqual(runtime.getSurface().runSourceDetails(() => 1).executed, false);
  }
}

async function startIsIdempotent() {
  let calls = 0;
  const runtime = UiGate.createRuntime({
    fetchFn: async function fetchOnce() {
      calls += 1;
      return { ok: true, json: async () => profile };
    },
  });
  const first = runtime.start();
  const second = runtime.start();
  assert.strictEqual(first, second);
  await first;
  assert.strictEqual(calls, 1);
}

(async function main() {
  await enabledProfilePreservesUiCallbacks();
  await disabledCapabilityDoesNotExecuteCallback();
  await malformedAndNetworkFailureStayClosed();
  await startIsIdempotent();
  console.log("public pilot UI gate tests: OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
