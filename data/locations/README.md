# Maharashtra village identity data

This MVP uses the local `maharashtra_villages_real.json` file as its location-identity source. It was generated on **2026-09-06** from the official Government of India **Local Government Directory (LGD)** “Villages with PIN Codes” CSV.

- State: Maharashtra
- Official records in generated export: 44,809
- Available fields: state/district/subdistrict/village names and codes, plus PIN code when supplied by LGD.
- Not available from this dataset: population, business counts, demand, competition, market size, income, road access, financial performance, or coordinates.

The application labels matching records `VERIFIED_LOCATION`. It returns `INSUFFICIENT_EVIDENCE` for an unknown village and `AMBIGUOUS_LOCATION` instead of arbitrarily selecting a duplicate village name.

## Regenerate

From the project directory:

```powershell
node backend/scripts/buildMaharashtraVillages.js
```

This reads only `data/locations/lgd_villages.csv` and rewrites `maharashtra_villages_real.json`.

## Test

```powershell
npm.cmd test
node backend/scripts/testMaharashtraLookup.js
```

Google Places remains optional. It is used only for optional nearby business/map enrichment when credentials are configured; LGD village search does not use an API key or Google billing.
