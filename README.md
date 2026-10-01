# Bin There Done That

This repo is my take-home project for the Precision Neuroscience full-stack role. A cloud server streams nonnegative integers to a web client. The client bins each number into an N by N grid and paints each cell on a blue-to-red heat map in real time.

The project is in progress. The scaffold, the backend stream, the heat map client, the client connection to the server, the cloud deploy, and the admin API are in place. specs/roadmap.md shows the status of each feature.

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
- You need AWS CLI 2.37.4 with credentials for `make deploy` and `make destroy`. The AWS account must be bootstrapped for CDK in the region of your AWS profile. The Deploy section gives the command.
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

## Backend stream

`GET /stream` sends the stream as Server-Sent Events. Each event holds one batch as a compact JSON array of random integers in its `data` field, with no spaces. The `id` field holds the batch sequence number, which starts at 0 when the server starts and goes up by 1 for each batch. A gap in the ids shows that the client missed batches. The server generates one shared stream, so every client gets the same batches. When the server sends nothing for 15 seconds, it sends the comment `: ping`.

Run `make backend`, and then run this command in another terminal to see the stream.

```sh
curl -N localhost:8000/stream | head -c 300
```

The server reads these environment variables at start. When a value is out of range or not a number, the server logs a warning and uses the default.

| Variable | Default | Range | Meaning |
| --- | --- | --- | --- |
| `SAMPLES_PER_SECOND` | 5000 | 1 to 100000 | This sets how many integers the server makes each second. |
| `BATCH_INTERVAL_MS` | 50 | 50 to 1000 | This sets the time between batches in milliseconds. |
| `MAX_VALUE` | 1024 | 1 to 10000 | Each integer is from 0 to this value minus 1. |
| `CORS_ORIGINS` | `http://localhost:4200` | It takes a comma-separated list. The server strips a trailing slash from each origin. | These origins can call the server from a browser. |
| `ADMIN_TOKEN` | It has no default. | It takes any string. | This is the token for the admin API. With no token, the server has no admin API. |

For example, `SAMPLES_PER_SECOND=20 BATCH_INTERVAL_MS=1000 make backend` sends one batch of 20 integers each second. The same variables work with `make docker`.

## Admin API

The admin API changes the stream settings and pauses the stream while the server runs, so a test of a new rate needs no restart. Every client gets the change at once, because the server keeps one shared stream. The changes live in memory only. A restart or a deploy sets the settings back to the environment values and ends the pause.

Each admin request must send the header `Authorization: Bearer <token>`. A request with a missing or wrong token gets status 401. When `ADMIN_TOKEN` is not set, every admin path returns status 404. The local token from `make backend`, `make dev`, and `make docker` is `local-admin-token`. The Deploy section shows how to read the cloud token.

| Request | Body | Effect |
| --- | --- | --- |
| `GET /admin/settings` | It takes no body. | This returns the settings and the pause state. |
| `PATCH /admin/settings` | It takes a JSON object with any of `samples_per_second`, `batch_interval_ms`, and `max_value`. | This changes the settings from the next batch. |
| `POST /admin/pause` | It takes no body. | This stops the batches. |
| `POST /admin/resume` | It takes no body. | This starts the batches again. |

Each request returns the settings and the pause state as one JSON object, such as `{"samples_per_second": 5000, "batch_interval_ms": 50, "max_value": 1024, "paused": false}`.

- A PATCH value must be an integer in the range in the Backend stream table. A value out of range, a value that is not an integer, or an unknown field gets status 422, and no setting changes. The PATCH cannot change `CORS_ORIGINS`.
- A change to the batch interval starts the schedule again from the time of the change, so the server sends no burst of batches. The batch id keeps going up.
- While paused, the server sends no batches, and the batch id does not advance. The `: ping` heartbeat keeps each connection open. A resume starts the schedule again and does not send the batches that the pause skipped. A settings change during a pause applies when the stream resumes.
- A pause while paused and a resume while running return status 200 and change nothing.
- The server logs each change.

The client has no Paused state yet. During a pause, the client sees no batches for 5 seconds and shows Reconnecting until the stream resumes.

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
- The minus and plus buttons change N from 1 to 64. The up and down arrow keys in the N field change N by 1, and by 10 with Shift. A change to N resets all counts to zero.
- A badge at the top of the side panel shows the stream state. Connecting is a white badge, and it shows from the start until the stream opens. Live is a green badge, and it shows while batches arrive. Reconnecting is an amber badge, and it shows after a live stream drops until the stream opens again. Test source is a white badge with no icon, and it shows while the test source runs.
- The side panel shows the samples received, the max count, and the frame rate. A red line shows below the frame rate when it falls below 90 percent of the target of 60 fps. Run the client in Chrome with Energy Saver off, because Energy Saver caps the frame rate at 30 fps.

### Reconnect

When the stream drops, the client closes it and tries again after a delay. The first delay is 1 second, and each failed attempt doubles it up to 30 seconds. A random factor from 0.5 to 1 spreads out the clients after a server restart. The delay goes back to 1 second after the stream opens. The browser hides the `: ping` heartbeat from the client, so the client also counts a live stream as dropped when no batch arrives for 5 seconds. The counts stay on screen during a reconnect. Only a change to N resets them. Batches that the server sends during the drop are lost.

### Test source

With `source=frontend` in the URL query, a test source in a Web Worker makes the data in the browser in place of the server. It makes uniform random integers as the server does, and it posts each batch as a JSON string. It has the same queue of 2 batches as the server. When the main thread falls behind, the worker drops the oldest waiting batch. The client reads the settings from the URL query. When a value is out of range or not a whole number, the client logs a warning to the console and uses the default.

| Setting | Default | Range | Meaning |
| --- | --- | --- | --- |
| `rate` | 100000 | 1 to 100000000 | This sets how many integers the source makes each second. The range goes past the server limit, so a stress test can push the browser. |
| `interval` | 50 | 50 to 1000 | This sets the time between batches in milliseconds. |
| `max` | 1024 | 1 to 10000 | Each integer is from 0 to this value minus 1. |

A change to the query needs a reload, which also resets the counts. For a stress test, run `make frontend`, open http://localhost:4200/?source=frontend&rate=1000000&interval=50&max=1024, set N to 64, and watch the frame rate.

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
TOKEN=$(aws secretsmanager get-secret-value --secret-id "$ARN" --query SecretString --output text)
curl https://api.precision.jgangjee.com/admin/settings -H "Authorization: Bearer $TOKEN"
```

Run `make destroy` to remove the stack. The hosted zone stays, because the stack only imports it.

## Specs and logs

- The specs/ folder holds the mission, the tech stack, the roadmap, and a plan for each feature.
- The docs/assumptions.md file records the assumptions I made.
- The docs/trade-offs.md file records the trade-offs I made.
- The docs/ai-changes.md file records where I changed the AI output, and why.
- The docs/logs/ folder holds my Claude Code session logs, with one folder for each roadmap feature.
- The context/ folder holds the brief, the HTML design, and my design notes.
