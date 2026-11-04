# Test Plan: Device API (Part B)

## Scope and assumptions

- `POST /login` returns an auth token. `GET /device/{id}/status` returns `{ level_percent, pump_state, last_seen }`.
- Authentication is `Authorization: Bearer <token>`.
- The brief does not define status codes, so these are assumed: `400` malformed request, `401` missing/invalid/expired credentials or token, `404` unknown device, `5xx` server error. `403` is reserved for "authenticated but not permitted"; it is not tested because the brief has no per-device permissions.
- A valid status has `level_percent` in 0-100, `pump_state` of `"on"` or `"off"`, and a parseable `last_seen` timestamp.
- A device is **stale** when `last_seen` is strictly more than 15 minutes older than now.

## Test cases

| ID | Scenario | Request | Expected | Category | Automated |
| --- | --- | --- | --- | --- | --- |
| TC-01 | Login with valid credentials | `POST /login` `{username, password}` | `200`, non-empty token | Positive | Yes |
| TC-02 | Status for a valid device with a valid token | `GET /device/DEV_101/status` + Bearer token | `200`, valid payload, `isStale: false` | Positive | Yes |
| TC-03 | Login with wrong password | `POST /login` with bad password | `401`, no token | Negative | Yes |
| TC-04 | Login with missing fields | `POST /login` with empty username/password | `400` | Negative | Yes |
| TC-05 | Status without a token | `GET /device/DEV_101/status`, no `Authorization` header | `401`; client sends no auth header | Negative | Yes |
| TC-06 | Status with an invalid or expired token | `GET` + `Bearer expired-token` | `401` | Negative | Yes |
| TC-07 | Unknown device ID | `GET /device/INVALID_999/status` | `404` | Edge | Yes |
| TC-08 | Stale `last_seen` | status with `last_seen` 16 min old; also exactly 15 min | `isStale: true` at 16 min; `false` at exactly 15 min | Edge | Yes |
| TC-09 | Malformed response | non-JSON body, empty body, missing field, `pump_state: "maybe"`, `level_percent: 140`, string level, invalid `last_seen` | Client rejects with `malformed_response`, no crash | Edge | Yes |
| TC-10 | Server or network failure | `503` response; fetch rejects | `server_error` / `network_error` surfaced to the caller | Edge | Yes |

## Approach

Automated with Jest in `api-tests/`. The device API is not real, so responses are mocked by injecting a stub `fetch` into a small typed client. The tests therefore verify the client's contract handling: request shape, status-code mapping, response validation (zod), and stale detection. Run with `npm test`.

## Not covered (next steps)

- Rate limiting / brute-force protection (`429`): not in the brief.
- Real token-expiry timing and refresh flows.
- Retry/backoff behaviour (the client does not retry).
- Contract tests against a real or staging API.