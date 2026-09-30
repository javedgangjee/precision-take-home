# Tech stack

The versions match the tools on my laptop on 2026-09-29. Where a library is not on the laptop, the version is the latest release on that date.

## Backend

- The backend uses Python 3.13.15.
- uv 0.11.24 manages the Python version, the dependencies, and the lock file.
- The web framework is FastAPI 0.142.1, with Pydantic 2.13.5.
- The ASGI server is Uvicorn 0.54.0.
- The backend sends the stream to the client with Server-Sent Events. The client sends nothing back, so the project does not use WebSockets.
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
- The HTML design in context/ sets the look of the client. The brief wins where the two differ.
- The tests use Vitest. The goal is 100 percent coverage, and no minimum is enforced.

## Infrastructure

- The backend runs on AWS ECS Fargate with 0.25 vCPU on ARM64, behind an Application Load Balancer.
- AWS CDK in Python defines the infrastructure. The CDK CLI is 2.1143.0, and the library is aws-cdk-lib 2.271.0.
- Docker 29.8.0 builds the image, and AWS CLI 2.37.4 handles credentials.
- The public URL is a subdomain of jgangjee.com, such as precision.jgangjee.com. I supply the final URL.
- A Makefile holds the common tasks, such as running the backend, running the frontend, running the tests, and deploying. It must work with GNU Make 3.81, which ships with macOS.
