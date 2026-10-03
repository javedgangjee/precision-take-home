# Trade-offs

Each heading after the summary gives the feature number, the feature name, and the spec-driven step. Each entry gives the choice and what it costs.

## Summary

This list gives the trade-offs that most affect the result. The sections below give every trade-off.

- The stream uses Server-Sent Events instead of WebSockets, because the client sends nothing to the server. The cost is that any future client-to-server message needs a separate HTTP call.
- The server generates one shared stream for all clients, so the server load stays flat as clients join. The cost is that clients cannot have their own settings.
- Delivery is lossy and best effort. Each client has a queue of at most 2 batches, and a full queue drops its oldest batch. The cost is gaps in the counts on a slow client or after a reconnect.
- The server encodes each batch to JSON once, with compact separators, and sends the same string to every client. The batch stays a plain JSON array, so the server does not use base64 or gzip. The cost is a larger payload than a packed format.
- The generator uses a uniform distribution, because it is the simplest to test. The cost is a nearly flat heat map.
- A change to N resets all counts to zero, so memory stays fixed. The cost is that the history is lost when N changes.
- The client draws the grid on a canvas and redraws at most once per display frame. The cost is up to one frame of added latency, and the cells are not in the DOM.
- The color scale sweeps 259° of hue from #1E00FF to #FF0033, so neighboring counts are easier to tell apart. The cost is that the ends are not pure blue and pure red.
- The frame rate warning compares the reading with a fixed target of 60 fps. The cost is that a 120 Hz display running at 60 fps shows no warning.
- The client drops a live stream after 5 s with no batch and reconnects with a backoff from 1 s up to 30 s. The cost is more code to own than the built-in EventSource retry.
- The service runs one task in a public subnet with no NAT gateway, and the stack costs about $35 a month. The cost is about one minute of downtime on each deploy.
- The admin API is a set of HTTP endpoints with one shared bearer token and no admin web page. The cost is that a reviewer needs a terminal to change the live settings, and the token does not rotate.
- The client measures the clock offset with `GET /time` and compares the p99 of the total latency of a run with the 100 ms target. The cost is an error of at most half of the round trip, and the slowest 1 percent of batches can be above the target.
- The extra clients in the load test are curl processes on my laptop. The cost is that they share one home link, and they do not parse or draw.
- The default stays at 20,000 samples per second, although 1,000,000 passed the load test. The lower rate leaves CPU for several reviewers at once. The cost is that the default client shows a rate far below the measured limit.

## Constitution

- The stream uses Server-Sent Events instead of WebSockets. The client sends nothing to the server, so a one-way channel is enough. The cost is that any future client-to-server message needs a separate HTTP call.
- The server generates one shared stream for all clients. The server load stays flat as clients join. The cost is that clients cannot have their own settings.
- A change to N resets all counts to zero. The client does not keep raw values, so memory stays fixed. The cost is that the history is lost when N changes.
- Delivery is lossy and best effort. The server does not buffer or replay batches for a client that disconnects. The cost is gaps in the counts after a reconnect.
- The client keeps counts as 64-bit floats. They stay exact up to 2⁵³, which a 32-bit integer would overflow in hours at 100,000 samples per second. The cost is twice the memory of 32-bit integers, which is small at 100 by 100 cells.
- The generator uses a uniform distribution. It is the simplest to test. The cost is a nearly flat heat map, so the hotspot mode is a stretch goal.
- The admin settings page is a stretch goal. The cost is that a settings change needs a server restart.
- The client draws the grid on a canvas instead of one DOM or SVG element per cell. A 100 by 100 grid has 10,000 cells, and a canvas repaints them without DOM updates. The cost is that the cells are not in the DOM, so tests must check the counts instead of the elements.
- The client redraws with requestAnimationFrame instead of once per batch. Batches arrive every 50 ms, and the browser paints at the display rate, so the client draws only the latest state. The cost is up to one frame of added latency, which is about 17 ms at 60 Hz.

