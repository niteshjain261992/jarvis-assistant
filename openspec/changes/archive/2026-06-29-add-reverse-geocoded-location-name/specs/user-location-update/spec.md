## MODIFIED Requirements

### Requirement: Location update processing

The location service in `src/services/location.service.ts` SHALL export `processLocationUpdate(envelope: LocationUpdateEnvelope)` that:

1. Loads the single user via `findSingleUser()`.
2. When the user has both `currentLat` and `currentLon` defined, computes Haversine distance to `payload.latitude` / `payload.longitude`.
3. When distance is **greater than 50 meters**, inserts a `location_history` document with a UUID `_id` (via `randomUUID()`), containing the **previous** `currentLat` / `currentLon`, the user's string `_id` as `userId`, `timestamp` equal to the envelope `timestamp`, `createdAt` / `updatedAt` set to the current time, and `locationName` set to the user's **previous** `currentLocationName` (captured before the update overwrites it).
4. Reverse-geocodes the incoming `payload.latitude` / `payload.longitude` via `reverseGeocode(...)` (null-safe; the result MAY be `null`) **only when the update qualifies** — i.e. it is the first fix or movement exceeded the 50 m threshold. A sub-threshold update SHALL NOT call `reverseGeocode`; the distance check is what gates Nominatim request frequency.
5. Updates the user document with `currentLat` = `payload.latitude`, `currentLon` = `payload.longitude`, `lastActive` = envelope `timestamp`, and, for a qualifying update, `currentLocationName` = the newly geocoded name. When the geocoded name is `null` (or the update did not qualify for geocoding), `currentLocationName` SHALL be left unchanged/unset and the literal string `"null"` SHALL NOT be written.

`processLocationUpdate` SHALL NOT include `homeLocation` in the `updateUser` payload — `homeLocation` is never modified by location updates. A geocoding failure SHALL be non-fatal: the update still proceeds with coordinates and an unset name, and `processLocationUpdate` SHALL NOT throw because geocoding failed.

#### Scenario: First location sets profile only

- **WHEN** the user exists with no `currentLat` / `currentLon` and a valid `LOCATION_UPDATE` is processed
- **THEN** `users.currentLat` and `users.currentLon` are set to the payload coordinates
- **AND** no `location_history` document is inserted

#### Scenario: Small movement skips history and geocoding

- **WHEN** the user has stored coordinates and Haversine distance to the payload is 50 meters or less
- **THEN** the user coordinates are updated to the payload values
- **AND** no new `location_history` row is inserted
- **AND** `reverseGeocode` is not called and the existing `currentLocationName` is left unchanged

#### Scenario: Large movement archives previous location

- **WHEN** the user has stored coordinates and Haversine distance to the payload is greater than 50 meters
- **THEN** a `location_history` row is inserted with a UUID `_id` and the **previous** latitude and longitude
- **AND** the user coordinates are updated to the payload values

#### Scenario: Successful geocode stores name on user

- **WHEN** a qualifying location update is processed and `reverseGeocode` returns a readable name
- **THEN** `users.currentLocationName` is set to that name via `updateUser`

#### Scenario: Failed geocode still updates coordinates

- **WHEN** a qualifying location update is processed and `reverseGeocode` returns `null`
- **THEN** the user coordinates are still updated, `currentLocationName` is not written as the string `"null"`, and `processLocationUpdate` does not throw

#### Scenario: History row records the previous location name

- **WHEN** an over-threshold update archives the previous location
- **THEN** the inserted `location_history` row's `locationName` is the user's `currentLocationName` value captured before `updateUser` runs

#### Scenario: homeLocation is never modified by location updates

- **WHEN** any location update is processed
- **THEN** `homeLocation` is not included in the `updateUser` payload and the stored `homeLocation` is unchanged

#### Scenario: Missing user fails operationally

- **WHEN** `findSingleUser()` returns `null`
- **THEN** `processLocationUpdate` throws an operational `AppError`
