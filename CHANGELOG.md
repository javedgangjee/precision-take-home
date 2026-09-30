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

### Changed

- Feature 2 makes `make backend` stop within 3 seconds of Ctrl+C, even when streams are open.
