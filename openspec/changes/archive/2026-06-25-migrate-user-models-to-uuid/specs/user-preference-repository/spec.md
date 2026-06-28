## MODIFIED Requirements

### Requirement: User preference document shape

The system SHALL persist preference documents in MongoDB collection `user_preferences` with the following fields:

| Field             | Type   | Required | Notes                                              |
| ----------------- | ------ | -------- | -------------------------------------------------- |
| `_id`             | string | yes      | UUID string (caller-supplied on insert)            |
| `userId`          | string | yes      | References `users._id`                             |
| `category`        | string | yes      | e.g. `music`, `movie`, `food`, `sports`, `general` |
| `preferenceValue` | string | yes      | e.g. `Classic Rock`, `Sci-Fi`                      |
| `weight`          | number | no       | Optional 1–5 strength scale                        |
| `createdAt`       | Date   | yes      | Document creation time                             |
| `updatedAt`       | Date   | yes      | Last modification time                             |

Typed interfaces SHALL live in `src/models/user-preference.model.ts` as `UserPreferenceDocument` and `UserPreferenceInsert` (omits `_id`).

#### Scenario: Insert preference linked to user

- **WHEN** `insertUserPreference` is called with a valid string `userId`, category/value, and timestamps
- **THEN** the document is stored and retrievable with matching fields

### Requirement: User preference repository operations

The user preference repository in `src/repositories/user-preference.repository.ts` SHALL export:

- `insertUserPreference(doc: UserPreferenceDocument): Promise<UserPreferenceDocument>`
- `findUserPreferenceById(id: string): Promise<UserPreferenceDocument | null>`
- `findPreferencesByUserId(userId: string): Promise<UserPreferenceDocument[]>`
- `findPreferencesByUserIdAndCategory(userId: string, category: string): Promise<UserPreferenceDocument[]>`
- `updateUserPreference(id: string, update: Partial<Pick<UserPreferenceDocument, 'category' | 'preferenceValue' | 'weight'>>): Promise<void>` — SHALL also set `updatedAt` to the current time
- `deleteUserPreference(id: string): Promise<void>`

#### Scenario: Find by user id

- **WHEN** multiple preferences exist for a user
- **THEN** `findPreferencesByUserId` returns all documents for that `userId`

#### Scenario: Find by user id and category

- **WHEN** preferences exist across categories for a user
- **THEN** `findPreferencesByUserIdAndCategory` returns only documents matching both `userId` and `category`

#### Scenario: Delete preference

- **WHEN** `deleteUserPreference` is called for an existing id
- **THEN** `findUserPreferenceById` returns `null` for that id
