# System

This file tells you how to run the system and how each part behaves. The folders in docs/specs/features/ give the full requirements of each feature.

## Setup

Install these tools. The versions are the ones I use.

- **uv 0.11.24** runs the backend and the infra. It installs Python 3.13.15 if it is missing.
- **Node.js 22.22.1** and **npm 11.20.0** run the client.
- **GNU Make 3.81** or later runs the tasks. macOS ships with 3.81.
- **Docker Desktop 4.92.0** is necessary for `make docker` and `make deploy`.
- **AWS CDK CLI 2.1143.0** is necessary for `make synth`, `make deploy`, and `make destroy`. Install it with `npm install -g aws-cdk@2.1143.0`.
- **AWS CLI 2.37.4** with credentials is necessary for `make deploy`, `make destroy`, and `make cloud-cpu`.

Run **`make install`** from the repo root. It installs the backend, frontend, and infra dependencies from their lock files.

## Run

| Command | Effect |
| --- | --- |
| `make frontend` | It starts the client at http://localhost:4200. |
| `make backend` | It starts the local server at http://localhost:8000. |
| `make dev` | It starts the local server and the client together. |
| `make docker` | It builds the backend image and runs it at http://localhost:8000. |

The client reads the stream from the **cloud server** at https://api.precision.jgangjee.com. To use the **local server**, open http://localhost:4200/?server=http://localhost:8000. The browser needs the network, because the client loads its icons from Google Fonts.

## Stream

`GET /stream` sends **Server-Sent Events**. The server makes **one shared stream**, so every client gets the same batches. The server keeps a **queue of 2 batches** for each client and drops the oldest batch when a client is slow. When the server sends nothing for 15 seconds, it sends the comment `: ping`.

The stream has two event types. A **batch event** holds the integers as a compact JSON array in `data`. Its `id` has the form `<sequence number>:<started>:<encoded>:<sent>`.

```
data: [794,29,619,38]
id: 1234:1790812800123456:1790812800123541:1790812800123702
```

- The **sequence number** starts at 0 when the server starts and goes up by 1 for each batch. A gap shows that the client **missed batches**.
- The three times are server timestamps in **microseconds** since the Unix epoch. The Latency section defines them. Each client has its own `sent` time.

A **settings packet** has the line `event: update` and no `id`. Its `data` holds the three stream settings and the pause state.

```
event: update
data: {"samples_per_second":20000,"batch_interval_ms":50,"max_value":10000,"paused":false}
```

- The server sends the packet **first on each connection**. It sends the packet again to every client **after each change** to the settings or the pause state.
- The packet does not go into the client queue, so the server **never drops it**.

**`GET /time`** returns the server time, such as `{"epoch_us":1790812800123456}`. The client uses it to compare its clock with the server clock.

The server reads these **environment variables** at start. When a value is out of range or not a number, the server logs a warning and uses the default.

| Variable | Default | Range | Meaning |
| --- | --- | --- | --- |
| `SAMPLES_PER_SECOND` | 20000 | 1 to 1000000 | This sets how many integers the server makes each second. |
| `BATCH_INTERVAL_MS` | 50 | 50 to 1000 | This sets the time between batches in milliseconds. |
| `MAX_VALUE` | 10000 | 1 to 10000 | Each integer is from 0 to this value minus 1. |
| `CORS_ORIGINS` | `http://localhost:4200` | It takes a comma-separated list. | These origins can call the server from a browser. |
| `ADMIN_TOKEN` | It has no default. | It takes any string. | This is the token for the admin API. |

For example, `SAMPLES_PER_SECOND=20 BATCH_INTERVAL_MS=1000 make backend` sends one batch of 20 integers each second. The same variables work with `make docker`. To see the stream, run `make backend`, and then run this command in another terminal.

```sh
curl -N localhost:8000/stream | head -c 300
```

## Admin API

The admin API changes the stream settings and pauses the stream **while the server runs**. The changes live **in memory only**. A restart or a deploy sets the settings back to the environment values and ends the pause.

Each request must send the header `Authorization: Bearer <token>`. A missing or wrong token gets **status 401**. When `ADMIN_TOKEN` is not set, every admin path returns **status 404**. The local token is **`local-admin-token`**. The Deploy section shows how to read the cloud token.

