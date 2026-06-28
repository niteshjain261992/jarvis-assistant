# Jarvis — A Local-First Personal AI Assistant

> The Jarvis from Iron Man, but running entirely on my own machine. No cloud LLM, no per-token bills, no sending my data to anyone.

Jarvis is a personal AI assistant built around a **locally-hosted LLM** ([Ollama](https://ollama.com) running `gemma4:12b`). It can hold a conversation, perform actions on a connected mobile device, search the web, and — through a small RAG layer — answer questions using what it knows about you (your name, your current location) without you having to repeat yourself.

The brain runs on your hardware. The phone is its hands and eyes.

---

## Why this exists

I've wanted my own Jarvis since I first saw Iron Man. This is me actually building it — as a learning project, in the open, with an emphasis on keeping everything **local and private**.

It's also an experiment in **spec-driven development**: the entire project was built using [OpenSpec](https://github.com/Fission-AI/OpenSpec), so the `openspec/` folder contains the design intent behind every capability, not just the code that resulted from it.

---

## What it can do

- **Conversation** — natural back-and-forth, answered by the local model
- **Device actions** — open the camera, play music, control device features (delegated to a connected mobile client over WebSocket)
- **Web search** — current information via [Tavily](https://tavily.com) when the model needs real-world data
- **Location-aware answers** — knows where you are (reverse-geocoded from GPS) so "what's the weather outside?" just works
- **Personal context (RAG)** — retrieves relevant facts about you and feeds them to the model per request, instead of stuffing everything into the prompt

---

## Architecture at a glance

```
Mobile client  ──WebSocket──►  Express + TypeScript backend
                                      │
                                      ├── LangChain / LangGraph agent loop
                                      │      └── runs against local Ollama (gemma4:12b)
                                      │
                                      ├── Tools (client-delegated + server-side)
                                      │      ├── open_camera, play_music, off_lights  → mobile
                                      │      └── web_search (Tavily)                   → server
                                      │
                                      ├── MongoDB        (conversations, messages, user)
                                      └── Qdrant         (user-context embeddings for RAG)
```

The agent decides, per turn, whether to answer directly or call a tool — there's no separate intent-classifier step. User context is retrieved from Qdrant and injected into the system prompt _before_ the model runs, so personalization costs no extra tool calls.

---

## Tech stack

| Layer             | Choice                                   |
| ----------------- | ---------------------------------------- |
| LLM runtime       | Ollama (`gemma4:12b`), fully local       |
| Embeddings        | Ollama (`nomic-embed-text`), fully local |
| Agent framework   | LangChain + LangGraph                    |
| Backend           | Node.js (>=20), TypeScript, Express      |
| Realtime          | WebSocket (`ws`)                         |
| Database          | MongoDB (Mongoose)                       |
| Vector store      | Qdrant                                   |
| Web search        | Tavily                                   |
| Reverse geocoding | Nominatim (OpenStreetMap)                |
| Background jobs   | Agenda                                   |
| Validation        | Zod                                      |
| Logging           | Pino                                     |

---

## Getting started

### Prerequisites

- **Node.js 20+**
- **Ollama** running locally, with the models pulled:
  ```bash
  ollama pull gemma4:12b
  ollama pull nomic-embed-text
  ```
- **MongoDB** running locally (default `mongodb://127.0.0.1:27017`)
- **Qdrant** running locally (default `http://localhost:6333`):
  ```bash
  docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
  ```
- A **Tavily API key** (free tier) for web search — https://tavily.com

### Setup

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
cp .env.example .env   # then fill in the values below
```

### Environment variables

| Variable                | Required | Default                               | Notes                          |
| ----------------------- | -------- | ------------------------------------- | ------------------------------ |
| `TAVILY_API_KEY`        | **yes**  | —                                     | Web search                     |
| `OLLAMA_BASE_URL`       | no       | `http://localhost:11434`              | Local Ollama                   |
| `OLLAMA_MODEL`          | no       | `gemma4:12b`                          | Main chat model                |
| `EMBEDDING_MODEL`       | no       | `nomic-embed-text`                    | RAG embeddings                 |
| `QDRANT_URL`            | no       | `http://localhost:6333`               | Vector store                   |
| `MONGODB_URI`           | no       | `mongodb://127.0.0.1:27017`           | Database                       |
| `MONGODB_DATABASE`      | no       | `jarvis`                              | Database name                  |
| `NOMINATIM_BASE_URL`    | no       | `https://nominatim.openstreetmap.org` | Reverse geocoding              |
| `PORT`                  | no       | `3000`                                | Server port                    |
| `YOUTUBE_API_KEY`       | no       | —                                     | Optional, for music resolution |
| `SPOTIFY_CLIENT_ID`     | no       | —                                     | Optional, for music resolution |
| `SPOTIFY_CLIENT_SECRET` | no       | —                                     | Optional, for music resolution |

### Run

```bash
npm run dev      # development, with hot reload + debug logs
npm run build    # compile to dist/
npm start        # run the compiled build
npm test         # run the test suite with coverage
npm run lint     # lint src and tests
```

---

## WebSocket protocol

The mobile client connects over WebSocket and exchanges typed messages. Inbound message types:

- `USER_PROMPT` — the user says something
- `ACTION_ACK` — the client confirms it executed a delegated action
- `LOCATION_UPDATE` — the client reports a new GPS location (reverse-geocoded and embedded server-side)

---

## How it's built — spec-driven development

This project was built with [OpenSpec](https://github.com/Fission-AI/OpenSpec) rather than ad-hoc "vibe coding." Each feature started as a written specification (proposal, design, spec deltas, tasks) before any code was implemented.

The result: the `openspec/specs/` folder documents what every capability is _supposed_ to do, and `openspec/engineering/` captures the architectural conventions (Result types, layered DDD structure, the client/server tool split). If you want to understand _why_ the code looks the way it does, start there.

---

## Project structure

```
src/
  agent/          # LangGraph agent loop + tool definitions
  config/         # env, mongo, qdrant, agenda
  controllers/    # websocket message controllers
  models/         # mongoose schemas (user, message, conversation, location-history)
  repositories/   # data access
  services/       # business logic (message pipeline, user-context RAG, geocoding, embeddings)
  schemas/        # zod validation (incl. websocket envelopes)
  websocket/      # gateway, client-task broker
openspec/         # specifications + engineering conventions
tests/            # mirrors src/
```

---

## Roadmap

- **Preference learning** — Jarvis learns your tastes (e.g. music preferences) and folds them into the RAG layer
- **Fine-tuning** — a model tuned toward Jarvis's specific behavior
- **Mobile app** — a proper client to demo the whole thing on a real phone
- More tools, more capabilities — basically, keep bolting upgrades onto the suit

---

## Status

Active personal project, built in the open as a learning exercise. Expect rough edges. Issues and ideas welcome.

---

## License

[MIT](LICENSE)
