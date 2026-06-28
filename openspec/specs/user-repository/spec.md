# user-repository Specification

## Purpose

Define MongoDB persistence for user profile documents in the `users` collection: typed fields, UUID string `_id`, and repository CRUD operations. The location update service MAY import this repository for single-user lookup and profile updates.

## Requirements

### Requirement: User document shape

The system SHALL persist user documents in MongoDB collection `users` with the following fields:

| Field          | Type   | Required | Notes                                       |
| -------------- | ------ | -------- | ------------------------------------------- |
| `_id`          | string | yes      | UUID string (caller-supplied on insert)     |
| `name`         | string | no       | Preferred name or nickname                  |
| `dob`          | string | no       | ISO 8601 date `YYYY-MM-DD`                  |
| `homeLocation` | string | no       | Primary residence/city                      |
| `currentLat`   | number | no       | Last known latitude                         |
| `currentLon`   | number | no       | Last known longitude                        |
| `lastActive`   | number | no       | Unix timestamp (seconds)                    |
| `createdAt`    | Date   | yes      | Document creation time                      |
| `updatedAt`    | Date   | yes      | Last modification time                      |

Typed interfaces SHALL live in `src/models/user.model.ts` as `UserDocument` and `UserInsert` (omits `_id`).

#### Scenario: Insert with profile fields

- **WHEN** `insertUser` is called with `_id`, `name`, `dob`, `homeLocation`, `createdAt`, and `updatedAt`
- **THEN** `findUserById` returns those exact field values

#### Scenario: Insert minimal user

- **WHEN** `insertUser` is called with `_id`, `createdAt`, and `updatedAt`
- **THEN** the document is retrievable via `findUserById`

### Requirement: User repository operations

The user repository in `src/repositories/user.repository.ts` SHALL export:

- `insertUser(doc: UserDocument): Promise<UserDocument>`
- `findUserById(id: string): Promise<UserDocument | null>`
- `findSingleUser(): Promise<UserDocument | null>`
- `updateUser(id: string, update: Partial<Pick<UserDocument, 'name' | 'dob' | 'homeLocation' | 'currentLat' | 'currentLon' | 'lastActive'>>): Promise<void>` — SHALL also set `updatedAt` to the current time
- `touchLastActive(id: string, timestamp: number): Promise<void>`

#### Scenario: Insert and find by id

- **WHEN** `insertUser` is called with a valid document
- **THEN** `findUserById` returns the inserted document

#### Scenario: Find missing user

- **WHEN** `findUserById` is called with an unknown id
- **THEN** the result is `null`

#### Scenario: Partial update

- **WHEN** `updateUser` sets `currentLat`, `currentLon`, and `lastActive`
- **THEN** only those fields change on the stored document and `updatedAt` is refreshed

#### Scenario: Touch last active

- **WHEN** `touchLastActive` is called with id and timestamp
- **THEN** the user's `lastActive` equals the given timestamp

#### Scenario: Single user found

- **WHEN** exactly one user document exists in `users`
- **THEN** `findSingleUser` returns that document

#### Scenario: No user returns null

- **WHEN** the `users` collection is empty
- **THEN** `findSingleUser` returns `null`

### Requirement: Repository isolation

The user repository module SHALL NOT be imported by HTTP routes, agent modules, or application bootstrap files unrelated to user profile persistence. The location update service and its WebSocket controller MAY import `user.repository` for `findSingleUser` and `updateUser`.

#### Scenario: Location update may use repository

- **WHEN** a `LOCATION_UPDATE` frame is processed
- **THEN** `src/services/location.service.ts` MAY import from `user.repository`

#### Scenario: No unrelated wiring

- **WHEN** the change is applied
- **THEN** `src/server.ts`, `src/app.ts`, and files under `src/agent/` contain no imports from `user.repository`

### Requirement: User repository tests

The change SHALL include Jest integration tests for the user repository using `mongodb-memory-server`, covering insert/find, null lookup, partial update, `touchLastActive`, and `findSingleUser`. `npm test` MUST pass with global coverage ≥ 90%.

#### Scenario: Test suite passes

- **WHEN** `npm test` runs after implementation
- **THEN** user repository tests pass and coverage thresholds are met
