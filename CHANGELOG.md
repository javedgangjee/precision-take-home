# Changelog

This file records the changes to the project that matter to a person who reads or runs it.

## Unreleased

### Added

- Feature 1 adds a backend project in backend/ that uses Python 3.13, uv, and FastAPI, with one `GET /health` endpoint that returns `{"status": "ok"}`.
- Feature 1 adds an Angular 21 frontend project in frontend/ that uses SCSS, Vitest, angular-eslint, and Prettier.
- Feature 1 adds a CDK app in Python in infra/ with one empty stack named `PrecisionStack` that synthesizes without AWS credentials.
- Feature 1 adds a Makefile with the targets `install`, `backend`, `frontend`, `dev`, `test`, `lint`, `synth`, `deploy`, and `destroy`, and it works with GNU Make 3.81.
- Feature 1 makes the backend and frontend test runs fail when coverage is below 80 percent.
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

### Changed

- Feature 2 makes `make backend` stop within 3 seconds of Ctrl+C, even when streams are open.
