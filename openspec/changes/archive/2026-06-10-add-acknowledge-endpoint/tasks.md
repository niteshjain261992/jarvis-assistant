# Tasks

Source files in scope (closed-world): `src/services/ollama.service.ts`, `src/utils/api-response.ts`, `src/app.ts`, `tests/services/ollama.service.test.ts`, `tests/app.test.ts`, plus new files listed below.

## 1. Service Layer

- [x] 1.1 Refactor `src/services/ollama.service.ts` — private `callOllama(system, prompt, timeoutMs)` shared helper; keep `interpretCommand` behavior unchanged
- [x] 1.2 Add `generateAcknowledgment(prompt: string): Promise<string>` — Jarvis persona system prompt, temperature 0.3, 10s timeout, trim/strip quotes on output, `LLM_*` errors on failure

## 2. HTTP Layer

- [x] 2.1 Add `successCodes.ACKNOWLEDGMENT_SENT` and `SuccessResponse.ACKNOWLEDGMENT_SENT` in `src/utils/api-response.ts`
- [x] 2.2 Create `src/controllers/acknowledge.controller.ts` — zod-validate `{ prompt }`, call `generateAcknowledgment`, respond via catalog
- [x] 2.3 Create `src/routes/acknowledge.route.ts` — `acknowledgeRouter` with `POST /` → controller
- [x] 2.4 Mount `acknowledgeRouter` at `/acknowledge` in `src/app.ts` (before 404 handler)

## 3. Tests

- [x] 3.1 Extend `tests/services/ollama.service.test.ts` — `generateAcknowledgment`: success, quote trimming, `LLM_UNAVAILABLE`, `LLM_ERROR_RESPONSE`, `LLM_EMPTY_RESPONSE`
- [x] 3.2 Create `tests/controllers/acknowledge.controller.test.ts` — supertest: 200 with `ACKNOWLEDGMENT_SENT` + `data.text`, 400 invalid body, 502 mocked service failure

## 4. Verification

- [x] 4.1 `npm test` passes with all global coverage metrics >= 90%
- [x] 4.2 `npm run build` and `npm run lint` pass
- [x] 4.3 Live test: `POST /acknowledge {"prompt":"open camera"}` → 200 with non-empty `data.text` (Ollama running)

## 5. Spec Plane Updates

- [x] 5.1 Update `openspec/codebase/map.md` (new controller/route/service export, HTTP surface row)
- [x] 5.2 Update `interfaces/http.md`, `interfaces/ollama.md`, `interfaces/api-response.md` (new endpoint, `generateAcknowledgment`, `ACKNOWLEDGMENT_SENT`)
