# Common tasks for the backend, the frontend, and the CDK app.
# The recipes use plain shell so they run on GNU Make 3.81, which ships with macOS.

BACKEND_PORT := 8000
FRONTEND_PORT := 4200
IMAGE := precision-backend
# The client uses the cloud server by default. This URL points it at the local server.
LOCAL_CLIENT := http://localhost:$(FRONTEND_PORT)/?server=http://localhost:$(BACKEND_PORT)
# The local server uses this fixed token for the admin API. The cloud server uses a secret.
LOCAL_ADMIN_TOKEN := local-admin-token
# The cloud targets call this server. They read its admin token from CLOUD_ADMIN_TOKEN in the shell.
CLOUD_SERVER ?= https://api.precision.jgangjee.com
STACK := PrecisionStack
# make cloud-cpu prints this many minutes of CPU values.
MINUTES ?= 30

# Each setting that is set adds one field to the body of make cloud-setting-update.
comma := ,
space := $(subst ,, )
SETTINGS := $(if $(SAMPLES_PER_SECOND),"samples_per_second":$(SAMPLES_PER_SECOND)) \
	$(if $(BATCH_INTERVAL_MS),"batch_interval_ms":$(BATCH_INTERVAL_MS)) \
	$(if $(MAX_VALUE),"max_value":$(MAX_VALUE))
SETTINGS_BODY := {$(subst $(space),$(comma),$(strip $(SETTINGS)))}

# Stop the Angular CLI from asking about usage data on the first run.
export NG_CLI_ANALYTICS := false

.PHONY: install backend frontend client dev docker-build docker test test-backend test-frontend test-infra lint lint-backend lint-frontend lint-infra synth deploy destroy cloud-pause cloud-resume cloud-setting-update cloud-cpu

install:
	cd backend && uv sync
	cd frontend && npm ci
	cd infra && uv sync

backend:
	cd backend && ADMIN_TOKEN=$(LOCAL_ADMIN_TOKEN) uv run uvicorn app.main:app --reload --port $(BACKEND_PORT) --timeout-graceful-shutdown 3

frontend:
	cd frontend && npx ng serve --port $(FRONTEND_PORT)

# This is the quick start for a reviewer. It installs the frontend dependencies and opens the client in the browser.
client:
	cd frontend && npm ci && npx ng serve --port $(FRONTEND_PORT) --open

dev:
	@echo "Open $(LOCAL_CLIENT) to use the local server."
	$(MAKE) -j2 backend frontend

docker-build:
	docker build --platform linux/arm64 -t $(IMAGE) backend

# Each -e NAME with no value passes the variable from the shell only when it is set.
# docker run sends Ctrl+C to Uvicorn, which stops within 3 s.
docker: docker-build
	@echo "Open $(LOCAL_CLIENT) to use the local server."
	docker run --rm -p $(BACKEND_PORT):8000 \
		-e SAMPLES_PER_SECOND -e BATCH_INTERVAL_MS -e MAX_VALUE -e CORS_ORIGINS \
		-e ADMIN_TOKEN=$(LOCAL_ADMIN_TOKEN) \
		$(IMAGE)

test: test-backend test-frontend test-infra

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npx ng test --no-watch --coverage

test-infra:
	cd infra && uv run pytest

lint: lint-backend lint-frontend lint-infra

lint-backend:
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app tests

lint-frontend:
	cd frontend && npx ng lint && npx prettier --check .

lint-infra:
	cd infra && uv run ruff check . && uv run ruff format --check . && uv run mypy app.py infra tests

synth:
	cd infra && cdk synth --quiet

deploy:
	cd infra && cdk deploy

destroy:
	cd infra && cdk destroy

# This sends one request to the admin API of the cloud server and prints the reply.
# The arguments are the method, the path, and any extra curl options.
# It sends no request when the token is not set, and it fails when the status is not 200.
# The shell reads the token, so make never prints it.
define cloud_admin
@test -n "$$CLOUD_ADMIN_TOKEN" || { echo "CLOUD_ADMIN_TOKEN is not set. The Deploy section of docs/system.md gives the commands."; exit 1; }
@reply=$$(curl -sS -X $(1) "$(CLOUD_SERVER)$(2)" -H "Authorization: Bearer $$CLOUD_ADMIN_TOKEN" $(3) -w '\n%{http_code}') || exit 1; \
	status=$$(printf '%s\n' "$$reply" | tail -n 1); \
	printf '%s\n' "$$reply" | sed '$$d'; \
	test "$$status" = 200 || { echo "The status is $$status."; exit 1; }
endef

cloud-pause:
	$(call cloud_admin,POST,/admin/pause)

cloud-resume:
	$(call cloud_admin,POST,/admin/resume)

cloud-setting-update:
	@test -n "$(SAMPLES_PER_SECOND)$(BATCH_INTERVAL_MS)$(MAX_VALUE)" || { echo "Set at least one of SAMPLES_PER_SECOND, BATCH_INTERVAL_MS, and MAX_VALUE."; exit 1; }
	$(call cloud_admin,PATCH,/admin/settings,-H "Content-Type: application/json" -d '$(SETTINGS_BODY)')

# CloudWatch has one CPU value for each minute, and a value shows about 2 minutes late.
# The percent is of the 0.25 vCPU of the task.
# The AWS CLI prints times in the zone of the laptop, so TZ=UTC makes them UTC.
cloud-cpu:
	@output() { aws cloudformation describe-stacks --stack-name $(STACK) \
			--query "Stacks[0].Outputs[?OutputKey=='$$1'].OutputValue" --output text; }; \
	cluster=$$(output ClusterName) && service=$$(output ServiceName) && now=$$(date +%s) && \
	rows=$$(TZ=UTC aws cloudwatch get-metric-statistics --namespace AWS/ECS --metric-name CPUUtilization \
		--dimensions Name=ClusterName,Value=$$cluster Name=ServiceName,Value=$$service \
		--start-time $$((now - $(MINUTES) * 60)) --end-time $$now --period 60 \
		--statistics Average Maximum \
		--query "sort_by(Datapoints, &Timestamp)[].[Timestamp, Average, Maximum]" --output text) && \
	printf '%s\n' "$$rows" | awk 'BEGIN { printf "%-16s  %7s  %7s\n", "Time (UTC)", "Avg %", "Max %" } \
		NF { printf "%-16s  %7.1f  %7.1f\n", substr($$1, 1, 16), $$2, $$3 }'
