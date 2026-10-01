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

## 2026-09-30, plan for feature 3, frontend

- The AI proposed fields in the side panel to set the test source rate for the stress test. I chose settings in the URL query, so the panel stays as the HTML design shows it.
- The AI proposed a color scale from pure blue (#0000FF) to pure red (#FF0000) through cyan and yellow. I widened the ends to #1E00FF and #FF0033 to make the colors easier to tell apart, and asked the AI to adjust the other colors to match. The AI made the scale an even hue sweep between the two ends. It also offered to keep cyan and yellow in the middle, and I kept the hue sweep.
- The AI proposed five scale labels, as in the HTML design. I cut them to three, which are the max, the midpoint, and 1.
- The AI proposed a frame rate readout with no warning. I asked for a red error line below the frame rate when it drops below the expected rate. The AI asked what the expected rate is, and I chose the peak reading since the page loaded, so the rule works on any display. The AI used the design red #B33A3A, which passes WCAG AA on the white panel.
- The AI proposed disabled N buttons at the limits, as in the HTML design. I had the AI hide them instead.
- The AI proposed a store service but put the render loop, the drawing, and the color scale in one heat map component. I asked for thin components with the state in its own unit. The AI moved the drawing into a plain renderer class, moved the scale into its own component, and made the store the only owner of the state.

## 2026-09-30, review for feature 3, frontend

- The AI drew the minus and plus icons on the N buttons as inline SVG paths. I asked for Google Material icons instead. The AI replaced both SVGs with Material Symbols Outlined glyphs, weight 300 at 20 px, from a font subset in frontend/public/fonts/.
- The AI closed each frame rate window on the first frame at or after 1 s and used the raw frame count as the reading. I pointed out that the window did not end at 1 s but kept going until the next frame. After a stall, 60 frames over 2 s read as 60 fps. The AI now divides the frame count by the real window length, and a new test covers a late frame.
- The AI marked the grid dirty after a resize and left the redraw to the next frame. Setting the canvas size clears the canvas, and the browser painted it blank before that frame, so the grid went blank while I resized. I changed layout() to draw at once. The AI then moved the draw call into one private method, fixed the frame loop test that my change broke, and added a test that a resize draws without a frame.
- The AI built the test source worker to post every batch with no limit, so a slow main thread would build an open backlog of messages. I asked for the same queue of 2 as the server. The AI added a queue in the worker that drops the oldest batch when it is full, with one batch in flight and an ack from the main thread that releases the next one.

## 2026-09-30, validate feature 3, frontend

- The AI set the test source rate limit to 10,000,000 samples per second. During the stress test, a rate of 100,000,000 fell back to the default of 100,000. I raised the limit to 100,000,000 in the code, and the AI updated the tests and the docs to match.
- The AI compared the frame rate with the peak reading since the page loaded. I decided the client targets 60 fps in Chrome with Energy Saver off, and asked for a fixed 60 fps target instead of the peak. The AI removed the peak from the meter, kept the 90 percent margin, and hid the line until the first reading.

## 2026-09-30, plan for feature 4, stream

- The AI proposed the URL query `source=test` to run the test source from feature 3. I changed the name to `source=frontend`.
- The AI proposed a small inline SVG icon for each badge state, because the bundled icon font had only the add and remove glyphs. I asked for Material Symbols icons that match each state. The AI picked `progress_activity` for Connecting, `sensors` for Live, and `sync` for Reconnecting.
- The AI then planned to add fonttools and build a new local font subset with the five icons. I did not want a new tool. I had the AI load the five icons from a Google Fonts link instead and remove the local icon font and its @font-face rule. The client now needs the network for the icons, and the text fonts stay bundled. The AI added a manual check that the icons load from Google Fonts.
- The AI left the public URL of the backend open in the tech stack and used precision.jgangjee.com in a test. I set the URL to https://api.precision.jgangjee.com, and the AI updated the tech stack, G2, and V1.
- The AI planned a manual check of the stream in Safari and Firefox. I removed it. Chrome is the only browser that a manual check covers now.
- The AI found that the client never sends `Last-Event-ID`, because each reconnect makes a new EventSource. It planned only to update the feature 2 assumption about the preflight. I had the AI add G10, which removes the header from the backend CORS rule, the two comments about it, and the preflight test. The AI added V10 to check that removal.

## 2026-09-30, implement feature 5, deploy

- The plan had the stack take the account from `CDK_DEFAULT_ACCOUNT`. During implement, the AI found that an account and a region make the VPC look up the availability zones in AWS, so a synth with credentials would write cdk.context.json. I chose to set only the region, so synth never makes a lookup.
- The AI then set the region to us-east-2. During review, I asked to remove it so the deploy uses the region in my AWS profile at the time. The AI removed the account and the region from the stack, and removed us-east-2 from the README, the specs, the assumptions, and the trade-offs.
- I asked the AI to lower the default rate to 5,000 samples per second to keep the cloud cost low during development. The AI first changed only the code and the tests, and marked each place as temporary. I asked for the change everywhere. The AI then updated the README, the mission, the specs for features 2 to 5, and the logs, and removed the temporary markers.

## 2026-09-30, replan after feature 5, deploy

- I asked to add a pause to the admin feature. The AI proposed to show the pause in the side panel and keep the three badge states from N10. I asked for Paused in the badge, and the AI changed N10 to four states.
- I asked to split the admin feature into an admin page and a settings display. The AI put the paused flag in the init and update packets of the settings display, which left the pause without a client signal in feature 6. I asked to move the pause entirely into feature 6, and the AI gave it a separate pause event there.
- The split moved the testing feature from feature 7 to feature 8. The older entries in these logs still call it feature 7.

## 2026-10-01, roadmap change to feature 6, admin API

- The roadmap had feature 6 as an admin web page that also sent a pause event to the client. I asked to drop the web page and use plain HTTP requests for the settings and for pause and resume. I also asked to move the client display of the pause state to feature 7. The AI moved the server pause event to feature 7 as well, so feature 6 changes only the backend.
- I asked to add a tuning step to feature 8. The AI asked what the tuning aims for. I chose two goals, which are the highest rate that meets the latency and frame rate targets, and the batch interval with the lowest latency at the default rate.
- I asked for a last feature in which I add the documents and the AI checks the repo against the brief and the overview. The AI added feature 9, which writes docs/submission-checklist.md and does not write the missing documents.

## 2026-10-01, implement feature 6, admin API

- I made no change to the AI output during implement. Changes from my review go here.
