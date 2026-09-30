# Assumptions

Each entry gives the date, the phase, and the assumption.

## 2026-09-29, constitution

- The bin index is (v - 1) mod N². This rule is the only one I found that matches both brief examples and the example input (e) in the brief picture.
- Row 0 is at the bottom of the grid and column 0 is at the left, as in the brief picture.
- The value 0 goes to cell <N-1, N-1>, because (0 - 1) mod N² is N² - 1.
- A count of 1 is full blue and the max count is full red, as in the 1 to 10 scale of the brief picture. When the max count is 1, every non-empty cell is full blue.
- The reviewers are the only users of the system.
- The server settings come from environment variables at start.
- Python 3.13.15 is the project version because `python3` on my PATH points to it, although Python 3.14.7 is also on the laptop.
- Accessibility is out of scope. A live color heat map cannot convey its data to a screen reader user, so an aria-label on the canvas would not fix the premise.

## 2026-09-29, plan for feature 1, scaffold

- The backend exposes `GET /health`, which returns `{"status": "ok"}`. The load balancer in feature 5 uses it as its health check.
- The backend runs on port 8000 and the frontend runs on port 4200, which are the tool defaults.
- The CDK stack has no AWS account or region lookup, so `cdk synth` runs without credentials.

## 2026-09-29, implement feature 1, scaffold

- The CDK CLI is installed globally, so the Makefile calls `cdk` directly instead of through npx. The README lists it as a prerequisite.

## 2026-09-29, plan for feature 2, backend

- The stream endpoint is `GET /stream`. Each batch is one SSE event with no event name, and its data field is a JSON array.
- Each value is a uniform random integer from 0 to the maximum value minus 1. The maximum value defaults to 1,024, so the default 32 by 32 grid fills evenly.
- Each SSE event carries the batch sequence number in its `id` field. The number starts at 0 when the server starts and goes back to 0 when it restarts.
- The environment variables are `SAMPLES_PER_SECOND`, `BATCH_INTERVAL_MS`, `MAX_VALUE`, and `CORS_ORIGINS`. `CORS_ORIGINS` is a comma-separated list.
- When samples per second times the interval is not a whole number, the server carries the fraction to the next batch and sends no empty batch.

## 2026-09-29, implement feature 2, backend

- The CORS rule allows only the GET method, because the client only reads from the server.
- The app is built by a `create_app(settings)` function, and the module makes the served app from the environment at import. The tests build apps with their own settings.

## 2026-09-30, review feature 2, backend

- The backend will be served at https://api.precision.jgangjee.com in feature 5. That address is the backend's own origin, so it does not go in `CORS_ORIGINS`. The frontend's public origin goes there, and feature 5 decides it.
- Some browsers may send a preflight request when EventSource reconnects with the `Last-Event-ID` header. The CORS rule allows that header, so the reconnect works in either case. Feature 4 checks it in real browsers.
