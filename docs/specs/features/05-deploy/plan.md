# Feature 5 plan: Deploy

The steps follow the answers to G1 to G12 in requirements.md.

1. Add pytest 9.1.1 to the infra dev dependencies, add the pytest settings, and update the lock file. This step changes infra/pyproject.toml and infra/uv.lock.
2. Write the stack. It imports the hosted zone from G1, makes the certificate, the VPC from G3, the cluster, and the Fargate service from G4, G5, and G8 to G11. It builds the image asset from G2 and outputs the service URL. This step changes infra/infra/precision_stack.py.
3. Give the stack no account or region, so a deploy uses the ones in the AWS profile at the time. This step changes infra/app.py.
4. Write the infra tests from V1 in validation.md. This step creates infra/tests/__init__.py and infra/tests/test_stack.py.
5. Add the `test-infra` target and add it to `test`. Make `lint-infra` run mypy on the tests too. Make `dev` and `docker` print the local server URL from G7. This step changes Makefile.
6. Change the client default server to https://api.precision.jgangjee.com and remove the comment that says feature 5 changes it. Update the tests that expect the local default. This step changes frontend/src/app/source/source-settings.ts and source-settings.spec.ts, and any other spec file that expects http://localhost:8000 as the default.
7. Add pytest for infra and the region rule to the tech stack. This step changes docs/specs/tech-stack.md.
8. Update the README. It gets a Deploy section with the bootstrap command from G12, `make deploy`, `make destroy`, the URL, and what the stack makes. It says that the client uses the cloud server by default and how to use the local server. It removes the text that says the stack is empty. This step changes README.md.
9. Add entries for this feature to the three logs. Replace the feature 2 assumption that says feature 5 decides the client origin. Record the public subnets with no NAT gateway, the stop-then-start deploy, and the cost of the stack as trade-offs. This step changes docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
10. Run every automated check in validation.md and fix the failures.
