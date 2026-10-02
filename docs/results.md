# Results

## Feature 8, Latency

The client measures the time of each batch from generation to render. The README section Latency describes the eight timestamps, the seven stages, and the console commands. The value that I compare with the 100 ms target is the p99 of the total.

### Run conditions

- I made both runs on 2026-10-02 with the code of feature 8.
- The cloud run used the server at https://api.precision.jgangjee.com, which is one Fargate task with 0.25 vCPU on ARM64 behind a load balancer in us-east-2.
- The local run used the same image in Docker Desktop on the laptop, from `make docker`.
- Both servers ran at 20,000 samples per second, a batch interval of 50 ms, and a max value of 10,000. Each batch holds 1,000 integers. These are not the settings in the plan, which were 5,000 samples per second and a max value of 1,024.
- The client ran from `make frontend` in Chrome 154 on a MacBook Air with an Apple M4 chip and a 60 Hz display, with N = 32, one client, and the tab in front.
- Each run started with `latency.reset()`. The cloud report holds 254 batches, which is about 13 seconds. The local report holds 140 batches, which is 7 seconds. The plan called for 60 seconds, which is 1,200 batches.

### Cloud run

All times are in milliseconds.

| Stage | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- |
| generate | 0.224 | 0.243 | 0.255 | 0.262 |
| queue | 0.061 | 0.075 | 0.083 | 0.148 |
| network | 15.409 | 16.939 | 17.509 | 21.848 |
| parse | 0 | 0.1 | 0.2 | 0.2 |
| apply | 0 | 0.1 | 0.1 | 0.1 |
| frame wait | 1.1 | 16.4 | 17.1 | 17.2 |
| draw | 0.8 | 1.3 | 1.4 | 1.5 |
| total | 17.47 | 34 | 34.933 | 35.091 |

The clock offset was 40.122 ms, and the round trip of the time request was 24.1 ms.

### Local run

All times are in milliseconds.

| Stage | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- |
| generate | 0.663 | 0.757 | 1.276 | 2.889 |
| queue | 0.182 | 0.241 | 0.305 | 0.679 |
| network | 2.027 | 2.463 | 5.467 | 9.801 |
| parse | 0 | 0.1 | 0.2 | 0.2 |
| apply | 0 | 0.1 | 0.1 | 0.1 |
| frame wait | 6.6 | 10.7 | 11.3 | 11.3 |
| draw | 1.1 | 1.3 | 1.4 | 1.4 |
| total | 10.528 | 14.505 | 15.039 | 15.249 |

The clock offset was -2.795 ms, and the round trip of the time request was 3.6 ms.

### Total against the target

| Run | p99 of the total | Target | Result |
| --- | --- | --- | --- |
| Cloud | 34.933 ms | 100 ms | The run meets the target. |
| Local | 15.039 ms | 100 ms | The run meets the target. |

The cloud run meets the target with 65 ms to spare. The slowest batch of the cloud run took 35.091 ms.

### What the stages show

- The network is the largest stage of the cloud run. Its p50 is 15.4 ms against 2.0 ms in the local run, so the path to the cloud adds about 13 ms.
- The frame wait is the second largest stage. A batch waits for the next animation frame, so the wait is from 0 to one frame, which is 16.7 ms on a 60 Hz display. The max of 17.2 ms in the cloud run matches that limit.
- The server work is small. The generate stage and the queue stage together stay below 0.4 ms at the p99 in the cloud run.
- The parse stage and the apply stage read as 0 to 0.2 ms. Chrome rounds the client clock to 0.1 ms, so these two stages are at the limit of the clock.
- The draw stage takes about 1 ms at N = 32.

### Limits of the measurement

- The error of the clock offset is at most half of the round trip. That is 12.05 ms for the cloud run and 1.8 ms for the local run. The error moves the network stage and the total by the same amount, and it does not change the other stages. With the full error added, the p99 of the cloud total is 47 ms, which still meets the target.
- The measurement stops when the canvas draw call returns. The time from the draw call to the light on the display is not measured, and it is about one frame, which is 16.7 ms.
- The runs are shorter than planned. With 254 batches, the p99 is the third slowest batch, and with 140 batches, it is the second slowest. A 60 second run could show a slower batch.
- The runs used one client and one set of server settings. Feature 9 measures the limits.
