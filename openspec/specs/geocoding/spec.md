# geocoding Specification

## Purpose

TBD — Define how the application resolves geographic coordinates to human-readable place names using Nominatim reverse geocoding.

## Requirements

### Requirement: Reverse-geocode coordinates to a readable name

The system SHALL provide `reverseGeocode(lat: number, lon: number): Promise<string | null>` in `src/services/geocoding.service.ts` that calls the Nominatim reverse endpoint (`<NOMINATIM_BASE_URL>/reverse?lat=<lat>&lon=<lon>&format=json`) with a descriptive `User-Agent` header identifying the application. On success it SHALL return a compact human-readable place name. The service SHALL NOT import Mongo or Qdrant modules — it performs geocoding only.

#### Scenario: Descriptive User-Agent header is sent

- **WHEN** `reverseGeocode` issues a request to Nominatim
- **THEN** the request carries a non-empty descriptive `User-Agent` header identifying the app

### Requirement: Compact name assembly from structured address

When the Nominatim response contains a structured `address` object, `reverseGeocode` SHALL assemble a compact name from the meaningful parts — neighbourhood/suburb, city/town/village, and state — joined with `", "`, omitting any absent part. When no structured parts are present, it SHALL fall back to the response `display_name`.

#### Scenario: Compact name from structured parts

- **WHEN** the response address contains a suburb, city, and state
- **THEN** `reverseGeocode` returns the compact `"<suburb>, <city>, <state>"` form rather than the raw `display_name`

#### Scenario: Falls back to display_name

- **WHEN** the response has no structured address parts but does have a `display_name`
- **THEN** `reverseGeocode` returns the `display_name`

### Requirement: Fail-soft geocoding

`reverseGeocode` SHALL never throw. On any failure — network error, non-200 response, empty result, or unparseable body — it SHALL log the failure via `logger.error` and return `null`. Callers treat `null` as "name unavailable" and proceed with coordinates only.

#### Scenario: Non-200 response returns null

- **WHEN** Nominatim responds with a non-200 status
- **THEN** `reverseGeocode` returns `null` and does not throw

#### Scenario: Network error returns null

- **WHEN** the underlying request throws (network failure)
- **THEN** `reverseGeocode` logs the error and returns `null` without propagating it
