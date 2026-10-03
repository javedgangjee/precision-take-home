# Feature 1 requirements: Scaffold

## Requirements from the sources

- R1. The repo has a backend project that uses Python 3.13.15, uv, FastAPI, Uvicorn, pytest, ruff, and mypy at the versions in docs/specs/tech-stack.md. (tech-stack.md, Backend)
- R2. The repo has a frontend project that uses Angular 21.2.1 with Vitest and angular-eslint. (tech-stack.md, Frontend)
- R3. The frontend test run fails when coverage is below 80 percent. (tech-stack.md, Frontend)
- R4. The repo has a CDK app in Python that uses aws-cdk-lib 2.271.0, and `cdk synth` succeeds. (tech-stack.md, Infrastructure; roadmap feature 1)
- R5. A Makefile runs the backend, runs the frontend, runs the tests, runs the linters, synthesizes the CDK app, and deploys. (N13; roadmap feature 1)
- R6. The Makefile works with GNU Make 3.81. (tech-stack.md, Infrastructure)
- R7. The README gives clear instructions to install and run the project. (S2)
- R8. The README and the three logs in docs/ record this feature. (roadmap, S3, S7, N14; CLAUDE.md)

## Items the sources do not cover

Each item below was my proposal. The user answered each one.

- G1. **Agreed.** The folders are backend/, frontend/, and infra/ at the repo root. Each Python folder is its own uv project with its own lock file.
- G2. **Agreed.** The scaffold backend has one endpoint, `GET /health`, that returns `{"status": "ok"}`. It gives the tests and the later load balancer health check something to hit. The stream endpoint comes in feature 2.
- G3. **Agreed with a change.** The frontend is made with `ng new frontend --style=scss --ssr=false --routing=false --zoneless --test-runner=vitest --ai-config=none --skip-git`. The styles use SCSS, as the user asked. The scaffold keeps the default app component and its test. The repo stays one monorepo, so `--skip-git` stops Angular from making a nested git repo.
- G4. **Agreed.** The CDK app has one empty stack named `PrecisionStack` with no AWS account or region lookup, so `cdk synth` runs without credentials. Feature 5 adds the resources.
- G5. **Agreed with a change.** The Makefile targets are `install`, `backend`, `frontend`, `dev`, `test`, `lint`, `synth`, `deploy`, and `destroy`. The `dev` target runs the backend and the frontend together with `make -j2 backend frontend`, as the user asked. In this feature `deploy` runs `cdk deploy` on the empty stack and `destroy` runs `cdk destroy` on it, as the user asked. Feature 5 makes `deploy` build and push the image. Both need AWS credentials and a bootstrapped account, so validation does not run them in this feature.
- G6. **Agreed.** The backend also measures coverage with pytest-cov and fails below 80 percent, to match the frontend rule. docs/specs/tech-stack.md now lists pytest-cov 7.1.0.
- G7. **Agreed.** The backend runs on port 8000 and the frontend runs on port 4200, which are the tool defaults.
