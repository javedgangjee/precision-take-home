# Feature 7 validation: Settings Display

The project documents have no worked example for this feature. The brief examples stay covered by the feature 3 tests, which must still pass. The cases follow the answers to G1 to G7 in requirements.md.

In the cases below, the default packet is `{"samples_per_second":5000,"batch_interval_ms":50,"max_value":1024,"paused":false}`. A request with the right token sends `Authorization: Bearer test-token`.

## Automated checks

The command for V1 to V7 is `make test`. The command for V8 is `make lint`. The command for V9 is `cd frontend && npx ng build`.

### V1. The broadcaster keeps the settings packet

- With the default settings, the packet text is the default packet, with no spaces.
- After an update to 20 samples per second, the packet has `samples_per_second` 20, and the change counter is 1 higher.
- After a pause, the packet has `paused` true, and the counter is 1 higher. A second pause leaves the packet and the counter as they were.
- After a resume, the packet has `paused` false, and the counter is 1 higher. A second resume leaves the packet and the counter as they were.
- An update, a pause, and a resume leave the next batch sequence number as it was.
- A subscriber with an empty queue gets one wake item after a pause, and the wake item is not a batch.
- A subscriber with 2 batches in its queue gets no wake item after a pause, and the queue still holds the same 2 batches.
- With a wake item in the queue, 2 new batches leave only the 2 batches in the queue, and their sequence numbers are 1 apart.

### V2. The stream sends the settings packet

The tests run the app in Uvicorn on a free local port with `admin_token="test-token"`.

- The first event of a new connection has `event` equal to `update`, has no `id`, and its data is the default packet. The second event is a batch with an `id` and no `event`.
- After `PATCH /admin/settings` with `{"samples_per_second": 20}`, the stream sends an update event with `samples_per_second` 20 and `paused` false within 1 s.
- After `POST /admin/pause`, the stream sends an update event with `paused` true within 1 s. After `POST /admin/resume`, the stream sends an update event with `paused` false within 1 s.
- A client that connects during a pause gets an update event with `paused` true as its first event.
- Across a `PATCH /admin/settings` with `{"max_value": 3}`, the batch ids before and after the update event go up by 1 with no gap.
- Two clients each get an update event with `max_value` 3 after one `PATCH /admin/settings` with `{"max_value": 3}`.
- With `SAMPLES_PER_SECOND=1` and `fastapi.routing._PING_INTERVAL` patched to 0.1 s, the first event is the settings packet and the next one is the comment `: ping`.
- The other stream tests from feature 2 and feature 6 pass with the same cases, and they skip the update events.

### V3. The missed batch counter counts the gaps

- The ids 0, 1, and 2 give a count of 0.
- A first id of 5 gives a count of 0.
- The ids 5, 6, and 9 give a count of 2.
- The ids 5, 9, and 12 give a count of 5.
- The ids 5 and 5 give a count of 0.
- After the ids 5 and 9, a reset gives a count of 0. A next id of 10 keeps the count at 0, and a next id of 12 gives a count of 1.
- The ids 5, 9, and 3 give a count of 0. A next id of 4 keeps the count at 0, and a next id of 6 gives a count of 1.

### V4. The server source reads the settings packet and the batch ids

These tests use a fake EventSource, fake timers, and a random value of 1.

- At start, the settings are unset and the missed batch count is 0.
- After an open event and an update event with the default packet, the settings are 5,000 samples per second, a 50 ms interval, and a maximum value of 1,024, and the state is live.
- A second update event with `samples_per_second` 20 and `batch_interval_ms` 1000 changes the settings to those values.
- After an update event with `paused` true, the state is paused. After 60 s with no message, the state is still paused, the EventSource is not closed, and no new EventSource exists.
- While paused, with N = 4, the message "[17,8]" gives cells <0,0> and <1,3> a count of 1 each. After 5 s more, the state is still paused.
- After an update event with `paused` true and then one with `paused` false, the state is live. After 5 s with no message, the state is reconnecting.
- After an error event while paused, the state is reconnecting, and a new EventSource opens at 1,000 ms. After an open event and an update event with `paused` true on the new EventSource, the state is paused.
- Messages with the ids 0, 1, and 4 give a missed batch count of 2.
- After those messages, an error event, a new EventSource, an open event, and a message with the id 10 give a missed batch count of 7.
- After that, a message with the id 3 gives a missed batch count of 0.
- With messages at the ids 4 and 5 and an update event between them, the missed batch count does not change.
- After messages with the ids 0, 1, and 4, a change to N gives a missed batch count of 0. A next message with the id 5 keeps the count at 0.

### V5. The badge shows Paused

- For paused, the badge shows "Paused" with the neutral tone class and the `pause` icon.
- The four badge cases from feature 4 still pass.

### V6. The side panel shows the settings and the missed batches

- With no settings, the panel has no Samples per second, Batch interval, or Max value readout.
- With the settings 5,000, 50, and 1,024, the Samples per second readout shows "5,000", the Batch interval readout shows "50 ms", and the Max value readout shows "1,024".
- After a change to the settings 100,000, 1,000, and 10,000, the three readouts show "100,000", "1,000 ms", and "10,000".
- With a missed batch count of 0, the Missed batches readout shows "0". With a count of 1,234, it shows "1,234".
- With no missed batch count, the panel has no Missed batches readout.
- The readouts below Frame rate are in the order Missed batches, Samples per second, Batch interval, and Max value.

