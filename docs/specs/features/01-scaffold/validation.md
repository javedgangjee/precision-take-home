# Feature 1 validation: Scaffold

The brief has no worked example that this feature covers.

## Automated checks

### V1. Backend tests pass with coverage of 80 percent or more

The command is `make test`, which runs the backend step below among others.

- The test sends `GET /health` to the app through the FastAPI test client. The expected result is status 200 and the body `{"status": "ok"}`.
- The coverage report shows 80 percent or more, and pytest exits with code 0.

### V2. Frontend tests pass with coverage of 80 percent or more

The command is `make test`, which runs `ng test` with coverage and no watch mode.

- The default app component test creates the component. The expected result is that the component exists.
- The coverage report shows 80 percent or more, and the command exits with code 0.

### V3. Linters pass

The command is `make lint`.

- ruff check and ruff format in check mode pass on backend/ and infra/.
- mypy in strict mode passes on backend/ and infra/.
- `ng lint` passes on frontend/.
- The expected result is exit code 0.

### V4. The CDK app synthesizes without AWS credentials

The command is `make synth`.

- The expected result is exit code 0 and a template for `PrecisionStack` in infra/cdk.out/.

### V5. The Makefile runs on GNU Make 3.81

The command is `/usr/bin/make --version && /usr/bin/make install test lint synth`.

- The expected result is that the version line says 3.81 and every target exits with code 0.

## Manual checks

### M1. The backend runs

1. Run `make backend` in one terminal.
2. Run `curl -s localhost:8000/health` in another terminal.
3. The expected result is `{"status":"ok"}`.

### M2. The frontend runs

1. Run `make frontend`.
2. Open http://localhost:4200 in a browser.
3. The expected result is the default Angular page with no errors in the browser console.

### M3. The dev target runs both apps

1. Run `make dev`.
2. Run `curl -s localhost:8000/health` in another terminal, and open http://localhost:4200 in a browser.
3. The expected result is `{"status":"ok"}` and the default Angular page.
4. Press Ctrl+C once. The expected result is that both processes stop.

### M4. The README is enough to start

1. Read README.md from the top.
2. Follow only its steps on a fresh clone.
3. The expected result is that M1, M2, and M3 pass without any other help.

### M5. The logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the scaffold feature.

## Results

These results are from 2026-09-29.

### Automated checks

- V1 passes. One backend test passed, and coverage is 100 percent.
- V2 passes. Two frontend tests passed, and coverage is 100 percent for statements, branches, functions, and lines.
- V3 passes. ruff check, ruff format, strict mypy, ng lint, and Prettier report no issues.
- V4 passes. `make synth` exits with code 0 and writes infra/cdk.out/PrecisionStack.template.json.
- V5 passes. `/usr/bin/make --version` reports GNU Make 3.81, and `install test lint synth` exits with code 0.

### Manual checks

- M1 passes, as the user reported.
- M2 passes, as the user reported.
- M3 passes, as the user reported.
- M4 passes. The user followed the README on a fresh copy of the repo, and M1 to M3 passed there.
- M5 passes. Each log has plan and implement entries for the scaffold dated 2026-09-29.

### Requirement coverage

- R3 has only partial proof. The 80 percent floor is set in frontend/angular.json, but no check shows that the run fails below 80 percent.
- Every other requirement has at least one passing check.
