# Feature 9 plan: Load

The steps follow the answers to G1 to G15 in requirements.md. Steps 1 to 4 are the implement session. Steps 5 to 7 are the validate session.

## Implement session

1. Add the four cloud targets. `CLOUD_SERVER` holds the address of the cloud server. `cloud-pause` sends `POST /admin/pause`, `cloud-resume` sends `POST /admin/resume`, and `cloud-setting-update` sends `PATCH /admin/settings` with the variables that are set. Each target reads `CLOUD_ADMIN_TOKEN` from the shell, prints the reply of the server, and fails when the status is not 200. `cloud-cpu` reads the two stack outputs and the CPU metric with the AWS CLI, and it prints the table from G13. The recipes use plain shell, so they run on GNU Make 3.81. This step changes the Makefile.
2. Update the README. The Makefile targets section gets the four targets. The Deploy section exports the token as `CLOUD_ADMIN_TOKEN` and shows one call of each target. A new Load test section names the two parts and the pass rule, and it points at validation.md of this feature for the method and at docs/results.md for the limits. The intro and the Specs and logs section name the load test. This step changes README.md.
3. Run the automated checks in validation.md and fix the failures.
4. Add entries for this feature to the three logs. This step changes docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.

The implement session writes no test file and changes no file in backend/, frontend/, or infra/.

## Validate session

5. Run the load test. I do the manual checks M1 to M4 in validation.md, and I paste the result of each step and the CPU table of each part. M4 ends the test with `make cloud-pause` or `make destroy`.
6. Write the results. The AI adds the section "Feature 9, Load" to docs/results.md from the pasted results. The section gives the run conditions, one table for each part, the limits, the highest samples per second that passes, and the limits of the measurement. This step changes docs/results.md.
7. Record what the test showed. The AI adds an entry to a log in docs/ only when the test gives one, such as a run that I had to repeat. I decide on the new default after I read the results, and that change goes to the replan.
