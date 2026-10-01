# Feature 5 validation: Deploy

The project documents have no worked example for this feature. The brief examples stay covered by the feature 3 tests, which must still pass.

## Automated checks

The command for V1 is `make test-infra`. The command for V2 and V5 is `make test`. The command for V3 is `make lint`. The command for V4 is `make synth`.

### V1. The stack has the key settings

Each test synthesizes the stack and checks the template.

- The task definition has a Cpu of "256", a Memory of "512", and a runtime platform of ARM64 on Linux. The container port is 8000, and the container environment has `CORS_ORIGINS` set to `http://localhost:4200,http://127.0.0.1:4200`.
- The service has a DesiredCount of 1, a MinimumHealthyPercent of 0, a MaximumPercent of 100, and a circuit breaker with rollback on.
- The target group has a health check path of /health and a deregistration delay of 5 s.
- One listener uses HTTPS on port 443 with a certificate, and one listener on port 80 redirects to HTTPS on port 443.
- The certificate is for api.precision.jgangjee.com with DNS validation, and an A record for api.precision.jgangjee.com sits in the hosted zone Z069085429G5UY5JHXYU4.
- The template has no NAT gateway.

### V2. The client uses the cloud server by default

- With no query, the stream URL is https://api.precision.jgangjee.com/stream.
- With `?server=http://localhost:8000`, the stream URL is http://localhost:8000/stream.
- With `?server=abc`, the stream URL is https://api.precision.jgangjee.com/stream, and the console gets a warning that names `server`.

### V3. Linters pass

- ruff and mypy pass on backend/ and infra/, including infra/tests/. ESLint and Prettier pass on frontend/. The expected result is exit code 0.

### V4. The stack synthesizes with no AWS credentials

- Run `AWS_PROFILE=none make synth`. The expected result is exit code 0.
- The expected result is that infra/cdk.context.json does not exist after the run.

### V5. All tests pass

- The backend, frontend, and infra tests pass. The expected result is exit code 0.

## Manual checks

These checks need AWS credentials. Run `aws login` first.

### M1. The stack deploys

1. If the account is not bootstrapped in us-east-2, run `cdk bootstrap aws://ACCOUNT/us-east-2` from infra/.
2. Start Docker Desktop and run `make deploy`. Approve the security changes.
3. The expected result is a finished deploy with an output that holds https://api.precision.jgangjee.com.

### M2. The server answers at the public URL

1. Run `curl https://api.precision.jgangjee.com/health`. The expected result is `{"status":"ok"}`.
2. Run `curl -N https://api.precision.jgangjee.com/stream | head -c 300`. The expected result is `id:` and `data:` lines with JSON arrays.
3. Run `curl -sI http://api.precision.jgangjee.com/health`. The expected result is a 301 status with a `Location` header that starts with https://.

### M3. The CORS rule allows only the local client

1. Run `curl -sI -H "Origin: http://localhost:4200" https://api.precision.jgangjee.com/health`. The expected result is `access-control-allow-origin: http://localhost:4200`.
2. Run the same command with `Origin: http://127.0.0.1:4200`. The expected result is `access-control-allow-origin: http://127.0.0.1:4200`.
3. Run the same command with `Origin: http://example.com`. The expected result is no `access-control-allow-origin` header.

### M4. The local client goes live with the cloud server

1. Run `make frontend` and open http://localhost:4200 in Chrome.
2. The expected result is a Live badge within 2 s, a filling grid, and a samples received readout that rises by about 100,000 each second.
3. In the DevTools network panel, the expected result is a `stream` request to https://api.precision.jgangjee.com/stream.
4. Open http://127.0.0.1:4200. The expected result is a Live badge.

### M5. A new deploy stops the old task first

1. With M4 running, run `aws ecs update-service --region us-east-2 --cluster CLUSTER --service SERVICE --force-new-deployment`, with the names from the stack outputs or the ECS console.
2. The expected result is a Reconnecting badge while no task runs, and the grid and the readouts keep their values.
3. The expected result is a Live badge after the new task passes its health check, within about 2 minutes.
4. In the ECS console, the expected result is that the service never shows two running tasks.

### M6. The container logs reach CloudWatch

1. Open the log group of the service in the CloudWatch console.
2. The expected result is a log stream with the Uvicorn start lines and a retention of one week.

### M7. The local server still works

1. Run `make dev`. The expected result is a line that says to open http://localhost:4200/?server=http://localhost:8000.
2. Open that URL. The expected result is a Live badge and a `stream` request to http://localhost:8000/stream.

### M8. The README and the logs record this feature

1. Open docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
2. The expected result is that each file has an entry dated for the deploy feature.
3. Open README.md.
4. The expected result is that it has a Deploy section with the bootstrap command, `make deploy`, `make destroy`, and the URL, and that it says how to use the local server.
