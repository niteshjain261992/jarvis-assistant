## Context

The location write path (`processLocationUpdate` → `updateUser` → `upsertUserLocation`) already exists. Today the embedded location fact is built from raw coordinates (`buildLocationSentence` in `src/services/user-context.service.ts`), which carries little semantic value for the LLM or for similarity retrieval. The user model already stores `homeLocation` (a stable, manually-set "where I live") and `currentLat`/`currentLon` (the live fix). `location-history.model.ts` already declares an optional `locationName` that nothing populates yet.

This change inserts a reverse-geocoding step that converts the live coordinates into a readable place name and threads that name through the user document, the history archival, and the embedding.

### Nominatim usage notes
- Endpoint: `https://nominatim.openstreetmap.org/reverse?lat=<lat>&lon=<lon>&format=json` (configurable base via `NOMINATIM_BASE_URL`).
- Policy **requires** a descriptive `User-Agent` header identifying the app (e.g. `jarvis-personal-assistant`). Requests without it may be blocked — set it on every request.
- Rate limit: max 1 request/second. **Assumption:** the existing 50 m distance threshold in `processLocationUpdate` already gates how often a qualifying update (and thus a geocode call) occurs, so for single-user personal use no additional rate limiter is needed. **This only holds if the geocode call is placed *after* the threshold check** — it must run only on a qualifying update (first fix or over-threshold), never on every inbound ping.
- No API key required.

## Goals / Non-Goals

**Goals:**
- Add `reverseGeocode(lat, lon): Promise<string | null>` as an isolated, fail-soft service.
- Persist `currentLocationName` on the user; populate the history row's `locationName` with the *previous* name.
- Embed the readable name (fallback to coordinates) at the unchanged `${userId}:location` point id.
- Keep every new external call non-fatal: a geocoding outage never fails a location update.

**Non-Goals:**
- Do NOT auto-update `homeLocation` from coordinates, and do NOT add any "is this home?" inference.
- No retrieval / read-path changes.
- No caching of geocoding results in this slice.
- No new npm package.

## Decisions

**1. New `geocoding.service.ts` rather than inlining in `location.service.ts`.**
Single responsibility and easy mocking in tests. The service imports neither Mongo nor Qdrant — it only does HTTP + parsing. Alternative (inline) was rejected because it couples the network call to the persistence flow and complicates test isolation.

**2. Use the built-in global `fetch` (Node 18+), no new dependency.**
The repo has no shared HTTP helper and Nominatim needs only a single GET with one header. A direct `fetch` with `headers: { 'User-Agent': 'jarvis-personal-assistant' }` is the smallest viable approach.

**3. Compact name assembly from the structured `address` object.**
Prefer `"<neighbourhood|suburb>, <city|town|village>, <state>"`, dropping absent parts and joining the rest with `", "`. `display_name` is often far too long; fall back to it only when no structured parts are present. Return `null` when neither is available.

**4. Fail-soft contract: `reverseGeocode` returns `null`, never throws.**
Any network error, non-200, empty/unparseable body → log via `logger.error` and return `null`. Callers treat `null` as "name unavailable" and proceed with coordinates. This mirrors the existing non-fatal posture of the user-context write path.

**5. Capture the previous name before overwriting.**
`processLocationUpdate` reads `user.currentLocationName` (the *previous* point's name) for the history row **before** calling `updateUser`, which overwrites it with the freshly geocoded `newLocationName`. The history row describes where the user *was*, so it must carry the previous name.

**5a. Geocode only on a qualifying update (after the threshold check).**
The `reverseGeocode` call is placed *after* the distance/first-fix decision (`shouldEmbedLocation`), not at the top of the function. Sub-threshold pings update only coordinates/`lastActive` and never touch Nominatim, so the existing 50 m gate genuinely throttles request frequency (see the rate-limit assumption above). On a non-qualifying update `currentLocationName` is left unchanged.

**6. Do not persist the string `"null"`.**
When `newLocationName` is `null`, leave `currentLocationName` unset/cleared in the `updateUser` payload — never write the literal `"null"`. The embed then falls back to coordinates.

**7. Embed precedence: name → coordinates → skip.**
`buildLocationSentence` uses `currentLocationName` when present (`"User's current location is <name>."`), else coordinates (`"User's current location is latitude <lat>, longitude <lon>."`), else (no name and no coordinates) the upsert is skipped as today.

**8. Optional `NOMINATIM_BASE_URL` env var.**
Added with the public default so tests (and a failure simulation) can point at a stub host. No key, consistent with the existing `QDRANT_URL`/`OLLAMA_BASE_URL` pattern.

## Risks / Trade-offs

- [Nominatim rate-limit / blocking] → Descriptive `User-Agent` on every request; the 50 m threshold gates frequency for single-user use. Failures are non-fatal.
- [Nominatim latency adds to the update path] → One extra awaited GET per *qualifying* update only; acceptable given the throttle. Failure/timeouts degrade to coordinates.
- [Stale name if a geocode succeeds but later calls fail] → Acceptable; the single overwritten point and the coordinate fallback keep the data coherent. No caching needed in this slice.
- [Accidentally overwriting `homeLocation`] → Explicitly excluded; a grep/test asserts `homeLocation` is never in the `updateUser` payload.

## Migration Plan

Additive only. The new `currentLocationName` field is optional — existing user documents remain valid and simply lack it until their next qualifying update. The Qdrant location point is overwritten in place at the stable id (no migration of vectors needed; the next update re-embeds with the readable name). Rollback is reverting the code; no data backfill or teardown required.

## Open Questions

None blocking. (Caching and multi-user rate limiting are deferred non-goals.)
