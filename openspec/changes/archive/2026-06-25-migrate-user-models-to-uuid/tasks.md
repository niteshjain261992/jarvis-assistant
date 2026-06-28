## 1. Model schema updates

- [x] 1.1 Update `src/models/user.model.ts`: change `_id` to `string`, add `createdAt` and `updatedAt` as required `Date` fields in interface and schema
- [x] 1.2 Update `src/models/user-preference.model.ts`: change `_id` and `userId` to `string`, add `createdAt` and `updatedAt`
- [x] 1.3 Update `src/models/location-history.model.ts`: change `_id` and `userId` to `string`, add `createdAt` and `updatedAt`

## 2. Repository layer updates

- [x] 2.1 Update `src/repositories/user.repository.ts`: change all id parameters to `string`; set `updatedAt: new Date()` in `updateUser`
- [x] 2.2 Update `src/repositories/user-preference.repository.ts`: change all id/userId parameters to `string`; set `updatedAt: new Date()` in `updateUserPreference`
- [x] 2.3 Update `src/repositories/location-history.repository.ts`: change all id/userId parameters to `string`; remove `getNextLocationHistoryId` function entirely

## 3. Service layer updates

- [x] 3.1 Update `src/services/location.service.ts`: replace `getNextLocationHistoryId()` with `randomUUID()` for history `_id`; set `createdAt` and `updatedAt` on history insert

## 4. Test updates

- [x] 4.1 Update `tests/repositories/user.repository.test.ts`: use UUID string ids and include `createdAt`/`updatedAt` in test fixtures
- [x] 4.2 Update `tests/repositories/user-preference.repository.test.ts`: use UUID string ids for `_id` and `userId`; include timestamps
- [x] 4.3 Update `tests/repositories/location-history.repository.test.ts`: use UUID string ids; remove `getNextLocationHistoryId` tests; include timestamps
- [x] 4.4 Update `tests/services/location.service.test.ts`: use UUID string user ids; verify history row has string `_id`

## 5. Verification

- [x] 5.1 Run `npm test` and confirm all tests pass with ≥ 90% coverage
