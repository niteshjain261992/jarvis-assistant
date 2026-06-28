## ADDED Requirements

### Requirement: User preference document shape

The system SHALL persist preference documents in MongoDB collection `user_preferences` with the following fields:

| Field             | Type   | Required | Notes                                              |
| ----------------- | ------ | -------- | -------------------------------------------------- |
| `_id`             | number | yes      | Integer row id (caller-supplied on insert)         |
| `userId`          | number | yes      | References `users._id`                             |
| `category`        | string | yes      | e.g. `music`, `movie`, `food`, `sports`, `general` |
| `preferenceValue` | string | yes      | e.g. `Classic Rock`, `Sci-Fi`                      |
| `weight`          | number | no       | Optional 1–5 strength scale                        |

Typed interfaces SHALL live in `src/models/user-preference.model.ts` as `UserPreferenceDocument` and `UserPreferenceInsert` (omits `_id`).

#### Scenario: Insert preference linked to user

- **WHEN** `insertUserPreference` is called with a valid `userId` and category/value
- **THEN** the document is stored and retrievable with matching fields

### Requirement: User preference repository operations

The user preference repository in `src/repositories/user-preference.repository.ts` SHALL export:

- `insertUserPreference(doc: UserPreferenceDocument): Promise<UserPreferenceDocument>`
- `findUserPreferenceById(id: number): Promise<UserPreferenceDocument | null>`
- `findPreferencesByUserId(userId: number): Promise<UserPreferenceDocument[]>`
- `findPreferencesByUserIdAndCategory(userId: number, category: string): Promise<UserPreferenceDocument[]>`
- `updateUserPreference(id: number, update: Partial<Pick<UserPreferenceDocument, 'category' | 'preferenceValue' | 'weight'>>): Promise<void>`
- `deleteUserPreference(id: number): Promise<void>`

#### Scenario: Find by user id

- **WHEN** multiple preferences exist for a user
- **THEN** `findPreferencesByUserId` returns all documents for that `userId`

#### Scenario: Find by user id and category

- **WHEN** preferences exist across categories for a user
- **THEN** `findPreferencesByUserIdAndCategory` returns only documents matching both `userId` and `category`

#### Scenario: Delete preference

- **WHEN** `deleteUserPreference` is called for an existing id
- **THEN** `findUserPreferenceById` returns `null` for that id

### Requirement: Repository isolation

The user preference repository module SHALL NOT be imported by any service, controller, route, agent, WebSocket, or application bootstrap file.

#### Scenario: No application wiring

- **WHEN** the change is applied
- **THEN** application bootstrap and business modules contain no imports from `user-preference.repository`

### Requirement: User preference repository tests

The change SHALL include Jest integration tests using `mongodb-memory-server` covering insert/find, category filter, update, and delete. `npm test` MUST pass with global coverage ≥ 90%.

#### Scenario: Test suite passes

- **WHEN** `npm test` runs after implementation
- **THEN** user preference repository tests pass and coverage thresholds are met
