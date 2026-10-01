# Feature 2 validation: Backend

The only worked example that this feature covers is the default batch size in N11. It is case V2.1.

## Automated checks

The command for V1 to V5 is `make test`. The command for V6 is `make lint`.

### V1. The settings load, and bad values fall back to the defaults

- With no environment variables set, the settings are 5,000 samples per second, a 50 ms interval, a maximum value of 1,024, and the origins `["http://localhost:4200"]`.
- With `SAMPLES_PER_SECOND=1`, `BATCH_INTERVAL_MS=1000`, and `MAX_VALUE=1`, the settings hold those values.
- With `CORS_ORIGINS="http://a.test,http://b.test"`, the origins are `["http://a.test", "http://b.test"]`.
- With `SAMPLES_PER_SECOND=0`, the load logs a warning that names `SAMPLES_PER_SECOND`, and the setting takes its default.
- With `SAMPLES_PER_SECOND=100001`, the load logs a warning that names `SAMPLES_PER_SECOND`, and the setting takes its default.
- With `BATCH_INTERVAL_MS=49`, the load logs a warning that names `BATCH_INTERVAL_MS`, and the setting takes its default.
- With `BATCH_INTERVAL_MS=1001`, the load logs a warning that names `BATCH_INTERVAL_MS`, and the setting takes its default.
- With `MAX_VALUE=0`, the load logs a warning that names `MAX_VALUE`, and the setting takes its default.
- With `MAX_VALUE=10001`, the load logs a warning that names `MAX_VALUE`, and the setting takes its default.
- With `SAMPLES_PER_SECOND=abc`, the load logs a warning that names `SAMPLES_PER_SECOND`, and the setting takes its default.

### V2. The generator makes batches of the right size and range

- V2.1. With the default settings, one batch holds 250 integers.
- With 1,000 samples per second and a 1,000 ms interval, one batch holds 1,000 integers.
- With 1 sample per second and a 50 ms interval, 20 calls in a row give 19 empty results and one batch of 1 integer.
- With 30 samples per second and a 50 ms interval, 20 calls in a row give 30 integers in total.
- With a maximum value of 3 and 100,000 samples, every value is an integer from 0 to 2, and each of 0, 1, and 2 appears at least once.
- With a maximum value of 1, every value is 0.
- With a fixed seed, two generators give the same batch.

### V3. The broadcaster shares one stream and drops old batches

- Two subscribers get the same batch, in the same order, when the broadcaster publishes one batch.
- Two subscribers get the same string object for one batch, which proves that the batch was encoded once. The string parses with `json.loads` to the list that the generator made.
- The first batch has sequence number 0, and each later batch has a sequence number 1 higher than the one before it.
- A subscriber whose queue holds 2 batches gets the 3rd batch, and the oldest batch leaves the queue. The other subscriber still gets all 3. The full subscriber then reads sequence numbers 1 and 2, so the gap shows the dropped batch.
- After a subscriber leaves, a publish does not raise an error, and the broadcaster has no queue for it.
- With a 50 ms interval, the background task publishes between 18 and 22 batches in 1 s.

### V4. The stream endpoint sends SSE batches and a heartbeat

The tests run the app in Uvicorn on a free local port.

- `GET /stream` returns status 200 and the content type `text/event-stream`.
- With the default settings, the first event arrives within 1 s, and its data is a JSON array of 250 integers from 0 to 1,023. Its `id` field is a nonnegative integer.
- The `id` fields of three events in a row go up by 1 each time.
- Two clients that connect at the same time get the same data and the same `id` in their next event.
- With 1 sample per second and `fastapi.routing._PING_INTERVAL` patched to 0.1 s, the stream sends the comment `: ping` before the first batch.

### V5. The health check and CORS work

- `GET /health` returns status 200 and the body `{"status": "ok"}`.
- A request with the header `Origin: http://localhost:4200` gets the response header `access-control-allow-origin: http://localhost:4200`.
- A request with the header `Origin: http://evil.test` gets no `access-control-allow-origin` header.

### V6. Linters pass

- ruff check, ruff format in check mode, and strict mypy pass on backend/. The expected result is exit code 0.

## Manual checks

### M1. The stream runs in a terminal

1. Run `make backend` in one terminal.
2. Run `curl -N localhost:8000/stream | head -c 300` in another terminal.
3. The expected result is lines that start with `data: [` and hold integers.

### M2. The settings come from the environment

1. Run `SAMPLES_PER_SECOND=20 BATCH_INTERVAL_MS=1000 make backend`.
2. Run `curl -N localhost:8000/stream` in another terminal.
3. The expected result is one event each second, and each event holds 20 integers.
4. Stop the server and run `SAMPLES_PER_SECOND=0 make backend`.
5. The expected result is that the server starts and logs a warning that names `SAMPLES_PER_SECOND`.
6. Run `curl -N localhost:8000/stream | head -c 300` in another terminal.
7. The expected result is a fast stream of long events, because the server uses the default rate of 5,000 samples per second.

### M3. The README and the logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the backend feature.
3. Open README.md.
4. The expected result is that it lists `GET /stream`, the four environment variables with their defaults and ranges, and a curl command that shows the stream.

## Results

These results are from 2026-09-30.

- V1 passes. All 10 settings cases pass.
- V2 passes. All 7 generator cases pass, and V2.1 is one of them.
- V3 passes. All 6 broadcaster cases pass.
- V4 passes. All 5 stream cases pass.
- V5 passes. All 3 health and CORS cases pass.
- V6 passes. `make lint` exits with code 0.
- M1 passes. The user confirmed it.
- M2 passes. The user confirmed it.
- M3 passes. The user confirmed it.

`make test` runs 36 backend tests, and all of them pass. Backend line coverage is 100%. The suite has 5 tests that this file does not list. Three tests check the tick schedule after a late or stalled tick. One test checks that the CORS preflight allows the `Last-Event-ID` header. One test checks that the server strips a trailing slash from `CORS_ORIGINS`. docs/ai-changes.md records the two CORS fixes and the user's approval.

Each item in requirements.md has at least one passing check. R1 is covered by V4, and R2 is covered by V2 and V4. R3 is covered by V3 and V4, and R4 by V3. R5 is covered by V4, and R6 by V1 and V2. R7 is covered by V5, and R8 by V5. R9 is covered by M3.