### V7. The test source shows its settings

- With `?source=frontend&rate=1000000&interval=100&max=64`, the settings are 1,000,000 samples per second, a 100 ms interval, and a maximum value of 64 after the test source starts.
- After the test source starts, the missed batch count is unset.

### V8. Linters pass

- ruff, mypy, ESLint, and Prettier pass. The expected result is exit code 0.

### V9. The production build passes

- The build exits with code 0.

## Manual checks

The local server runs in Docker for every local check. `make docker` builds the backend image and runs it at http://localhost:8000, and it needs Docker Desktop. The local token is `local-admin-token`. The checks use Chrome.

### M1. The panel shows the settings and follows a change

1. Start Docker Desktop. Run `make docker` in one terminal and `make frontend` in a second terminal. Open http://localhost:4200/?server=http://localhost:8000.
2. The expected result is a Live badge. The Missed batches readout shows 0. The three settings readouts show 5,000 samples per second, a 50 ms batch interval, and a max value of 1,024. The whole panel fits in the window with no clipped readout.
3. Run `curl -X PATCH localhost:8000/admin/settings -H "Authorization: Bearer local-admin-token" -H "Content-Type: application/json" -d '{"samples_per_second": 20, "batch_interval_ms": 1000}'`.
4. The expected result is that the readouts show 20 and 1,000 ms within 1 s, with no reload. The badge stays Live.

### M2. The badge shows Paused, and the stream stays open

1. With M1 running, open the DevTools network panel. Run `curl -X POST localhost:8000/admin/pause -H "Authorization: Bearer local-admin-token"`.
2. The expected result is a white Paused badge with a pause icon within 1 s. The icon does not show as a word or a blank box. The grid and the readouts keep their values.
3. Wait 30 seconds. The expected result is that the badge still shows Paused, and the network panel shows no new `stream` request.
4. Run `curl -X POST localhost:8000/admin/resume -H "Authorization: Bearer local-admin-token"`.
5. The expected result is a Live badge within 1 s. The samples received readout goes up from the value it held, and the Missed batches readout does not change.

### M3. A client that connects during a pause shows Paused

1. With M1 running, pause the server with the command from M2 step 1, and reload the page.
2. The expected result is a Paused badge within 2 s, an empty grid, and settings readouts with the current settings.
3. Resume the server with the command from M2 step 4. The expected result is a Live badge and a filling grid.

### M4. The client counts the batches it missed during a drop

1. With M1 running, set the settings back with a PATCH to `{"samples_per_second": 5000, "batch_interval_ms": 50}`.
2. In the DevTools network panel, set the throttling to Offline and wait 10 seconds. The expected result is a Reconnecting badge.
3. Set the throttling to No throttling. The expected result is a Live badge within 30 s, and a Missed batches readout that went up by about 20 for each second offline.
4. If the Offline setting does not cut the open stream, do the same check with the cloud server and turn the Wi-Fi off for 10 seconds.

### M5. A server restart resets the missed batches

1. With a Missed batches readout above 0 from M4, press Ctrl+C in the `make docker` terminal, wait 10 seconds, and run `make docker` again.
2. The expected result is a Reconnecting badge and then a Live badge. The Missed batches readout shows 0, the counts keep their values, and the settings readouts show the default settings.

### M6. The test source shows its own settings

1. Open http://localhost:4200/?source=frontend&rate=1000000.
2. The expected result is a Test source badge. The settings readouts show 1,000,000 samples per second, a 50 ms batch interval, and a max value of 1,024. The panel has no Missed batches readout.

### M7. The cloud server sends the settings packet

1. Run `make deploy`, and open http://localhost:4200 with no query.
2. The expected result is a Live badge and settings readouts with the default settings.
3. Run `curl -N https://api.precision.jgangjee.com/stream | head -c 300`. The expected result is that the first event has the lines `event: update` and `data:` with the four fields, and has no `id:` line.
4. Read the token into `TOKEN` with the AWS CLI commands in the Deploy section of the README. Run `curl -X POST https://api.precision.jgangjee.com/admin/pause -H "Authorization: Bearer $TOKEN"`. The expected result is a Paused badge within 1 s.
5. Run `curl -X POST https://api.precision.jgangjee.com/admin/resume -H "Authorization: Bearer $TOKEN"`. The expected result is a Live badge within 1 s.

### M8. The client follows a settings change on the cloud server

1. With M7 running and `TOKEN` set, keep http://localhost:4200 open with no query. The readouts show 5,000 samples per second, a 50 ms batch interval, and a max value of 1,024.
2. Run `curl -X PATCH https://api.precision.jgangjee.com/admin/settings -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"samples_per_second": 20, "batch_interval_ms": 1000, "max_value": 64}'`.
3. The expected result is that the readouts show 20, 1,000 ms, and 64 within 1 s, with no reload. The badge stays Live, and the samples received readout goes up by 20 each second.
4. Run the same command with the body `{"samples_per_second": 5000, "batch_interval_ms": 50, "max_value": 1024}`.
5. The expected result is that the readouts show 5,000, 50 ms, and 1,024 within 1 s, with no reload. The badge stays Live.

### M9. The README and the logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the settings display feature.
3. Open README.md.
4. The expected result is that it describes the settings packet, the Paused badge, the Missed batches readout, and the three settings readouts. The note that the client has no Paused state is gone.