## Feature 1, Scaffold, plan

- The repo is one monorepo, and backend/ and infra/ are separate uv projects. The CDK libraries stay out of the backend image. The cost is two lock files to keep current.
- The backend fails its tests below 80 percent coverage, the same rule as the frontend. The cost is one more dev dependency.

## Feature 1, Scaffold, implement

- The frontend keeps Angular 21.2.24, which npm resolved from the ranges that Angular CLI 21.2.1 wrote. The project gets the latest 21.2 patches. The cost is that the version differs from the CLI that created the project.
- The backend adds httpx2 as a dev dependency. The FastAPI test client needs an HTTP client, and Starlette warns that httpx is deprecated for it. The cost is one more dev dependency.
- The frontend adds @vitest/coverage-v8 4.1.11 as a dev dependency. The Angular test builder needs it to measure coverage. The cost is one more dev dependency.
- The Makefile sets NG_CLI_ANALYTICS to false, so the Angular CLI never stops to ask about usage data. The cost is that the Angular team gets no usage data from this project.
- The CDK app has no feature flags in cdk.json, because the stack is empty. The cost is a notice on each synth until feature 5 adds the resources and the flags.

## Feature 1, Scaffold, replan

- The tests measure coverage and aim for 100 percent, but no minimum is enforced and no check tests the minimum. The rule was hard to prove and added little. The cost is that coverage can drop without a failed build.
- The admin page moves from a stretch goal to feature 6, before the testing feature. The stress test can then change the sample rate without a server restart. The cost is one more feature before the latency and limit measurements.

## Feature 2, Backend, plan

- The heartbeat is the built-in FastAPI keep-alive, which sends `: ping` after 15 idle seconds. It needs no extra code. The cost is that the stream test patches a private FastAPI name to shorten the wait.
- A bad environment value logs a warning and falls back to its default, and the server still starts. A typo does not take the stream down. The cost is that the server can run with settings the operator did not intend.
- Each client has a queue of at most 2 batches, and a full queue drops its oldest batch. A slow client gets fresh data and never slows the others, and a backlog adds at most 0.1 s of delay at the default interval. The cost is more dropped batches, and gaps in the counts, on a client that stalls for a short time.
- The generator schedules each batch from a fixed start time on the monotonic clock. The batches do not drift. After a stall, the server skips the missed ticks instead of making them in a burst (changed in the feature 2 review).
- The stream tests run the app in a real Uvicorn server on a free port, because the in-process test clients wait for the end of a response. The cost is slower tests and a background thread in the fixture.
- The sequence number goes in the SSE `id` field instead of the data. The data stays a plain array. The cost is that the browser sends the last id back on a reconnect, and the server must ignore it.
- The batches carry no timestamp yet. Feature 8 decides how to measure latency across two clocks. The cost is that the payload format may change in feature 8.
- \* The generator uses `random.Random.choices` from the standard library instead of NumPy. It needs no new dependency and makes a 5,000-value batch in about 0.5 ms, three times faster than a `randrange` loop. The cost is speed. NumPy made the same batch in 0.11 ms, including the conversion to a list for JSON, which is about four times faster. At 20 batches a second, the saving is about 0.7 percent of one core, which does not justify a large dependency.
- The broadcaster encodes each batch to JSON once and sends the same string to every client with `raw_data`. Encoding costs 0.28 ms per batch instead of 2.94 ms per batch per client, so a 0.25 vCPU task can serve many more clients. The cost is that the route bypasses the FastAPI data validation and encoding, so the broadcaster owns the wire format.

## Feature 2, Backend, implement

- The generator keeps the carried fraction as a whole number of thousandths of a sample instead of a float. The carry stays exact over any number of batches. The cost is a less obvious formula in the code.
- The broadcaster tests run the event loop with `asyncio.run` inside plain tests instead of adding pytest-asyncio. The project needs no new dependency. The cost is a small wrapper function in the async test.
- The stream test fixture binds a socket to a free port and hands it to Uvicorn. No other process can take the port between the bind and the start. The cost is more fixture code than a plain port number.

