(function (root, factory) {
  let capabilityClient = root && root.StodCapabilityClient;
  if (typeof module === "object" && module.exports) {
    capabilityClient = require("./capabilities.js");
    module.exports = factory(capabilityClient);
    return;
  }
  if (root) {
    root.StodPilotSurface = factory(capabilityClient);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (capabilityClient) {
  "use strict";

  const MATCH_BASIC = "match_basic";
  const SOURCE_DETAILS = "source_details";

  function disabledResult() {
    return Object.freeze({ executed: false, value: undefined });
  }

  function normalize(payload) {
    if (!capabilityClient || typeof capabilityClient.parseResolution !== "function") {
      return Object.freeze({ valid: false, resolution: null });
    }
    try {
      return Object.freeze({
        valid: true,
        resolution: capabilityClient.parseResolution(payload),
      });
    } catch (_error) {
      return Object.freeze({ valid: false, resolution: null });
    }
  }

  function createPilotSurface(payload) {
    const normalized = normalize(payload);

    function enabled(capabilityId) {
      return (
        normalized.valid === true &&
        capabilityClient.isEnabled(normalized.resolution, capabilityId) === true
      );
    }

    function runMatchBasic(callback) {
      if (!enabled(MATCH_BASIC)) {
        return disabledResult();
      }
      return capabilityClient.runIfEnabled(normalized.resolution, MATCH_BASIC, callback);
    }

    function runSourceDetails(callback) {
      if (!enabled(MATCH_BASIC) || !enabled(SOURCE_DETAILS)) {
        return disabledResult();
      }
      return capabilityClient.runIfEnabled(normalized.resolution, SOURCE_DETAILS, callback);
    }

    return Object.freeze({
      valid: normalized.valid,
      matchBasicEnabled: enabled(MATCH_BASIC),
      sourceDetailsEnabled: enabled(MATCH_BASIC) && enabled(SOURCE_DETAILS),
      runMatchBasic,
      runSourceDetails,
    });
  }

  return Object.freeze({ createPilotSurface });
});
