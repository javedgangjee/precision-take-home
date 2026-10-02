# Bin There Done That

This repo is my take-home project for the Precision Neuroscience full-stack role. A cloud server streams nonnegative integers to a web client. The client bins each number into an N by N grid and paints each cell on a blue-to-red heat map in real time.

The project is in progress. The scaffold, the backend stream, the heat map client, the client connection to the server, the cloud deploy, the admin API, the settings display, the latency measurement, and the Makefile targets for the load test are in place. specs/roadmap.md shows the status of each feature.

## Repo layout

- The backend/ folder holds the FastAPI server. It is a uv project.
- The frontend/ folder holds the Angular client.
- The infra/ folder holds the AWS CDK app in Python. It is a separate uv project.
- The Makefile at the root runs the common tasks.

## Prerequisites

Install these tools before you start. The versions are the ones I use.

- You need uv 0.11.24. uv installs Python 3.13.15 for you if it is missing.
- You need Node.js 22.22.1 and npm 11.20.0.
- You need the AWS CDK CLI 2.1143.0 for `make synth`. Install it with `npm install -g aws-cdk@2.1143.0`.
- You need AWS CLI 2.37.4 with credentials for `make deploy`, `make destroy`, and `make cloud-cpu`. The AWS account must be bootstrapped for CDK in the region of your AWS profile. The Deploy section gives the command.
- You need GNU Make 3.81 or later. macOS ships with 3.81.
- You need Docker Desktop 4.92.0 with Docker 29.8.0 for `make docker-build`, `make docker`, and `make deploy`.
- The client loads its icons from Google Fonts, so the browser needs the network.

## Install

Run `make install` from the repo root. It installs the backend, frontend, and infra dependencies from their lock files.

## Makefile targets

- `make backend` runs the server at http://localhost:8000 with reload on file changes. It sets the admin token to `local-admin-token`. It stops within 3 seconds of Ctrl+C, even with open streams. The health check is at http://localhost:8000/health.
- `make frontend` runs the client at http://localhost:4200.
- `make dev` runs the backend and the frontend together. Press Ctrl+C once to stop both. It prints the URL that points the client at the local server.
- `make docker-build` builds the backend image for linux/arm64 with the tag `precision-backend`.
- `make docker` builds the image and runs it at http://localhost:8000, the same port as `make backend`. It prints the URL that points the client at the local server. It passes `SAMPLES_PER_SECOND`, `BATCH_INTERVAL_MS`, `MAX_VALUE`, and `CORS_ORIGINS` into the container when they are set in the shell. It sets the admin token to `local-admin-token`. Press Ctrl+C to stop the container, which stops within 3 seconds.
- `make test` runs the backend, frontend, and infra tests. It reports coverage for the backend and the frontend. The goal is 100 percent, and no minimum is enforced.
- `make test-infra` runs only the infra tests. They synthesize the stack and check the key settings.
- `make lint` runs ruff and mypy on backend/ and infra/, and ESLint and Prettier on frontend/.
- `make synth` synthesizes the CDK app into infra/cdk.out/. It needs no AWS credentials.
- `make deploy` builds the backend image and deploys the CDK stack to AWS. The Deploy section has the details.
- `make destroy` removes the CDK stack from AWS.
- `make cloud-pause` pauses the stream of the cloud server, and `make cloud-resume` resumes it. Both call the admin API with curl, and they read the admin token from `CLOUD_ADMIN_TOKEN` in the shell. The Deploy section shows how to set it.
- `make cloud-setting-update` changes the settings of the cloud server. It sends each of `SAMPLES_PER_SECOND`, `BATCH_INTERVAL_MS`, and `MAX_VALUE` that is set, such as `make cloud-setting-update SAMPLES_PER_SECOND=100000`. It reads the same token.
- These three targets print the reply of the server, and they fail when the status is not 200. They send no request when the token is not set. `CLOUD_SERVER` changes the server address, so `CLOUD_SERVER=http://localhost:8000` with the token `local-admin-token` calls the local server.
- `make cloud-cpu` prints the CPU use of the cloud service from CloudWatch, with one row for each minute of the last 30 minutes. Each row has the time in UTC, the average, and the maximum in percent of the 0.25 vCPU of the task. `MINUTES` changes the 30. It needs AWS credentials and no admin token.

## Backend stream

