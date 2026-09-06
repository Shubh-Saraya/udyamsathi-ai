# Live data integration

## Required environment variables

Copy .env.example to .env beside package.json. The server reads it on startup.

- GOOGLE_MAPS_API_KEY: server-only Google Maps Platform key for Places API (New) requests.
- GOOGLE_MAPS_MAPS_JS_KEY: browser-restricted Maps JavaScript API key used solely to render the map.
- GOVERNMENT_DATA_API_KEY: reserved for a future supported official API adapter. It is not sent to the browser.
- AI_API_KEY: reserved for future grounded AI explanations. The deterministic offline advisor works without it.

Enable **Places API (New)** and **Maps JavaScript API** in the Google Cloud project. Restrict the server key to Places API (New); restrict the browser key by authorised HTTP referrers and Maps JavaScript API. Geocoding API is not currently called: Places Text Search (New) supplies selected address and coordinates.

## Current live flow

1. The user can use device location, text search, or manual village selection.
2. Autocomplete and Text Search call server routes; keys never reach frontend JavaScript.
3. Nearby Text Search returns Google place records with name, address, coordinate, category, Maps URL and calculated distance.
4. The frontend renders only observed Google records as map markers and labels them LIVE with retrieval time.
5. The advisory endpoint combines local place results, deterministic financial analysis, active verified schemes and active verified financing products.

If a live request fails, the adapter uses a short-lived in-memory cache; when absent it returns clearly labelled DEMO data. It never represents a fallback as Google data.

## Official-data imports currently supported

The product supports importing official CSV and JSON exports from **myScheme**, **data.gov.in**, official ministry/department portals, Maharashtra government portals, and official lender/provider pages. It does not claim a live API exists for any of these sources until a documented adapter is added.

The admin page at /frontend/admin.html accepts JSON or simple CSV records.

### Scheme required import fields

name, official_url, source_name. Recommended: id, ministry, department, state, category, beneficiary_type, business_types, eligibility, minimum_amount, maximum_amount, subsidy, loan, interest_rate, tenure, collateral, required_documents, application_process, source_url, last_verified, status.

### Financing required import fields

provider, product_name, official_url, source. Recommended: id, business_types, minimum_amount, maximum_amount, interest_rate, tenure, collateral, eligibility, documents, source_url, last_verified, status.

Only ACTIVE records are matched. UNVERIFIED, STALE and EXPIRED records remain visible in the admin data layer but are not confidently recommended. Missing numerical fields remain �w^~)�tNot available in verified source�w^~)�u or+�u���\Check with lende{�u���].

## API routes

- POST /api/location/autocomplete
- POST /api/location/search
- POST /api/local-intelligence
- POST /api/advisory/live-context
- GET /api/schemes/verified and POST /api/schemes/match
- GET /api/financing/verified and POST /api/financing/match
- POST /api/admin/schemes and POST /api/admin/financing
- GET /api/integration-status
