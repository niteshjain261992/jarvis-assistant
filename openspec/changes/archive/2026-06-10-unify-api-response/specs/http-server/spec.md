# http-server Delta Specification

## MODIFIED Requirements

### Requirement: Health-check endpoint

The application SHALL expose `GET /health` returning HTTP 200 with the unified response envelope, where `data` contains the service status and uptime: `{ "code": "HEALTH_OK", "message": string, "data": { "status": "ok", "uptime": number, "timestamp": string } }`.

#### Scenario: Health check succeeds

- **WHEN** a client sends `GET /health`
- **THEN** the response is HTTP 200 with JSON containing `data.status: "ok"` and `code: "HEALTH_OK"`
