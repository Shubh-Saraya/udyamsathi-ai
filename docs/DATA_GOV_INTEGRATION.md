# data.gov.in evidence-first integration

## Architecture

`LGD lookup → verified location → normalized official-data cache → Local Business & Market Genome → derived indicators/advisory`

`backend/integrations/dataGov.js` is the only component that calls `https://api.data.gov.in/resource/<resource-id>`. It provides key injection, timeout, retry for temporary failures, pagination, response validation, and cache protection. `backend/services/dataGovNormalizers.js` converts source-specific records into internal shapes. `backend/services/localBusinessGenome.js` combines cache evidence without mixing geographic levels.

The public endpoint is `POST /api/local-business-genome`, using a verified LGD location body such as:

```json
{"district":"Jalgaon","subdistrict":"Erandol","village":"Javkhede Sim","villageCode":"527291"}
```

`POST /api/analyze` also embeds the resulting genome at `genome.businessGenome` for compatibility with the existing user flow.

## Dataset configuration

All catalog URLs, verified resource IDs, geography scope, publisher, and enablement are centralised in `data/datagov/datasets.json`.

| Dataset | Intended geography | Current configuration |
|---|---|---|
| LGD village export | Village | Local official export, active |
| Census 2011 PCA Maharashtra | Village | Catalog configured; resource UUID must be verified before sync |
| Census 2011 village amenities | Village | Catalog configured; resource UUID must be verified before sync |
| UDYAM total/services/manufacturing | District | Catalog configured; resource UUIDs must be verified before sync |
| AGMARKNET mandi prices | District market signal | Verified resource ID `9ef84268-d588-465a-a308-a864a43d0070`, enabled |
| PM-KISAN | Village | Disabled pending a verified Maharashtra resource ID |
| ODOP | District | Disabled pending a verified resource UUID |
| Crop production | District | Disabled pending a verified resource UUID |
| Kisan Call Centre | District | Disabled pending a verified resource UUID |

Catalog references are official data.gov.in pages only. The integration intentionally does **not** guess resource UUIDs from slugs or search results.

## API key and synchronization

1. Obtain a data.gov.in API key for the resources your project may access.
2. Copy `.env.example` to `.env`.
3. Set `DATA_GOV_API_KEY=...` only in `.env`.
4. Verify each resource UUID in the data.gov.in catalog/API console, then enter it in `data/datagov/datasets.json` and set `enabled: true`.
5. Run `npm.cmd run sync:datagov`.

The synchronizer accepts only configured data.gov.in resource IDs. It refuses an empty normalized response and leaves the last valid `data/datagov/cache/<dataset>.json` untouched. Each cache contains source metadata, retrieval time, source update time where supplied, and normalized records.

## Geography and data honesty

Priority is exact Village → Subdistrict → District → State → `INSUFFICIENT_EVIDENCE`. A district record is never displayed as village data. Census fields always carry data year `2011`; they are historical, not current population or infrastructure claims. UDYAM is labelled “registered UDYAM/MSME enterprises,” not all businesses. PM-KISAN beneficiaries are not interpreted as all farmers or households.

The only initial derived metric is MSMEs per 1,000 district Census population, calculated as `(district UDYAM registered enterprises / district Census population) × 1,000`. It is not calculated if compatible official district records are absent.

An advisory appears only when official source records support it. The user interface labels it `AI ADVISORY` and lists its evidence.

## Troubleshooting

- **`DATA_GOV_API_KEY is not configured`**: set the server-only key in `.env`, restart, and rerun sync.
- **Dataset skipped**: confirm its exact official resource UUID and enable it in `datasets.json`; a catalog slug is not an API ID.
- **Sync failed**: the prior valid cache remains in use. Inspect the report printed by `sync:datagov`.
- **No village metric**: this may be correct. The UI should display “Village-level official data unavailable” rather than a proxy.
- **Google not configured**: this affects only optional live nearby-place enrichment, never LGD lookup or cached government genome data.

## Adding an official dataset

Add one configuration entry with the official catalog URL, verified UUID, publisher, geography scope, and enable flag. Add a normalizer that validates required fields and rejects impossible numeric values. Extend `localBusinessGenome.js` only after the normalized geography keys have been tested.
