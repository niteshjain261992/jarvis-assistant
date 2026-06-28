## 1. Utilities and repository extensions

- [x] 1.1 Add `src/utils/haversine.ts` with `haversineDistanceMeters(lat1, lon1, lat2, lon2)` using Earth radius 6_371_000 m
- [x] 1.2 Add `tests/utils/haversine.test.ts` covering zero distance and a known ~1 km pair
- [x] 1.3 Add `findSingleUser()` to `src/repositories/user.repository.ts`
- [x] 1.4 Add `getNextLocationHistoryId()` to `src/repositories/location-history.repository.ts`
- [x] 1.5 Extend `tests/repositories/user.repository.test.ts` with `findSingleUser` cases
- [x] 1.6 Extend `tests/repositories/location-history.repository.test.ts` with `getNextLocationHistoryId` cases

## 2. WebSocket schema and types

- [x] 2.1 Create `src/schemas/websocket/location-update.schema.ts` validating `latitude`, `longitude`, `accuracy_meters`, and `speed_kmh`
- [x] 2.2 Add `LOCATION_UPDATE` arm to `src/schemas/websocket/inbound-envelope.schema.ts` and export `LocationUpdateEnvelope`
- [x] 2.3 Extend `tests/schemas/websocket/inbound-envelope.schema.test.ts` with valid and invalid `LOCATION_UPDATE` cases

## 3. Location service

- [x] 3.1 Create `src/services/location.service.ts` with `processLocationUpdate(envelope)` implementing single-user lookup, 50 m Haversine threshold, history append of superseded coordinates, and user profile update
- [x] 3.2 Create `tests/services/location.service.test.ts` with mongodb-memory-server covering first fix, sub-threshold move, over-threshold history, and missing user

## 4. WebSocket controller and registry

- [x] 4.1 Create `src/controllers/websocket/location-update.controller.ts` calling `processLocationUpdate` with fire-and-forget success and error envelope mapping
- [x] 4.2 Register `LOCATION_UPDATE: handleLocationUpdate` in `src/controllers/websocket/index.ts`
- [x] 4.3 Create `tests/controllers/websocket/location-update.controller.test.ts` mocking `processLocationUpdate`
- [x] 4.4 Extend `tests/websocket/messages.gateway.test.ts` to assert `LOCATION_UPDATE` routes to the location controller

## 5. Verification

- [x] 5.1 Run `npm test` and confirm all new and existing tests pass with coverage ≥ 90%
