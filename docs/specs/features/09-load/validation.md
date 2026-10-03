# Feature 9 validation: Load

The project documents have no worked example for this feature. The cases follow the answers to G1 to G15 in requirements.md. The feature adds no test file, so each automated check is a command.

## Automated checks

V1 to V3 run the new targets. V3 points them at the local server, so it needs `make backend` in another terminal. The command for V4 is `make test`, and the command for V5 is `make lint`.

### V1. A target with no token stops and sends no request

The commands are `env -u CLOUD_ADMIN_TOKEN make cloud-pause`, `env -u CLOUD_ADMIN_TOKEN make cloud-resume`, and `env -u CLOUD_ADMIN_TOKEN make cloud-setting-update SAMPLES_PER_SECOND=100000`.

- Each command exits with a code that is not 0.
- Each output names `CLOUD_ADMIN_TOKEN` and has no reply from a server.

### V2. The update target with no value stops and sends no request

The command is `env -u SAMPLES_PER_SECOND -u BATCH_INTERVAL_MS -u MAX_VALUE CLOUD_ADMIN_TOKEN=x make cloud-setting-update`.

- The command exits with a code that is not 0.
- The output names the three variables and has no reply from a server.

### V3. The targets send the right requests

Each command below starts with `CLOUD_ADMIN_TOKEN=local-admin-token` and ends with `CLOUD_SERVER=http://localhost:8000`. The cases run in this order.

- `make cloud-pause` exits with 0, and the reply has `"paused":true`.
- `make cloud-resume` exits with 0, and the reply has `"paused":false`.
- `make cloud-setting-update SAMPLES_PER_SECOND=100000` exits with 0. The reply has 100000 samples per second, a batch interval of 50, and a max value of 10000.
- `make cloud-setting-update BATCH_INTERVAL_MS=200 MAX_VALUE=5000` exits with 0. The reply has 100000, 200, and 5000.
- `make cloud-setting-update SAMPLES_PER_SECOND=20000 BATCH_INTERVAL_MS=50 MAX_VALUE=10000` exits with 0. The reply has 20000, 50, and 10000.
- `make cloud-setting-update SAMPLES_PER_SECOND=2000000` exits with a code that is not 0, and the output shows the reply of the server. A `GET /admin/settings` then still gives 20000.
- `make cloud-setting-update BATCH_INTERVAL_MS=25` exits with a code that is not 0. A `GET /admin/settings` then still gives 50.
- `make cloud-pause` with the token `wrong` exits with a code that is not 0. A `GET /admin/settings` then gives `"paused":false`.
- No output of these commands holds the text `local-admin-token`.

### V4. The tests still pass

- `make test` exits with code 0.

### V5. Linters pass

- `make lint` exits with code 0.

### V6. The feature changes no application code

The command is `git diff --name-only main -- backend frontend infra`.

- The command prints nothing.

## Load test method

The manual checks M2 and M3 use this method. I run them in the validate session.

### Setup

1. Run the two AWS CLI commands in the README section Deploy, so `CLOUD_ADMIN_TOKEN` is set in the terminal.
2. Run `make frontend`. Open http://localhost:4200 with no query in Chrome with Energy Saver off. Keep N at 32, and keep the tab in front for every run.
3. Open the DevTools console and paste the snippet below. Paste it again after each reload.

```js
async function run() {
  const start = new Date().toISOString();
  let hidden = document.hidden;
  const onChange = () => (hidden = true);
  document.addEventListener('visibilitychange', onChange);
  latency.reset();
  let lowFps = Infinity;
  let frames = 0;
  let windowStart = null;
  let end = 0;
  await new Promise((done) => {
    const tick = (now) => {
      if (windowStart === null) {
        windowStart = now;
        end = now + 30000;
      } else if (now - windowStart >= 1000) {
        lowFps = Math.min(lowFps, Math.round((frames * 1000) / (now - windowStart)));
        windowStart = now;
        frames = 0;
      }
      frames++;
      if (now < end) requestAnimationFrame(tick);
      else done();
    };
    requestAnimationFrame(tick);
  });
  document.removeEventListener('visibilitychange', onChange);
  const report = latency.report();
  return {
    start,
    p99: report.rows.total.p99,
    lowFps,
    batches: report.batches,
    roundTrip: report.roundTripMs,
    hidden,
  };
}

async function step() {
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push(await run());
  console.table(runs);
  return runs;
}
```

### One step

