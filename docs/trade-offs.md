# Trade-offs

Each entry gives the date, the phase, the choice, and what it costs.

## 2026-09-29, constitution

- The stream uses Server-Sent Events instead of WebSockets. The client sends nothing to the server, so a one-way channel is enough. The cost is that any future client-to-server message needs a separate HTTP call.
- The server generates one shared stream for all clients. The server load stays flat as clients join. The cost is that clients cannot have their own settings.
- A change to N resets all counts to zero. The client does not keep raw values, so memory stays fixed. The cost is that the history is lost when N changes.
- Delivery is lossy and best effort. The server does not buffer or replay batches for a client that disconnects. The cost is gaps in the counts after a reconnect.
- The client keeps counts as 64-bit floats. They stay exact up to 2⁵³, which a 32-bit integer would overflow in hours at 100,000 samples per second. The cost is twice the memory of 32-bit integers, which is small at 64 by 64 cells.
- The generator uses a uniform distribution. It is the simplest to test. The cost is a nearly flat heat map, so the hotspot mode is a stretch goal.
- The admin settings page is a stretch goal. The cost is that a settings change needs a server restart.
- The client draws the grid on a canvas instead of one DOM or SVG element per cell. A 64 by 64 grid has 4,096 cells, and a canvas repaints them without DOM updates. The cost is that the cells are not in the DOM, so tests must check the counts instead of the elements.
- The client redraws with requestAnimationFrame instead of once per batch. Batches arrive every 50 ms, and the browser paints at the display rate, so the client draws only the latest state. The cost is up to one frame of added latency, which is about 17 ms at 60 Hz.

## 2026-09-29, plan for feature 1, scaffold

- The repo is one monorepo, and backend/ and infra/ are separate uv projects. The CDK libraries stay out of the backend image. The cost is two lock files to keep current.
- The backend fails its tests below 80 percent coverage, the same rule as the frontend. The cost is one more dev dependency.

## 2026-09-29, implement feature 1, scaffold

- The frontend keeps Angular 21.2.24, which npm resolved from the ranges that Angular CLI 21.2.1 wrote. The project gets the latest 21.2 patches. The cost is that the version differs from the CLI that created the project.
- The backend adds httpx2 as a dev dependency. The FastAPI test client needs an HTTP client, and Starlette warns that httpx is deprecated for it. The cost is one more dev dependency.
- The frontend adds @vitest/coverage-v8 4.1.11 as a dev dependency. The Angular test builder needs it to measure coverage. The cost is one more dev dependency.
- The Makefile sets NG_CLI_ANALYTICS to false, so the Angular CLI never stops to ask about usage data. The cost is that the Angular team gets no usage data from this project.
- The CDK app has no feature flags in cdk.json, because the stack is empty. The cost is a notice on each synth until feature 5 adds the resources and the flags.

## 2026-09-29, replan after feature 1, scaffold

- The tests measure coverage and aim for 100 percent, but no minimum is enforced and no check tests the minimum. The rule was hard to prove and added little. The cost is that coverage can drop without a failed build.
- The admin page moves from a stretch goal to feature 6, before the testing feature. The stress test can then change the sample rate without a server restart. The cost is one more feature before the latency and limit measurements.

## 2026-09-29, plan for feature 2, backend

- The heartbeat is the built-in FastAPI keep-alive, which sends `: ping` after 15 idle seconds. It needs no extra code. The cost is that the stream test patches a private FastAPI name to shorten the wait.
- A bad environment value logs a warning and falls back to its default, and the server still starts. A typo does not take the stream down. The cost is that the server can run with settings the operator did not intend.
- Each client has a queue of at most 2 batches, and a full queue drops its oldest batch. A slow client gets fresh data and never slows the others, and a backlog adds at most 0.1 s of delay at the default interval. The cost is more dropped batches, and gaps in the counts, on a client that stalls for a short time.
- The generator schedules each batch from a fixed start time on the monotonic clock. The batches do not drift. After a stall, the server skips the missed ticks instead of making them in a burst (changed in the feature 2 review).
- The stream tests run the app in a real Uvicorn server on a free port, because the in-process test clients wait for the end of a response. The cost is slower tests and a background thread in the fixture.
- The sequence number goes in the SSE `id` field instead of the data. The data stays a plain array. The cost is that the browser sends the last id back on a reconnect, and the server must ignore it.
- The batches carry no timestamp yet. Feature 7 decides how to measure latency across two clocks. The cost is that the payload format may change in feature 7.
- \* The generator uses `random.Random.choices` from the standard library instead of NumPy. It needs no new dependency and makes a 5,000-value batch in about 0.5 ms, three times faster than a `randrange` loop. The cost is speed. NumPy made the same batch in 0.11 ms, including the conversion to a list for JSON, which is about four times faster. At 20 batches a second, the saving is about 0.7 percent of one core, which does not justify a large dependency.
- The broadcaster encodes each batch to JSON once and sends the same string to every client with `raw_data`. Encoding costs 0.28 ms per batch instead of 2.94 ms per batch per client, so a 0.25 vCPU task can serve many more clients. The cost is that the route bypasses the FastAPI data validation and encoding, so the broadcaster owns the wire format.

## 2026-09-29, implement feature 2, backend

- The generator keeps the carried fraction as a whole number of thousandths of a sample instead of a float. The carry stays exact over any number of batches. The cost is a less obvious formula in the code.
- The broadcaster tests run the event loop with `asyncio.run` inside plain tests instead of adding pytest-asyncio. The project needs no new dependency. The cost is a small wrapper function in the async test.
- The stream test fixture binds a socket to a free port and hands it to Uvicorn. No other process can take the port between the bind and the start. The cost is more fixture code than a plain port number.

## 2026-09-30, review feature 2, backend

- `make backend` gives open streams 3 seconds to close on shutdown, and then Uvicorn cancels them. The server always stops in about 3 seconds. The cost is that Uvicorn logs an error line for the cancelled streams, and a client sees its stream cut off.
- \* After a stall, the broadcaster runs only the latest tick that is due and skips the older ticks. The server does not spend CPU on batches that the client queues would drop, and it does not send a flood of old data. The cost is that the samples of the skipped ticks are never made, so the rate over a stall falls below the setting. The sequence number counts only the batches that the server sends, so a client cannot see the skipped ticks as a gap.