## Feature 2, Backend, review

- `make backend` gives open streams 3 seconds to close on shutdown, and then Uvicorn cancels them. The server always stops in about 3 seconds. The cost is that Uvicorn logs an error line for the cancelled streams, and a client sees its stream cut off.
- \* After a stall, the broadcaster runs only the latest tick that is due and skips the older ticks. The server does not spend CPU on batches that the client queues would drop, and it does not send a flood of old data. The cost is that the samples of the skipped ticks are never made, so the rate over a stall falls below the setting. The sequence number counts only the batches that the server sends, so a client cannot see the skipped ticks as a gap.

## Feature 2, Backend, after validate

- The broadcaster encodes each batch with the compact JSON separators `(",", ":")`. A default batch drops from 24,558 characters to 19,559, which is 20 percent less, and the encode time stays at 0.29 ms. The client still gets a plain JSON array, so R2 holds. The cost is that the stream is harder to read by eye in curl.
- The server does not send the batch as base64 of packed integers. Base64 of 16-bit values is 13,336 characters, and 10-bit packing is 8,336 characters. Both break R2, because the data is no longer a JSON array. The browser also decodes base64 slower than `JSON.parse`, at 0.4 to 0.6 ms against 0.09 ms per batch in Node 22.
- The server does not gzip the stream. The Starlette GZipMiddleware skips `text/event-stream`, because it buffers the response. A custom per-event gzip needs one compressor for each client and must flush after each event. Gzip alone cuts the compact batch only to 8,149 bytes, because random values do not compress well.
- The server does not send counts per value in place of the values. Counts make a batch 2,078 characters, but they break R2 and the brief, which asks for an array of random integers.

## Feature 3, Frontend, plan

- The test source settings come from the URL query instead of fields in the side panel. The panel stays as the HTML design shows it. The cost is that each change needs a reload, which also resets the counts.
- The test source runs in a Web Worker and posts each batch as a JSON string, which the main thread parses. The main thread does the same work as it will for the SSE stream in feature 4, so the stress test measures the real path. The cost is a worker config file and a change to angular.json, and the unit tests use a fake worker, because jsdom cannot run one.
- The color scale sweeps the hue from #1E00FF to #FF0033 through cyan, green, and yellow. It spans 259° of hue instead of 240°, so neighboring counts are easier to tell apart. The cost is that the ends are not pure blue and pure red, so N4 in docs/specs/mission.md needs new wording at replan.
- The scale shows three labels, which are the max, the midpoint, and 1. The scale stays easy to read. The cost is fewer reference points, and the midpoint shows a decimal, such as 5.5, when the max is even.
- The client draws the axis labels on the same canvas as the cells. The labels stay lined up with the cells at any size. The cost is that the labels are not in the DOM, so the tests check them through a fake canvas context.
- The panel readouts update at most once every 150 ms, as the HTML design does. Text updates do not cost a frame. The cost is that the numbers lag the grid by up to 150 ms.
- The frame rate counts requestAnimationFrame callbacks, and the error line compares the count with the peak since load. It shows when the main thread falls behind, on any display. The cost is that the peak is low when the page loads under heavy load, and then the line does not show a drop that is real. The validate step replaced the peak with a fixed target, as the entry below records.
- The N buttons hide with `visibility: hidden` at the limits instead of going disabled. The field does not move. The cost is that the button under the pointer or the keyboard focus disappears at the limit, and the focus leaves it.
- The heat map state lives in one store service, the drawing lives in a plain renderer class, and the components only bind signals and forward events. Each part is small and has its own tests. The cost is more files than one component that does it all.

## Feature 3, Frontend, implement

