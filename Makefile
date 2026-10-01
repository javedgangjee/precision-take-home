# Common tasks for the backend, the frontend, and the CDK app.
# The recipes use plain shell so they run on GNU Make 3.81, which ships with macOS.

BACKEND_PORT := 8000
FRONTEND_PORT := 4200
IMAGE := precision-backend

# Stop the Angular CLI from asking about usage data on the first run.
export NG_CLI_ANALYTICS := false

.PHONY: install backend frontend dev docker-build docker test test-backend test-frontend lint lint-backend lint-frontend lint-infra synth deploy destroy

install:
	cd backend && uv sync
	cd frontend && npm ci
	cd infra && uv sync

backend:
	cd backend && uv run uvicorn app.main:app --reload --port $(BACKEND_PORT) --timeout-graceful-shutdown 3

frontend:
	cd frontend && npx ng serve --port $(FRONTEND_PORT)

dev:
	$(MAKE) -j2 backend frontend

docker-build:
	docker build --platform linux/arm64 -t $(IMAGE) backend

# Each -e NAME with no value passes the variable from the shell only when it is set.
# docker run sends Ctrl+C to Uvicorn, which stops within 3 s.
docker: docker-build
	docker run --rm -p $(BACKEND_PORT):8000 \
		-e SAMPLES_PER_SECOND -e BATCH_INTERVAL_MS -e MAX_VALUE -e CORS_ORIGINS \
		$(IMAGE)

test: test-backend test-frontend

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npx ng test --no-watch --coverage

lint: lint-backend lint-frontend lint-infra

lint-backend:
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app tests

lint-frontend:
	cd frontend && npx ng lint && npx prettier --check .

lint-infra:
	cd infra && uv run ruff check . && uv run ruff format --check . && uv run mypy app.py infra

synth:
	cd infra && cdk synth --quiet

deploy:
	cd infra && cdk deploy

destroy:
	cd infra && cdk destroy
