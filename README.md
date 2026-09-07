# VyaparGuide AI

VyaparGuide AI is a Node/HTML/CSS/JavaScript MVP for rural micro-entrepreneurs. It combines a verified Maharashtra village identity with evidence-first business and financial guidance.

## Run

```powershell
npm.cmd start
```

Open `http://localhost:3000`.

## Verified location identity

The local LGD export in `data/locations/maharashtra_villages_real.json` contains 44,809 Maharashtra records from the Government of India Local Government Directory (LGD), “Villages with PIN Codes.” It is the authoritative source for village identity, district, subdistrict, LGD codes, and PINs.

Search works locally without internet, a Google key, or a data.gov.in key. An unknown location is labelled `INSUFFICIENT_EVIDENCE`; a duplicate name is never selected silently.

## Evidence statuses

- `VERIFIED` — direct official source record.
- `DERIVED` — transparent calculation from verified official records.
- `ADVISORY` — deterministic business interpretation; not government fact.
- `INSUFFICIENT_EVIDENCE` — no reliable record at the requested geography.

LGD does not provide population, business count, market size, demand, or competitor data. The app does not invent these values.

## data.gov.in integration

Configuration is in `data/datagov/datasets.json`; cached normalized records are kept in `data/datagov/cache/`. The backend alone calls data.gov.in. The browser never receives `DATA_GOV_API_KEY`.

```powershell
# Copy .env.example to .env and set DATA_GOV_API_KEY
npm.cmd run sync:datagov
npm.cmd run build:genome
npm.cmd run refresh:data
```

Only the AGMARKNET mandi resource has a verified API resource ID in the initial configuration. Other catalog entries deliberately remain disabled until their resource UUIDs are verified in data.gov.in; this avoids fabricated IDs and unsafe data claims. A failed sync preserves the last valid cache.

See [data.gov.in integration documentation](docs/DATA_GOV_INTEGRATION.md) for the complete dataset policy, cache behaviour, geography fallback, and troubleshooting steps.

## Optional Google Places

Google Places is optional and used only for live nearby-business/map enrichment. Without `GOOGLE_MAPS_API_KEY`, the UI shows that live nearby business data is unavailable; it does not display fake competitors.

## Test

```powershell
npm.cmd test
node backend/scripts/testMaharashtraLookup.js
```
