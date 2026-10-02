# AI changes

Each heading after the summary gives the feature number, the feature name, and the spec-driven step. Each entry gives what the AI produced, what I changed, and why.

## Summary

This list gives the changes that most affect the result. The sections below give every change.

- The AI did not plan how the client at localhost:4200 reaches the backend on another origin. I found the gap and chose CORS on the backend over an Angular dev proxy, because the same code works locally and on Fargate.
- The AI proposed a queue of 10 batches per client. I cut it to 2, because 10 batches add up to 0.5 s of delay against a 100 ms latency target.
- The AI planned to let FastAPI encode each batch to JSON once for every client. I asked whether the server did any duplicate work. The AI timed the encode at 2.94 ms per batch per client, which would fill the task at about 4 clients, so the broadcaster now encodes each batch once.
- The AI encoded each batch with the default JSON separators. I asked for a smaller payload that still works over SSE, and the compact separators cut a default batch by 20 percent and keep the JSON array.
- The AI built the batch loop to make every missed batch in a burst after a stall. A one hour stall would make 72,000 batches that the client queues drop, so I had the loop skip the missed ticks.
- The AI said that the lifespan type was not deprecated, because it checked only for runtime warnings. My editor flagged the type, and I had the AI change it.
- The AI put the render loop, the drawing, and the color scale in one heat map component. I asked for thin components, so the drawing moved into a renderer class and the state lives in one store.
- The AI closed each frame rate window on the first frame after 1 s and used the raw frame count. After a stall, 60 frames over 2 s read as 60 fps. I found the bug, and the reading now divides the count by the real window length.
- The AI left the redraw after a resize to the next frame, so the grid went blank while I resized. I changed the code to draw at once.
- The AI let the test source worker post batches with no limit. I asked for the same queue of 2 as the server, so a slow main thread does not build a backlog.
- The roadmap gave feature 7 three messages, which were an init packet, an update packet, and a pause event. I asked for one settings packet that holds the full state.
- The AI wrote that the server adds its timestamps to each batch. I asked for the timestamps in the SSE `id` field with the sequence number, so the data stays a JSON array of integers.
- The AI labeled the times in the CPU table as UTC and did not check them. I asked the AI to confirm, and the times were 4 hours off, so a row did not match the run it belonged to.
- I removed three backend tests that the AI wrote, because they repeated other tests or added nothing.
- I removed the batch interval part of the load test before it ran. A longer interval adds no wait to the total latency, so the part proved nothing.

## Constitution

- The AI drafted a roadmap with a final write-up feature. I removed it. The README, this log, and the other logs now update during every feature, so the documents stay current with the code.
- The AI listed the admin page before the hotspot distribution in the stretch goals. I swapped the order.
- The AI offered to put the bonus write-ups for 3D and server-side rendering in the roadmap. I kept them out, because I write them myself.

## Feature 1, Scaffold, plan

- The AI proposed plain CSS for the frontend. I changed it to SCSS.
- The AI proposed Makefile targets with no way to run both apps at once and no way to remove the stack. I added a `dev` target that runs the backend and the frontend together, and a `destroy` target next to `deploy`.
- The AI proposed backend coverage with pytest-cov, which was not in the tech stack. I approved it and added pytest-cov 7.1.0 to specs/tech-stack.md.

## Feature 1, Scaffold, implement

- The AI found that npm installed Angular 21.2.24 instead of the 21.2.1 in the tech stack, and it offered to pin 21.2.1. I kept 21.2.24 and had the AI update specs/tech-stack.md.
- The AI kept the README that `ng new` made in frontend/. I deleted it, because the repo needs one README at the root.
- The AI installed Prettier and its config in frontend/ but left it out of `make lint`, so eight files were out of format. I had the AI add `prettier --check` to the lint target and a `format` script to package.json, and it formatted the eight files. I also had the AI add Prettier 3.9.9 to specs/tech-stack.md.
- The AI did not plan how the client at localhost:4200 reaches the backend on another origin. I found the gap and chose CORS on the backend over an Angular dev proxy, because the same code works locally and on Fargate. I had the AI add it to feature 2 in specs/roadmap.md.

## Feature 2, Backend, plan

