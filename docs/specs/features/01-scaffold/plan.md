# Feature 1 plan: Scaffold

The steps follow the answers to G1 to G7 in requirements.md.

1. Create the backend project with uv. Pin Python 3.13.15, add FastAPI, Uvicorn, and Pydantic, and add pytest, pytest-cov, ruff, and mypy as dev dependencies. Configure ruff, mypy in strict mode, and the pytest coverage floor of 80 percent in pyproject.toml. This step creates backend/pyproject.toml, backend/uv.lock, and backend/.python-version.
2. Write the FastAPI app with the `GET /health` endpoint. This step creates backend/app/__init__.py and backend/app/main.py.
3. Write the backend test for the health endpoint. This step creates backend/tests/__init__.py and backend/tests/test_health.py.
4. Create the frontend with the `ng new` command in G3. This step creates the frontend/ folder and its files.
5. Add angular-eslint with `ng add angular-eslint`. This step changes frontend/angular.json and frontend/package.json and creates frontend/eslint.config.js.
6. Set the Vitest coverage floor to 80 percent for lines, branches, functions, and statements. This step changes frontend/angular.json and frontend/package.json.
7. Create the CDK app as a uv project. Pin Python 3.13.15, add aws-cdk-lib 2.271.0 and constructs, and add ruff and mypy as dev dependencies. Write the empty `PrecisionStack`. This step creates infra/pyproject.toml, infra/uv.lock, infra/.python-version, infra/cdk.json, infra/app.py, and infra/infra/precision_stack.py.
8. Write the Makefile with the targets in G5. The `dev` target runs `backend` and `frontend` in parallel. Each recipe line uses tabs and plain shell, so it runs on GNU Make 3.81. This step creates Makefile.
9. Add ignore rules for Python caches, virtual environments, node_modules, the Angular build output, coverage output, and cdk.out. This step creates .gitignore.
10. Write the README with the prerequisites, the install step, each Makefile target, and pointers to specs/ and docs/. This step creates README.md.
11. Add entries for this feature to the three logs. This step changes docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
12. Run every check in validation.md and fix the failures.
