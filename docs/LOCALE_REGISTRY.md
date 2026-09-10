# Stödassistenten – locale registry v0.1

## Syfte

Detta är första maskinläsbara steget från dagens tre pilotspråk till en produkt som kan stödja många språk utan att språk byggs in i matchnings- eller regelmotorn.

`config/locales.json` beskriver endast presentationsmetadata:

- standardiserat locale-ID,
- intern UI-nyckel,
- namn som visas för användaren,
- textriktning (`ltr`/`rtl`),
- om språket är aktivt i den publika piloten.

Registret får inte innehålla stödregler, eligibility, prisplaner, authorization, endpoints, hemligheter, user-/case-ID eller annan privat produktlogik.

## Varför nu

`docs/MULTILINGUAL_ARCHITECTURE.md` kräver att språk är konfigurerbara resurser och att RTL/LTR styrs av locale-metadata i stället för specialkod per språk. Samtidigt ligger dagens pilotöversättningar fortfarande inline i `index.html`.

Locale registry v0.1 skapar därför ett stabilt kontrakt före den mer invasiva UI-refaktorn. Det är avsiktligt reversibelt och ändrar inte pilotens runtime.

## Nuvarande pilot

Aktiva pilot-locale:

- `sv-SE` → UI-nyckel `sv`, LTR
- `ar` → UI-nyckel `ar`, RTL
- `fa` → UI-nyckel `fa`, RTL

Detta är inte en tillåten-lista för den framtida produkten. Schemat accepterar nya BCP-47-liknande locale-ID:n utan att kärnlogiken behöver ändras.

## Sanningslager

`canonical_rule_locale` är `sv-SE`. Det markerar att verifierade svenska regler och primärkällor fortsatt är sanningslagret även när användarens samtalsspråk är ett annat.

`fallback_ui_locale` är den säkra UI-fallbacken om en lokaliserad presentation saknas.

## Validering

Kör lokalt:

```bash
python scripts/validate_locales.py --self-test
```

Validatorn är dependency-free och failar bland annat vid:

- dubbla locale-ID:n eller UI-nycklar,
- ogiltig textriktning,
- fallback som inte finns eller inte är aktiv,
- icke-svenskt canonical rule locale,
- extra/okända fält som kan läcka backend- eller produktsemantik.

## Nästa steg

Nästa separat granskade steg för issue #4 är att flytta UI-strängarna ur `index.html` till språkresurser och låta språkknappar/RTL läsa från detta register. Det steget ska ha snapshot-/smoke-test som visar oförändrat beteende för svenska, arabiska och persiska innan merge.

Locale registry v0.1 innebär alltså inte att fler språk redan är lanserade. Det gör språkarkitekturen skalbar så att nya språk kan läggas till säkert senare.