- The AI proposed a maximum value of 10,000 as the default. I changed the default to 1,024 and kept 10,000 as the upper limit, so the default grid fills evenly.
- The AI proposed that the server stop at start when an environment value is out of range. I changed it to log a warning and use the default, so the server still starts.
- The AI proposed a queue of 10 batches per client. I changed it to 2 to try first, because 10 batches add up to 0.5 s of delay against a 100 ms latency target.
- The AI planned batches with no sequence number or timestamp. I asked for a sequence number, and the AI put it in the SSE `id` field, so the data stays a plain array and a client can count dropped batches. The AI advised that a timestamp wait for feature 7, because the server clock and the client clock differ.
- The AI left the random number source open in the plan, which would have let the implement step pick a slow per-value loop or add NumPy. I ruled out NumPy because it is a large dependency for the backend image. I suggested `random.Random.choices(range(max_value), k=n)` because it might be faster, but I was not sure. The AI timed three options on a 5,000-value batch. `choices` took 0.48 ms, a `randrange` loop took 1.55 ms, and a `randint` loop took 2.21 ms. The timing showed that `choices` is about three times faster, and the plan now names it.
- The AI planned to yield each batch as a Python list, so FastAPI would encode it to JSON once for every client. I asked whether the server did any duplicate work. The AI then read the FastAPI code and timed the encode at 2.94 ms per batch per client, which would fill a 0.25 vCPU task at about 4 clients. I had the AI change the plan so the broadcaster encodes each batch once with `json.dumps` and every client gets the same string.

## Feature 2, Backend, review

- The AI left the backend so it did not stop when I killed it, because Uvicorn waits for every open stream to close and an SSE stream never closes. I had the AI add `--timeout-graceful-shutdown 3` to `make backend`, so Uvicorn cancels open streams after 3 seconds and then runs the app shutdown.
- The AI built the batch loop so that it made every missed batch in a burst after a stall. After a one hour stall, that is 72,000 batches, and the client queues drop almost all of them. I had the AI change the loop to skip the missed ticks and run only the latest one that is due.
- The AI typed the lifespan function as `AsyncIterator[None]` under `@asynccontextmanager`. The type stubs mark that form as deprecated, and my editor flagged it. The AI first said that nothing was deprecated, because it checked only for runtime warnings. I had the AI change the type to `AsyncGenerator[None]`.
- I asked which CORS origin forms the server must cover. The AI found two gaps in its own code. The server kept a trailing slash in `CORS_ORIGINS`, so `http://localhost:4200/` would match no browser. The CORS rule allowed no extra headers, so a reconnect with `Last-Event-ID` could fail in a browser that sends a preflight for it. I approved both fixes.

## Feature 2, Backend, after validate

- The AI encoded each batch with the default `json.dumps` separators, which put a space after each comma. I asked for a way to make the payload smaller that still works as a string over SSE. The AI timed five formats. I kept the compact separators, which cut a default batch by 20 percent at no extra cost and keep the JSON array. The formats that save more break the JSON array in R2, and trade-offs.md records them.

## Feature 3, Frontend, plan

