(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./public-pilot-ui-gate.js"));
    return;
  }

  if (root) {
    const api = factory(root.StodPublicPilotUiGate);
    root.StodPublicPilotWiring = api;
    root.StodPublicPilotWiringState = api.wireBrowser(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (uiGateApi) {
  "use strict";

  const SOURCE_LINK_RE = /<a class="source"[\s\S]*?<\/a>/;
  const FALLBACK = Object.freeze({
    sv: "Stödmatchningen kunde inte laddas säkert just nu. Försök igen om en stund.",
    ar: "تعذر تحميل مطابقة الدعم بشكل آمن الآن. حاول مرة أخرى بعد قليل.",
    fa: "تطبیق حمایت در حال حاضر به‌صورت امن بارگذاری نشد. کمی بعد دوباره تلاش کنید.",
  });

  function languageCode(value) {
    if (typeof value !== "string") {
      return "sv";
    }
    const normalized = value.toLowerCase().split("-")[0];
    return Object.prototype.hasOwnProperty.call(FALLBACK, normalized) ? normalized : "sv";
  }

  function fallbackHtml(language) {
    const text = FALLBACK[languageCode(language)];
    return `<section class="card"><div class="notice" role="status">${text}</div></section>`;
  }

  function splitSourceLink(cardHtml) {
    if (typeof cardHtml !== "string") {
      return Object.freeze({ base: cardHtml, source: "", marker: "" });
    }
    const match = cardHtml.match(SOURCE_LINK_RE);
    if (!match) {
      return Object.freeze({ base: cardHtml, source: "", marker: "" });
    }
    const marker = "<!--STOD_SOURCE_DETAILS-->";
    return Object.freeze({
      base: cardHtml.replace(match[0], marker),
      source: match[0],
      marker,
    });
  }

  function createBindings(options) {
    const opts = options || {};
    const runtime = opts.runtime;
    const originalResults = opts.originalResults;
    const originalResultCard = opts.originalResultCard;
    const getLanguage = typeof opts.getLanguage === "function" ? opts.getLanguage : function () { return "sv"; };

    if (!runtime || typeof runtime.getSurface !== "function") {
      throw new TypeError("runtime with getSurface is required");
    }
    if (typeof originalResults !== "function" || typeof originalResultCard !== "function") {
      throw new TypeError("originalResults and originalResultCard are required");
    }

    function gatedResultCard(row, index) {
      const cardHtml = originalResultCard(row, index);
      const parts = splitSourceLink(cardHtml);
      if (!parts.source) {
        return cardHtml;
      }

      const surface = runtime.getSurface();
      const sourceResult = surface && typeof surface.runSourceDetails === "function"
        ? surface.runSourceDetails(function () { return parts.source; })
        : Object.freeze({ executed: false, value: undefined });
      const sourceHtml = sourceResult && sourceResult.executed === true ? sourceResult.value : "";
      return parts.base.replace(parts.marker, sourceHtml || "");
    }

    function gatedResults() {
      const surface = runtime.getSurface();
      const matchResult = surface && typeof surface.runMatchBasic === "function"
        ? surface.runMatchBasic(originalResults)
        : Object.freeze({ executed: false, value: undefined });
      if (matchResult && matchResult.executed === true) {
        return matchResult.value;
      }
      return fallbackHtml(getLanguage());
    }

    return Object.freeze({ gatedResults, gatedResultCard });
  }

  function wireBrowser(rootObject) {
    const root = rootObject || null;
    if (
      !root ||
      !uiGateApi ||
      typeof uiGateApi.createRuntime !== "function" ||
      typeof root.results !== "function" ||
      typeof root.resultCard !== "function" ||
      typeof root.render !== "function"
    ) {
      return Object.freeze({ wired: false, reason: "dependencies_unavailable" });
    }

    const runtime = uiGateApi.createRuntime();
    const bindings = createBindings({
      runtime,
      originalResults: root.results,
      originalResultCard: root.resultCard,
      getLanguage: function () {
        return root.document && root.document.documentElement
          ? root.document.documentElement.lang
          : "sv";
      },
    });

    root.resultCard = bindings.gatedResultCard;
    root.results = bindings.gatedResults;

    const started = runtime.start().then(function () {
      try {
        root.render();
      } catch (_error) {
        // Capability loading must not break the already rendered public pilot.
      }
      return runtime.getStatus();
    });

    return Object.freeze({ wired: true, runtime, started });
  }

  return Object.freeze({
    fallbackHtml,
    splitSourceLink,
    createBindings,
    wireBrowser,
  });
});
