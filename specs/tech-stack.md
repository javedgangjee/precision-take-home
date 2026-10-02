# Tech stack

The versions match the tools on my laptop on 2026-09-29. Where a library is not on the laptop, the version is the latest release on that date.

## Summary

- The backend is a Python 3.13 server built with FastAPI. It sends batches of random integers to the client over Server-Sent Events.
- The frontend is an Angular 21 client that runs on the local machine and draws the grid on an HTML canvas.
- The backend runs in a Docker image on AWS ECS Fargate, behind an Application Load Balancer. AWS CDK in Python defines the infrastructure.
- The tests use pytest for the backend and the infrastructure, and Vitest for the frontend.
- A Makefile runs the common tasks, which include the local servers, the tests, the linters, and the deploy.

## Backend

- The backend uses Python 3.13.15.
- uv 0.11.24 manages the Python version, the dependencies, and the lock file.
- The web framework is FastAPI 0.142.1, with Pydantic 2.13.5.
- The ASGI server is Uvicorn 0.54.0.
- The backend sends the stream to the client with Server-Sent Events. The client sends nothing back, so the project does not use WebSockets.
- The stream has two event types. A batch event has an `id` line and no event name. The `id` holds the batch sequence number and three server timestamps, in the form `<sequence number>:<started>:<encoded>:<sent>`. A settings packet has the event name `update` and no `id` line.
- The backend has a `GET /time` endpoint that returns the server time. The client uses it to measure the offset between its clock and the server clock.
- The backend has an admin API under /admin that changes the stream settings and pauses the stream. Each admin request needs a bearer token, which the backend reads from the `ADMIN_TOKEN` environment variable.
- The backend runs locally for development, both with uv and in a Docker image in Docker Desktop 4.92.0. The same image runs in the cloud.
- The tests use pytest 9.1.1. pytest-cov 7.1.0 measures coverage. The goal is 100 percent coverage, and no minimum is enforced.
- The linters are ruff 0.16.9 and mypy 2.3.1.

## Frontend

- The frontend uses Angular 21.2.24 and runs only on the local machine. Angular CLI 21.2.1 created the project, and npm resolved its version ranges to 21.2.24.
- The runtime is Node.js 22.22.1, and the package manager is npm 11.20.0.
- The TypeScript, Vitest, and ESLint versions are the ones that Angular CLI 21.2.1 installs when it creates the project. ESLint comes from angular-eslint.
- Prettier 3.9.9 formats the frontend code, and `make lint` checks the format. Angular CLI 21.2.1 wrote the range ^3.8.1, and npm resolved it to 3.9.9.
- The frontend draws the grid on an HTML canvas. It applies each batch to the counts when the batch arrives, and it redraws at most once per display frame with requestAnimationFrame.
- The frontend keeps counts as 64-bit floats, so large counts do not overflow.
- The frontend measures the latency of each batch from generation to render. It gives the result in the browser console with `latency.report()`, and the side panel does not show it.
- The HTML design in context/ sets the look of the client. The brief wins where the two differ. The side panel readouts and the stream badge differ from the design, because I changed their look in the feature 7 review.
- The tests use Vitest. The goal is 100 percent coverage, and no minimum is enforced.

## Infrastructure

- The backend runs on AWS ECS Fargate with 0.25 vCPU on ARM64, behind an Application Load Balancer, in the region of the AWS profile at deploy time.
- AWS CDK in Python defines the infrastructure. The CDK CLI is 2.1143.0, and the library is aws-cdk-lib 2.271.0.
- AWS Secrets Manager holds the admin token for the cloud server. The stack generates a random value and passes it to the task as `ADMIN_TOKEN`.
- The infra tests use pytest 9.1.1. They synthesize the stack and check the key settings in the template.
- Docker 29.8.0 builds the image, and AWS CLI 2.37.4 handles credentials.
- The public URL of the backend is https://api.precision.jgangjee.com.
- A Makefile holds the common tasks, such as running the backend, running the frontend, running the tests, and deploying. It must work with GNU Make 3.81, which ships with macOS.
- The Makefile has four targets for the cloud server. Three of them call the admin API with curl and read the admin token from `CLOUD_ADMIN_TOKEN` in the shell. The fourth is `make cloud-cpu`, which reads the CPU use of the service from CloudWatch with the AWS CLI.
