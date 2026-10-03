
# Bin There Done That

This repo is my take-home project for the Precision Neuroscience full-stack role. A cloud server streams nonnegative integers to a web client. The client bins each number into an N by N grid and paints each cell on a blue-to-red heat map in real time.

**N=100, 1 million samples/s**
https://github.com/user-attachments/assets/ec107d13-7232-49df-921c-b7585e2d9c1d



## Quick start

The quick start needs Git, Node.js 22, and npm. The client reads the stream from the cloud server, so you do not need to run the backend.

On macOS or Linux:

```sh
git clone https://github.com/javedgangjee/precision-take-home.git
cd precision-take-home
make client
```

`make client` installs the frontend dependencies, starts the client, and opens http://localhost:4200 in your browser. Port must be 4200.

On Windows, in PowerShell:

```
git clone https://github.com/javedgangjee/precision-take-home.git
cd precision-take-home\frontend
npm ci
$env:NG_CLI_ANALYTICS = "false"
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

## AI toolchain

### Tools

- **Claude Code** run in terminal in VSCode with **Opus 5.5** as the primary model
- **Claude Design** was used for the first design prototype with my custom Design System.
- **Github Copilot** inline suggestions

### Method

The project used a personal take on **spec-driven development** by JetBrains. This has been used on personal projects and given the best results. It depends heavily on the author being in charge of every decision.

![Diagram of the spec-driven method, from the context and the constitution through the feature loop to the final review](docs/assets/spec-driven-method.png)

The `docs/ai/ai-toolchain.md` file gives the skills and each step of the method.

## Documentation
- **Specs** - `docs/specs/` is the source of truth for what to build. The `features/` folder has one folder per feature, and each one holds `requirements.md`, `plan.md`, and `validation.md`.
- **AI usage** - `docs/ai/` shows how I used AI on the project. `ai-changes.md` records how I changed the AI output and why.
  - **Logs** - `docs/ai/logs/` holds the Claude Code session transcript for each spec-driven step, with one folder per feature.
  - **Skill** - `docs/ai/skill/` holds a copy of the custom spec-driven skill.
- **Bonus** - `docs/bonus/` holds my answers to the bonus questions. `3d.md` covers the 3D case and `server_side_rendering.md` covers server side rendering.

## Out of Scope 
- **Hotspot generation** - 2-3 Gaussian peaks
- **Sliding Window/Decay** - To see an up to date map
- **Admin web page** - Control settings, pause/resume