`GET /stream` sends the stream as Server-Sent Events. Each event holds one batch as a compact JSON array of random integers in its `data` field, with no spaces. The server generates one shared stream, so every client gets the same batches. When the server sends nothing for 15 seconds, it sends the comment `: ping`.

The `id` field of a batch holds four whole numbers with a colon between them, in the form `<sequence number>:<started>:<encoded>:<sent>`.

```
data: [794,29,619,38]
id: 1234:1790812800123456:1790812800123541:1790812800123702
```

- The sequence number starts at 0 when the server starts and goes up by 1 for each batch. A gap in the sequence numbers shows that the client missed batches.
- The three times are server timestamps in microseconds since the Unix epoch. The Latency section tells what each one means.
- Every client gets the same `started` and `encoded` times for a batch. Each client has its own `sent` time.
- The times are not in the data, so the data stays a JSON array of integers.

The stream has one more event type, which is the settings packet. It has the line `event: update`, and its `data` field holds the three stream settings and the pause state as one compact JSON object.

```
event: update
data: {"samples_per_second":20000,"batch_interval_ms":50,"max_value":10000,"paused":false}
```

- The settings packet is the first event on each connection.
- The server sends it again to every client after each `PATCH /admin/settings` that returns status 200, and after a pause or a resume that changes the pause state.
- The settings packet is not a batch. It has no `id` line, and the batch sequence number does not advance when the server sends one.
- The server keeps one current packet and does not put it in the client queue, so the queue that drops the oldest batch for a slow client never drops a settings packet. When two changes happen before a client reads the first one, the client gets one packet with the newest values.
- Batches that the server made before a change can still arrive after the packet.

Run `make backend`, and then run this command in another terminal to see the stream.

```sh
curl -N localhost:8000/stream | head -c 300
```

`GET /time` returns the server time in microseconds since the Unix epoch, such as `{"epoch_us":1790812800123456}`. The client uses it to compare its clock with the server clock. The response has the header `Cache-Control: no-store`, and the request needs no token.

The server reads these environment variables at start. When a value is out of range or not a number, the server logs a warning and uses the default.

| Variable | Default | Range | Meaning |
| --- | --- | --- | --- |
| `SAMPLES_PER_SECOND` | 20000 | 1 to 1000000 | This sets how many integers the server makes each second. |
| `BATCH_INTERVAL_MS` | 50 | 50 to 1000 | This sets the time between batches in milliseconds. |
| `MAX_VALUE` | 10000 | 1 to 10000 | Each integer is from 0 to this value minus 1. |
| `CORS_ORIGINS` | `http://localhost:4200` | It takes a comma-separated list. The server strips a trailing slash from each origin. | These origins can call the server from a browser. |
| `ADMIN_TOKEN` | It has no default. | It takes any string. | This is the token for the admin API. With no token, the server has no admin API. |

For example, `SAMPLES_PER_SECOND=20 BATCH_INTERVAL_MS=1000 make backend` sends one batch of 20 integers each second. The same variables work with `make docker`.

## Admin API

The admin API changes the stream settings and pauses the stream while the server runs, so a test of a new rate needs no restart. Every client gets the change at once, because the server keeps one shared stream. The server also sends each client a settings packet with the new state, as the Backend stream section describes. The changes live in memory only. A restart or a deploy sets the settings back to the environment values and ends the pause.

Each admin request must send the header `Authorization: Bearer <token>`. A request with a missing or wrong token gets status 401. When `ADMIN_TOKEN` is not set, every admin path returns status 404. The local token from `make backend`, `make dev`, and `make docker` is `local-admin-token`. The Deploy section shows how to read the cloud token.

| Request | Body | Effect |
| --- | --- | --- |
| `GET /admin/settings` | It takes no body. | This returns the settings and the pause state. |
| `PATCH /admin/settings` | It takes a JSON object with any of `samples_per_second`, `batch_interval_ms`, and `max_value`. | This changes the settings from the next batch. |
| `POST /admin/pause` | It takes no body. | This stops the batches. |
| `POST /admin/resume` | It takes no body. | This starts the batches again. |

Each request returns the settings and the pause state as one JSON object, such as `{"samples_per_second": 20000, "batch_interval_ms": 50, "max_value": 10000, "paused": false}`.

