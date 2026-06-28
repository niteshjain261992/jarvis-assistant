## 1. Models

- [x] 1.1 Create `src/models/user.model.ts` with `UserDocument`, `UserInsert` (omits `_id`), Mongoose schema for collection `users`, and exported `UserModel`
- [x] 1.2 Create `src/models/user-preference.model.ts` with `UserPreferenceDocument`, `UserPreferenceInsert`, optional `PreferenceCategory` union, schema for collection `user_preferences` (index on `userId` + `category`), and `UserPreferenceModel`
- [x] 1.3 Create `src/models/location-history.model.ts` with `LocationHistoryDocument`, `LocationHistoryInsert`, schema for collection `location_history` (index on `userId` + `timestamp`), and `LocationHistoryModel`

## 2. User repository

- [x] 2.1 Create `src/repositories/user.repository.ts` with `insertUser`, `findUserById`, `updateUser`, `touchLastActive`; re-export model types
- [x] 2.2 Create `tests/repositories/user.repository.test.ts` using `mongodb-memory-server`: insert/find, null lookup, partial update, `touchLastActive`

## 3. User preference repository

- [x] 3.1 Create `src/repositories/user-preference.repository.ts` with insert, find by id, find by user id, find by user id + category, update, delete
- [x] 3.2 Create `tests/repositories/user-preference.repository.test.ts`: insert/find, category filter, update, delete

## 4. Location history repository

- [x] 4.1 Create `src/repositories/location-history.repository.ts` with insert, find by id, find by user id (newest first, default limit 50), delete
- [x] 4.2 Create `tests/repositories/location-history.repository.test.ts`: insert/find, timestamp ordering, limit, delete

## 5. Isolation and verification

- [x] 5.1 Confirm `src/server.ts`, `src/app.ts`, `src/services/`, `src/controllers/`, `src/agent/`, and `src/websocket/` have no imports from new repositories
- [x] 5.2 Confirm `package.json`, `.env.example`, and `src/config/env.ts` are unchanged
- [x] 5.3 Run `npm test` and confirm all tests pass with coverage ≥ 90%
- [x] 5.4 Run `npm run lint` on new files
