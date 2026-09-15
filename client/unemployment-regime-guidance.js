(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODUnemploymentRegimeGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product public-copy guard only. The matcher, truth layer and first-day
  // unemployment detection remain owned by the existing Stödassistenten runtime.
  // This module closes the v78 presentation drift without deciding eligibility,
  // benefit amount, sanction outcome, deadlines or which legal regime applies.
  const AF_FIRST_DAY_URL = 'https://arbetsformedlingen.se/for-arbetssokande/arbetslos---vad-hander-nu';
  const IAF_REGIME_URL = 'https://www.iaf.se/pressrum/aktuellt-och-pressmeddelanden/nya-regler-for-arbetsloshetsforsakringen-fran-den-1-oktober/';

  const COPY = Object.freeze({
    sv: Object.freeze({
      firstDayTitle: 'Nyss arbetslös – börja första arbetslösa dagen',
      firstDayBody: 'Om du precis blivit arbetslös: skriv in dig hos Arbetsförmedlingen första arbetslösa dagen och ansök därefter hos din a-kassa. A-kassan prövar rätten till ersättning.',
      regimeTitle: 'A-kassa – kontrollera vilket regelverk som gäller',
      regimeBody: 'Sedan 1 oktober 2025 finns två regelverk parallellt. Nya beslut prövas enligt de inkomstbaserade reglerna, medan en pågående ersättningsperiod som startade före 1 oktober 2025 kan följa de äldre reglerna. Kontrollera ditt spår med a-kassan; Stödassistenten avgör inte rätt, nivå eller sanktion.',
      supportTitle: 'Arbetsförmedlingen – stöd som arbetssökande',
      supportBody: 'Vilket stöd som kan vara relevant beror på din situation, hur länge du varit arbetslös och vilka hinder eller behov du har.'
    }),
    ar: Object.freeze({
      firstDayTitle: 'أصبحت عاطلاً الآن – ابدأ في أول يوم بطالة',
      firstDayBody: 'إذا أصبحت عاطلاً الآن، سجّل نفسك لدى Arbetsförmedlingen في أول يوم بطالة، ثم قدّم طلب التعويض لدى صندوق البطالة (a-kassa). صندوق البطالة هو من يقرر الاستحقاق.',
      regimeTitle: 'تعويض البطالة – تحقّق أولاً من القواعد التي تنطبق',
      regimeBody: 'منذ 1 أكتوبر 2025 يوجد نظامان متوازيان. تُفحص القرارات الجديدة وفق القواعد المبنية على الدخل، بينما قد تستمر فترة تعويض بدأت قبل 1 أكتوبر 2025 وفق القواعد الأقدم. تحقّق من المسار مع صندوق البطالة؛ Stödassistenten لا يقرر الاستحقاق أو المستوى أو العقوبة.',
      supportTitle: 'Arbetsförmedlingen – دعم للباحث عن عمل',
      supportBody: 'يعتمد الدعم المناسب على وضعك ومدة البطالة والعوائق أو الاحتياجات التي لديك.'
    }),
    fa: Object.freeze({
      firstDayTitle: 'تازه بیکار شده‌اید – از اولین روز بیکاری شروع کنید',
      firstDayBody: 'اگر تازه بیکار شده‌اید، در اولین روز بیکاری در Arbetsförmedlingen ثبت‌نام کنید و سپس از صندوق بیکاری (a-kassa) درخواست بدهید. تصمیم درباره حق دریافت با صندوق بیکاری است.',
      regimeTitle: 'بیمه بیکاری – ابتدا مشخص کنید کدام مقررات مربوط است',
      regimeBody: 'از ۱ اکتبر ۲۰۲۵ دو نظام مقرراتی به‌طور موازی وجود دارد. تصمیم‌های جدید طبق مقررات مبتنی بر درآمد بررسی می‌شوند، در حالی که یک دوره پرداختِ در حال اجرا که پیش از ۱ اکتبر ۲۰۲۵ آغاز شده است ممکن است طبق مقررات قبلی ادامه یابد. مسیر خود را با a-kassa بررسی کنید؛ Stödassistenten درباره استحقاق، سطح پرداخت یا جریمه تصمیم نمی‌گیرد.',
      supportTitle: 'Arbetsförmedlingen – حمایت برای جویندگان کار',
      supportBody: 'نوع حمایت مناسب به شرایط شما، مدت بیکاری و موانع یا نیازهای شما بستگی دارد.'
    })
  });

  function languageCode(value) {
    const normalized = String(value || 'sv').toLowerCase().split('-')[0];
    return Object.prototype.hasOwnProperty.call(COPY, normalized) ? normalized : 'sv';
  }

  function rewriteRows(rows, options) {
    const baseRows = Array.isArray(rows) ? rows.slice() : [];
    const opts = options || {};
    const work = opts.work;
    if (work !== 'unemployed' && work !== 'akassa') return baseRows;

    const copy = COPY[languageCode(opts.language)];
    const regime = [copy.regimeTitle, copy.regimeBody, IAF_REGIME_URL];
    const support = [copy.supportTitle, copy.supportBody, AF_FIRST_DAY_URL];
    const tail = baseRows.slice(2);

    if (work === 'unemployed') {
      const firstDay = [copy.firstDayTitle, copy.firstDayBody, AF_FIRST_DAY_URL];
      return [firstDay, regime].concat(tail).slice(0, 4);
    }
    return [regime, support].concat(tail).slice(0, 4);
  }

  function runtimeLanguage(root) {
    try {
      if (typeof lang !== 'undefined') return languageCode(lang);
    } catch (_error) {
      // Fall back to the document language below.
    }
    return languageCode(root && root.document && root.document.documentElement
      ? root.document.documentElement.lang
      : 'sv');
  }

  function runtimeWork() {
    try {
      if (typeof scenario !== 'undefined' && scenario === 'general' && typeof answers !== 'undefined' && answers) {
        return answers.work || null;
      }
    } catch (_error) {
      // Missing legacy pilot globals means this module is simply inactive.
    }
    return null;
  }

  function init(root) {
    if (!root || !root.document || root.__stodUnemploymentRegimeV79 === true) {
      return Object.freeze({ wired: false, reason: 'not_applicable_or_already_wired' });
    }

    try {
      if (typeof getRows !== 'function') {
        return Object.freeze({ wired: false, reason: 'person_rows_unavailable' });
      }
      const originalGetRows = getRows;
      getRows = function () {
        return rewriteRows(originalGetRows(), {
          language: runtimeLanguage(root),
          work: runtimeWork()
        });
      };
      root.__stodUnemploymentRegimeV79 = true;
      try {
        if (typeof render === 'function') render();
      } catch (_error) {
        // Copy alignment must never break an already rendered pilot.
      }
      return Object.freeze({ wired: true });
    } catch (_error) {
      return Object.freeze({ wired: false, reason: 'fail_closed' });
    }
  }

  return Object.freeze({
    AF_FIRST_DAY_URL,
    IAF_REGIME_URL,
    COPY,
    languageCode,
    rewriteRows,
    init
  });
});
