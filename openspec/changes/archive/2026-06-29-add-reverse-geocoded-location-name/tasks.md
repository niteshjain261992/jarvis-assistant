## 1. Configuration

- [x] 1.1 Add optional `NOMINATIM_BASE_URL` (valid URL, default `https://nominatim.openstreetmap.org`) to the env schema in `src/config/env.ts`
- [x] 1.2 Document `NOMINATIM_BASE_URL` with its public default in `.env.example`

## 2. Data model

- [x] 2.1 Add `currentLocationName?: string` to the `UserDocument` interface in `src/models/user.model.ts`
- [x] 2.2 Add `currentLocationName: { type: String }` to the user schema; leave `homeLocation` exactly as-is
- [x] 2.3 Confirm `src/models/location-history.model.ts` already has optional `locationName` and leave it unchanged

## 3. Geocoding service

- [x] 3.1 Create `src/services/geocoding.service.ts` exporting `reverseGeocode(lat, lon): Promise<string | null>` that GETs `<NOMINATIM_BASE_URL>/reverse?lat=..&lon=..&format=json` with a descriptive `User-Agent` header
- [x] 3.2 Assemble a compact name from the structured `address` (neighbourhood/suburb, city/town/village, state joined with `", "`, omitting absent parts); fall back to `display_name` when structured parts are absent; return `null` when neither exists
- [x] 3.3 Make it fail-soft: catch network errors / non-200 / empty / unparseable body, log via `logger.error`, and return `null` (never throw); import no Mongo or Qdrant modules

## 4. Location update path

- [x] 4.1 In `processLocationUpdate` (`src/services/location.service.ts`), call `reverseGeocode(latitude, longitude)` into `newLocationName` (null-safe) **only on a qualifying update** (after the threshold/first-fix check); sub-threshold pings must not call Nominatim
- [x] 4.2 Capture the user's previous `currentLocationName` before `updateUser`, and set it as the history row's `locationName` on the over-threshold insert
- [x] 4.3 Add `currentLocationName` to the `updateUser` payload using `newLocationName`; when `null`, leave it unset/cleared and never write the string `"null"`; do not include `homeLocation`
- [x] 4.4 Pass the updated user data (including `currentLocationName`) into `upsertUserLocation`; ensure geocoding failure never fails `processLocationUpdate`

## 5. Embedding sentence

- [x] 5.1 Update `buildLocationSentence` / `upsertUserLocation` in `src/services/user-context.service.ts` to use `currentLocationName` when present (`"User's current location is <name>."`)
- [x] 5.2 Fall back to a coordinate sentence when name is absent but `currentLat`/`currentLon` exist; skip the upsert when neither name nor coordinates exist; keep the `${userId}:location` point id and non-fatal semantics unchanged

## 6. Tests

- [x] 6.1 Create `tests/services/geocoding.service.test.ts` (mock fetch): compact name from structured address, fallback to `display_name`, null on non-200, null on network throw, and assertion that a descriptive `User-Agent` header is set — no real Nominatim calls
- [x] 6.2 Update `tests/services/location.service.test.ts`: geocode stores `currentLocationName` via `updateUser`; history row carries the previous name (ordering proof); null geocode still updates coordinates without writing `"null"` and without throwing; `homeLocation` absent from `updateUser` payload; `upsertUserLocation` invoked with updated user data; existing threshold and NOT_FOUND tests still pass
- [x] 6.3 Update `tests/services/user-context.service.test.ts`: embeds the readable name (place name present, raw coordinates absent); falls back to coordinates when name absent; skips when neither present; point id stays `${userId}:location` across both cases

## 7. Verification

- [x] 7.1 Run `npm test`; confirm it passes with coverage above 90%
- [x] 7.2 `grep` confirms `homeLocation` is never written by `processLocationUpdate`
- [ ] 7.3 Manual: send a `LOCATION_UPDATE` → user gets `currentLocationName`, `homeLocation` unchanged, Qdrant location point text contains the place name not raw lat/lon; simulate a Nominatim failure → coordinates still update, name unset, embed falls back to coordinates, no crash
