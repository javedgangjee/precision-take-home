# Mission

## Why the project exists

This project is a take-home exercise for the Precision Neuroscience full-stack role. It shows how I design, build, and deploy a real-time streaming system, and how I use AI tools to do it. The hiring manager and the software engineering team review the code and the write-ups, and then I walk them through the design.

## Who uses it

The reviewers run the web client on their own machine. The client connects to a data server that runs in the cloud. The reviewers are the only users.

## What the system does

A cloud server generates a stream of nonnegative integers and sends it to the web client. The client bins each number into an N by N grid, keeps a running count for each cell, and paints each cell on a blue-to-red heat map. The grid and the color scale update in real time as data arrives.

## Requirements

The brief is the main source of truth. Where my notes or the HTML design disagree with the brief, the brief wins.

### From the brief

- B1. The client renders an N by N grid, and N is configurable.
- B2. The client reads a stream of nonnegative integers from a cloud server.
- B3. The client bins each number by zero-based remainder and quotient. For a 4 by 4 grid, 17 goes to cell <0,0> and 8 goes to cell <1,3>.
- B4. Each cell keeps a running cumulative count of hits.
- B5. Each cell gets a color from its count normalized to the maximum count. A cell with zero count has no color. The colors follow a conventional blue-to-red heat map.
- B6. The grid and the color scale update in real time as data streams in.
- B7. A write-up explains how I would do this in 3D.
- B8. A write-up discusses the design considerations for moving to server-side rendering.

### From the project overview

- S1. The submission is a GitHub repository.
- S2. The submission has clear instructions to run the solution.
- S3. The submission documents the assumptions and trade-offs I made.
- S4. The submission describes the AI toolchain.
- S5. The submission shares the prompts or the agent interaction history.
- S6. The submission shares the context engineering, skills, and specs I used.
- S7. The submission calls out the key places where I changed the AI output, and why.

### From my design notes

- N1. The bin index is (v - 1) mod N², the row is index div N, and the column is index mod N. Row 0 is at the bottom of the screen, and column 0 is at the left. This rule matches both brief examples and the example input (e) in the brief picture. The server can send 0, and 0 goes to cell <N-1, N-1>.
- N2. The grid shows row numbers on the left and column numbers along the bottom, as in the brief picture. When N is too large to label every row and column, the labels appear at a fixed interval.
- N3. N ranges from 1 to 64, and the default is 32. When the user changes N, all counts reset to zero.
- N4. The color position of a cell is (count - 1) / (max - 1). A count of 1 is the blue end of the scale, #1E00FF, and the max count is the red end, #FF0033. When the max count is 1, every non-empty cell is the blue end. The scale labels run from 1 to the max count.
- N5. The server sends the stream in batches, and each batch is a JSON array of random integers drawn from a uniform distribution. The server generates one shared stream, and every connected client gets the same batches. Each batch carries a sequence number that starts at 0 when the server starts, so a client can count the batches it missed.
- N6. The target latency from generation to render is 100 ms.
- N7. Delivery is lossy and best effort.
- N8. The server sends a heartbeat if it sends nothing for 15 seconds.
- N9. Counts stay on screen while the client reconnects.
- N10. The client reconnects with backoff and shows one of three states, which are Live, Connecting, and Reconnecting.
- N11. The server settings are samples per second from 1 to 100,000, batch interval from 50 ms to 1 s, and a maximum value from 1 to 10,000. The defaults are 5,000 samples per second, a 50 ms batch interval, and a maximum value of 1,024, so each batch holds 250 integers from 0 to 1,023. A fourth setting lists the origins that can call the server from a browser, and the default is http://localhost:4200. The server reads these settings from environment variables at start.
- N12. A stress test measures the limits on clients, samples, and payload size, if it is feasible.
- N13. A Makefile runs the frontend and the backend, runs the tests, and deploys.
- N14. Three logs in docs/ record the assumptions, the trade-offs, and my changes to AI output in each phase. They are assumptions.md, trade-offs.md, and ai-changes.md.

### From the HTML design

- D1. A side panel shows the stream state as a badge.
- D2. The side panel has minus and plus buttons that change N.
- D3. The side panel shows the samples received, the max count, and the measured frame rate.

## Out of scope

- The bonus items are write-ups only. I write B7 and B8 myself, outside the roadmap.
- I do not write general documentation about AI.
- Accessibility is out of scope, including an aria-label on the canvas.
