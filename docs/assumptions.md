# Assumptions

Each heading after the summary gives the feature number, the feature name, and the spec-driven step. Each entry gives one assumption.

## Summary

This list gives the assumptions that most affect the result. The sections below give every assumption.

- The bin index is (v - 1) mod N². This rule matches both brief examples and the example input (e) in the brief picture. The value 0 goes to cell <N-1, N-1>.
- Row 0 is at the bottom of the grid and column 0 is at the left, as in the brief picture.
- A count of 1 is full blue and the max count is full red. The colors of the brief picture are a sketch, so a cell with 5 of 10 hits is green on the client and not yellow.
- Where the HTML design differs from the brief or the specs, the client follows the brief and the specs.
- The reviewers are the only users. The client runs only on the local machine, in Chrome with Energy Saver off.
- Accessibility is out of scope.
- Each value is a uniform random integer from 0 to the maximum value minus 1.
- The target frame rate is 60 fps. The client shows a warning when the reading is below 54 fps.
- A live stream with no batch for 5 s counts as dropped, even when the connection reports no error.
- The request and the response of `GET /time` take about the same time on the network. The latency numbers depend on this, and the error is at most half of the round trip.
- The server clock does not step during a run.
- The CPU of the task is what limits the server. The limits of about 1,200,000 samples per second with one client and about 130 clients at 20,000 samples per second come from a straight line through the measured CPU. I did not test above 1,000,000 samples per second or above 100 clients.

## Constitution

- The bin index is (v - 1) mod N². This rule is the only one I found that matches both brief examples and the example input (e) in the brief picture.
- Row 0 is at the bottom of the grid and column 0 is at the left, as in the brief picture.
- The value 0 goes to cell <N-1, N-1>, because (0 - 1) mod N² is N² - 1.
- A count of 1 is full blue and the max count is full red, as in the 1 to 10 scale of the brief picture. When the max count is 1, every non-empty cell is full blue.
- The reviewers are the only users of the system.
- The server settings come from environment variables at start.
- Python 3.13.15 is the project version because `python3` on my PATH points to it, although Python 3.14.7 is also on the laptop.
- Accessibility is out of scope. A live color heat map cannot convey its data to a screen reader user, so an aria-label on the canvas would not fix the premise.

## Feature 1, Scaffold, plan

- The backend exposes `GET /health`, which returns `{"status": "ok"}`. The load balancer in feature 5 uses it as its health check.
- The backend runs on port 8000 and the frontend runs on port 4200, which are the tool defaults.
- The CDK stack has no AWS account or region lookup, so `cdk synth` runs without credentials.

## Feature 1, Scaffold, implement

- The CDK CLI is installed globally, so the Makefile calls `cdk` directly instead of through npx. The README lists it as a prerequisite.

## Feature 2, Backend, plan

- The stream endpoint is `GET /stream`. Each batch is one SSE event with no event name, and its data field is a JSON array.
- Each value is a uniform random integer from 0 to the maximum value minus 1. The maximum value defaulted to 1,024, so that the default 32 by 32 grid fills evenly. Feature 8 raised the default to 10,000.
- Each SSE event carries the batch sequence number in its `id` field. The number starts at 0 when the server starts and goes back to 0 when it restarts.
- The environment variables are `SAMPLES_PER_SECOND`, `BATCH_INTERVAL_MS`, `MAX_VALUE`, and `CORS_ORIGINS`. `CORS_ORIGINS` is a comma-separated list.
- When samples per second times the interval is not a whole number, the server carries the fraction to the next batch and sends no empty batch.

## Feature 2, Backend, implement

- The CORS rule allows only the GET method, because the client only reads from the server.
- The app is built by a `create_app(settings)` function, and the module makes the served app from the environment at import. The tests build apps with their own settings.

## Feature 2, Backend, review

- The backend is served at https://api.precision.jgangjee.com. That address is the backend's own origin, so it does not go in `CORS_ORIGINS`. The client runs only on the local machine, so feature 5 sets `CORS_ORIGINS` to `http://localhost:4200,http://127.0.0.1:4200` (changed in feature 5).
- The client never sends the `Last-Event-ID` header. Feature 4 makes a new EventSource for each reconnect, and a new EventSource has no last event id. So the CORS rule allows no extra headers, and a reconnect needs no preflight.

## Feature 3, Frontend, plan

- Where the HTML design differs from the brief or the specs, the client follows the brief and the specs. N runs from 1 to 100, the grid has row and column labels, row 0 is at the bottom, cells use (count - 1) / (max - 1), and the frame rate is measured.
- The test source in the browser reads `rate`, `interval`, and `max` from the URL query. The defaults match the server. The rate goes up to 100,000,000 samples per second so that the stress test can go past the server limit of 1,000,000.
- The test source is the only source in feature 3. Feature 4 decides how the user picks the test source or the server.
- The colors of the brief picture are a sketch. Cell (b), with 5 of 10 hits, looks yellow in the picture and is green on the client scale.
- The expected frame rate is the highest one-second reading since the page loaded. On an idle page that reading is the display refresh rate, so the rule works on 60 Hz and 120 Hz screens. The validate step replaced this assumption with the one below.
- The fonts come from the HTML design bundle. The repo is private and will not be released, so it has no license files for the fonts.
- The client uses the light theme only.

## Feature 3, Frontend, implement