- The renderer fills each cell with its own `fillRect` call, which is 10,000 calls a frame at N = 100. The code is short and easy to test with a fake context. The cost is that it is slower than writing the pixels to one ImageData. The stress test shows whether that matters.
- The worker makes batches on a `setInterval` timer. The code is short. The cost is that a busy worker sends late batches and does not skip or catch up, as the server does after a stall.
- tsconfig.app.json leaves out the worker files, which tsconfig.worker.json compiles with the web worker types. The plan named only the new config and angular.json. The cost is one more changed config file.

## Feature 3, Frontend, review

- The Material Symbols font is a subset from Google Fonts that holds only the add and remove glyphs, and the client serves it from frontend/public/fonts/. The file is 1 KB and the client needs no network for it, as G9 asks for the other fonts. The cost is that a new icon needs a new subset download.
- The frame rate reading is the frame count divided by the real window length, so a stall lowers it. The cost is that a hidden tab pauses requestAnimationFrame, and the first window after the tab shows again reads low and can show the error line for up to 1 s.
- A resize draws the grid at once, outside the frame loop, so the grid never paints blank. The cost is a second draw in a frame when a batch and a resize land in the same frame, which happens only while the user resizes.
- The test source worker sends one batch at a time and waits for an ack from the main thread, with a queue of 2 behind it. A slow main thread gets fresh batches and the backlog stays at 3 batches at most. The cost is one extra message per batch, and the queue fills only when the main thread lags. The server queue in feature 4 fills when the network lags, because the browser reads the SSE stream off the main thread.

## Feature 3, Frontend, validate

- The error line compares the frame rate with a fixed target of 60 fps instead of the peak since load. A page that loads under heavy load now shows the drop. The cost is that a 120 Hz display running at 60 fps shows no line, and a browser capped at 30 fps shows the line at all times.

## Feature 3, Frontend, replan

- The hotspot mode is removed from the roadmap. The project ends with the testing feature. The cost is that the heat map stays nearly flat under the uniform generator.
- Features 8 and 9 write their findings to docs/results.md, next to the other logs. A reviewer finds the results in one place. The cost is one more file to keep current.

## Feature 4, Stream, implement

- The Material Symbols icons load from Google Fonts, and the local subset is gone. One font serves all five icons, and a new icon needs only a change to the link. The cost is that the client needs the network for the icons, and the icons are blank until the font loads.
- The client closes the EventSource on each drop and makes a new one after a backoff delay of 1 s that doubles up to 30 s, with a random factor from 0.5 to 1. The built-in EventSource retry has a fixed delay. The cost is more code to own, and a reconnect takes up to 1 s longer than the built-in retry after a short drop.
- The watchdog drops a live stream after 5 s with no batch. It catches a connection that hangs with no error. The cost is a false drop if the server pauses for more than 5 s, which happens only when the server stalls.
- The Docker image is built for linux/arm64 only. It runs native on my laptop and matches Fargate ARM64. The cost is that an Intel machine runs it under emulation.

## Feature 5, Deploy, implement

