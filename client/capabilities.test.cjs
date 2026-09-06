"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const client = require("./capabilities.js");

const ROOT = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "capabilities.json"), "utf8"));
const knownIds = catalog.capabilities.map((item) => item.capability_id);

function expectReject(payload, message) {
  assert.throws(() => client.parseResolution(payload, knownIds), /Invalid capability resolution/, message);
}

const validPayload = {
  schema_version: "0.1.0",
  capabilities: catalog.capabilities.map((item) => ({
    capability_id: item.capability_id,
    enabled: item.execution_surface === "public_ui",
  })),
};

const normalized = client.parseResolution(validPayload, knownIds);
assert.equal(client.isEnabled(normalized, "match_basic"), true);
assert.equal(client.isEnabled(normalized, "source_details"), true);
assert.equal(client.isEnabled(normalized, "documents"), false);
assert.equal(client.isEnabled(normalized, "missing_capability"), false, "unknown/missing capability must fail closed");

let privateRenderCount = 0;
let privateCallCount = 0;
const renderResult = client.runIfEnabled(normalized, "documents", () => {
  privateRenderCount += 1;
  return "PRIVATE_DOCUMENT_UI";
});
const callResult = client.runIfEnabled(normalized, "documents", () => {
  privateCallCount += 1;
  return "PRIVATE_SERVICE_CALLED";
});
assert.equal(renderResult.executed, false);
assert.equal(callResult.executed, false);
assert.equal(privateRenderCount, 0, "disabled capability must not render gated private UI");
assert.equal(privateCallCount, 0, "disabled capability must not trigger gated private call");

const enabledResult = client.runIfEnabled(normalized, "match_basic", () => "PUBLIC_MATCH_UI");
assert.equal(enabledResult.executed, true);
assert.equal(enabledResult.value, "PUBLIC_MATCH_UI");

const snapshot = client.publicSnapshot(normalized);
assert.deepEqual(Object.keys(snapshot).sort(), ["capabilities", "schema_version"]);
for (const item of snapshot.capabilities) {
  assert.deepEqual(Object.keys(item).sort(), ["capability_id", "enabled"]);
}
const serialized = JSON.stringify(snapshot).toLowerCase();
for (const forbidden of [
  "price",
  "plan",
  "entitlement",
  "authorization",
  "endpoint",
  "token",
  "secret",
  "user_id",
  "case_id",
  "database",
]) {
  assert.equal(serialized.includes(forbidden), false, `public snapshot leaked forbidden term: ${forbidden}`);
}

for (const forbiddenField of [
  "price",
  "plan",
  "entitlement",
  "authorization",
  "endpoint",
  "token",
  "secret",
  "user_id",
  "case_id",
]) {
  expectReject({ ...validPayload, [forbiddenField]: "must-not-leak" }, `top-level ${forbiddenField} must be rejected`);
  const itemLeak = structuredClone(validPayload);
  itemLeak.capabilities[0][forbiddenField] = "must-not-leak";
  expectReject(itemLeak, `per-capability ${forbiddenField} must be rejected`);
}

const unknown = structuredClone(validPayload);
unknown.capabilities[0].capability_id = "future_unknown_capability";
expectReject(unknown, "unknown capability IDs must be rejected when catalog is supplied");

const duplicate = structuredClone(validPayload);
duplicate.capabilities.push({ ...duplicate.capabilities[0] });
expectReject(duplicate, "duplicate capability IDs must be rejected");

const wrongType = structuredClone(validPayload);
wrongType.capabilities[0].enabled = "true";
expectReject(wrongType, "non-boolean enabled state must be rejected");

expectReject({ schema_version: "v1", capabilities: validPayload.capabilities }, "invalid schema version must be rejected");
expectReject({ schema_version: "0.1.0", capabilities: [] }, "empty capability list must be rejected");
expectReject({ schema_version: "0.1.0" }, "missing capabilities must be rejected");

console.log(`Capability client adapter checks passed for ${knownIds.length} catalog capabilities.`);
