# Feature 2 plan: Backend

The steps follow the answers to G1 to G7 in requirements.md.

1. Write the settings model. It reads `SAMPLES_PER_SECOND`, `BATCH_INTERVAL_MS`, `MAX_VALUE`, and `CORS_ORIGINS` from the environment, applies the defaults, and logs a warning and uses the default for each value that is out of range or not a number. This step creates backend/app/settings.py.
2. Write the batch generator. It takes the settings, a seeded `random.Random` instance, and the carried fraction, and returns the next batch of uniform integers from 0 to the maximum value minus 1. It makes the batch with `choices(range(max_value), k=n)`. This step creates backend/app/generator.py.
3. Write the broadcaster. It keeps one queue per client with a limit of 2 batches, drops the oldest batch when a queue is full, gives each batch the next sequence number, encodes each batch to JSON once with `json.dumps` and puts the same string in every queue, and runs the background task that makes a batch on each tick of the monotonic clock. This step creates backend/app/broadcaster.py.
4. Change the app. Load the settings at start, start and stop the broadcaster in the app lifespan, add CORSMiddleware with the allowed origins, and add `GET /stream` as an async generator route with `response_class=EventSourceResponse`. The route yields `ServerSentEvent(raw_data=text, id=str(seq))` for each batch, so FastAPI sends the JSON string without encoding it again. Keep `GET /health`. This step changes backend/app/main.py.
5. Write the unit tests for the settings, the generator, and the broadcaster. This step creates backend/tests/test_settings.py, backend/tests/test_generator.py, and backend/tests/test_broadcaster.py.
6. Write the stream tests. A pytest fixture runs the app in Uvicorn on a free local port in a background thread. This step creates backend/tests/conftest.py and backend/tests/test_stream.py, and it changes backend/tests/test_health.py to add the CORS cases.
7. Update the README with the stream endpoint, the environment variables with their defaults and ranges, and a curl command that shows the stream. This step changes README.md.
8. Add entries for this feature to the three logs. This step changes docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
9. Run every check in validation.md and fix the failures.
