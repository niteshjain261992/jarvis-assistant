## ADDED Requirements

### Requirement: Single user lookup

The user repository SHALL export `findSingleUser(): Promise<UserDocument | null>` returning the first user document in the `users` collection (single-user deployment).

#### Scenario: Single user found

- **WHEN** exactly one user document exists in `users`
- **THEN** `findSingleUser` returns that document

#### Scenario: No user returns null

- **WHEN** the `users` collection is empty
- **THEN** `findSingleUser` returns `null`

## MODIFIED Requirements

### Requirement: Repository isolation

The user repository module SHALL NOT be imported by HTTP routes, agent modules, or application bootstrap files unrelated to user profile persistence. The location update service and its WebSocket controller MAY import `user.repository` for `findSingleUser` and `updateUser`.

#### Scenario: Location update may use repository

- **WHEN** a `LOCATION_UPDATE` frame is processed
- **THEN** `src/services/location.service.ts` MAY import from `user.repository`

#### Scenario: No unrelated wiring

- **WHEN** the change is applied
- **THEN** `src/server.ts`, `src/app.ts`, and files under `src/agent/` contain no imports from `user.repository`