| Request | Body | Effect |
| --- | --- | --- |
| `GET /admin/settings` | It takes no body. | This returns the settings and the pause state. |
| `PATCH /admin/settings` | It takes a JSON object with any of `samples_per_second`, `batch_interval_ms`, and `max_value`. | This changes the settings from the next batch. |
| `POST /admin/pause` | It takes no body. | This stops the batches. |
| `POST /admin/resume` | It takes no body. | This starts the batches again. |

Each request returns a JSON object with the same fields as the settings packet.

- A PATCH value must be an integer in the range in the Stream table. A bad value or an unknown field gets **status 422**, and no setting changes.
- A change to the **batch interval** starts the schedule again from the time of the change, so the server sends no burst of batches.
- While **paused**, the server sends no batches, and the sequence number does not advance. A resume does not send the batches that the pause skipped.
- A **settings change during a pause** applies when the stream resumes.

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

The page shows the heat map, a color scale, and a side panel.

- The **grid** has N by N cells, and **N is 32** at start. Row 0 is at the bottom, and column 0 is at the left.
- Each value v goes to **cell index (v - 1) mod N²**. The row is the index divided by N, and the column is the index mod N. On a 4 by 4 grid, 17 goes to cell <0,0>, 8 goes to cell <1,3>, and 0 goes to cell <3,3>.
- A cell with no hits is **white**. A cell with hits gets a color from **blue** (#1E00FF) at a count of 1 through cyan, green, and yellow to **red** (#FF0033) at the max count.
- The N field and its minus and plus buttons set **N from 1 to 100**. A change to N **resets all counts** to zero.
- A **badge** shows the stream state, which is Connecting, Live, Reconnecting, Paused, or Test source.
- The **side panel** shows the samples received, the max count, the frame rate, the missed batches, and the three stream settings from the settings packet.
- A **red line** shows below the frame rate when it falls below 90 percent of 60 fps. Use Chrome with **Energy Saver off**, because Energy Saver caps the frame rate at 30 fps.
- The **Missed batches** readout adds the size of each gap in the sequence numbers. A change to N or a server restart sets it to 0.

The client reads these settings from the **URL query**. When a value is bad, the client logs a warning to the console and uses the default. A change to the query **needs a reload**.

| Setting | Default | Meaning |
| --- | --- | --- |
| `source` | `server` | The value `frontend` runs the test source in the browser in place of the server. |
| `server` | `https://api.precision.jgangjee.com` | This is the server address, which must be an http or https URL. |
| `rate` | 20000 | This sets how many integers the test source makes each second, from 1 to 100000000. |
| `interval` | 50 | This sets the time between batches of the test source in milliseconds, from 50 to 1000. |
| `max` | 10000 | Each integer of the test source is from 0 to this value minus 1. The range is 1 to 10000. |

### Reconnect and pause

When the stream drops, the client **tries again after a delay**. The first delay is **1 second**, and each failed attempt doubles it up to **30 seconds**. A random factor from 0.5 to 1 spreads out the clients after a server restart. The client also counts the stream as dropped when **no batch arrives for 5 seconds**. The **counts stay on screen** during a reconnect. Batches that the server sends during the drop are lost, and the Missed batches readout counts them.

When a settings packet says that the server is paused, the client shows **Paused** and keeps the stream open. It stops the 5 second check until the pause ends. The grid and the readouts keep their values.

### Test source

With **`source=frontend`**, a **Web Worker** makes the data in the browser. It makes uniform random integers and has the same queue of 2 batches as the server. The `rate` range goes past the server limit, so a stress test can push the browser. The panel has **no Missed batches readout**, because the worker messages have no batch id.

For a **stress test**, run `make frontend`, open http://localhost:4200/?source=frontend&rate=1000000&interval=50&max=10000, set N to 100, and watch the frame rate.

## Latency

The client measures each batch from generation to render with **eight timestamps**. The **server** takes the first three on its clock and sends them in the batch id. The **client** takes the other five on its clock.

- `started` is the time just before the server makes the values of the batch.
- `encoded` is the time when the JSON text exists and the batch goes into the client queues.
- `sent` is the time when the stream route hands the event to the web server.
- `received` is the time when the message handler of the client starts.
- `parsed` is the time when the client has the array of integers.
- `applied` is the time when the counts hold the batch.
- `frame` is the time when the animation frame callback that draws the batch starts.
- `drawn` is the time when the canvas draw call returns.

Each stage runs from one timestamp to the next. The **seven stages** are generate, queue, network, parse, apply, frame wait, and draw. The network stage holds the write by Uvicorn, the load balancer, the network, and the browser. The **total** runs from `started` to `drawn`, so it does not hold the time from the draw call to the light on the display.

The network stage and the total cross the two clocks, so the client measures the **offset** between them. It makes 5 requests to `GET /time` and keeps the offset from the request with the shortest round trip. The **error of the offset** is at most half of that round trip. The client measures the offset when the page loads and on each `latency.reset()`. The clocks can drift by 1 to 3 ms each minute, so **start each run with a reset**.

To read the latency, open the **Chrome DevTools console**. Keep the **tab in front**, because a hidden tab draws no frames.

1. Run **`latency.reset()`**. It drops the samples and measures the clock offset again.
2. Wait **60 seconds**.
3. Run **`latency.report()`**. It prints the p50, the p95, the p99, and the max of each stage and of the total, in milliseconds.

Run `copy(latency.report())` to put the values on the clipboard as JSON. The client keeps the last **1,200 batches**, which is 60 seconds at the default settings. The test source has no server times, so `latency` does not exist with `source=frontend`. The docs/results.md file gives the measured times.

## Deploy

The backend runs on **AWS ECS Fargate** at https://api.precision.jgangjee.com. The **CDK app** in infra/ defines the stack. The stack names no account or region, so a deploy uses the ones in your AWS profile. The stack makes these resources.

- One **Fargate task** with 0.25 vCPU and 512 MiB on ARM64 runs the image from backend/Dockerfile. `make docker` runs the same image.
- An **Application Load Balancer** serves HTTPS on port 443, redirects port 80 to HTTPS, and checks `GET /health`.
- The **VPC** has public subnets in 2 availability zones and no NAT gateway.
- An **ACM certificate** and an **A record** give the load balancer the name api.precision.jgangjee.com. The stack imports the Route 53 hosted zone for precision.jgangjee.com.
- A **CloudWatch log group** keeps the container logs for one week.
- A **Secrets Manager secret** holds a random 32-character value, which the task gets as `ADMIN_TOKEN`.

The task sets `CORS_ORIGINS` to `http://localhost:4200,http://127.0.0.1:4200`, so the local client can read the cloud stream. A deploy stops the old task before it starts the new one, so the stream is **down for about a minute**.

To deploy, do these steps.

1. Run **`aws login`**, or set up AWS credentials another way.
2. Run **`cdk bootstrap`** from infra/ one time for the account and region of your profile.
3. Start **Docker Desktop**. CDK builds the image with Docker.
4. Run **`make deploy`** and approve the security changes in the terminal.

To call the cloud admin API, **read the token from the secret**. Run these commands with the same AWS profile as the deploy.

```sh
ARN=$(aws cloudformation describe-stacks --stack-name PrecisionStack \
  --query "Stacks[0].Outputs[?OutputKey=='AdminTokenSecretArn'].OutputValue" --output text)
export CLOUD_ADMIN_TOKEN=$(aws secretsmanager get-secret-value --secret-id "$ARN" --query SecretString --output text)
curl https://api.precision.jgangjee.com/admin/settings -H "Authorization: Bearer $CLOUD_ADMIN_TOKEN"
```

The cloud targets of the Makefile read **`CLOUD_ADMIN_TOKEN`**, so they work in the same terminal after the export. The values in the third command are the defaults.

```sh
make cloud-pause
make cloud-resume
make cloud-setting-update SAMPLES_PER_SECOND=20000 BATCH_INTERVAL_MS=50 MAX_VALUE=10000
make cloud-cpu
```

Run **`make destroy`** to remove the stack. The hosted zone stays, because the stack only imports it.

## Load test

The load test measures the limits of the **cloud server**. I change the settings between the steps with `make cloud-setting-update`, so the server needs no restart.

1. The first part raises the **samples per second** through 20,000, 250,000, 500,000, and 1,000,000, with one client and a batch interval of 50 ms.
2. The second part raises the **number of clients** through 1, 5 and 100, at 20,000 samples per second. One Chrome tab measures, and each other client is a curl process on the laptop that reads the stream and drops the data.

Each step has **3 runs of 30 seconds**. A run passes when the p99 of the total latency is **at most 100 ms** and the frame rate stays at **54 fps or more**. A step passes when all 3 runs pass, and a part ends at its first step that fails. After each part, `make cloud-cpu` gives the CPU use of the server.

The docs/specs/features/09-load/validation.md file gives the method and the console snippet that times a run. The docs/results.md file records the limits.
