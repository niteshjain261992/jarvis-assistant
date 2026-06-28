# async-messages Specification

## Purpose

Define the synchronous message pipeline over WebSocket: resolve an active conversation, persist user and assistant rows, classify intent, and return the completed assistant message in one WebSocket response frame.

## Requirements

### Requirement: WebSocket message submission

The system SHALL accept message prompts only over an established WebSocket connection using the protocol defined in the `websocket-messages` capability. There is no REST message endpoint.

#### Scenario: WebSocket is the sole message transport

- **WHEN** a client submits a valid `prompt` via WebSocket
- **THEN** the message pipeline runs via `createMessage` and the server responds on the same connection with a JSON envelope

#### Scenario: REST message endpoint absent

- **WHEN** a client sends `POST /messages`
- **THEN** the response is HTTP 404 with `code: "NOT_FOUND"`
