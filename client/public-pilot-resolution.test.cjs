const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const capabilityClient = require('./capabilities.js');
const pilotSurface = require('./pilot-surface.js');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'capabilities.json'), 'utf8'));
const resolution = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'public_pilot_capabilities.json'), 'utf8'));

const catalogIds = new Set(catalog.capabilities.map((item) => item.capability_id));
const parsed = capabilityClient.parseResolution(resolution, catalogIds);
const byId = new Map(catalog.capabilities.map((item) => [item.capability_id, item]));
const enabled = new Set(
  Object.entries(parsed.capabilities)
    .filter(([, isEnabled]) => isEnabled === true)
    .map(([capabilityId]) => capabilityId),
);
const publicUi = new Set(
  catalog.capabilities
    .filter((item) => item.execution_surface === 'public_ui' && item.enforcement === 'client_visibility')
    .map((item) => item.capability_id),
);

assert.deepEqual([...enabled].sort(), [...publicUi].sort(), 'public pilot profile must explicitly match the public UI capability set');

for (const capabilityId of enabled) {
  const capability = byId.get(capabilityId);
  assert.ok(capability, `enabled capability must exist in catalog: ${capabilityId}`);
  assert.equal(capability.execution_surface, 'public_ui', `${capabilityId} must remain public_ui`);
  assert.equal(capability.enforcement, 'client_visibility', `${capabilityId} must remain client_visibility`);
  assert.equal(capability.data_scope, 'no_case_data', `${capabilityId} must not expose case data`);
  for (const dependency of capability.dependencies) {
    assert.ok(enabled.has(dependency), `${capabilityId} dependency must be enabled: ${dependency}`);
  }
}

for (const capability of catalog.capabilities) {
  if (capability.execution_surface === 'private_service' || capability.enforcement === 'server_authoritative') {
    assert.equal(capabilityClient.isEnabled(parsed, capability.capability_id), false, `${capability.capability_id} must fail closed in public pilot profile`);
  }
}

const surface = pilotSurface.createPilotSurface(resolution);
assert.equal(surface.valid, true);
assert.equal(surface.matchBasicEnabled, true);
assert.equal(surface.sourceDetailsEnabled, true);

let matchRuns = 0;
let sourceRuns = 0;
assert.equal(surface.runMatchBasic(() => ++matchRuns).executed, true);
assert.equal(surface.runSourceDetails(() => ++sourceRuns).executed, true);
assert.equal(matchRuns, 1);
assert.equal(sourceRuns, 1);

console.log(`OK: public pilot profile enables ${enabled.size} safe UI capabilities and keeps private capabilities fail-closed`);
