## Why

The mobile client can now report GPS coordinates over the existing WebSocket connection, but the backend has no handler to persist them. Jarvis needs a durable current location on the user profile and a movement history trail so future agent turns can reason about where the user is and where they have been. The inbound envelope pattern is already in place; this change adds the first location-specific message type and wires it through to MongoDB.

## What Changes

- Add `LOCATION_UPDATE` as a third inbound WebSocket envelope type with a validated payload (`latitude`, `longitude`, `accuracy_meters`, `speed_kmh`).
- Add a `location-update.controller.ts` registered in the WebSocket controller map.
- Add a `location.service.ts` (or equivalent) that:
  - Loads the single user record from the database.
  - Computes Haversine distance (meters) between the stored coordinates and the incoming payload.
  - When distance exceeds **50 meters** and a prior location exists, appends the **previous** stored coordinates to `location_history`.
  - Updates `users.currentLat` / `users.currentLon` (and `lastActive`) with the new payload coordinates.
- Add a shared Haversine distance utility.
- Extend `user.repository` with `findSingleUser()` for the single-user deployment model.
- Add repository helper(s) as needed for location-history id allocation (if not already present).
- Add unit/integration tests for schema, controller, service, and Haversine logic.
- **Non-breaking** for existing `USER_PROMPT` and `ACTION_ACK` clients; new message type is additive.

## Capabilities

### New Capabilities

- `user-location-update`: Business logic for processing `LOCATION_UPDATE` frames — single-user lookup, Haversine threshold (50 m), history append of superseded coordinates, and user profile update.

### Modified Capabilities

- `websocket-inbound-envelope`: Add `LOCATION_UPDATE` discriminated-union arm and payload validation.
- `websocket-message-controllers`: Register and specify behavior for `handleLocationUpdate`.
- `user-repository`: Add `findSingleUser()`; relax repository-isolation requirement so location update flow may import it.
- `location-history-repository`: Relax repository-isolation requirement so location update flow may import `insertLocationHistory`.

## Impact

- **Code (new)**: `src/schemas/websocket/location-update.schema.ts`, `src/controllers/websocket/location-update.controller.ts`, `src/services/location.service.ts`, `src/utils/haversine.ts`
- **Code (modify)**: `src/schemas/websocket/inbound-envelope.schema.ts`, `src/controllers/websocket/index.ts`, `src/repositories/user.repository.ts`
- **Tests (new/modify)**: schema, controller, service, and utility tests; gateway routing test for `LOCATION_UPDATE`
- **Dependencies**: none (uses existing `mongoose`, `ws`, `zod`)
- **Data**: writes to existing `users` and `location_history` collections; no schema migration required (`currentLat`/`currentLon` already exist on `UserDocument`)