- The VPC has public subnets only and no NAT gateway, and the task gets a public IP. A NAT gateway costs about $32 a month in each zone. The cost is that the task sits in a public subnet. Its security group lets in traffic only from the ALB, so the task cannot be reached from the internet.
- The service runs one task, and a deploy stops the old task before it starts the new one. Two streams never run at once, so every client sees one sequence of batch ids. The cost is that the stream is down for about a minute on each deploy, and the client shows Reconnecting.
- The target group drains a task in 5 s instead of the default 300 s. An SSE stream never ends on its own, so the default would make each deploy wait 5 minutes. The cost is that open streams are cut at once when a task stops.
- The stack runs all the time. At the list prices I know, the ALB costs about $16 a month, the task about $7, the three public IPv4 addresses about $11, and the hosted zone $0.50. The total is about $35 a month before data transfer. I have not checked these prices against the AWS bill. `make destroy` removes all of it except the hosted zone.
- The stack sets no account or region. A deploy goes to the account and the region in the AWS profile at the time. The VPC picks 2 availability zones in the template, and synth makes no AWS lookup and writes no cdk.context.json. The cost is that CDK cannot check at synth time that the zones exist, and the zones are the first 2 that AWS returns at deploy time. A deploy with a different profile makes a second stack in that region.
- The stack builds the image as a CDK asset during `make deploy`. The cloud runs the same Dockerfile as `make docker`, and there is no separate push step. The cost is that Docker must run during the deploy, and the image lives in the CDK bootstrap ECR repo.
- The cdk.json file still has no feature flags. Feature 1 planned to add them with the resources, but the plan for feature 5 did not name the file. The cost is the notice about unset feature flags on each synth.
- The infra tests check only the key settings in the template, and there is no full test suite for the stack. The cost is that a change to a setting the tests do not check can pass `make test`.
- The default rate is 5,000 samples per second instead of 100,000, so each batch holds 250 integers. A lower rate keeps the data transfer cost low while I develop against the cloud stack. The cost is a lighter load than the brief limit, and I plan to raise the default before submission. Feature 8 raised the default to 20,000.

## Feature 5, Deploy, replan

- The admin page and the settings display are two features instead of one. Each feature stays small enough to review in one pass. The cost is that feature 6 ships live settings that the client cannot show until feature 7.
- Pause lives entirely in feature 6, with its own pause event, apart from the init and update packets of feature 7. A pause then never makes the clients reconnect, even before feature 7. The cost is a second kind of control event that feature 7 does not fold into its packets.
- The badge gets a fourth state, Paused, in place of a note in the side panel. The user sees the pause where the stream state already shows. The cost is a change to N10, which named three states from my design notes.
- Feature 6 is a set of HTTP endpoints with no admin web page. I change the settings and pause the stream with curl. The cost is that a reviewer needs a terminal to try the live settings.
- The pause event and the Paused badge move to feature 7, with the init and update packets. Feature 6 then changes only the backend. The cost is that between feature 6 and feature 7 a pause makes each client reconnect every 5 s, because the client watchdog sees no batches.
- Feature 9 adds a tuning step that sets the default rate to the highest rate that meets the 100 ms target and 54 fps. This replaces the plan to raise the default before submission by hand. The cost is that the default depends on one set of measurements on my laptop and one Fargate task size.
- Feature 10 is a checklist that compares the repo with the brief and the project overview before I submit. The check catches a missing document before a reviewer does. The cost is one more feature, and the check reads only the files, so it cannot judge the quality of the write-ups.

## Feature 6, Admin API, implement

- The admin API uses one shared bearer token on the public URL. It needs no new port, no IAM signing, and no change to the load balancer. The cost is that anyone with the token can change the stream, and the token does not rotate.
- The cloud token lives in Secrets Manager with a random value. No token sits in the repo or in the task environment in the template. The cost is about $0.40 a month, and a reader needs two AWS CLI calls to get the token.
- The local token is the fixed string `local-admin-token` in the Makefile. The curl examples work with no setup. The cost is that the token is public, so a local server is open to anyone who can reach port 8000.
- The admin handlers are async, so they run on the event loop with the broadcaster. The broadcaster wakes its loop with an `asyncio.Event`, which is not safe to set from a worker thread. The cost is that a slow handler would block the stream, and each handler only sets a few fields.
- main.py sets up the root logger at the info level, because Uvicorn sets up only its own loggers. Each admin change then shows in the terminal and in CloudWatch. The cost is that info logs from other libraries also show.

## Feature 7, Settings Display, plan

