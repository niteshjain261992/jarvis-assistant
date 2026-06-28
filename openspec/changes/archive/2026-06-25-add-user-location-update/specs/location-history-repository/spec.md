## ADDED Requirements

### Requirement: Next location history id

The location history repository SHALL export `getNextLocationHistoryId(): Promise<number>` returning one greater than the highest existing `_id` in `location_history`, or `1` when the collection is empty.

#### Scenario: Empty collection starts at one

- **WHEN** `location_history` has no documents
- **THEN** `getNextLocationHistoryId` returns `1`

#### Scenario: Increments from latest id

- **WHEN** the highest `_id` in `location_history` is `100`
- **THEN** `getNextLocationHistoryId` returns `101`

## MODIFIED Requirements

### Requirement: Repository isolation

The location history repository module SHALL NOT be imported by HTTP routes, agent modules, or application bootstrap files unrelated to location persistence. The location update service MAY import `insertLocationHistory` and `getNextLocationHistoryId`.

#### Scenario: Location update may use repository

- **WHEN** a location move exceeds the 50-meter threshold
- **THEN** `src/services/location.service.ts` MAY import from `location-history.repository`

#### Scenario: No unrelated wiring

- **WHEN** the change is applied
- **THEN** `src/server.ts`, `src/app.ts`, and files under `src/agent/` contain no imports from `location-history.repository`
