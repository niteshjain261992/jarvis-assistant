## MODIFIED Requirements

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
