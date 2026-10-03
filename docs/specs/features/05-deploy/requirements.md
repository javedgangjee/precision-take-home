# Feature 5 requirements: Deploy

## Requirements from the sources

- R1. The backend runs in the cloud, and the local client reads the stream from it. (B2; mission.md, What the system does)
- R2. The backend runs on AWS ECS Fargate with 0.25 vCPU on ARM64, behind an Application Load Balancer. (tech-stack.md, Infrastructure)
- R3. AWS CDK in Python defines the infrastructure, with aws-cdk-lib 2.271.0. (tech-stack.md, Infrastructure)
- R4. The public URL of the backend is https://api.precision.jgangjee.com. (tech-stack.md, Infrastructure)
- R5. The cloud runs the same image that runs in Docker Desktop. (tech-stack.md, Backend; feature 4, R6)
- R6. The service runs one task, because the server makes one shared stream for every client. (N5)
- R7. The Makefile deploys the stack. (N13; roadmap feature 5)
- R8. The client default server is the cloud URL. (feature 4, G2)
- R9. The cloud server allows the origin of the local client in its CORS rule. (docs/assumptions.md, review feature 2)
- R10. The README and the three logs in docs/ record this feature. (roadmap, S2, S3, S7, N14; CLAUDE.md)

## Items the sources do not cover

Items G1 to G7 are answers from the user. Items G8 to G12 were my proposals, and the user agreed to each one.

- G1. **Agreed.** Cloudflare hosts jgangjee.com and delegates precision.jgangjee.com to a Route 53 hosted zone with the id Z069085429G5UY5JHXYU4. The stack imports the zone by its id and name, with no lookup, so `make synth` needs no AWS credentials. The stack makes an ACM certificate for api.precision.jgangjee.com that validates by DNS in that zone, and an alias A record that points the name at the ALB. The stack names no account or region, and deploys to the ones in the AWS profile at the time.
- G2. **Agreed.** The stack builds the image from backend/Dockerfile as a CDK asset for linux/arm64. `cdk deploy` builds the image with Docker, pushes it to the CDK bootstrap ECR repo, and points the task at it. Docker must run during `make deploy`.
- G3. **Agreed.** The stack makes a new VPC with 2 availability zones and public subnets only, with no NAT gateway. The task gets a public IP so it can pull the image and send logs. Its security group lets in traffic only from the ALB.
- G4. **Agreed.** The service runs 1 task. A deploy stops the old task before it starts the new one, so two streams never run at once. The minimum healthy percent is 0 and the maximum percent is 100. The stream is down for about a minute on each deploy, and the client shows Reconnecting. A deployment circuit breaker rolls back a task that fails to start.
- G5. **Agreed.** The task sets `CORS_ORIGINS` to `http://localhost:4200,http://127.0.0.1:4200`. The other server settings use their defaults, so the task does not set them.
- G6. **Agreed with a change.** infra/ gets pytest 9.1.1 as a dev dependency and a few tests in infra/tests/test_stack.py. The tests synthesize the stack and check the key settings in the template. There is no full test suite. A new `test-infra` target runs them, and `make test` runs it. docs/specs/tech-stack.md gets a line for it.
- G7. **Agreed.** `DEFAULT_SERVER` in the client becomes https://api.precision.jgangjee.com, so `make frontend` shows the cloud stream. `make dev` and `make docker` print a line that says to open http://localhost:4200/?server=http://localhost:8000 for the local server.
- G8. **Agreed.** The stack uses the `ApplicationLoadBalancedFargateService` construct from aws-ecs-patterns. The task has 256 CPU units and 512 MiB of memory, which is the smallest memory Fargate allows at 0.25 vCPU. The container listens on port 8000.
- G9. **Agreed.** The ALB listens for HTTPS on port 443 with the certificate from G1. Port 80 redirects to HTTPS. The ALB idle timeout stays at the default of 60 s, because the server sends a batch at least once each second.
- G10. **Agreed.** The target group health check calls `GET /health`. The deregistration delay is 5 s, down from the default of 300 s, so a deploy does not wait 5 minutes for open streams to drain.
- G11. **Agreed.** The container sends its logs to a CloudWatch log group with a retention of one week. The log group is removed with the stack.
- G12. **Agreed.** The AWS account must be bootstrapped for CDK in the region of the AWS profile once, with `cdk bootstrap`. The README gives the command, and the Makefile gets no target for it. `make deploy` keeps `cdk deploy`, which asks for approval of security changes in the terminal.
