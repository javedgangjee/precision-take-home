# Feature 8 validation: Latency

The project documents have no worked example for this feature. The brief examples stay covered by the feature 3 tests, which must still pass, and V8 runs them through the new id. The cases follow the answers to G1 to G6 in requirements.md.

In the cases below, the short id is `7:1000000:1003000:1005000`. Its sequence number is 7, and its three server times are 1,000 ms, 1,003 ms, and 1,005 ms. The offset is the server clock minus the client clock.

## Automated checks

The command for V1 to V11 is `make test`. The command for V12 is `make lint`. The command for V13 is `cd frontend && npx ng build`.

### V1. The broadcaster takes the first two timestamps

These tests use a clock that returns 100 on the first call and goes up by 100 on each call.

- The first batch has `started` 100 and `encoded` 200. The second batch has 300 and 400.
- The first batch has the sequence number 0, and the second has 1.
- Two subscribers get the same two times for the same batch.
- With 1 sample per second and a 50 ms interval, the first call makes no batch, and the next sequence number stays 0.
- The broadcaster tests from features 2, 6, and 7 pass with the same cases.

### V2. The stream sends the timestamps in the id

The tests run the app in Uvicorn on a free local port.

- The id of a batch event has four parts with a colon between them, and each part has only digits.
- The three times are in order, so `started` is at most `encoded`, and `encoded` is at most `sent`.
- The `sent` time is between the time just before the request and the time just after the test reads the event. The `started` time is at most 1 s before the `sent` time.
- The data of the event is a JSON array of integers.
- Two clients that get the batch with the same sequence number get the same `started` and `encoded` times.
- Across three batches in a row, the sequence number goes up by 1 each time, and `started` goes up each time.
- The first event of a connection is still the settings packet with no `id`.
- The stream tests from features 2, 6, and 7 pass with the same cases, and they read the sequence number from the first part of the id.

### V3. The time endpoint returns the server time

- `GET /time` returns status 200 and a JSON object with the one field `epoch_us`. The value is a whole number between the time just before the request and the time just after it, in microseconds.
- The response has the header `Cache-Control: no-store`.
- A request with `Origin: http://localhost:4200` gets the header `Access-Control-Allow-Origin: http://localhost:4200`.
- With `admin_token="test-token"`, a request with no token returns status 200.

### V4. The client reads the id

- The short id gives the sequence number 7 and the times 1,000, 1,003, and 1,005 ms.
- The id `1234:1790812800123456:1790812800123541:1790812800123702` gives the sequence number 1,234. Its `started` time is 1,790,812,800,123.456 ms and its `sent` time is 1,790,812,800,123.702 ms, each to within 0.001 ms.
- The id `42` gives the sequence number 42 and no times.
- An empty id gives the sequence number 0 and no times, as the client reads it today.
- The id `42:1000:2000` gives the sequence number 42 and no times.
- The id `42:a:b:c` gives the sequence number 42 and no times.

### V5. The percentile function uses the nearest rank

- The numbers 1 to 100 give a p50 of 50, a p95 of 95, a p99 of 99, and a max of 100.
- The one number 5 gives 5 for all four values.
- The numbers 30, 10, 20, and 40 give a p50 of 20, a p95 of 40, a p99 of 40, and a max of 40.
- An empty list gives no value for any of the four.

### V6. The clock sync keeps the offset from the shortest round trip

Each sample below is the client time before the request, the client time after the response, and the server time, in milliseconds.

- The samples (1000, 1100, 2050), (2000, 2020, 3012), and (3000, 3060, 4030) give an offset of 1,002 ms and a round trip of 20 ms.
- The one sample (1000, 1100, 2050) gives an offset of 1,000 ms and a round trip of 100 ms.
- No samples give no offset.

The service tests use a fake request function, a fake clock, and fake timers.

- Before the start, the service has no offset.
- After the start with the address `http://localhost:8000/time` and 5 good responses, the service made exactly 5 requests to that address. With the three samples above among the 5, and two more with longer round trips, the offset is 1,002 ms and the round trip is 20 ms.
- A response with `epoch_us` 2050000 counts as a server time of 2,050 ms.
- When 2 of the 5 requests fail, the offset comes from the other 3.
- When all 5 requests fail, the offset stays as it was.
- A second call to the sync makes 5 more requests and takes the new offset, and the old offset stays in use until the new one exists.
- With no second call, 60 s pass with no more requests.

### V7. The tracker calculates the stages and the total

These tests use an offset of 1,000 ms and a round trip of 20 ms. Batch A has the server times 5000, 5003, and 5005, and the client times `received` 4025, `parsed` 4026, and `applied` 4027. Batch B has the server times 5010, 5012, and 5013, and the client times 4030, 4031, and 4032. The frame has `frame` 4035 and `drawn` 4038.

- After batch A and the frame, the report has 1 batch. The stages are generate 3, queue 2, network 20, parse 1, apply 1, frame wait 8, and draw 3, and the total is 38. Each p50, p95, p99, and max equals that one value.
- After batch A, batch B, and the frame, the report has 2 batches. The total has a p50 of 28 and a max of 38. The frame wait has a p50 of 3 and a max of 8.
- A second frame with no new batch leaves the report as it was.
- A frame with no batch adds no sample.
- With no offset, batch A and the frame give a report with 0 batches. When the offset exists later, a new frame still adds no sample for batch A.
- A batch with no server times adds no sample.
- After a reset, the report has 0 batches, and the clock sync got one new call. A new batch and a frame then give 1 batch.
- After 1,201 batches that each get a frame, the report has 1,200 batches.
- After 1,300 batches with no frame and then one frame, the report has 1,200 batches.
- The report gives the offset 1,000 and the round trip 20. Its rows are generate, queue, network, parse, apply, frame wait, draw, and total, in that order.
- With no sample, the report has 0 batches and no value in any row.
- The function that sets `window.latency` gives the window object a `report` and a `reset`. A call to `report` calls `console.table` once and returns the report.

