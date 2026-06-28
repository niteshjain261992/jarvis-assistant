# location-history-repository Specification

## Purpose

Define MongoDB persistence for location history documents in the `location_history` collection: coordinates, optional labels, and timestamp-ordered queries linked to `users._id`. The location update service MAY import this repository for history archival.

## Requirements

### Requirement: Location history document shape

The system SHALL persist location documents in MongoDB collection `location_history` with the following fields:

| Field          | Type   | Required | Notes                                      |
| -------------- | ------ | -------- | ------------------------------------------ |
| `_id`          | string | yes      | UUID string (caller-supplied on insert)    |
| `userId`       | string | yes      | References `users._id`                     |
| `latitude`     | number | yes      | Recorded latitude                          |
| `longitude`    | number | yes      | Recorded longitude                         |
| `locationName` | string | no       | Optional reverse-geocoded label            |
| `timestamp`    | number | yes      | Unix timestamp (seconds)                   |
| `createdAt`    | Date   | yes      | Document creation time                     |
| `updatedAt`    | Date   | yes      | Last modification time                     |

Typed interfaces SHALL live in `src/models/location-history.model.ts` as `LocationHistoryDocument` and `LocationHistoryInsert` (omits `_id`).

#### Scenario: Insert location with coordinates

- **WHEN** `insertLocationHistory` is called with `_id`, `userId`, `latitude`, `longitude`, `timestamp`, `createdAt`, and `updatedAt`
- **THEN** the document is stored and retrievable with those values

#### Scenario: Optional location name

- **WHEN** `insertLocationHistory` is called without `locationName`
- **THEN** the document is stored with `locationName` undefined on read

### Requirement: Location history repository operations

The location history repository in `src/repositories/location-history.repository.ts` SHALL export:

- `insertLocationHistory(doc: LocationHistoryDocument): Promise<LocationHistoryDocument>`
- `findLocationHistoryById(id: string): Promise<LocationHistoryDocument | null>`
- `findLocationHistoryByUserId(userId: string, limit?: number): Promise<LocationHistoryDocument[]>` — ordered by `timestamp` descending, default `limit` 50
- `deleteLocationHistory(id: string): Promise<void>`

#### Scenario: Recent locations ordered

- **WHEN** multiple location documents exist for a user with different timestamps
- **THEN** `findLocationHistoryByUserId` returns documents newest-first

#### Scenario: Limit respected

- **WHEN** `findLocationHistoryByUserId` is called with `limit: 2` and more than two documents exist
- **THEN** exactly two documents are returned

#### Scenario: Delete location row

- **WHEN** `deleteLocationHistory` is called for an existing id
- **THEN** `findLocationHistoryById` returns `null`

### Requirement: Repository isolation

The location history repository module SHALL NOT be imported by HTTP routes, agent modules, or application bootstrap files unrelated to location persistence. The location update service MAY import `insertLocationHistory`.

#### Scenario: Location update may use repository

- **WHEN** a location move exceeds the 50-meter threshold
- **THEN** `src/services/location.service.ts` MAY import from `location-history.repository`

#### Scenario: No unrelated wiring

- **WHEN** the change is applied
- **THEN** `src/server.ts`, `src/app.ts`, and files under `src/agent/` contain no imports from `location-history.repository`

### Requirement: Location history repository tests

The change SHALL include Jest integration tests using `mongodb-memory-server` covering insert/find, ordering, limit, and delete. `npm test` MUST pass with global coverage ≥ 90%.

#### Scenario: Test suite passes

- **WHEN** `npm test` runs after implementation
- **THEN** location history repository tests pass and coverage thresholds are met