- The AI proposed fields in the side panel to set the test source rate for the stress test. I chose settings in the URL query, so the panel stays as the HTML design shows it.
- The AI proposed a color scale from pure blue (#0000FF) to pure red (#FF0000) through cyan and yellow. I widened the ends to #1E00FF and #FF0033 to make the colors easier to tell apart, and asked the AI to adjust the other colors to match. The AI made the scale an even hue sweep between the two ends. It also offered to keep cyan and yellow in the middle, and I kept the hue sweep.
- The AI proposed five scale labels, as in the HTML design. I cut them to three, which are the max, the midpoint, and 1.
- The AI proposed a frame rate readout with no warning. I asked for a red error line below the frame rate when it drops below the expected rate. The AI asked what the expected rate is, and I chose the peak reading since the page loaded, so the rule works on any display. The AI used the design red #B33A3A, which passes WCAG AA on the white panel.
- The AI proposed disabled N buttons at the limits, as in the HTML design. I had the AI hide them instead.
- The AI proposed a store service but put the render loop, the drawing, and the color scale in one heat map component. I asked for thin components with the state in its own unit. The AI moved the drawing into a plain renderer class, moved the scale into its own component, and made the store the only owner of the state.

## Feature 3, Frontend, review

- The AI drew the minus and plus icons on the N buttons as inline SVG paths. I asked for Google Material icons instead. The AI replaced both SVGs with Material Symbols Outlined glyphs, weight 300 at 20 px, from a font subset in frontend/public/fonts/.
- The AI closed each frame rate window on the first frame at or after 1 s and used the raw frame count as the reading. I pointed out that the window did not end at 1 s but kept going until the next frame. After a stall, 60 frames over 2 s read as 60 fps. The AI now divides the frame count by the real window length, and a new test covers a late frame.
- The AI marked the grid dirty after a resize and left the redraw to the next frame. Setting the canvas size clears the canvas, and the browser painted it blank before that frame, so the grid went blank while I resized. I changed layout() to draw at once. The AI then moved the draw call into one private method, fixed the frame loop test that my change broke, and added a test that a resize draws without a frame.
- The AI built the test source worker to post every batch with no limit, so a slow main thread would build an open backlog of messages. I asked for the same queue of 2 as the server. The AI added a queue in the worker that drops the oldest batch when it is full, with one batch in flight and an ack from the main thread that releases the next one.

## Feature 3, Frontend, validate

- The AI set the test source rate limit to 10,000,000 samples per second. During the stress test, a rate of 100,000,000 fell back to the default of 100,000. I raised the limit to 100,000,000 in the code, and the AI updated the tests and the docs to match.
- The AI compared the frame rate with the peak reading since the page loaded. I decided the client targets 60 fps in Chrome with Energy Saver off, and asked for a fixed 60 fps target instead of the peak. The AI removed the peak from the meter, kept the 90 percent margin, and hid the line until the first reading.

## Feature 4, Stream, plan

- The AI proposed the URL query `source=test` to run the test source from feature 3. I changed the name to `source=frontend`.
- The AI proposed a small inline SVG icon for each badge state, because the bundled icon font had only the add and remove glyphs. I asked for Material Symbols icons that match each state. The AI picked `progress_activity` for Connecting, `sensors` for Live, and `sync` for Reconnecting.
- The AI then planned to add fonttools and build a new local font subset with the five icons. I did not want a new tool. I had the AI load the five icons from a Google Fonts link instead and remove the local icon font and its @font-face rule. The client now needs the network for the icons, and the text fonts stay bundled. The AI added a manual check that the icons load from Google Fonts.
- The AI left the public URL of the backend open in the tech stack and used precision.jgangjee.com in a test. I set the URL to https://api.precision.jgangjee.com, and the AI updated the tech stack, G2, and V1.
- The AI planned a manual check of the stream in Safari and Firefox. I removed it. Chrome is the only browser that a manual check covers now.
- The AI found that the client never sends `Last-Event-ID`, because each reconnect makes a new EventSource. It planned only to update the feature 2 assumption about the preflight. I had the AI add G10, which removes the header from the backend CORS rule, the two comments about it, and the preflight test. The AI added V10 to check that removal.

## Feature 5, Deploy, implement

- The plan had the stack take the account from `CDK_DEFAULT_ACCOUNT`. During implement, the AI found that an account and a region make the VPC look up the availability zones in AWS, so a synth with credentials would write cdk.context.json. I chose to set only the region, so synth never makes a lookup.
- The AI then set the region to us-east-2. During review, I asked to remove it so the deploy uses the region in my AWS profile at the time. The AI removed the account and the region from the stack, and removed us-east-2 from the README, the specs, the assumptions, and the trade-offs.
- I asked the AI to lower the default rate to 5,000 samples per second to keep the cloud cost low during development. The AI first changed only the code and the tests, and marked each place as temporary. I asked for the change everywhere. The AI then updated the README, the mission, the specs for features 2 to 5, and the logs, and removed the temporary markers.

## Feature 5, Deploy, replan

- I asked to add a pause to the admin feature. The AI proposed to show the pause in the side panel and keep the three badge states from N10. I asked for Paused in the badge, and the AI changed N10 to four states.
- I asked to split the admin feature into an admin page and a settings display. The AI put the paused flag in the init and update packets of the settings display, which left the pause without a client signal in feature 6. I asked to move the pause entirely into feature 6, and the AI gave it a separate pause event there.
- The split moved the testing feature from feature 7 to feature 8. The older entries in these logs still call it feature 7.
- The roadmap had feature 6 as an admin web page that also sent a pause event to the client. I asked to drop the web page and use plain HTTP requests for the settings and for pause and resume. I also asked to move the client display of the pause state to feature 7. The AI moved the server pause event to feature 7 as well, so feature 6 changes only the backend.
- I asked to add a tuning step to feature 8. The AI asked what the tuning aims for. I chose two goals, which are the highest rate that meets the latency and frame rate targets, and the batch interval with the lowest latency at the default rate.
- I asked for a last feature in which I add the documents and the AI checks the repo against the brief and the overview. The AI added feature 9, which writes docs/submission-checklist.md and does not write the missing documents.

## Feature 7, Settings Display, plan

- The roadmap gave feature 7 three messages, which were an init packet, an update packet, and a pause event. I asked for one packet type that holds the three settings and the pause state. The AI rewrote the roadmap entry and the plan around one settings packet.
- The roadmap did not say how the settings packet relates to the missed batch count. I asked the AI to make that clear. The roadmap now says that the packet carries no sequence number, that it never adds to the missed batch count, and that the slow-client queue does not drop it.
- The AI named the SSE event `settings`. I changed the name to `update`.
- The AI proposed that a change to N keeps the missed batch count. I chose that a change to N resets the count to 0, as it does for the samples received.
- The AI proposed the blue info tone for the Paused badge. I chose the neutral white badge with the `pause` icon.
- The AI proposed a compact group of three small rows for the settings. I chose four full readouts in the style of the other readouts.

## Feature 7, Settings Display, review

- The AI built the side panel readouts as the HTML design styles them, with a 15 px value above an 11 px muted label, and it put the four new readouts below Frame rate. I changed the look of the side panel during review, and the changes are cosmetic. The label is now above the value in all seven readouts. The label is 14 px with a 20 px line height in the secondary ink color, and the value is 18 px with a 24 px line height. The Grid size label now has the same style as the readout labels. The stream badge is 40 px tall, with 14 px text and a 24 px icon. I also moved Frame rate to the bottom of the panel, below Max value.

## Feature 7, Settings Display, replan

- The AI wrote each heading in the three logs with a date and a phase, and it wrote a section for a step even when I changed nothing. I asked for headings with the feature number, the feature name, and the spec-driven step, and for no empty sections.
- The roadmap had one testing feature for the latency, the stress test, and the tuning. I split it into feature 8 for latency and feature 9 for load. The submission check is now feature 10. The older entries in this log still call the testing feature feature 8 and the submission check feature 9.
- The roadmap had a measured latency with no method. I asked for a timestamp at each stage on the server and the client, and for a total that the client calculates. I first asked for the total in the side panel, and then I removed it. The AI wrote that the server adds its timestamps to each batch. I asked for the timestamps in the SSE `id` field with the sequence number, in a form such as `id:epoch time`.
- I asked for a load test that raises the rate, then the number of clients, then the batch interval, each until it stops passing. The AI kept the rule that the highest rate that passes becomes the new default, and it removed the search for the batch interval with the lowest latency.

## Feature 8, Latency, plan

- The AI proposed four server timestamps, with one stage for the random values and one for the JSON text. I chose three server timestamps, so the two are one generate stage and the id is shorter.
- The AI proposed that the client measures the clock offset every 10 s. I chose a measurement at start and on each `latency.reset()` only, so the client sends no requests in the background.

## Feature 8, Latency, implement

- The plan set both runs for docs/results.md at 5,000 samples per second and a max value of 1,024, with a wait of 60 seconds. I ran both at 20,000 samples per second and a max value of 10,000, and I took the reports after 7 and 13 seconds. The AI read the settings packet of both servers to confirm the settings, and docs/results.md gives the real conditions.

## Feature 8, Latency, review

- The AI wrote the same `DEFAULT_PACKET` string in `test_stream.py` and `test_broadcaster.py`. I had it moved to `tests/conftest.py`, so the default settings packet has one copy in the backend tests.
- I raised the server defaults to 20,000 samples per second and a max value of 10,000, and I raised the upper limit of samples per second to 1,000,000. The defaults are the settings of the runs in docs/results.md. The AI found 15 backend tests that still had the old values. It updated the tests, the specs, the README, and the test source defaults to match.
- The AI wrote the same `BRIEF_EXAMPLE` array in three heat map spec files. I had it moved to `frontend/src/app/heatmap/brief-example.ts`, so the example input from the brief has one copy in the frontend tests.
- The AI set the largest N to 64, from my design notes. I raised it to 100, which the HTML design allows. A 100 by 100 grid has 10,000 cells, so each value has its own cell at the default max value of 10,000.
- I removed three backend tests that the AI wrote. The two-client test for the `started` and `encoded` times and the CORS test on `GET /time` repeated tests from feature 2. The test that an update, a pause, and a resume keep the next sequence number was filler, because the pause test and the stream test for a gap in the ids cover it.
- I removed the link styles from `styles.scss`, because the client has no links.
- I removed the manual check that the test source has no latency report, because the automated check V10 covers the same case. The later manual checks moved up by one number.

## Feature 8, Latency, validate

- The AI wrote `head -c 600` in the two manual checks that read the stream with curl. At 20,000 samples per second, one batch is about 4,900 bytes, so the output showed no `id:` line. The AI found this in validate, and I approved the change to `head -c 12000`.
- The implement runs for docs/results.md were 7 and 13 seconds. I ran both again for 60 seconds in validate, and the AI wrote the new reports into docs/results.md.

## Feature 9, Load, plan

- I asked the AI to limit the code, because this feature is a test. The plan adds three Makefile targets and no test file, and it changes no file in backend/, frontend/, or infra/.
- The AI proposed that a step passes when 2 of its 3 runs pass. I asked for 3 full runs, so a step passes only when all 3 pass. I repeat a run only for an obvious error in the setup, such as a hidden tab.
- The AI proposed that the second part and the third part run at the highest rate that passes the first part. I chose 20,000 samples per second, so the numbers line up with the feature 8 runs.
- The AI proposed batch intervals of 100, 200, 500, and 1,000 ms. I asked for 25 ms, 50 ms, 100 ms, 500 ms, and 1 s. The AI found that the server rejects 25 ms, because the range starts at 50 ms, and that the 50 ms step repeats the first step of the first part. I dropped 25 ms, and the third part runs 100 ms, 500 ms, and 1 s.
- The AI proposed that the implement step changes the default rate when a higher rate passes. I chose to decide after I read the results, so the change goes to the replan.
- The AI proposed that I run the load test in the implement session, as in feature 8. I moved it to the validate session, because this feature is mostly a testing and validation step.
- The roadmap set the first part at 20,000, 100,000, and 1,000,000 samples per second, and the AI kept those steps. I had tested 100,000 before, so I changed the steps to 20,000 as a baseline, then 250,000, 500,000, and 1,000,000.
- I added a fourth Makefile target, `make cloud-cpu`, which prints the CPU use of the cloud service from CloudWatch. The plan had no server metric, so a failed step gave no clue to its cause. The AI added the start time of each run to the console snippet, so a run matches a row of the CPU table.
- I added a last step to the load test that pauses or destroys the cloud server, so it does not cost more than it must when I leave it overnight. The plan ended the test with the server live at its defaults.

## Feature 9, Load, implement

- The AI gave the CPU table of `make cloud-cpu` the heading Time (UTC) and did not check the times. I asked the AI to confirm that the times are in UTC. The AWS CLI printed them in the time zone of my laptop, which was 4 hours behind UTC, so a row did not match the `start` time of a run. The AI set `TZ=UTC` for the CloudWatch call, and the times now match the UTC clock.

## Feature 9, Load, validate

- The plan had a third part that raised the batch interval through 100 ms, 500 ms, and 1 s. I removed it before it ran, because it proves nothing. The total latency starts when the server makes a batch, so a longer interval adds no wait to it, and the first part already passes with a larger batch. The AI removed the part from the roadmap, the feature specs, and the README.
- The plan had the client steps in rising order, at 2, 5, 10, 20, 50, and 100. The step at 5 clients passed with a p99 of about 25 ms, which was far below the limit, so I went straight to 100. That step passed, and the steps at 2, 10, 20, and 50 did not run.
- The AI reported the results of each part with no statement of what limits the server. I read the CPU table and asked the AI to record that the 0.25 vCPU of the task is the limit, as an assumption.
