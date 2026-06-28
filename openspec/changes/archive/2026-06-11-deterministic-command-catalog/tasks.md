# Tasks

Source files in scope (closed-world): `src/config/command-catalog.ts` (new), `src/services/ollama.service.ts`, `tests/services/ollama.service.test.ts`, `tests/config/command-catalog.test.ts` (new), `openspec/codebase/interfaces/ollama.md`.

## 1. Command Catalog

- [x] 1.1 Create `src/config/command-catalog.ts` — `CommandCatalogEntry`, `COMMAND_CATALOG` (seed: `OPEN:CAMERA`, `OFF:LIGHTS`, `PLAY:MUSIC` with phrase hints), `ALLOWED_COMMANDS` set, `buildCommandSystemPrompt()`
- [x] 1.2 Create `tests/config/command-catalog.test.ts` — every catalog command appears in built prompt; `ALLOWED_COMMANDS` matches catalog

## 2. Ollama Service

- [x] 2.1 Update `src/services/ollama.service.ts` — use `buildCommandSystemPrompt()` instead of inline `COMMAND_SYSTEM_PROMPT`; after normalize, if not in `ALLOWED_COMMANDS` return the normalized string as-is (passthrough)
- [x] 2.2 Update `tests/services/ollama.service.test.ts` — assert system prompt lists catalog commands; add test passthrough for `OPEN:VIDEO_CAMERA`; keep existing happy-path tests

## 3. Verification

- [x] 3.1 `npm test` passes with coverage >= 90%
- [x] 3.2 `npm run build` and `npm run lint` pass

## 4. Spec Plane

- [x] 4.1 Update `openspec/codebase/interfaces/ollama.md` — document catalog-driven prompt; non-catalog output passthrough (remove "best-effort / no allowlist" wording)
