(function (root, factory) {
  let pilotSurfaceApi = root && root.StodPilotSurface;
  let defaultFetch = root && typeof root.fetch === "function" ? root.fetch.bind(root) : null;

  if (typeof module === "object" && module.exports) {
    pilotSurfaceApi = require("./pilot-surface.js");
    defaultFetch = null;
    module.exports = factory(pilotSurfaceApi, defaultFetch);
    return;
  }

  if (root) {
    root.StodPublicPilotUiGate = factory(pilotSurfaceApi, defaultFetch);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (pilotSurfaceApi, defaultFetch) {
  "use strict";

  const DEFAULT_PROFILE_URL = "config/public_pilot_capabilities.json";

  function disabledResult() {
    return Object.freeze({ executed: false, value: undefined });
  }

  function closedSurface() {
    return Object.freeze({
      valid: false,
      matchBasicEnabled: false,
      sourceDetailsEnabled: false,
      runMatchBasic: disabledResult,
      runSourceDetails: disabledResult,
    });
  }

  function createRuntime(options) {
    const opts = options || {};
    const fetchFn = opts.fetchFn || defaultFetch;
    const profileUrl = opts.profileUrl || DEFAULT_PROFILE_URL;
    let surface = closedSurface();
    let status = "idle";
    let startPromise = null;
    const listeners = new Set();

    function snapshot() {
      return Object.freeze({
        status,
        ready: status === "ready",
        valid: surface.valid === true,
        matchBasicEnabled: surface.matchBasicEnabled === true,
        sourceDetailsEnabled: surface.sourceDetailsEnabled === true,
      });
    }

    function notify() {
      const value = snapshot();
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (_error) {
          // A UI listener must never break capability resolution.
        }
      }
    }

    function subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("listener must be a function");
      }
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    }

    async function load() {
      status = "loading";
      surface = closedSurface();
      notify();

      if (!pilotSurfaceApi || typeof pilotSurfaceApi.createPilotSurface !== "function" || typeof fetchFn !== "function") {
        status = "unavailable";
        notify();
        return snapshot();
      }

      try {
        const response = await fetchFn(profileUrl, {
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response || response.ok !== true || typeof response.json !== "function") {
          throw new Error("profile unavailable");
        }
        const payload = await response.json();
        const candidate = pilotSurfaceApi.createPilotSurface(payload);
        if (!candidate || candidate.valid !== true) {
          throw new Error("invalid profile");
        }
        surface = candidate;
        status = "ready";
      } catch (_error) {
        surface = closedSurface();
        status = "unavailable";
      }

      notify();
      return snapshot();
    }

    function start() {
      if (!startPromise) {
        startPromise = load();
      }
      return startPromise;
    }

    return Object.freeze({
      start,
      subscribe,
      getSurface: function getSurface() {
        return surface;
      },
      getStatus: snapshot,
    });
  }

  return Object.freeze({
    DEFAULT_PROFILE_URL,
    createRuntime,
  });
});