- A call to set N to the value it already has does nothing. An arrow key press at 1 or 100 then keeps the counts.
- The test source settings must be whole numbers. A value such as 1.5 falls back to its default, as a value out of range does.
- The grid is never smaller than 120 CSS pixels on a side, as in the HTML design.
- The client redraws the grid when the fonts finish loading, so the axis labels use IBM Plex Mono.

## Feature 3, Frontend, review

- The server queue holds batches that wait for the send to the client. I assume the closest match in the browser is a queue in the worker that waits for the main thread to apply each batch, so the ack stands for a finished send.

## Feature 3, Frontend, validate

- The client runs in Chrome with Energy Saver off. Energy Saver caps the frame rate at 30 fps, which would show the red error line on an idle page.
- The target frame rate is 60 fps. The red error line shows when the reading is below 90 percent of 60, which is 54 fps. The line hides for the first second, before the meter has a reading.
- The test source rate goes up to 100,000,000 samples per second, so the stress test can push the browser past 10,000,000.

## Feature 3, Frontend, after replan

- The N field reads the first whole number in its text, so the text "50.7" sets N to 50.
- A typed number below 1 snaps to 1, in the same way that a number above 100 snaps to 100.
- Text with no number is a mistake, so N stays the same and the field shows it again.

## Feature 4, Stream, implement

- A batch arrives at least once each second at the lowest server settings. So a live stream with no batch for 5 s counts as dropped, even when the connection does not report an error.
- The query `source=server` picks the server with no warning, as no `source` value does. Only other values log a warning.
- The badge copies the stream status rules of the HTML design. Every tone has a white border and a soft shadow, so the Connecting badge shows its edge by the shadow and not by a grey outline.
- The Docker image runs Uvicorn as process 1. Uvicorn handles the stop signal from `docker stop` and from Ctrl+C on `make docker`, so the image needs no init process.

## Feature 5, Deploy, implement

- The stack names no account or region. A deploy uses the account and the region in the AWS profile at the time.
- The hosted zone for precision.jgangjee.com already exists in Route 53, and Cloudflare delegates the name to it. The stack imports the zone by its id and does not make or delete it.
- The task needs a public IP in a public subnet to pull the image from ECR and to send logs to CloudWatch, because the VPC has no NAT gateway.
- The ALB idle timeout stays at 60 s. The server sends a batch at least once each second, so an open stream is never idle that long.

## Feature 6, Admin API, implement

- An empty `ADMIN_TOKEN` counts as no token, so the server has no admin API.
- A PATCH value must be a JSON integer. The server rejects a string such as "20", a number such as 20.5, and null with status 422.
- A 401 response sends the header `WWW-Authenticate: Bearer`.
- Up to 3 batches made before a change can still reach a client after the change. Two wait in the client queue, and one is in the send. The live tests skip these batches.
- A batch whose timer fires at the same moment as a pause is not sent. The server checks for a change again before each batch.

## Feature 7, Settings Display, implement

- Each `PATCH /admin/settings` that returns status 200 sends a settings packet, even when the new values equal the old ones. A pause while paused and a resume while running send none.
- The browser gives each batch event its `id` line as `lastEventId`. The client reads that value as the batch sequence number.
- A batch that arrives during a pause goes into the counts and into the missed batch count. It does not start the watchdog.
- The missed batch count resets on the Angular pass that follows a change to N. A batch that arrives between the change and that pass can add to the count before the reset.
- A Chrome window on a laptop is at least 720 px tall inside. The panel with seven readouts and the frame rate warning is 723 px tall with the page header, so it fits. In a shorter window the panel scrolls.

## Feature 8, Latency, implement

- The request and the response of `GET /time` take about the same time on the network. The offset is exact only then, and its error is at most half of the round trip.
- A frame draws every batch that arrived since the frame before it. Those batches share the `frame` and `drawn` times.
- The server clock does not step during a run. The server reads the wall clock for its three times, and a time correction on the host would move them.
- Chrome rounds the client clock to 0.1 ms. The parse stage and the apply stage are shorter than that at the default settings, so they read as 0 or 0.1 ms.
- A time request that returns a status other than 200 counts as a failed request and gives no sample. A client that connects to a server from before this feature then has no offset and no samples.
- The report rounds each value to 0.001 ms.

## Feature 9, Load, implement

- A setting variable that is exported in the shell counts as set, as it does for `make docker`. `make cloud-setting-update` then sends it with no value on the command line.
- The Makefile puts each setting value into the JSON body with no check. A value that is not a whole number gets status 422 from the server, and the target fails.
- `make cloud-cpu` uses the AWS profile that is active in the shell, which is the profile of the deploy. It finds the service through the stack name `PrecisionStack`.
- The times in the CPU table are in UTC, as is the `start` time of each run from the console snippet. I match the two by the minute.

## Feature 9, Load, validate

- With one client, the 0.25 vCPU of the task is what limits the samples per second. The step at 1,000,000 passes with a p99 of about 55 ms, and the CPU is at about 82 percent in that step. The CPU rises in a straight line with the rate, at 24 percent for 250,000 and 43 percent for 500,000, so it reaches 100 percent at about 1,200,000 samples per second. I did not test a rate above 1,000,000, because that is the top of the range in N11, so the real limit is an assumption.
- At 20,000 samples per second, the same CPU is what limits the number of clients. The step at 100 clients passes with a p99 of about 38 ms, and the CPU is at 76 to 81 percent in that step. The CPU is at about 6 percent with 1 client and 9 percent with 5 clients, so each client adds about 0.7 percent, and the CPU reaches 100 percent at about 130 clients. I did not test above 100 clients, so the real limit is an assumption.
