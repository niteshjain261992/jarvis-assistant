## ADDED Requirements

### Requirement: LOCATION_UPDATE payload validation

The `LOCATION_UPDATE` payload SHALL require `latitude` (number, -90 to 90 inclusive), `longitude` (number, -180 to 180 inclusive), `accuracy_meters` (number ≥ 0), and `speed_kmh` (number ≥ 0). Validation SHALL live in `src/schemas/websocket/location-update.schema.ts` and be composed into the inbound discriminated union.

#### Scenario: Valid location update payload

- **WHEN** `payload` is `{ "latitude": 28.4595, "longitude": 77.0266, "accuracy_meters": 12.5, "speed_kmh": 0.0 }`
- **THEN** payload validation succeeds

#### Scenario: Latitude out of range rejected

- **WHEN** `payload.latitude` is `91`
- **THEN** validation fails with a field-specific error for `latitude`

#### Scenario: Negative accuracy rejected

- **WHEN** `payload.accuracy_meters` is `-1`
- **THEN** validation fails with a field-specific error for `accuracy_meters`

## MODIFIED Requirements

### Requirement: Inbound WebSocket envelope shape

Every inbound WebSocket JSON text frame (except malformed JSON handled separately) SHALL be validated as an object with exactly these top-level keys: `type` (non-empty string), `message_id` (non-empty string), `timestamp` (positive integer Unix seconds), and `payload` (object). Validation SHALL be implemented in `src/schemas/websocket/inbound-envelope.schema.ts` using a Zod discriminated union on `type`.

#### Scenario: Valid USER_PROMPT envelope accepted

- **WHEN** a client sends a frame with `type: "USER_PROMPT"`, a non-empty `message_id`, a positive integer `timestamp`, and a valid `payload`
- **THEN** `inboundEnvelopeSchema.safeParse` succeeds
- **AND** the parsed value is typed as the `USER_PROMPT` variant

#### Scenario: Valid ACTION_ACK envelope accepted

- **WHEN** a client sends a frame with `type: "ACTION_ACK"`, a non-empty `message_id`, a positive integer `timestamp`, and a valid `payload`
- **THEN** `inboundEnvelopeSchema.safeParse` succeeds
- **AND** the parsed value is typed as the `ACTION_ACK` variant

#### Scenario: Valid LOCATION_UPDATE envelope accepted

- **WHEN** a client sends a frame with `type: "LOCATION_UPDATE"`, a non-empty `message_id`, a positive integer `timestamp`, and a valid `payload`
- **THEN** `inboundEnvelopeSchema.safeParse` succeeds
- **AND** the parsed value is typed as the `LOCATION_UPDATE` variant

#### Scenario: Missing envelope field rejected

- **WHEN** a client sends a JSON object missing `message_id`, `timestamp`, or `payload`
- **THEN** validation fails
- **AND** the formatted error message identifies the missing or invalid field

#### Scenario: Unknown type rejected at validation

- **WHEN** a client sends an envelope with `type: "UNKNOWN_TYPE"` and otherwise valid base fields
- **THEN** validation fails with an error indicating an unsupported `type`
