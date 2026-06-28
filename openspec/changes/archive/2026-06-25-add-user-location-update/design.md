## Context

Jarvis runs as a single-user deployment. The `users` collection already stores `currentLat` and `currentLon` on `UserDocument`, and `location_history` stores past coordinates linked by `userId`. The WebSocket gateway validates inbound frames with a discriminated union (`USER_PROMPT`, `ACTION_ACK`) and dispatches to type-specific controllers.

The client will send periodic GPS fixes using the envelope pattern:

```json
{
  "type": "LOCATION_UPDATE",
  "message_id": "loc-7g8h9i",
  "timestamp": 1719311010,
  "payload": {
    "latitude": 28.4595,
    "longitude": 77.0266,
    "accuracy_meters": 12.5,
    "speed_kmh": 0.0
  }
}
```

Business rules from the product:

1. Load the single user from the database.
2. If the user has a stored location, compute Haversine distance (meters) to the incoming coordinates.
3. When distance **> 50 m**, append the **previous** stored coordinates to `location_history` (not the incoming fix).
4. Always replace `users.currentLat` / `users.currentLon` with the incoming payload values and refresh `lastActive` from the envelope `timestamp`.

`accuracy_meters` and `speed_kmh` are validated on ingress but are **not** persisted in v1 — only lat/lon land on the user profile and history rows.

## Goals / Non-Goals

**Goals:**

- Add `LOCATION_UPDATE` to the inbound envelope schema and controller registry.
- Implement Haversine distance in a pure utility (`src/utils/haversine.ts`).
- Implement location update orchestration in `src/services/location.service.ts`.
- Extend `user.repository` with `findSingleUser()` for the single-user model.
- Add `getNextLocationHistoryId()` (or equivalent) to allocate integer `_id` values for history rows.
- Unit/integration tests for schema, Haversine, service threshold logic, controller dispatch, and gateway routing.

**Non-Goals:**

- Reverse geocoding / `locationName` population.
- Storing `accuracy_meters` or `speed_kmh` in MongoDB.
- Outbound acknowledgment frames on successful location updates (fire-and-forget like `ACTION_ACK`).
- Multi-user auth or per-connection user identity.
- Changing outbound server envelope shape.

## Decisions

### 1. Single-user lookup via `findSingleUser()`

Add `findSingleUser(): Promise<UserDocument | null>` to `user.repository.ts`, implemented as `UserModel.findOne().lean()` (first/only document). Jarvis is single-user; no env var or WebSocket session mapping is needed.

**Alternative:** Hard-code `_id: 1`. Rejected — couples to seed data; `findOne` matches deployment reality.

### 2. Haversine utility

Pure function in `src/utils/haversine.ts`:

```typescript
haversineDistanceMeters(lat1, lon1, lat2, lon2): number
```

Uses Earth radius 6_371_000 m, standard Haversine formula. Exported for direct unit testing.

**Alternative:** Inline in service. Rejected — formula is testable domain logic worth isolating.

### 3. 50-meter threshold constant

Define `LOCATION_HISTORY_DISTANCE_THRESHOLD_METERS = 50` in `location.service.ts` (or a small constants module). Compare using strict `>` (exactly 50 m does **not** trigger history).

**Alternative:** Configurable env var. Rejected for v1 — product spec is fixed at 50 m.

### 4. History append uses superseded coordinates

When threshold exceeded **and** `currentLat`/`currentLon` are both defined numbers on the user:

- Insert history row with the **old** lat/lon, `userId` from the user, `timestamp` = envelope `timestamp` (or `lastActive` if preferred — use envelope timestamp for consistency with client clock).
- Then update user to incoming lat/lon.

When user has no prior location (undefined lat/lon), skip history insert and only set the new coordinates.

**Alternative:** Always append incoming coordinates. Rejected — product spec says archive the database location before replace.

### 5. Location history id allocation

Add `getNextLocationHistoryId(): Promise<number>` to `location-history.repository.ts`:

```typescript
const latest = await LocationHistoryModel.findOne().sort({ _id: -1 }).select('_id').lean();
return (latest?._id ?? 0) + 1;
```

Matches existing integer `_id` caller-supplied pattern used in repository tests.

### 6. Service + thin controller

| Layer | Responsibility |
|-------|----------------|
| `location-update.schema.ts` | Payload Zod validation |
| `location-update.controller.ts` | Type guard, call service, map errors to envelopes |
| `location.service.ts` | `processLocationUpdate(envelope)` — user lookup, distance, history, update |

Controller follows `user-prompt.controller.ts` error mapping (`AppError` → `envelopeFromAppError`, unexpected → `internalServerErrorEnvelope`). On success, send **no** outbound frame (same as `ACTION_ACK`).

**Alternative:** Put logic directly in controller. Rejected — service is testable without WebSocket mocks.

### 7. Missing user handling

If `findSingleUser()` returns `null`, throw operational `AppError` with code `NOT_FOUND` (or existing equivalent) so the controller returns an error envelope without closing the connection.

### 8. Inbound schema composition

Add arm to `inboundEnvelopeSchema` discriminated union:

```typescript
z.object({
  type: z.literal('LOCATION_UPDATE'),
  message_id: z.string().min(1),
  timestamp: z.number().int().positive(),
  payload: locationUpdatePayloadSchema,
})
```

Payload schema (`location-update.schema.ts`):

| Field | Validation |
|-------|------------|
| `latitude` | number, -90 to 90 |
| `longitude` | number, -180 to 180 |
| `accuracy_meters` | number, ≥ 0 |
| `speed_kmh` | number, ≥ 0 |

Export `LocationUpdateEnvelope` type via `Extract<InboundEnvelope, { type: 'LOCATION_UPDATE' }>`.

## Risks / Trade-offs

- **[Risk] GPS jitter near 50 m boundary causes frequent history rows** → **Mitigation:** Threshold is product-defined; future change can add hysteresis or time-based dedup.
- **[Risk] `findOne` ambiguous if multiple users seeded** → **Mitigation:** Single-user deployment assumption documented; tests use one user document.
- **[Risk] Concurrent location updates race on `_id` allocation** → **Mitigation:** Acceptable for single-client GPS stream; retry or atomic counter if multi-writer becomes a concern.
- **[Risk] Client sends invalid coordinates at poles/date line** → **Mitigation:** Zod range validation rejects out-of-range values at ingress.

## Migration Plan

1. Deploy backend with new schema arm and controller — existing clients unaffected.
2. Ship mobile client sending `LOCATION_UPDATE` envelopes.
3. Ensure a user document exists in `users` (seed/migration) before first fix.
4. Rollback: remove controller registry entry and schema arm; client stops sending type.

## Open Questions

- None for v1 — outbound ack for location updates deferred until product asks for it.
