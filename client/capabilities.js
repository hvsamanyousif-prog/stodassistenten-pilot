(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.StodCapabilityClient = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
  const CAPABILITY_ID_RE = /^[a-z][a-z0-9_]{2,79}$/;
  const TOP_LEVEL_KEYS = ["capabilities", "schema_version"];
  const ITEM_KEYS = ["capability_id", "enabled"];

  function fail(message) {
    throw new Error(`Invalid capability resolution: ${message}`);
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function exactKeys(value, expected, field) {
    if (!isPlainObject(value)) {
      fail(`${field} must be an object`);
    }
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
      fail(`${field} has unexpected or missing fields`);
    }
  }

  function normalizeKnownIds(knownCapabilityIds) {
    if (knownCapabilityIds == null) {
      return null;
    }
    const values = Array.from(knownCapabilityIds);
    const known = new Set();
    for (const id of values) {
      if (typeof id !== "string" || !CAPABILITY_ID_RE.test(id)) {
        fail("known capability catalog contains an invalid capability_id");
      }
      known.add(id);
    }
    return known;
  }

  function parseResolution(payload, knownCapabilityIds) {
    exactKeys(payload, TOP_LEVEL_KEYS, "payload");

    if (typeof payload.schema_version !== "string" || !VERSION_RE.test(payload.schema_version)) {
      fail("schema_version must use semantic x.y.z format");
    }
    if (!Array.isArray(payload.capabilities) || payload.capabilities.length === 0) {
      fail("capabilities must be a non-empty array");
    }

    const known = normalizeKnownIds(knownCapabilityIds);
    const seen = new Set();
    const states = Object.create(null);

    payload.capabilities.forEach((item, index) => {
      exactKeys(item, ITEM_KEYS, `capabilities[${index}]`);
      const id = item.capability_id;
      if (typeof id !== "string" || !CAPABILITY_ID_RE.test(id)) {
        fail(`capabilities[${index}].capability_id is invalid`);
      }
      if (typeof item.enabled !== "boolean") {
        fail(`capabilities[${index}].enabled must be boolean`);
      }
      if (seen.has(id)) {
        fail(`duplicate capability_id: ${id}`);
      }
      if (known && !known.has(id)) {
        fail(`unknown capability_id: ${id}`);
      }
      seen.add(id);
      states[id] = item.enabled;
    });

    return Object.freeze({
      schema_version: payload.schema_version,
      capabilities: Object.freeze(states),
    });
  }

  function isEnabled(resolution, capabilityId) {
    if (!resolution || !resolution.capabilities) {
      return false;
    }
    if (typeof capabilityId !== "string" || !CAPABILITY_ID_RE.test(capabilityId)) {
      return false;
    }
    return resolution.capabilities[capabilityId] === true;
  }

  function runIfEnabled(resolution, capabilityId, callback) {
    if (!isEnabled(resolution, capabilityId)) {
      return Object.freeze({ executed: false, value: undefined });
    }
    if (typeof callback !== "function") {
      throw new TypeError("callback must be a function");
    }
    return Object.freeze({ executed: true, value: callback() });
  }

  function publicSnapshot(resolution) {
    if (!resolution || typeof resolution.schema_version !== "string" || !resolution.capabilities) {
      fail("normalized resolution is required");
    }
    return Object.freeze({
      schema_version: resolution.schema_version,
      capabilities: Object.freeze(
        Object.keys(resolution.capabilities)
          .sort()
          .map((capabilityId) =>
            Object.freeze({
              capability_id: capabilityId,
              enabled: resolution.capabilities[capabilityId] === true,
            })
          )
      ),
    });
  }

  return Object.freeze({
    parseResolution,
    isEnabled,
    runIfEnabled,
    publicSnapshot,
  });
});