### V8. The server source takes the client timestamps and still counts the missed batches

These tests use a fake EventSource and a clock that returns 10, 11, and 12.

- With N = 4, the message "[17,8]" with the short id gives cells <0,0> and <1,3> a count of 1 each. The tracker gets one batch with the server times 1,000, 1,003, and 1,005, and with `received` 10, `parsed` 11, and `applied` 12.
- Messages with the sequence numbers 0, 1, and 4, each in an id with three times, give a missed batch count of 2.
- A message with the id `5` goes into the counts and into the missed batch count, and the tracker gets a batch with no server times.
- An update event gives the tracker nothing.
- The server source tests from features 4 and 7 pass with the same cases.

### V9. The heat map component takes the frame timestamps

These tests use a clock that returns 100 and 103.

- On a frame where the store asks for a redraw, the tracker gets one frame with `frame` 100 and `drawn` 103.
- On a frame where the store asks for no redraw, the tracker gets nothing.
- A draw on a resize gives the tracker nothing.

### V10. The app starts the measurement only for the server source

- With no query, the clock sync starts with `https://api.precision.jgangjee.com/time`, and `window.latency` has a `report` and a `reset`.
- With `?server=http://localhost:8000`, the clock sync starts with `http://localhost:8000/time`.
- With `?source=frontend`, the clock sync makes no request, and `window.latency` is not set.

### V11. The source settings give the time address

- With no query, the time address is `https://api.precision.jgangjee.com/time`.
- With `?server=http://localhost:8000/`, the time address is `http://localhost:8000/time`.

### V12. Linters pass

- ruff, mypy, ESLint, and Prettier pass. The expected result is exit code 0.

### V13. The production build passes

- The build exits with code 0.

## Manual checks

`make docker` builds the backend image and runs it at http://localhost:8000, and it needs Docker Desktop. The checks use Chrome with Energy Saver off, and the tab stays in front during each run.

### M1. The local stream has the new id and the time endpoint

1. Start Docker Desktop and run `make docker`. In a second terminal, run `curl -N localhost:8000/stream | head -c 600`.
2. The expected result is a first event with `event: update` and no `id:` line. Each later event has an `id:` line with four numbers and colons between them, and a `data:` line with a JSON array of integers.
3. Run `curl -i localhost:8000/time`.
4. The expected result is status 200, the header `cache-control: no-store`, and a body such as `{"epoch_us":1790812800123456}`.

### M2. The console gives the report for the local server

1. With M1 running, run `make frontend` in another terminal. Open http://localhost:4200/?server=http://localhost:8000 and open the DevTools console.
2. Run `latency.reset()`, wait 60 seconds, and run `latency.report()`.
3. The expected result is a table with eight rows, which are the seven stages and the total. The columns are p50, p95, p99, and max. The report gives between 1,150 and 1,200 batches, a clock offset, and a round trip. The p50 of the total is above 0 ms and below 100 ms.
4. Run `copy(latency.report())` and paste into a text editor. The expected result is the same values as JSON.
5. The expected result in the side panel is a Missed batches readout of 0 and no latency readout.

### M3. The client asks for the server time at start and on a reset

1. With M2 running, open the DevTools network panel, filter for `time`, and reload the page.
2. The expected result is 5 requests, each with status 200. After 30 seconds, the panel shows no more.
3. Run `latency.reset()` in the console. The expected result is 5 more requests, each with status 200.

### M4. The test source has no latency report

1. Open http://localhost:4200/?source=frontend and run `window.latency` in the console.
2. The expected result is `undefined`. The network panel shows no `time` request.

### M5. The console gives the report for the cloud server

1. Run `make deploy`. Run `curl -N https://api.precision.jgangjee.com/stream | head -c 600`. The expected result is an `id:` line with four numbers in each batch event.
2. Open http://localhost:4200 with no query. Run `latency.reset()`, wait 60 seconds, and run `copy(latency.report())`.
3. The expected result is a report with between 1,150 and 1,200 batches and a value in every row. The check passes when the report exists. docs/results.md records whether the p99 of the total meets the 100 ms target.

### M6. The missed batch count still works with the new id

1. With M5 running, note the Missed batches readout. Turn the Wi-Fi off for 10 seconds, and turn it on again.
2. The expected result is a Reconnecting badge and then a Live badge. The Missed batches readout went up by about 20 for each second with no stream, and it does not show NaN.

### M7. docs/results.md gives the measured times

1. Open docs/results.md.
2. The expected result is the run conditions, a table of the seven stages and the total for the cloud run, and the same table for the local run. The file gives the p99 of the total next to the 100 ms target and says whether the target is met. It gives the round trip and the error bound of the clock offset, and it says that the time from the draw call to the display is not measured. The numbers match the two reports from M2 and M5.

### M8. The README and the logs record this feature

1. Open README.md.
2. The expected result is that it describes the four-part id, `GET /time`, the stages, and how to read the report in the console. The Specs and logs section names docs/results.md.
3. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
4. The expected result is that docs/assumptions.md and docs/trade-offs.md each have a section for feature 8. docs/ai-changes.md has a section for each step of feature 8 in which I changed the AI output.