- A PATCH value must be an integer in the range in the Backend stream table. A value out of range, a value that is not an integer, or an unknown field gets status 422, and no setting changes. The PATCH cannot change `CORS_ORIGINS`.
- A change to the batch interval starts the schedule again from the time of the change, so the server sends no burst of batches. The batch sequence number keeps going up.
- While paused, the server sends no batches, and the batch sequence number does not advance. The `: ping` heartbeat keeps each connection open. A resume starts the schedule again and does not send the batches that the pause skipped. A settings change during a pause applies when the stream resumes.
- A pause while paused and a resume while running return status 200 and change nothing.
- The server logs each change.

Run `make backend`, and then run these commands in another terminal.

```sh
TOKEN=local-admin-token
curl localhost:8000/admin/settings -H "Authorization: Bearer $TOKEN"
curl -X PATCH localhost:8000/admin/settings -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"samples_per_second": 20, "batch_interval_ms": 1000}'
curl -X POST localhost:8000/admin/pause -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:8000/admin/resume -H "Authorization: Bearer $TOKEN"
```

## Client

Run `make frontend` and open http://localhost:4200. The page shows the heat map, a color scale, and a side panel. The client reads the stream from the cloud server at https://api.precision.jgangjee.com and applies each batch to the counts.

To use the local server, run `make dev` or `make docker`, and open http://localhost:4200/?server=http://localhost:8000. With `make docker`, also run `make frontend` in another terminal.

The client reads these settings from the URL query. When a value is bad, the client logs a warning to the console and uses the default.

| Setting | Default | Meaning |
| --- | --- | --- |
| `source` | `server` | The value `server` reads the stream from the server. The value `frontend` runs the test source in the browser instead. Only one source runs at a time. |
| `server` | `https://api.precision.jgangjee.com` | This is the server address, which must be an http or https URL. The client strips a trailing slash and connects to the address plus `/stream`. |

For example, http://localhost:4200/?server=http://localhost:8000 connects to the local server.

