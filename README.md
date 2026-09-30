# Bin There Done That

This repo is my take-home project for the Precision Neuroscience full-stack role. A cloud server streams nonnegative integers to a web client. The client bins each number into an N by N grid and paints each cell on a blue-to-red heat map in real time.

The project is in progress. The scaffold is in place, and the stream and the heat map come in later features. specs/roadmap.md shows the status of each feature.

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

- `make backend` runs the server at http://localhost:8000 with reload on file changes. The health check is at http://localhost:8000/health.
- `make frontend` runs the client at http://localhost:4200.
- `make dev` runs the backend and the frontend together. Press Ctrl+C once to stop both.
- `make test` runs the backend and frontend tests with coverage. Each fails below 80 percent coverage.
- `make lint` runs ruff and mypy on backend/ and infra/, and ESLint on frontend/.
- `make synth` synthesizes the CDK app into infra/cdk.out/. It needs no AWS credentials.
- `make deploy` deploys the CDK stack to AWS. The stack is empty until feature 5.
- `make destroy` removes the CDK stack from AWS.

## Specs and logs

- The specs/ folder holds the mission, the tech stack, the roadmap, and a plan for each feature.
- The docs/assumptions.md file records the assumptions I made.
- The docs/trade-offs.md file records the trade-offs I made.
- The docs/ai-changes.md file records where I changed the AI output, and why.
- The context/ folder holds the brief, the HTML design, and my design notes.