1. Set the server with `make cloud-setting-update`, and set the number of curl clients for the step.
2. Wait until the side panel shows the new settings and the badge shows Live.
3. Run `copy(await step())` in the console. It takes about 90 seconds and prints a table with one row for each run.
4. Paste the copied JSON into the session, with the name of the step.

### After each part

1. Wait 2 minutes, because CloudWatch shows a value about 2 minutes late.
2. Run `make cloud-cpu` and paste the table into the session. The `start` time of each run matches the run with a row of the table.

### Rules

- A run passes when `p99` is a number of at most 100 and `lowFps` is at least 54.
- A step passes when all 3 runs pass.
- A run does not count when `hidden` is true, or when the setup had another obvious error. I repeat that run with `copy(await run())`, and I tell the session which run it replaces.
- The expected number of batches in a run is 30 s divided by the batch interval, which is 600 at 50 ms. The pass rule does not use the number, and docs/results.md records it.
- A part ends at its first step that fails, or at its last step.

### Extra clients

This command starts 4 curl clients, which is the step of 5 clients in total. Change the 4 for each step.

```sh
for i in $(seq 1 4); do curl -sN https://api.precision.jgangjee.com/stream > /dev/null & done
```

This command counts the curl clients, and the next one stops them all.

```sh
pgrep -f "curl -sN https://api.precision" | wc -l
pkill -f "curl -sN https://api.precision"
```

## Manual checks

### M1. The four targets work on the cloud server

1. Do the setup. Run `make cloud-pause`.
2. The expected result is a reply with `"paused":true`, and a Paused badge in the client within a second.
3. Run `make cloud-resume`.
4. The expected result is a reply with `"paused":false`, and a Live badge.
5. Run `make cloud-setting-update SAMPLES_PER_SECOND=100000`.
6. The expected result is a reply with 100000, and a Samples per second readout of 100,000.
7. Run `make cloud-setting-update SAMPLES_PER_SECOND=20000`. The expected result is a readout of 20,000.
8. Run `make cloud-cpu` with the AWS profile and the region of the deploy.
9. The expected result is a table with about 28 rows, one for each minute. Each row has a time, an average, and a maximum in percent. `make cloud-cpu MINUTES=5` gives about 3 rows.

### M2. The first part gives the highest samples per second that passes

The part uses one client, a batch interval of 50 ms, and a max value of 10,000.

1. Do one step at 20,000 samples per second, which is the baseline. Then do one step at 250,000, one at 500,000, and one at 1,000,000. Stop after the first step that fails.
2. The expected result is 3 runs for each step that ran, and each run has a `p99`, a `lowFps`, and a number of batches. The check passes when the results exist and the part stopped by the rule. docs/results.md records which steps pass.
3. Run `make cloud-setting-update SAMPLES_PER_SECOND=20000`. The expected result is a Samples per second readout of 20,000.

When the step at 20,000 fails, the test stops, and I tell the session.

### M3. The second part gives the highest number of clients that passes

The part uses 20,000 samples per second, a batch interval of 50 ms, and a max value of 10,000. The step with 1 client is the first step of M2.

1. Do one step for each of 2, 5, 10, 20, 50, and 100 clients in total. The number of curl clients is 1, 4, 9, 19, 49, and 99. Stop the curl clients before each step, and start the new number. Stop after the first step that fails.
2. After each step, count the curl clients. The expected result is the number that the step started. A lower number means that a curl client lost its stream, and I tell the session.
3. The expected result is 3 runs for each step that ran. The check passes when the results exist and the part stopped by the rule.
4. Stop the curl clients.

### M4. The cloud server is at its defaults, and it is paused or destroyed

This check is the last step of the load test, so the server does not cost more than it must when I leave it overnight.

1. Run `make cloud-setting-update SAMPLES_PER_SECOND=20000 BATCH_INTERVAL_MS=50 MAX_VALUE=10000`, and count the curl clients.
2. The expected result is a reply with 20000, 50, and 10000, and a count of 0.
3. Choose one of the two endings, and tell the session which one.
   - Run `make cloud-pause`. The expected result is a reply with `"paused":true` and a Paused badge. The server then sends no data, so an open client costs no data transfer. The stack still runs and costs about $1.15 a day. A restart of the task ends the pause. Run `make cloud-resume` before a reviewer uses the server.
   - Run `make destroy`. The expected result is that `curl https://api.precision.jgangjee.com/health` fails. The stack then costs nothing. Run `make deploy` before a reviewer uses the server, and read the new admin token.
