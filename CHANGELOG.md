# Changelog

This file records the changes to the project that matter to a person who reads or runs it.

## Unreleased

### Added

- Feature 1 adds a backend project in backend/ that uses Python 3.13, uv, and FastAPI, with one `GET /health` endpoint that returns `{"status": "ok"}`.
- Feature 1 adds an Angular 21 frontend project in frontend/ that uses SCSS, Vitest, angular-eslint, and Prettier.
- Feature 1 adds a CDK app in Python in infra/ with one empty stack named `PrecisionStack` that synthesizes without AWS credentials.
- Feature 1 adds a Makefile with the targets `install`, `backend`, `frontend`, `dev`, `test`, `lint`, `synth`, `deploy`, and `destroy`, and it works with GNU Make 3.81.
- Feature 1 adds a README at the repo root that explains how to install, run, test, and lint the project.
- Feature 1 adds the three logs in docs/ for assumptions, trade-offs, and changes to AI output.
- Feature 2 adds a `GET /stream` endpoint that sends batches of random integers as Server-Sent Events, with one compact JSON array in each event.
- Feature 2 gives each event an `id` that holds the batch sequence number, which starts at 0 when the server starts, so a client can count the batches it missed.
- Feature 2 makes the server generate one shared stream, so every connected client gets the same batches.
- Feature 2 makes delivery lossy, so each client queue holds at most 2 batches and drops the oldest batch when it is full.
- Feature 2 makes the server send the comment `: ping` when it sends nothing for 15 seconds.
- Feature 2 adds the environment variables `SAMPLES_PER_SECOND`, `BATCH_INTERVAL_MS`, `MAX_VALUE`, and `CORS_ORIGINS`, with the defaults 100,000, 50 ms, 1,024, and `http://localhost:4200`.
- Feature 2 makes the server log a warning and use the default when an environment variable is out of range or is not a number.
- Feature 2 lets browser clients from the origins in `CORS_ORIGINS` call the server.
- Feature 2 adds a section to the README that describes the stream, the environment variables, and a curl command that shows the stream.
- Feature 3 adds an Angular client that draws an N by N heat map on a canvas, with row 0 at the bottom and column 0 at the left.
- Feature 3 bins each value with index = (v - 1) mod N², so that in a 4 by 4 grid the value 17 goes to cell <0,0> and the value 0 goes to cell <3,3>.
- Feature 3 keeps a running count for each cell and colors a non-empty cell by (count - 1) / (max - 1), on a hue scale from blue #1E00FF to red #FF0033.
- Feature 3 adds a color scale beside the grid that shows 1, the midpoint, and the max count.
- Feature 3 adds row and column labels, which appear at every 2nd row and column above N = 16 and at every 4th row and column above N = 32.
- Feature 3 adds a side panel with minus and plus buttons that set N from 1 to 64, and changing N resets the counts.
- Feature 3 makes the side panel show the samples received, the max count, and the measured frame rate, and a red line appears when the frame rate falls below 54 fps.
- Feature 3 adds a test source that runs in a Web Worker and sends batches of random integers as JSON text, so the browser can be stress tested before it connects to the server.
- Feature 3 lets the user set the test source with the URL query settings `rate`, `interval`, and `max`, and `rate` goes up to 100,000,000 samples per second.
- Feature 3 bundles the Red Hat Display, Libre Franklin, and IBM Plex Mono fonts, so the client needs no network for fonts.
- Feature 3 adds a section to the README that describes the client, the query settings, and a stress test URL.
- Feature 4 makes the client read the stream from the server over Server-Sent Events by default, at the address in the URL query `server`, which defaults to http://localhost:8000.
- Feature 4 adds a badge at the top of the side panel that shows the stream state as Connecting, Live, or Reconnecting, each with a matching icon.
- Feature 4 makes the client reconnect after the stream drops, with a delay that doubles after each failed attempt up to 30 s and has a random factor so clients do not reconnect at the same moment.
- Feature 4 makes the client treat the stream as dropped and reconnect when no batch arrives for 5 s while the state is Live.
- Feature 4 keeps the counts on screen while the client reconnects.
- Feature 4 adds the URL query `source=frontend`, which runs the test source from feature 3 instead of the server and shows a "Test source" badge.
- Feature 4 adds backend/Dockerfile, which builds an ARM64 image that runs the backend as a user that is not root and stops within 3 s.
- Feature 4 adds the Makefile targets `docker-build` and `docker`, which build the backend image and run it in Docker on port 8000 with the stream settings from the shell.
- Feature 4 adds sections to the README that describe the `source` and `server` query settings, the badge states, the reconnect, and `make docker`.
- Feature 5 adds a CDK stack that runs the backend image on AWS ECS Fargate with one ARM64 task behind an Application Load Balancer at https://api.precision.jgangjee.com.
- Feature 5 makes the load balancer serve HTTPS with an ACM certificate, redirect HTTP to HTTPS, and check `GET /health`.
- Feature 5 makes the stack deploy to the account and region in the current AWS profile, so `make synth` needs no AWS credentials.
- Feature 5 makes a deploy stop the old task before it starts the new one, so two streams never run at once and the client shows Reconnecting for about a minute.
- Feature 5 sends the container logs to CloudWatch with a retention of one week.
- Feature 5 adds infra tests in infra/tests/ and the Makefile target `test-infra`, and `make test` now runs them.
- Feature 5 adds a Deploy section to the README, with the one-time `cdk bootstrap` command.

### Changed

- Feature 2 makes `make backend` stop within 3 seconds of Ctrl+C, even when streams are open.
- Feature 4 makes the client load the Material Symbols icons from Google Fonts instead of a bundled font, so the icons need the network.
- Feature 5 makes the client read from https://api.precision.jgangjee.com by default, and `make dev` and `make docker` print the URL that points the client at the local server.
- Feature 5 lowers the default rate on the server and in the test source from 100,000 to 5,000 samples per second, so each batch holds 250 integers, to keep cloud cost low during development.

### Removed

- Feature 4 removes `Last-Event-ID` from the headers that the backend CORS rule allows, because the client never sends it.
