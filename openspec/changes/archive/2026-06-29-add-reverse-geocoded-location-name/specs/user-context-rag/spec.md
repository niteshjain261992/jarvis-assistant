## MODIFIED Requirements

### Requirement: Embed-on-write at stable point ids

The system SHALL embed user identity and location facts into the `user_context` collection using deterministic, stable point ids derived from the user id: identity at `${userId}:identity` and location at `${userId}:location`. Each point's content SHALL be a natural-language sentence built only from defined `UserDocument` fields and SHALL never emit the literal word "undefined". Each point's metadata SHALL include `{ userId, type }` where `type` is `'identity'` or `'location'`.

Identity content SHALL be built from `name`, `dob`, `homeLocation` (whichever are present). Location content SHALL use the human-readable `currentLocationName` when present (e.g. `"User's current location is <currentLocationName>."`); when `currentLocationName` is absent but `currentLat` and `currentLon` are present it SHALL fall back to a coordinate sentence (e.g. `"User's current location is latitude <lat>, longitude <lon>."`); when neither a name nor coordinates are present the location upsert SHALL be skipped.

#### Scenario: Identity upsert builds a sentence and stable id

- **WHEN** `upsertUserIdentity` runs for a user with a name and home location but no dob
- **THEN** a point is upserted at id `${userId}:identity` whose content includes the name and home location, omits the dob, and contains no literal "undefined", with metadata type `'identity'`

#### Scenario: Location upsert uses the readable name

- **WHEN** `upsertUserLocation` runs for a user whose `currentLocationName` is set
- **THEN** a point is upserted at id `${userId}:location` whose content contains the place name and not the raw latitude/longitude, with metadata type `'location'`

#### Scenario: Location upsert falls back to coordinates

- **WHEN** `upsertUserLocation` runs for a user with `currentLat` and `currentLon` set but no `currentLocationName`
- **THEN** a point is upserted at id `${userId}:location` whose content reflects the coordinates, with metadata type `'location'`

#### Scenario: Missing name and coordinates skip location embed

- **WHEN** `upsertUserLocation` runs for a user missing `currentLocationName`, `currentLat`, and `currentLon`
- **THEN** no embedding is computed and no upsert is performed
