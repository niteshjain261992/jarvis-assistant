## ADDED Requirements

### Requirement: Haversine distance utility

The system SHALL provide `haversineDistanceMeters(lat1, lon1, lat2, lon2)` in `src/utils/haversine.ts` returning the great-circle distance in meters between two WGS-84 coordinate pairs using Earth radius 6_371_000 m.

#### Scenario: Same point returns zero

- **WHEN** `haversineDistanceMeters` is called with identical latitude and longitude for both points
- **THEN** the result is `0`

#### Scenario: Known distance approximation

- **WHEN** `haversineDistanceMeters` is called for two points approximately 1 km apart at the same latitude
- **THEN** the result is within 1% of 1000 meters

### Requirement: Location update processing

The location service in `src/services/location.service.ts` SHALL export `processLocationUpdate(envelope: LocationUpdateEnvelope)` that:

1. Loads the single user via `findSingleUser()`.
2. When the user has both `currentLat` and `currentLon` defined, computes Haversine distance to `payload.latitude` / `payload.longitude`.
3. When distance is **greater than 50 meters**, inserts a `location_history` document containing the **previous** `currentLat` / `currentLon`, the user's `_id` as `userId`, and `timestamp` equal to the envelope `timestamp`.
4. Updates the user document with `currentLat` = `payload.latitude`, `currentLon` = `payload.longitude`, and `lastActive` = envelope `timestamp`.

#### Scenario: First location sets profile only

- **WHEN** the user exists with no `currentLat` / `currentLon` and a valid `LOCATION_UPDATE` is processed
- **THEN** `users.currentLat` and `users.currentLon` are set to the payload coordinates
- **AND** no `location_history` document is inserted

#### Scenario: Small movement skips history

- **WHEN** the user has stored coordinates and Haversine distance to the payload is 50 meters or less
- **THEN** the user coordinates are updated to the payload values
- **AND** no new `location_history` row is inserted

#### Scenario: Large movement archives previous location

- **WHEN** the user has stored coordinates and Haversine distance to the payload is greater than 50 meters
- **THEN** a `location_history` row is inserted with the **previous** latitude and longitude
- **AND** the user coordinates are updated to the payload values

#### Scenario: Missing user fails operationally

- **WHEN** `findSingleUser()` returns `null`
- **THEN** `processLocationUpdate` throws an operational `AppError`

### Requirement: Location update service tests

The change SHALL include Jest tests for `haversineDistanceMeters` and `processLocationUpdate` covering first fix, sub-threshold move, over-threshold history append, and missing user. Tests SHALL use `mongodb-memory-server` for service integration paths.

#### Scenario: Test suite passes

- **WHEN** `npm test` runs after implementation
- **THEN** location service and Haversine tests pass and global coverage thresholds are met
