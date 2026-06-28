## Why

The user-context RAG write path currently embeds the user's location as raw coordinates ("Current location: latitude 19.06, longitude 72.83"). Coordinates are meaningless to the LLM and to semantic retrieval. Translating the live GPS fix into a human-readable place name ("Bandra, Mumbai, Maharashtra") makes the embedded location fact far more useful for reasoning and retrieval, at no extra API cost (Nominatim is keyless).

## What Changes

- Add a new `geocoding` capability: a single-responsibility `reverseGeocode(lat, lon)` service that turns coordinates into a compact readable place name via Nominatim (OpenStreetMap), failing soft (returns `null`, never throws).
- On a qualifying location update, reverse-geocode the new coordinates and store the result on the user as a new `currentLocationName` field; the archived history row carries the **previous** location's name.
- The location embedding now uses `currentLocationName` when present, falling back to raw coordinates when geocoding is unavailable, so the location point is never empty when coordinates exist.
- `homeLocation` (where the user *lives*) is explicitly **never** modified by location updates — this change only adds `currentLocationName` (where the user *is*).
- Geocoding failure is non-fatal end-to-end: the location update still succeeds with coordinates and an unset name.
- No new package and no required env var; an optional `NOMINATIM_BASE_URL` is added (with the public default) for testability.

## Capabilities

### New Capabilities
- `geocoding`: Reverse-geocode WGS-84 coordinates to a compact human-readable place name via Nominatim, with a descriptive User-Agent header and fail-soft (`null`) semantics; free of Mongo/Qdrant concerns.

### Modified Capabilities
- `user-location-update`: A qualifying update reverse-geocodes the new coordinates, stores `currentLocationName` on the user, sets the history row's `locationName` to the user's previous name (captured before the update), never touches `homeLocation`, and treats geocoding failure as non-fatal.
- `user-context-rag`: The location embed sentence uses the readable `currentLocationName` when available and falls back to raw coordinates otherwise; the stable `${userId}:location` point id and overwrite/non-fatal semantics are unchanged.
- `app-config`: Add optional `NOMINATIM_BASE_URL` (valid URL, public default `https://nominatim.openstreetmap.org`) for testability; no key required.

## Impact

- Code: `src/services/geocoding.service.ts` (new); `src/models/user.model.ts`, `src/services/location.service.ts`, `src/services/user-context.service.ts`, `src/config/env.ts` (modified). `src/models/location-history.model.ts` already has `locationName` — no change.
- Tests: `tests/services/geocoding.service.test.ts` (new); `tests/services/location.service.test.ts`, `tests/services/user-context.service.test.ts` (modified).
- External dependency: Nominatim public reverse-geocode endpoint (rate limit 1 req/s, gated by the existing 50 m distance threshold; descriptive User-Agent required). No API key, no new npm package.
