#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { createPilotSurface } = require("./pilot-surface.js");

function payload(matchBasic, sourceDetails) {
  return {
    schema_version: "0.1.0",
    capabilities: [
      { capability_id: "match_basic", enabled: matchBasic },
      { capability_id: "source_details", enabled: sourceDetails },
    ],
  };
}

function countingCallback(counter, value) {
  return () => {
    counter.calls += 1;
    return value;
  };
}

{
  const surface = createPilotSurface(payload(true, true));
  assert.equal(surface.valid, true);
  assert.equal(surface.matchBasicEnabled, true);
  assert.equal(surface.sourceDetailsEnabled, true);

  const match = { calls: 0 };
  const source = { calls: 0 };
  assert.deepEqual(surface.runMatchBasic(countingCallback(match, "match")), { executed: true, value: "match" });
  assert.deepEqual(surface.runSourceDetails(countingCallback(source, "source")), { executed: true, value: "source" });
  assert.equal(match.calls, 1);
  assert.equal(source.calls, 1);
}

{
  const surface = createPilotSurface(payload(false, true));
  const match = { calls: 0 };
  const source = { calls: 0 };
  assert.equal(surface.matchBasicEnabled, false);
  assert.equal(surface.sourceDetailsEnabled, false, "source_details must inherit match_basic dependency");
  assert.deepEqual(surface.runMatchBasic(countingCallback(match, "unexpected")), { executed: false, value: undefined });
  assert.deepEqual(surface.runSourceDetails(countingCallback(source, "unexpected")), { executed: false, value: undefined });
  assert.equal(match.calls, 0);
  assert.equal(source.calls, 0);
}

{
  const surface = createPilotSurface(payload(true, false));
  const source = { calls: 0 };
  assert.equal(surface.matchBasicEnabled, true);
  assert.equal(surface.sourceDetailsEnabled, false);
  assert.deepEqual(surface.runSourceDetails(countingCallback(source, "unexpected")), { executed: false, value: undefined });
  assert.equal(source.calls, 0);
}

{
  const malformed = {
    schema_version: "0.1.0",
    capabilities: [
      { capability_id: "match_basic", enabled: true, extra: "must-fail" },
      { capability_id: "source_details", enabled: true },
    ],
  };
  const surface = createPilotSurface(malformed);
  const match = { calls: 0 };
  const source = { calls: 0 };
  assert.equal(surface.valid, false);
  assert.equal(surface.matchBasicEnabled, false);
  assert.equal(surface.sourceDetailsEnabled, false);
  assert.deepEqual(surface.runMatchBasic(countingCallback(match, "unexpected")), { executed: false, value: undefined });
  assert.deepEqual(surface.runSourceDetails(countingCallback(source, "unexpected")), { executed: false, value: undefined });
  assert.equal(match.calls, 0);
  assert.equal(source.calls, 0);
}

{
  const surface = createPilotSurface(null);
  const counter = { calls: 0 };
  assert.equal(surface.valid, false);
  assert.deepEqual(surface.runMatchBasic(countingCallback(counter, "unexpected")), { executed: false, value: undefined });
  assert.equal(counter.calls, 0);
}

console.log("pilot capability surface tests: ok");
