# AI changes

Each entry gives the date, the phase, what the AI produced, what I changed, and why.

## 2026-09-29, constitution

- The AI drafted a roadmap with a final write-up feature. I removed it. The README, this log, and the other logs now update during every feature, so the documents stay current with the code.
- The AI listed the admin page before the hotspot distribution in the stretch goals. I swapped the order.
- The AI offered to put the bonus write-ups for 3D and server-side rendering in the roadmap. I kept them out, because I write them myself.

## 2026-09-29, plan for feature 1, scaffold

- The AI proposed plain CSS for the frontend. I changed it to SCSS.
- The AI proposed Makefile targets with no way to run both apps at once and no way to remove the stack. I added a `dev` target that runs the backend and the frontend together, and a `destroy` target next to `deploy`.
- The AI proposed backend coverage with pytest-cov, which was not in the tech stack. I approved it and added pytest-cov 7.1.0 to specs/tech-stack.md.

## 2026-09-29, implement feature 1, scaffold

- The AI found that npm installed Angular 21.2.24 instead of the 21.2.1 in the tech stack, and it offered to pin 21.2.1. I kept 21.2.24 and had the AI update specs/tech-stack.md.
- The AI kept the README that `ng new` made in frontend/. I deleted it, because the repo needs one README at the root.
- The AI installed Prettier and its config in frontend/ but left it out of `make lint`, so eight files were out of format. I had the AI add `prettier --check` to the lint target and a `format` script to package.json, and it formatted the eight files. I also had the AI add Prettier 3.9.9 to specs/tech-stack.md.
- The AI did not plan how the client at localhost:4200 reaches the backend on another origin. I found the gap and chose CORS on the backend over an Angular dev proxy, because the same code works locally and on Fargate. I had the AI add it to feature 2 in specs/roadmap.md.

## 2026-09-29, plan for feature 2, backend

- The AI proposed a maximum value of 10,000 as the default. I changed the default to 1,024 and kept 10,000 as the upper limit, so the default grid fills evenly.
- The AI proposed that the server stop at start when an environment value is out of range. I changed it to log a warning and use the default, so the server still starts.
- The AI proposed a queue of 10 batches per client. I changed it to 2 to try first, because 10 batches add up to 0.5 s of delay against a 100 ms latency target.
- The AI planned batches with no sequence number or timestamp. I asked for a sequence number, and the AI put it in the SSE `id` field, so the data stays a plain array and a client can count dropped batches. The AI advised that a timestamp wait for feature 7, because the server clock and the client clock differ.
- The AI left the random number source open in the plan, which would have let the implement step pick a slow per-value loop or add NumPy. I ruled out NumPy because it is a large dependency for the backend image. I suggested `random.Random.choices(range(max_value), k=n)` because it might be faster, but I was not sure. The AI timed three options on a 5,000-value batch. `choices` took 0.48 ms, a `randrange` loop took 1.55 ms, and a `randint` loop took 2.21 ms. The timing showed that `choices` is about three times faster, and the plan now names it.
- The AI planned to yield each batch as a Python list, so FastAPI would encode it to JSON once for every client. I asked whether the server did any duplicate work. The AI then read the FastAPI code and timed the encode at 2.94 ms per batch per client, which would fill a 0.25 vCPU task at about 4 clients. I had the AI change the plan so the broadcaster encodes each batch once with `json.dumps` and every client gets the same string.

## 2026-09-30, review feature 2, backend

- The AI left the backend so it did not stop when I killed it, because Uvicorn waits for every open stream to close and an SSE stream never closes. I had the AI add `--timeout-graceful-shutdown 3` to `make backend`, so Uvicorn cancels open streams after 3 seconds and then runs the app shutdown.
- The AI built the batch loop so that it made every missed batch in a burst after a stall. After a one hour stall, that is 72,000 batches, and the client queues drop almost all of them. I had the AI change the loop to skip the missed ticks and run only the latest one that is due.
- The AI typed the lifespan function as `AsyncIterator[None]` under `@asynccontextmanager`. The type stubs mark that form as deprecated, and my editor flagged it. The AI first said that nothing was deprecated, because it checked only for runtime warnings. I had the AI change the type to `AsyncGenerator[None]`.
- I asked which CORS origin forms the server must cover. The AI found two gaps in its own code. The server kept a trailing slash in `CORS_ORIGINS`, so `http://localhost:4200/` would match no browser. The CORS rule allowed no extra headers, so a reconnect with `Last-Event-ID` could fail in a browser that sends a preflight for it. I approved both fixes.

## 2026-09-30, compact the batch payload, backend

- The AI encoded each batch with the default `json.dumps` separators, which put a space after each comma. I asked for a way to make the payload smaller that still works as a string over SSE. The AI timed five formats. I kept the compact separators, which cut a default batch by 20 percent at no extra cost and keep the JSON array. The formats that save more break the JSON array in R2, and trade-offs.md records them.
