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
