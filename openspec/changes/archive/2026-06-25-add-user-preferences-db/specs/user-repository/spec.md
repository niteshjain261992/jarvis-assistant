## ADDED Requirements

### Requirement: User document shape

The system SHALL persist user documents in MongoDB collection `users` with the following fields:

| Field          | Type   | Required | Notes                                       |
| -------------- | ------ | -------- | ------------------------------------------- |
| `_id`          | number | yes      | Integer user id (caller-supplied on insert) |
| `name`         | string | no       | Preferred name or nickname                  |
| `dob`          | string | no       | ISO 8601 date `YYYY-MM-DD`                  |
| `homeLocation` | string | no       | Primary residence/city                      |
| `currentLat`   | number | no       | Last known latitude                         |
| `currentLon`   | number | no       | Last known longitude                        |
| `lastActive`   | number | no       | Unix timestamp (seconds)                    |

Typed interfaces SHALL live in `src/models/user.model.ts` as `UserDocument` and `UserInsert` (omits `_id`).

#### Scenario: Insert with profile fields

- **WHEN** `insertUser` is called with `_id`, `name`, `dob`, and `homeLocation`
- **THEN** `findUserById` returns those exact field values

#### Scenario: Insert minimal user

- **WHEN** `insertUser` is called with only `_id`
- **THEN** the document is retrievable via `findUserById`

### Requirement: User repository operations

The user repository in `src/repositories/user.repository.ts` SHALL export:

- `insertUser(doc: UserDocument): Promise<UserDocument>`
- `findUserById(id: number): Promise<UserDocument | null>`
- `updateUser(id: number, update: Partial<Pick<UserDocument, 'name' | 'dob' | 'homeLocation' | 'currentLat' | 'currentLon' | 'lastActive'>>): Promise<void>`
- `touchLastActive(id: number, timestamp: number): Promise<void>`

#### Scenario: Insert and find by id

- **WHEN** `insertUser` is called with a valid document
- **THEN** `findUserById` returns the inserted document

#### Scenario: Find missing user

- **WHEN** `findUserById` is called with an unknown id
- **THEN** the result is `null`

#### Scenario: Partial update

- **WHEN** `updateUser` sets `currentLat`, `currentLon`, and `lastActive`
- **THEN** only those fields change on the stored document

#### Scenario: Touch last active

- **WHEN** `touchLastActive` is called with id and timestamp
- **THEN** the user's `lastActive` equals the given timestamp

### Requirement: Repository isolation

The user repository module SHALL NOT be imported by any service, controller, route, agent, WebSocket, or application bootstrap file. Only the repository module, its model, and dedicated tests MAY reference it.

#### Scenario: No application wiring

- **WHEN** the change is applied
- **THEN** `src/server.ts`, `src/app.ts`, and all files under `src/services/`, `src/controllers/`, `src/agent/`, and `src/websocket/` contain no imports from `user.repository`

### Requirement: User repository tests

The change SHALL include Jest integration tests for the user repository using `mongodb-memory-server`, covering insert/find, null lookup, partial update, and `touchLastActive`. `npm test` MUST pass with global coverage ≥ 90%.

#### Scenario: Test suite passes

- **WHEN** `npm test` runs after implementation
- **THEN** user repository tests pass and coverage thresholds are met
