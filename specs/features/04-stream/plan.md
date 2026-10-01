# Feature 4 plan: Stream

The steps follow the answers to G1 to G9 in requirements.md. Frontend paths are under frontend/, and each step that adds code also adds its spec file next to it.

1. Write the source settings. `readSourceSettings(query)` reads `source` and `server` from the URL query, applies the defaults from G1 and G2, and logs a warning for each bad value. It returns the source kind and the stream URL. This step creates src/app/source/source-settings.ts.
2. Write the backoff function. `reconnectDelay(attempt, random)` returns the delay in ms from G4. The tests pass a fixed random value. This step creates src/app/source/backoff.ts.
3. Write the stream status service. It holds the state as a signal with the values connecting, live, reconnecting, and test. This step creates src/app/source/stream-status.ts.
4. Write the server source service. It makes the EventSource through an injection token, sets the state from G3, parses each message and calls `store.applyBatch`, closes and reopens the EventSource with the delay from step 2, and runs the 5 s watchdog from G5. It closes the EventSource and clears its timers when it is destroyed. This step creates src/app/source/server-source.ts.
5. Make the test source set the state to test when it starts. This step changes src/app/source/test-source.ts.
6. Add the Google Fonts link for Material Symbols Outlined from G6, with the add, progress_activity, remove, sensors, and sync icons at opsz 20 and wght 300. Remove the local icon font file and its @font-face rule. This step changes src/index.html and src/styles.scss, and it deletes public/fonts/material-symbols-outlined.woff2.
7. Write the badge component. It reads the stream status and shows the label, the tone class, and the Material Symbols icon from G6. Add the `--success-text` and `--warning-text` tokens and the `md-badge` styles from the HTML design. This step creates src/app/panel/stream-badge.ts, stream-badge.html, and stream-badge.scss, and it changes src/styles.scss.
8. Put the badge at the top of the side panel with an hr line below it. This step changes src/app/panel/side-panel.ts and side-panel.html.
9. Make the app read the source settings at start and start either the server source or the test source. This step changes src/app/app.ts and app.spec.ts.
10. Write the Dockerfile and the ignore file from G8. This step creates backend/Dockerfile and backend/.dockerignore.
11. Add the `docker-build` and `docker` targets from G9. This step changes Makefile.
12. Remove the `Last-Event-ID` header from the CORS rule and the two comments about it, as G10 says. Remove the test for the preflight. This step changes backend/app/main.py and backend/tests/test_health.py.
13. Update the README. It says how the client picks the source and the server, what the badge states mean, how the reconnect works, and how to run the backend in Docker. It removes the text that says the client does not connect to the server. This step changes README.md at the repo root.
14. Add entries for this feature to the three logs. Replace the feature 2 assumption about the `Last-Event-ID` preflight with the reason from G10. Record the move of the icon font to Google Fonts as a trade-off and as a change to the AI output. This step changes docs/assumptions.md, docs/trade-offs.md, and docs/ai-changes.md.
15. Run every check in validation.md and fix the failures.
