# Changelog

This file records the changes to the project that matter to a person who reads or runs it.

## Unreleased

### Added

- Feature 1 adds a backend project in backend/ that uses Python 3.13, uv, and FastAPI, with one `GET /health` endpoint that returns `{"status": "ok"}`.
- Feature 1 adds an Angular 21 frontend project in frontend/ that uses SCSS, Vitest, angular-eslint, and Prettier.
- Feature 1 adds a CDK app in Python in infra/ with one empty stack named `PrecisionStack` that synthesizes without AWS credentials.
- Feature 1 adds a Makefile with the targets `install`, `backend`, `frontend`, `dev`, `test`, `lint`, `synth`, `deploy`, and `destroy`, and it works with GNU Make 3.81.
- Feature 1 makes the backend and frontend test runs fail when coverage is below 80 percent.
- Feature 1 adds a README at the repo root that explains how to install, run, test, and lint the project.
- Feature 1 adds the three logs in docs/ for assumptions, trade-offs, and changes to AI output.
