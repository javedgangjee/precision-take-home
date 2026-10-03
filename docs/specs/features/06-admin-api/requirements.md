# Feature 6 requirements: Admin API

## Requirements from the sources

- R1. HTTP endpoints change the stream settings while the server runs, so a test of a new sample rate needs no restart. (roadmap feature 6; design notes, admin settings)
- R2. A request sets the samples per second, the batch interval, and the maximum value, within the ranges in N11. (roadmap feature 6; N11)
- R3. A request pauses the generation, and another request resumes it. (roadmap feature 6)
- R4. While paused, the server sends no batches, and the batch sequence number does not advance. (roadmap feature 6; N5)
- R5. While paused, the server heartbeat keeps each connection alive. (roadmap feature 6; N8)
- R6. The feature has no admin web page, sends no new events to the client, and changes no client code. (roadmap feature 6)
- R7. The server keeps one shared stream, and a settings change applies to every client at once. (N5)
- R8. The server keeps `GET /health` and `GET /stream` as they are. (feature 1, G2; feature 2, G1; user request for this plan)
- R9. The README and the three logs in docs/ record this feature. (roadmap, S2, S3, S7, N14; CLAUDE.md)

## Items the sources do not cover

Each item below was my proposal. The user agreed to each one.

- G1. **Agreed.** The admin endpoints run on the public URL, so anyone could pause the stream. The server uses a shared token. The server reads `ADMIN_TOKEN` from the environment, and each admin request must send the header `Authorization: Bearer <token>`. A request with a missing or wrong token gets status 401. When `ADMIN_TOKEN` is not set, the admin endpoints return status 404, so a server with no token has no admin API. `make backend` and `make docker` set a fixed local token. The CDK stack makes a Secrets Manager secret with a random value and passes it to the task as `ADMIN_TOKEN`. The README gives the AWS CLI command that reads the token.
- G2. **Agreed.** The endpoints are `GET /admin/settings`, `PATCH /admin/settings`, `POST /admin/pause`, and `POST /admin/resume`, as the user asked. I read "PATH" in the request as PATCH.
- G3. **Agreed.** `GET /admin/settings` returns a JSON object with `samples_per_second`, `batch_interval_ms`, `max_value`, and `paused`. `PATCH /admin/settings` takes a JSON object with any of the three settings and returns the same object as the GET. `POST /admin/pause` and `POST /admin/resume` take no body and return the same object.
- G4. **Agreed.** A PATCH with a value out of range, a value that is not an integer, or an unknown field gets status 422, and no setting changes. The PATCH cannot change `CORS_ORIGINS`, because the CORS middleware reads it once at start.
- G5. **Agreed.** A settings change applies from the next batch. A change to the batch interval starts the schedule again from the time of the change, so the server does not send a burst of batches. A change drops the carried fraction from G4 of feature 2. The sequence number keeps going up and does not go back to 0.
- G6. **Agreed.** A pause while paused and a resume while running return status 200 and change nothing. A resume starts the schedule again from the time of the resume, so the server does not send the batches it skipped. A settings change during a pause applies when the generation resumes.
- G7. **Agreed.** The changes live in memory only. A restart or a deploy sets the settings back to the environment values and ends the pause. The server logs each change at the info level.
- G8. **Agreed.** The CORS rule stays at `GET` only, because curl sends the admin requests and a browser does not.
