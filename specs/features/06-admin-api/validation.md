# Feature 6 validation: Admin API

The project documents have no worked example for this feature. The cases follow the answers to G1 to G8 in requirements.md. In the cases below, a request with the right token sends `Authorization: Bearer test-token`.

## Automated checks

The command for V1 to V6 is `make test`. The command for V7 is `make lint`.

### V1. The update model checks the ranges

- `{"samples_per_second": 1}` is valid, and the other two fields are unset.
- `{"samples_per_second": 100000, "batch_interval_ms": 1000, "max_value": 10000}` is valid.
- `{"samples_per_second": 0}` is not valid.
- `{"batch_interval_ms": 49}` is not valid.
- `{"max_value": 10001}` is not valid.
- `{"samples_per_second": "abc"}` is not valid.
- `{"max_value": null}` is not valid.
- `{"cors_origins": ["http://a.test"]}` is not valid.
- With `ADMIN_TOKEN=abc`, the loaded settings have the token `abc`. With no `ADMIN_TOKEN`, the token is unset.

### V2. The generator takes new settings

- After a change to 1,000 samples per second and a 1,000 ms interval, the next batch holds 1,000 integers.
- After a change to a maximum value of 3, every value in a 10,000-value batch is from 0 to 2.
- With 1 sample per second and a 50 ms interval, 10 calls carry a fraction. After a change to the same settings, the next 19 calls are empty and the 20th holds 1 integer, which shows the carry was dropped.

### V3. The broadcaster pauses, resumes, and updates

- With a 50 ms interval, a pause for 0.5 s publishes no batch, and the sequence number is the same before and after the pause.
- After a resume, the first batch has the sequence number 1 higher than the last batch before the pause.
- A pause while paused and a resume while running raise no error and leave the flag as it was.
- After a change from a 50 ms interval to a 200 ms interval, the task publishes between 4 and 6 batches in 1 s.
- After a resume that follows a 1 s pause at a 50 ms interval, the task publishes at most 2 batches in the first 60 ms, which shows no burst.

### V4. The admin endpoints work with a token

The tests run the app with `admin_token="test-token"`.

- `GET /admin/settings` returns status 200 and `{"samples_per_second": 5000, "batch_interval_ms": 50, "max_value": 1024, "paused": false}`.
- `PATCH /admin/settings` with `{"samples_per_second": 20}` returns status 200 and the object with `samples_per_second` 20. A later GET returns the same object.
- `PATCH /admin/settings` with `{"max_value": 0}` returns status 422, and a later GET shows the settings did not change.
- `PATCH /admin/settings` with `{"samples_per_second": 20, "max_value": 0}` returns status 422, and a later GET shows `samples_per_second` is still 5000.
- `PATCH /admin/settings` with `{"cors_origins": ["http://a.test"]}` returns status 422.
- `POST /admin/pause` returns status 200 and `paused` true. A second pause returns status 200 and `paused` true.
- `POST /admin/resume` returns status 200 and `paused` false. A second resume returns status 200 and `paused` false.
- A PATCH during a pause returns status 200 and `paused` true.

### V5. The token guards the admin endpoints

- Each of the four admin requests with no `Authorization` header returns status 401.
- Each of the four admin requests with `Authorization: Bearer wrong` returns status 401.
- With no admin token set, each of the four admin requests returns status 404, even with a token in the header.
- With no admin token set, `GET /health` still returns status 200 and `{"status": "ok"}`.

### V6. The live stream follows the admin requests

The tests run the app in Uvicorn on a free local port with `admin_token="test-token"`.

- After `PATCH /admin/settings` with `{"samples_per_second": 20, "batch_interval_ms": 1000}`, the next events each hold 20 integers.
- After `PATCH /admin/settings` with `{"max_value": 3}`, the next event holds only values from 0 to 2.
- After `POST /admin/pause`, the stream sends no event for 0.5 s. After `POST /admin/resume`, the next event has an `id` 1 higher than the last event before the pause.
- With `fastapi.routing._PING_INTERVAL` patched to 0.1 s, the stream sends the comment `: ping` during a pause, and the connection stays open.
- Two clients get the same data and the same `id` in their next event after a settings change.

### V7. Linters pass

- ruff check, ruff format in check mode, and strict mypy pass on backend/ and infra/. The expected result is exit code 0.

## Manual checks

### M1. The admin API works in a terminal

1. Run `make backend` in one terminal, and run `curl -N localhost:8000/stream` in a second terminal.
2. In a third terminal, run `curl -X PATCH localhost:8000/admin/settings -H "Authorization: Bearer <local token>" -H "Content-Type: application/json" -d '{"samples_per_second": 20, "batch_interval_ms": 1000}'`.
3. The expected result is that the stream shows one event each second with 20 integers.
4. Run `curl -X POST localhost:8000/admin/pause -H "Authorization: Bearer <local token>"`.
5. The expected result is that the stream stops, and after 15 seconds it shows `: ping`.
6. Run `curl -X POST localhost:8000/admin/resume -H "Authorization: Bearer <local token>"`.
7. The expected result is that events start again, and the first `id` is 1 higher than the last `id` before the pause.

### M2. The client survives a pause

1. Run `make dev` and open http://localhost:4200/?server=http://localhost:8000.
2. Pause the server with the command from M1 step 4 and wait 10 seconds.
3. The expected result is that the badge shows Reconnecting, because the client has no Paused state until feature 7, and the counts stay on screen.
4. Resume the server with the command from M1 step 6.
5. The expected result is that the badge shows Live within 30 seconds.

### M3. The cloud admin API needs the token

1. Run `make deploy`.
2. Run `curl -i https://api.precision.jgangjee.com/admin/settings`.
3. The expected result is status 401.
4. Read the token with the AWS CLI command in the README, and run the same request with the header `Authorization: Bearer <token>`.
5. The expected result is status 200 and the default settings.

### M4. The README and the logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the admin API feature.
3. Open README.md.
4. The expected result is that it lists the four admin endpoints, the token, and a curl command for each endpoint.