- The grid has N by N cells, and N is 32 at start. Row 0 is at the bottom, and column 0 is at the left. Row numbers run up the left side and column numbers run along the bottom. When N is above 16, every 2nd row and column has a label, and when N is above 32, every 4th one has a label.
- Each value v goes to cell index (v - 1) mod N². The row is the index divided by N, and the column is the index mod N. On a 4 by 4 grid, 17 goes to cell <0,0>, 8 goes to cell <1,3>, and 0 goes to cell <3,3>.
- A cell with no hits is white. A cell with hits gets a color from blue (#1E00FF) at a count of 1 through cyan, green, and yellow to red (#FF0033) at the max count.
- The color scale shows the max count at the top, the midpoint in the middle, and 1 at the bottom.
- The minus and plus buttons change N from 1 to 100. The up and down arrow keys in the N field change N by 1, and by 10 with Shift. A change to N resets all counts to zero.
- A badge at the top of the side panel shows the stream state. Connecting is a white badge, and it shows from the start until the stream opens. Live is a green badge, and it shows while batches arrive. Reconnecting is an amber badge, and it shows after a live stream drops until the stream opens again. Paused is a white badge with a pause icon, and it shows while the server is paused. Test source is a white badge with no icon, and it shows while the test source runs.
- The side panel shows the samples received, the max count, and the frame rate. A red line shows below the frame rate when it falls below 90 percent of the target of 60 fps. Run the client in Chrome with Energy Saver off, because Energy Saver caps the frame rate at 30 fps.
- The Missed batches readout shows how many batches the client did not get. The client reads the sequence number from the id of each batch, and a number that skips ahead adds the size of the gap to the count. The count starts at 0 when the page loads, and it spans a reconnect. A change to N sets it to 0. A sequence number lower than the last one means that the server restarted, and it also sets the count to 0.
- The Samples per second, Batch interval, and Max value readouts show the settings of the stream. The client reads them from the settings packet, so they change within a second of an admin change, with no reload. They do not show until the first settings packet arrives.
- In a short window the side panel scrolls.

### Reconnect

When the stream drops, the client closes it and tries again after a delay. The first delay is 1 second, and each failed attempt doubles it up to 30 seconds. A random factor from 0.5 to 1 spreads out the clients after a server restart. The delay goes back to 1 second after the stream opens. The browser hides the `: ping` heartbeat from the client, so the client also counts a live stream as dropped when no batch arrives for 5 seconds. The counts stay on screen during a reconnect. Only a change to N resets them. Batches that the server sends during the drop are lost, and the Missed batches readout counts them.

One limit stays in the missed batch count. After a server restart, the count gets a false gap when the first new sequence number is higher than the last one the client saw. This needs a server that ran for less time than the client took to reconnect.

### Pause

When a settings packet says that the server is paused, the client shows Paused, keeps the stream open, and stops the 5 second check, because the server sends no batches during a pause. The grid and the readouts keep their values. A settings packet with the pause off sets the state to Live and starts the check again. The badge shows Live when the stream opens, so a client that connects during a pause shows Live for a moment before it shows Paused. When the stream drops during a pause, the client shows Reconnecting and tries again with the same delays.

### Latency

The client measures the time of each batch from generation to render. The measurement has eight timestamps. The server takes the first three on its clock and sends them in the batch id. The client takes the other five on its clock.

- `started` is the time just before the server makes the values of the batch.
- `encoded` is the time when the JSON text exists and the batch goes into the client queues.
- `sent` is the time when the stream route takes the batch from the queue of that client and hands the event to the web server.
- `received` is the time when the message handler of the client starts.
- `parsed` is the time when the client has the array of integers.
- `applied` is the time when the counts hold the batch.
- `frame` is the time when the animation frame callback that draws the batch starts.
- `drawn` is the time when the canvas draw call returns.

Each stage runs from one timestamp to the next. The seven stages are generate, queue, network, parse, apply, frame wait, and draw, in that order. The total runs from `started` to `drawn`. The network stage holds the write by Uvicorn, the load balancer, the network, and the browser. The measurement stops at `drawn`, so it does not hold the time from the draw call to the light on the display.

The network stage and the total cross the two clocks, so the client measures the difference between them. It makes 5 requests to `GET /time`, one after the other, and keeps the offset from the request with the shortest round trip. The error of the offset is at most half of that round trip. The client measures the offset when the page loads and on each `latency.reset()`, and it sends no time requests in the background. The two clocks can drift by 1 to 3 ms each minute, so start each run with a reset.

To read the latency, open the Chrome DevTools console and keep the tab in front, because a hidden tab draws no frames.

1. Run `latency.reset()`. It drops the samples and measures the clock offset again.
2. Wait 60 seconds.
3. Run `latency.report()`. It prints a table with one row for each stage and one row for the total. The columns are the p50, the p95, the p99, and the max in milliseconds.

The report also returns the same values as an object, with the number of batches, the clock offset, and the round trip. Run `copy(latency.report())` to put them on the clipboard as JSON. The client keeps the last 1,200 batches, which is 60 seconds at the default settings. The side panel does not show the latency. The test source has no server times, so `latency` does not exist with `source=frontend`.

The docs/results.md file gives the measured times and compares the p99 of the total with the 100 ms target.

### Test source

With `source=frontend` in the URL query, a test source in a Web Worker makes the data in the browser in place of the server. It makes uniform random integers as the server does, and it posts each batch as a JSON string. It has the same queue of 2 batches as the server. When the main thread falls behind, the worker drops the oldest waiting batch. The client reads the settings from the URL query. When a value is out of range or not a whole number, the client logs a warning to the console and uses the default.

| Setting | Default | Range | Meaning |
| --- | --- | --- | --- |
| `rate` | 20000 | 1 to 100000000 | This sets how many integers the source makes each second. The range goes past the server limit, so a stress test can push the browser. |
| `interval` | 50 | 50 to 1000 | This sets the time between batches in milliseconds. |
| `max` | 10000 | 1 to 10000 | Each integer is from 0 to this value minus 1. |

The three settings readouts in the side panel show the `rate`, `interval`, and `max` values in use. The panel has no Missed batches readout, because the worker messages have no batch id.

A change to the query needs a reload, which also resets the counts. For a stress test, run `make frontend`, open http://localhost:4200/?source=frontend&rate=1000000&interval=50&max=10000, set N to 100, and watch the frame rate.

## Deploy

The backend runs on AWS ECS Fargate at https://api.precision.jgangjee.com. The CDK app in infra/ defines the stack. The stack names no account or region, so a deploy uses the ones in your AWS profile at the time.

The stack makes these resources.

- It imports the Route 53 hosted zone for precision.jgangjee.com by its id. Cloudflare hosts jgangjee.com and delegates that zone to Route 53.
- It makes an ACM certificate for api.precision.jgangjee.com that validates by DNS, and an A record that points the name at the load balancer.
- It makes a VPC with public subnets in 2 availability zones and no NAT gateway.
- It runs one Fargate task with 0.25 vCPU and 512 MiB on ARM64. The task runs the image that backend/Dockerfile builds, the same image as `make docker`.
- It puts an Application Load Balancer in front of the task. The load balancer serves HTTPS on port 443 and redirects port 80 to HTTPS. It checks `GET /health`.
- It sends the container logs to a CloudWatch log group that keeps them for one week.
- It makes a Secrets Manager secret with a random 32-character value, and passes it to the task as `ADMIN_TOKEN`.

The task sets `CORS_ORIGINS` to `http://localhost:4200,http://127.0.0.1:4200`, so the local client can read the cloud stream.

A deploy stops the old task before it starts the new one, so two streams never run at once. The stream is down for about a minute, and the client shows Reconnecting until the new task is live.

To deploy, follow these steps.

1. Run `aws login`, or set up AWS credentials another way.
2. Bootstrap the account for CDK in the region of your profile once. Run `cdk bootstrap` from infra/.
3. Start Docker Desktop. CDK builds the image with Docker and pushes it to the bootstrap ECR repo.
4. Run `make deploy` and approve the security changes in the terminal. The outputs give the service URL, the cluster name, the service name, and the ARN of the admin token secret.

To call the cloud admin API, read the token from the secret. The stack output `AdminTokenSecretArn` names the secret. Run these commands with the same AWS profile as the deploy.

```sh
ARN=$(aws cloudformation describe-stacks --stack-name PrecisionStack \
  --query "Stacks[0].Outputs[?OutputKey=='AdminTokenSecretArn'].OutputValue" --output text)
export CLOUD_ADMIN_TOKEN=$(aws secretsmanager get-secret-value --secret-id "$ARN" --query SecretString --output text)
curl https://api.precision.jgangjee.com/admin/settings -H "Authorization: Bearer $CLOUD_ADMIN_TOKEN"
```

The cloud targets of the Makefile read `CLOUD_ADMIN_TOKEN`, so they work in the same terminal after the export. The values in the third command are the defaults.

```sh
make cloud-pause
make cloud-resume
make cloud-setting-update SAMPLES_PER_SECOND=20000 BATCH_INTERVAL_MS=50 MAX_VALUE=10000
make cloud-cpu
```

Run `make destroy` to remove the stack. The hosted zone stays, because the stack only imports it.

## Load test

The load test measures the limits of the cloud server on the samples per second, the number of clients, and the size of a batch. It runs against the cloud server only. I change the settings between the steps with `make cloud-setting-update`, so the server needs no restart.

The test has three parts, in this order.

1. The first part raises the samples per second through 20,000, 250,000, 500,000, and 1,000,000, with one client and a batch interval of 50 ms.
2. The second part raises the number of clients through 2, 5, 10, 20, 50, and 100, at 20,000 samples per second and a batch interval of 50 ms. One Chrome tab measures, and each other client is a curl process on the laptop that reads the stream and drops the data.
3. The third part raises the batch interval through 100 ms, 500 ms, and 1 s, with one client at 20,000 samples per second. The batches hold 2,000, 10,000, and 20,000 integers.

Each step has 3 runs of 30 seconds. A run passes when the p99 of the total latency from `latency.report()` is at most 100 ms and the frame rate stays at 54 fps or more. A step passes when all 3 runs pass, and a part ends at its first step that fails. After each part, `make cloud-cpu` gives the CPU use of the server, as a clue to what limits a step. The CPU is not part of the pass rule.

The specs/features/09-load/validation.md file gives the method, with the console snippet that times a run and reads its frame rate. The docs/results.md file records the limits.

## Specs and logs

- The specs/ folder holds the mission, the tech stack, the roadmap, and a plan for each feature.
- The docs/assumptions.md file records the assumptions I made.
- The docs/trade-offs.md file records the trade-offs I made.
- The docs/ai-changes.md file records where I changed the AI output, and why.
- The docs/results.md file gives the measured latency for each stage and compares the total with the 100 ms target. The limits from the load test go in the same file.
- The docs/logs/ folder holds my Claude Code session logs, with one folder for each roadmap feature.
- The context/ folder holds the brief, the HTML design, and my design notes.
