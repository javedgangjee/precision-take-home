# Bin There Done That

This repo is my take-home project for the Precision Neuroscience full-stack role. A cloud server streams nonnegative integers to a web client. The client bins each number into an N by N grid and paints each cell on a blue-to-red heat map in real time.

## Quick start

The quick start needs Git, Node.js 22, and npm. The client reads the stream from the cloud server, so you do not need to run the backend.

On macOS or Linux:

```sh
git clone https://github.com/javedgangjee/precision-take-home.git
cd precision-take-home
make client
```

`make client` installs the frontend dependencies, starts the client, and opens http://localhost:4200 in your browser.

On Windows, in PowerShell:

```
git clone https://github.com/javedgangjee/precision-take-home.git
cd precision-take-home\frontend
npm ci
npx ng serve --open
```

## Tech stack

- The backend is a **Python 3.13 server** built with **FastAPI**. It sends batches of random integers to the client over Server-Sent Events.
- The frontend is an **Angular 21 client** that runs on the local machine and draws the grid on an HTML canvas.
- The backend runs in a Docker image on **AWS ECS Fargate**, behind an Application Load Balancer. **AWS CDK** in Python defines the infrastructure.
- The tests use pytest for the backend and the infrastructure, and Vitest for the frontend.
- A Makefile runs the common tasks, which include the local servers, the tests, the linters, and the deploy.

The `docs/specs/tech-stack.md` file gives the version of each tool and the details of each part.

## Repo layout

- The `backend/` folder holds the FastAPI server. It is a uv project.
- The `frontend/` folder holds the Angular client.
- The `infra/` folder holds the AWS CDK app in Python. Separate uv project.

## Results

- **Cloud server** - single Fargate task with 0.25 vCPU. 

- **Client** - Chrome on a MacBook Air with a 60 Hz display, with N = 32.
- **Latency** - from generation to render. At 20,000 samples per second and a batch interval of 50 ms. Each run held 1,200 batches over 60 seconds.

- **Load test** - raised the samples per second with one client, and then raised the number of clients at 20,000 samples per second. Each step has 3 runs of 30 seconds. A run passes when the p99 of the total latency is at most 100 ms and the lowest frame rate is at least 54 fps. A step passes when all 3 runs pass.
CPU was the limit in both cases

### Latency

The client measures each batch from generation to render in 7 stages. 
Both runs used the default settings, which are 20,000 samples per second and a batch interval of 50 ms. 
Each run held 1,200 batches over 60 seconds. 
**Both runs meet the target.**

| Run | p50 of the total | p99 of the total | Max of the total |
| --- | --- | --- | --- |
| Cloud server | 27.2 ms | **28.5 ms** | 43.6 ms |
| Local server in Docker | 7.5 ms | **21.6 ms** | 23.9 ms |

- The **network** is the largest stage of the cloud run, with a p50 of **15.0 ms**. The wait for the next **animation frame** is the second largest, with a p50 of **10.9 ms**.
- The **server** makes and queues a batch in **less than 0.4 ms** at the p99.
- The error of the **clock offset** is at most 11.85 ms in the cloud run. With the full error added, the p99 of the cloud total is **40 ms**, which still meets the target.
- The measurement stops when the canvas draw call returns. The time from the draw call to the light on the **display** is not measured, and it is about one frame, which is 16.7 ms.

### Load test

The load test raised the samples per second with one client, and then it raised the number of clients at 20,000 samples per second. Each step has 3 runs of 30 seconds. A run passes when the p99 of the total latency is at most 100 ms and the lowest frame rate is at least 54 fps. A step passes when all 3 runs pass.

| Samples per second | Clients | Integers in a batch | Highest p99 of the total | CPU maximum |
| --- | --- | --- | --- | --- |
| 20,000 | 1 | 1,000 | **29.1 ms** | 6.4% |
| 250,000 | 1 | 12,500 | **23.9 ms** | 24.4% |
| 500,000 | 1 | 25,000 | **34.5 ms** | 43.7% |
| 1,000,000 | 1 | 50,000 | **55.5 ms** | 82.7% |
| 20,000 | 5 | 1,000 | **25.1 ms** | 9.6% |
| 20,000 | 100 | 1,000 | **38.2 ms** | 81.8% |

The CPU values are a share of the 0.25 vCPU of the task.

- **Every step passes**, so the test did not find the point where the server breaks.
- **No run lost a batch**, and the frame rate stayed at **60 fps** in every run.
- The largest batch that passes holds **50,000 integers**, which is about 244 KB.
- The **CPU** of the task is the first limit that the numbers point at, and this is an assumption. A straight line through the CPU values reaches 100% at about **1,200,000 samples per second** with one client, and at about **130 clients** at 20,000 samples per second.
- The extra clients were **curl processes** on the same laptop, which read the stream and dropped the data. I did not test many clients at a high rate.

The `docs/results.md` file gives the table of each stage and the limits of each measurement. The `docs/system.md` file describes how to run both tests.

## AI toolchain

### Tools

- **Claude Code** run in terminal in VSCode with **Opus 5.5** as the primary model
- **Claude Design** was used for the first design prototype with my custom design system.
- Github Copilot inline suggestions

### Method

The project used a personal take on spec-driven development by JetBrains. This has been used numerous times on personal projects and given the best results. It depends heavily on the author being in charge of every decision.

![Diagram of the spec-driven method, from the context and the constitution through the feature loop to the final review](docs/assets/spec-driven-method.png)

The `docs/ai/ai-toolchain.md` file gives the skills and each step of the method.

## Documentation
- **Specs** - `docs/specs/` is the source of truth for what to build. The `features/` folder has one folder per feature, and each one holds `requirements.md`, `plan.md`, and `validation.md`.
- **AI usage** - `docs/ai/` shows how I used AI on the project. `ai-changes.md` records how I changed the AI output and why.
  - **Logs** - `docs/ai/logs/` holds the Claude Code session transcript for each spec-driven step, with one folder per feature.
  - **Skill** - `docs/ai/skill/` holds a copy of the custom spec-driven skill.
- **Bonus** - `docs/bonus/` holds my answers to the bonus questions. `3d.md` covers the 3D case and `server_side_rendering.md` covers server side rendering.
- **Assumptions** - `docs/assumptions.md` records the assumptions I made.
- **Results** - `docs/results.md` gives the measured latency for each stage and compares the total with the 100 ms target. It also gives the limits from the load test.
- **Trade-offs** - `docs/trade-offs.md` records the trade-offs I made.

## Out of Scope 
- **Hotspot generation** - 2-3 Gaussian peaks
- **Admin web page** - Control settings, pause/resume