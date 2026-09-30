# Bin There Done That

This repo is my take-home project for the Precision Neuroscience full-stack role. A cloud server streams nonnegative integers to a web client. The client bins each number into an N by N grid and paints each cell on a blue-to-red heat map in real time.

The project is in progress. The scaffold and the backend stream are in place, and the heat map comes in a later feature. specs/roadmap.md shows the status of each feature.

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
- You need AWS CLI 2.37.4 with credentials for `make deploy` and `make destroy`. The AWS account must be bootstrapped for CDK.
- You need GNU Make 3.81 or later. macOS ships with 3.81.

## Install

Run `make install` from the repo root. It installs the backend, frontend, and infra dependencies from their lock files.

## Makefile targets

- `make backend` runs the server at http://localhost:8000 with reload on file changes. It stops within 3 seconds of Ctrl+C, even with open streams. The health check is at http://localhost:8000/health.
- `make frontend` runs the client at http://localhost:4200.
- `make dev` runs the backend and the frontend together. Press Ctrl+C once to stop both.
- `make test` runs the backend and frontend tests and reports coverage. The goal is 100 percent, and no minimum is enforced.
- `make lint` runs ruff and mypy on backend/ and infra/, and ESLint and Prettier on frontend/.
- `make synth` synthesizes the CDK app into infra/cdk.out/. It needs no AWS credentials.
- `make deploy` deploys the CDK stack to AWS. The stack is empty until feature 5.
- `make destroy` removes the CDK stack from AWS.

## Backend stream

`GET /stream` sends the stream as Server-Sent Events. Each event holds one batch as a JSON array of random integers in its `data` field. The `id` field holds the batch sequence number, which starts at 0 when the server starts and goes up by 1 for each batch. A gap in the ids shows that the client missed batches. The server generates one shared stream, so every client gets the same batches. When the server sends nothing for 15 seconds, it sends the comment `: ping`.

Run `make backend`, and then run this command in another terminal to see the stream.

```sh
curl -N localhost:8000/stream | head -c 300
```

The server reads these environment variables at start. When a value is out of range or not a number, the server logs a warning and uses the default.

| Variable | Default | Range | Meaning |
| --- | --- | --- | --- |
| `SAMPLES_PER_SECOND` | 100000 | 1 to 100000 | This sets how many integers the server makes each second. |
| `BATCH_INTERVAL_MS` | 50 | 50 to 1000 | This sets the time between batches in milliseconds. |
| `MAX_VALUE` | 1024 | 1 to 10000 | Each integer is from 0 to this value minus 1. |
| `CORS_ORIGINS` | `http://localhost:4200` | It takes a comma-separated list. | These origins can call the server from a browser. |

For example, `SAMPLES_PER_SECOND=20 BATCH_INTERVAL_MS=1000 make backend` sends one batch of 20 integers each second.

## Specs and logs

- The specs/ folder holds the mission, the tech stack, the roadmap, and a plan for each feature.
- The docs/assumptions.md file records the assumptions I made.
- The docs/trade-offs.md file records the trade-offs I made.
- The docs/ai-changes.md file records where I changed the AI output, and why.
- The context/ folder holds the brief, the HTML design, and my design notes.
