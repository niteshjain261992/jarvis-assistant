## MODIFIED Requirements

### Requirement: Location update processing

The location service in `src/services/location.service.ts` SHALL export `processLocationUpdate(envelope: LocationUpdateEnvelope)` that:

1. Loads the single user via `findSingleUser()`.
2. When the user has both `currentLat` and `currentLon` defined, computes Haversine distance to `payload.latitude` / `payload.longitude`.
3. When distance is **greater than 50 meters**, inserts a `location_history` document with a UUID `_id` (via `randomUUID()`), containing the **previous** `currentLat` / `currentLon`, the user's string `_id` as `userId`, `timestamp` equal to the envelope `timestamp`, and `createdAt` / `updatedAt` set to the current time.
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
- **THEN** a `location_history` row is inserted with a UUID `_id` and the **previous** latitude and longitude
- **AND** the user coordinates are updated to the payload values

#### Scenario: Missing user fails operationally

- **WHEN** `findSingleUser()` returns `null`
- **THEN** `processLocationUpdate` throws an operational `AppError`
