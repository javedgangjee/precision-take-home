# Feature 4 validation: Stream

The project documents have no worked example for this feature. The brief examples stay covered by the feature 3 tests, which must still pass.

## Automated checks

The command for V1 to V6 and V10 is `make test`. The command for V7 is `make lint`. The command for V8 is `cd frontend && npx ng build`. The command for V9 is `make docker-build`.

### V1. The source settings pick the source and the server

- With no query, the source is the server, and the stream URL is http://localhost:8000/stream.
- With `?source=frontend`, the source is the test source.
- With `?source=abc`, the source is the server, and the console gets a warning that names `source`.
- With `?server=https://api.precision.jgangjee.com`, the stream URL is https://api.precision.jgangjee.com/stream.
- With `?server=http://localhost:8000/`, the stream URL is http://localhost:8000/stream, with no double slash.
- With `?server=abc` or `?server=ftp://example.com`, the stream URL is http://localhost:8000/stream, and the console gets a warning that names `server`.

### V2. The backoff delay doubles up to 30 s

- With a random value of 1, the attempts 0 to 6 give 1,000, 2,000, 4,000, 8,000, 16,000, 30,000, and 30,000 ms.
- With a random value of 0, attempt 0 gives 500 ms, and attempt 6 gives 15,000 ms.
- With a random value of 0.5, attempt 2 gives 3,000 ms.

### V3. The server source connects, applies batches, and reconnects

These tests use a fake EventSource, fake timers, and a random value of 1.

- At start, the state is connecting, and one EventSource opens http://localhost:8000/stream.
- After an `open` event, the state is live.
- With N = 4, the message data "[17,8]" gives cells <0,0> and <1,3> a count of 1 each.
- After an `error` event while live, the state is reconnecting, the EventSource is closed, and the counts are the same as before the error.
- After that error, no new EventSource exists at 999 ms, and one exists at 1,000 ms.
- When the new EventSource also fails, the next one opens after 2,000 ms.
- After an `open` event on the new EventSource, the state is live, and the next drop waits 1,000 ms again.
- An `error` event before the first `open` event keeps the state at connecting, and a new EventSource opens after 1,000 ms.
- While live, a message every 1 s for 10 s keeps the state at live.
- While live, no message for 5 s sets the state to reconnecting and closes the EventSource.
- When the service is destroyed, the EventSource is closed, and no new EventSource opens later.

### V4. The test source sets its own state

- When the test source starts, the state is test.

### V5. The badge shows the state

- For connecting, the badge shows "Connecting" with the neutral tone class and the `progress_activity` icon.
- For live, the badge shows "Live" with the success tone class and the `sensors` icon.
- For reconnecting, the badge shows "Reconnecting" with the warning tone class and the `sync` icon.
- For test, the badge shows "Test source" with the neutral tone class and no icon.
- The side panel shows the badge above the grid size control.

### V6. The app starts one source

- With no query, the app starts the server source and makes no worker.
- With `?source=frontend`, the app starts the test source and makes no EventSource.

### V7. Linters pass

- ruff, mypy, ESLint, and Prettier pass. The expected result is exit code 0.

### V8. The production build passes

- The build exits with code 0.

### V9. The Docker image builds

- The build exits with code 0.
- `docker image inspect precision-backend --format '{{.Architecture}}'` prints arm64.
- `docker run --rm precision-backend whoami` does not print root.

### V10. The backend no longer allows `Last-Event-ID`

- The test `test_cors_preflight_allows_last_event_id` is gone, and the other backend tests pass.
- `grep -rni last-event-id backend/app backend/tests` prints nothing.
- A `GET /stream` event still has an `id` line with the sequence number.

## Manual checks

### M1. The client goes live with the local server

1. Run `make dev` and open http://localhost:4200 in Chrome.
2. The expected result is a Connecting badge that turns to a green Live badge within 2 s. Each badge shows its icon, and no icon shows as a word or a blank box. The grid fills, and the samples received readout rises by about 100,000 each second.

### M2. The icons load from Google Fonts

1. With M1 running, open the DevTools network panel and reload the page.
2. The expected result is one request to fonts.googleapis.com and one font request to fonts.gstatic.com. The minus and plus buttons and the badge show their icons.
3. The expected result is no request for /fonts/material-symbols-outlined.woff2.

### M3. The counts stay during a reconnect

1. With M1 running, press Ctrl+C in the terminal to stop both servers, and then run `make backend` in the terminal.
2. Before the backend starts, the expected result is an amber Reconnecting badge. The grid and the readouts keep their values.
3. In the DevTools network panel, the expected result is `stream` requests with growing gaps between them.
4. After the backend starts, the expected result is a Live badge within 2 s of the next attempt, and the samples received readout goes up from the value it held.

### M4. The client connects to the Docker image

1. Run `make docker` in one terminal and `make frontend` in another.
2. Open http://localhost:4200. The expected result is a Live badge and a filling grid.
3. Run `curl -N localhost:8000/stream | head -c 300`. The expected result is `id:` and `data:` lines with JSON arrays.
4. Press Ctrl+C in the `make docker` terminal. The expected result is that the container stops within 3 s and the badge shows Reconnecting.
5. Run `make docker` again. The expected result is a Live badge and counts that keep their values.

### M5. The test source still runs

1. Run `make frontend` and open http://localhost:4200/?source=frontend&rate=1000000.
2. The expected result is a neutral "Test source" badge, a filling grid, and no `stream` requests in the DevTools network panel.

### M6. The README and the logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the stream feature.
3. Open README.md.
4. The expected result is that it describes the `source` and `server` query settings, the badge states, the reconnect, and `make docker`.
