# Feature 6 plan: Admin API

The steps follow the answers to G1 to G8 in requirements.md.

1. Add `admin_token` to the settings. It reads `ADMIN_TOKEN` from the environment, and its default is no token. Add a `SettingsUpdate` model with the three settings as optional fields, the N11 ranges, and no extra fields. This step changes backend/app/settings.py.
2. Let the generator take new settings. A new method sets the rate, the interval, and the maximum value, and drops the carried fraction. This step changes backend/app/generator.py.
3. Let the broadcaster change settings and pause. Add `update(settings)`, `pause()`, `resume()`, and a `paused` flag. An `asyncio.Event` wakes the run loop on each change, so the loop starts its schedule again from the time of the change. While paused, the loop waits on the event and makes no batch, so the sequence number does not advance. This step changes backend/app/broadcaster.py.
4. Add the admin router. It has `GET /admin/settings`, `PATCH /admin/settings`, `POST /admin/pause`, and `POST /admin/resume`, behind a dependency that checks the bearer token. The router returns status 404 for every admin path when no token is set. Each change logs at the info level. This step creates backend/app/admin.py and changes backend/app/main.py to include the router and keep the live settings on `app.state`.
5. Set a fixed local token in `make backend`, `make dev`, and `make docker`. This step changes the Makefile.
6. Add a Secrets Manager secret with a random value to the stack, and pass it to the task as `ADMIN_TOKEN`. Add a test that checks the task gets the secret. This step changes infra/infra/precision_stack.py and infra/tests/test_stack.py.
7. Write the unit tests for the update model, the generator change, and the broadcaster pause and update. This step changes backend/tests/test_settings.py, backend/tests/test_generator.py, and backend/tests/test_broadcaster.py.
8. Write the admin endpoint tests and the live pause tests. This step creates backend/tests/test_admin.py and changes backend/tests/test_stream.py.
9. Update the README with the admin endpoints, the token, and curl examples for each endpoint. This step changes README.md.
10. Add entries for this feature to the three logs. This step changes docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
11. Run every check in validation.md and fix the failures.
