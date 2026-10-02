# Results

## Feature 8, Latency

The client measures the time of each batch from generation to render. The README section Latency describes the eight timestamps, the seven stages, and the console commands. The value that I compare with the 100 ms target is the p99 of the total.

### Run conditions

- I made both runs on 2026-10-02 with the code of feature 8.
- The cloud run used the server at https://api.precision.jgangjee.com, which is one Fargate task with 0.25 vCPU on ARM64 behind a load balancer in us-east-2.
- The local run used the same image in Docker Desktop on the laptop, from `make docker`.
- Both servers ran at 20,000 samples per second, a batch interval of 50 ms, and a max value of 10,000. Each batch holds 1,000 integers. These are not the settings in the plan, which were 5,000 samples per second and a max value of 1,024.
- The client ran from `make frontend` in Chrome 154 on a MacBook Air with an Apple M4 chip and a 60 Hz display, with N = 32, one client, and the tab in front.
- Each run started with `latency.reset()` and ran for 60 seconds, so each report holds 1,200 batches.

### Cloud run

All times are in milliseconds.

| Stage | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- |
| generate | 0.226 | 0.246 | 0.272 | 0.313 |
| queue | 0.062 | 0.074 | 0.084 | 0.099 |
| network | 15.018 | 15.978 | 16.895 | 30.962 |
| parse | 0 | 0.1 | 0.1 | 0.2 |
| apply | 0 | 0.1 | 0.1 | 0.2 |
| frame wait | 10.9 | 12.3 | 12.9 | 14.6 |
| draw | 1.1 | 1.3 | 1.4 | 1.5 |
| total | 27.18 | 28.124 | 28.542 | 43.645 |

The clock offset was 27.815 ms, and the round trip of the time request was 23.7 ms.

### Local run

All times are in milliseconds.

| Stage | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- |
| generate | 0.777 | 0.84 | 0.891 | 1.565 |
| queue | 0.373 | 0.436 | 0.517 | 1.516 |
| network | 2.175 | 2.8 | 3.419 | 6.196 |
| parse | 0 | 0.1 | 0.1 | 0.2 |
| apply | 0 | 0.1 | 0.1 | 0.1 |
| frame wait | 3.4 | 16.6 | 17.1 | 17.4 |
| draw | 0.9 | 1 | 1.2 | 1.2 |
| total | 7.534 | 21.127 | 21.617 | 23.892 |

The clock offset was -0.87 ms, and the round trip of the time request was 3.3 ms.

### Total against the target

| Run | p99 of the total | Target | Result |
| --- | --- | --- | --- |
| Cloud | 28.542 ms | 100 ms | The run meets the target. |
| Local | 21.617 ms | 100 ms | The run meets the target. |

The cloud run meets the target with 71 ms to spare. The slowest batch of the cloud run took 43.645 ms.

### What the stages show

- The network is the largest stage of the cloud run. Its p50 is 15.0 ms against 2.2 ms in the local run, so the path to the cloud adds about 13 ms.
- The frame wait is the second largest stage. A batch waits for the next animation frame, so the wait is from 0 to one frame, which is 16.7 ms on a 60 Hz display. The max is 14.6 ms in the cloud run and 17.4 ms in the local run, which is about one frame.
- The server work is small. The generate stage and the queue stage together stay below 0.4 ms at the p99 in the cloud run.
- The parse stage and the apply stage read as 0 to 0.2 ms. Chrome rounds the client clock to 0.1 ms, so these two stages are at the limit of the clock.
- The draw stage takes about 1 ms at N = 32.

### Limits of the measurement

- The error of the clock offset is at most half of the round trip. That is 11.85 ms for the cloud run and 1.65 ms for the local run. The error moves the network stage and the total by the same amount, and it does not change the other stages. With the full error added, the p99 of the cloud total is 40 ms, which still meets the target.
- The measurement stops when the canvas draw call returns. The time from the draw call to the light on the display is not measured, and it is about one frame, which is 16.7 ms.
- The runs used one client and one set of server settings. Feature 9 measures the limits.