4. Close the client tab.

### M5. docs/results.md gives the limits

1. Open docs/results.md.
2. The expected result is a section "Feature 9, Load" after the feature 8 section, and the feature 8 section is as it was.
3. The section gives the run conditions and one table for each part. Each table row gives the step, the `p99`, the `lowFps`, and the number of batches of each run, and whether the step passes. Each table also gives the average and the maximum CPU of the minutes of each step, from the CPU table of the part. The numbers match the results from M2 and M3.
4. The section gives the highest samples per second and the highest number of clients that pass, and the largest batch that passes in integers and in bytes. It names no new default, because I decide on the default after the test.
5. The section says that every client shared one home link, that the extra clients were curl processes, and that a batch that does not arrive gives no latency sample.

### M6. The README and the logs record this feature

1. Open README.md.
2. The expected result is that the Makefile targets section has the four targets, the Deploy section exports `CLOUD_ADMIN_TOKEN`, and a Load test section names the two parts, the pass rule, and docs/results.md.
3. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
4. The expected result is that docs/trade-offs.md and docs/ai-changes.md each have a section for feature 9. docs/assumptions.md has one when the feature made an assumption.

## Results, 2026-10-02

Every check passes except M4, which fails on one point.

- V1 passes. Each of the three commands exits with 2, names `CLOUD_ADMIN_TOKEN`, and prints no reply from a server.
- V2 passes. The command exits with 2 and names the three variables.
- V3 passes. The AI ran `make backend` and the eight cases in order. The first five exit with 0 and give the expected replies. The two bad values get status 422, the wrong token gets status 401, and the settings stay at 20000, 50, and not paused. No output holds `local-admin-token`.
- V4 passes. `make test` exits with 0. The backend runs 101 tests with 100 percent coverage, the frontend runs 169 tests in 24 files, and infra runs 7 tests, and all of them pass.
- V5 passes. `make lint` exits with 0.
- V6 passes. The command prints nothing.
- M1 passes. The user ran the four targets on the cloud server.
- M2 passes. The steps at 20,000, 250,000, 500,000, and 1,000,000 each have 3 runs, and every run passes. The part ended at its last step. The highest p99 is 55.496 ms at 1,000,000, and the lowest frame rate is 60 in every run. After the part, the server was at 100 samples per second, and the user set 20,000 before M3.
- M3 passes with a change of the steps. The user ran the step at 5 clients and then went straight to 100 clients, and both steps pass. The steps at 2, 10, 20, and 50 did not run. The count of curl clients was 4 after the first step and 99 after the second, which is the number that each step started.
- M4 fails on one point. The server is paused, and the count of curl clients is 0. The settings packet of the stream still gives 100 samples per second, and the check expects 20,000. `make cloud-setting-update SAMPLES_PER_SECOND=20000` fixes it, and it works during a pause.
- M5 passes. The AI wrote the section "Feature 9, Load" into docs/results.md in this session from the results that the user pasted, and the feature 8 section has no changed line.
- M6 passes. The README has the four targets, the export of `CLOUD_ADMIN_TOKEN`, and a Load test section with the two parts. The three logs have sections for feature 9.

Each item in requirements.md has at least one passing check, except R10 and one half of R11. R1 has M2, M3, and M5. R2 has M2 and M3. R3 has M1, M2, and M3. R4 has V1, V2, V3, and M1. R5 has M2 and M3. R6 has M2 and M3. R7 has M2, with the steps from G12. R8 has M3. R11 has M5 for the limits. R12 has M6. R10 and the new default in R11 have no check, because G8 leaves the default to the replan.

The run differs from the method in these ways.

- The user removed the third part, on the batch interval, before it ran. G15 in requirements.md gives the reason. The file had a manual check M4 for that part, and the later checks moved up by one number.
- The runs have no `start` value, because the snippet that ran did not return one. The AI recorded the time of each paste and matched the steps with the CPU rows by that time.
- The first result that the user pasted came from a server at a batch interval of 100 ms, with 300 batches in each run. It does not count. The step at 20,000 ran again at 50 ms.
- The CPU table that the user pasted after M2 had no rows for the step at 20,000. The AI ran `make cloud-cpu MINUTES=50` after M3 and took the rows for both parts from that table.
- The branch changes docs/specs/roadmap.md, which plan.md does not name. The user asked for the roadmap to follow the removal of the third part.