- One packet type carries the three settings and the pause state. The client has one handler, and each packet holds the full state. The cost is that a pause sends the three settings again, which adds about 85 bytes to that packet.
- The settings packet has no id and takes no sequence number, so the batch ids stay 1 apart and the missed batch count reads only batches. The cost is that a client cannot detect a lost settings packet from the ids. The server never drops one from a queue, and each new connection gets one first.
- When two changes happen before a client reads the first one, the client gets one packet with the newest values. The client always ends at the current state. The cost is that it does not see the state between the two changes.
- The badge shows Live when the stream opens and turns to Paused when the first packet says so. The client needs no extra state for a stream that is open with no packet yet. The cost is that a client that connects during a pause shows Live for a moment.
- The client detects a server restart from a batch id lower than the last one, so the packet needs no server start time. The cost is a false gap in the missed batch count when the new server passes the old id before the client reconnects.
- The panel shows the missed batches and the three settings as four full readouts. They match the readouts from feature 3. The cost is a panel that is about 240 px taller.

## Feature 7, Settings Display, implement

- The broadcaster keeps one settings packet and a change counter. Each stream keeps the counter value of the last packet it sent and sends the packet when the values differ. The packet never sits in a client queue, so the queue cannot drop it. The cost is that the stream route has a second thing to check on each pass.
- A change puts a wake item in each empty client queue, so a stream with no batches still sends the packet. The cost is that the queue holds two kinds of item, and the code that reads it must tell a batch from a wake item. A full queue can drop a wake item, and that is safe, because the stream then wakes for a batch.
- The admin response and the settings packet share one model in broadcaster.py. The two cannot drift apart. The cost is that the admin API returns the model that the broadcaster owns, so a new admin-only field needs a second model.
- The client uses an Angular effect on N to reset the missed batch count. The heat map store needs no change and does not know about the stream. The cost is that the reset runs one pass after the counts reset and not in the same call.
- The gap between the readouts went from 20 px to 12 px, and the panel scrolls in a short window. The seven readouts then fit in a laptop window. The cost is that the readout spacing no longer matches the HTML design.

## Feature 7, Settings Display, replan

- Testing is two features, which are feature 8 for latency and feature 9 for load. The load test then uses the latency measurement from feature 8 as its pass check. The cost is one more feature before the submission check.
- The load test raises the batch interval until a step fails. It no longer looks for the batch interval with the lowest latency at the default rate. The cost is that the default interval stays at 50 ms with no measurement that shows it is the best one.
- The server timestamps for feature 8 go in the SSE `id` field, after the batch sequence number. The batch data stays a JSON array of integers. The cost is that the id is no longer a plain number, so the client must split it before it counts the missed batches.

## Feature 8, Latency, plan

- The server has one generate stage that holds the making of the values and the JSON encoding. The id has three times and adds about 50 bytes to a batch. The cost is that the results cannot show which of the two grows at a high sample rate.
- The `sent` time is the time when the stream route hands the event to the web server. The app cannot see the write to the socket. The cost is that the network stage also holds the write by Uvicorn and the load balancer.
- The measurement stops when the canvas draw call returns. The browser gives no time for the light on the display. The cost is that the total leaves out about one frame.
- The client compares the two clocks with `GET /time` and keeps the offset from the request with the shortest round trip. The alternative was to trust both clocks, and a laptop clock is often tens of milliseconds off. The cost is one new endpoint and an error of at most half of the round trip.
- The client measures the offset at start and on each `latency.reset()`. It sends no requests in the background. The cost is that the two clocks can drift by 1 to 3 ms each minute, so each run must start with a reset.
- I read the times from `latency.report()` in the console. The feature needs no new part in the side panel, and feature 9 can call the same function. The cost is that a reviewer must open the console to see the latency.
- The value that I compare with the 100 ms target is the p99 of the total over 60 s. One long pause in the browser does not fail a run. The cost is that the 12 slowest batches of 1,200 can be above the target.
- The client keeps the stage times of the last 1,200 batches and no raw data file. The memory stays small. The cost is that I cannot draw a chart of the latency over time.

## Feature 8, Latency, implement

