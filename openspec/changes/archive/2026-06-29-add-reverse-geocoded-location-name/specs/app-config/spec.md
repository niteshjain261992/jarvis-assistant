## ADDED Requirements

### Requirement: Nominatim reverse-geocoding configuration

The environment schema SHALL define `NOMINATIM_BASE_URL` (valid URL, default `https://nominatim.openstreetmap.org`) as an optional, keyless setting, validated at startup like all other variables and documented in `.env.example`. No API key SHALL be required for reverse geocoding.

#### Scenario: Default applied

- **WHEN** the process starts without `NOMINATIM_BASE_URL` set
- **THEN** `env.NOMINATIM_BASE_URL` is `https://nominatim.openstreetmap.org`

#### Scenario: Invalid Nominatim URL fails fast

- **WHEN** the process starts with `NOMINATIM_BASE_URL=not-a-url`
- **THEN** the process exits immediately at startup with a readable validation error identifying `NOMINATIM_BASE_URL`