- The client measures all the time, with no setting that turns it off. A report is ready at any moment, and feature 9 needs no setup. The cost is three clock reads for each batch and one or two for each frame in every session.
- The handler of `GET /time` is async, so it reads the clock on the event loop and not in a worker thread. The response does not wait for a thread. The cost is that a busy event loop delays the response, which makes the round trip longer. The client keeps the shortest of 5 round trips, which limits that effect.
- A batch that waits for a frame when no offset exists is dropped from the measurement and is not kept for later. The tracker needs no second list. The cost is that the batches of about the first 100 ms after the page loads give no sample.
- The default time request uses `fetch` and has no unit test, as the default EventSource has none. The tests replace both with fakes. The cost is that the coverage of clock-sync.ts is 90 percent of the lines.

## Feature 8, Latency, review

- The server defaults are 20,000 samples per second and a max value of 10,000, so each batch holds 1,000 integers from 0 to 9,999. These are the settings of the runs in docs/results.md. The cost is about five times the bytes for each client, and a default 32 by 32 grid that does not fill evenly. With 10,000 values on 1,024 cells, 784 cells get 10 values each and 240 cells get 9.

## Feature 9, Load, plan

- The three cloud targets read the admin token from the shell variable `CLOUD_ADMIN_TOKEN`. These targets make no AWS call, and the Makefile holds no token. The cost is one export in each new terminal.
- A snippet in the DevTools console times each run and reads the frame rate. The client code does not change. The cost is that the snippet has no test and lives in validation.md of the feature.
- The extra clients of the second part are curl processes on the laptop. They need no new code. The cost is that every client shares one home link, so the link can set the limit on clients before the server does. A curl client also does not parse or draw.
- A step passes only when all 3 runs pass. The limit is a rate that held for 90 seconds. The cost is that one slow second on the network fails a step and ends the part.
- The second part runs at 20,000 samples per second. The numbers line up with the feature 8 runs. The cost is that they do not describe the server at a higher default.
- The pass rule reads the p99 of the batches that arrive. The server can drop a batch for a slow client, and that batch gives no latency sample. docs/results.md gives the number of batches of each run next to the expected number, and the pass rule does not use that number.
- The Makefile targets have no automated test. The checks are commands in validation.md that run the targets against the local server. The cost is that `make test` does not catch a broken target.
- `make cloud-cpu` reads the standard ECS CPU metric from CloudWatch. It needs no change to the stack. The cost is one value for each minute, so a 30 second run has no value of its own, and the CPU is a clue and not a measurement of a step.

## Feature 9, Load, implement

- The three admin targets share one `define` block in the Makefile, which checks the token, sends the request, and checks the status. The rule for the token and the status has one copy. The cost is a block that is harder to read than three plain curl lines.
- The targets hide their commands, so the output is only the reply of the server. The cost is that I do not see the curl command that ran. `make -n cloud-pause` prints it, with the name of the token variable in place of the token.
- The targets check the status code and not only the curl exit code, so a redirect or any other status that is not 200 fails the target. The cost is three more lines of shell.
- `make cloud-cpu` gives the start and the end of the period to the AWS CLI in Unix seconds. The recipe needs no `date` options, which differ between macOS and Linux. The cost is a command that is harder to read than one with dates.

## Feature 9, Load, validate

- The load test has no part on the batch interval. The cost is that no run shows the client at a longer interval, and the default of 50 ms has no measurement against the other intervals.
- The second part ran with 5 clients and with 100 clients only. The cost is that the results have three points for the number of clients, with the 1 client step of the first part, so they do not show how the p99 rises between 5 and 100.

## Feature 9, Load, replan

- The default stays at 20,000 samples per second. The roadmap said that the highest rate that passes becomes the default, and that rate is 1,000,000. One client uses about 6 percent of the CPU at 20,000 and 82 percent at 1,000,000, so the lower rate leaves room for several reviewers at once. The cost is that the default client shows a rate far below the measured limit.
