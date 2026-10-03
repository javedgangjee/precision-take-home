# Results

## Feature 3, Frontend

The browser stress test ran the client on the test source in the browser, with no server. It ran in Chrome with Energy Saver off at N = 64, which was the largest N at that time. The frame rate was 60 fps at 100,000, 5,000,000, and 10,000,000 samples per second, and it was 23 fps at 100,000,000. I found the limit near 40,000,000 samples per second. The docs/specs/features/03-frontend/validation.md file gives the method.

## Feature 8, Latency

The client measures the time of each batch from generation to render. The Latency section of system.md describes the eight timestamps, the seven stages, and the console commands. The value that I compare with the 100 ms target is the p99 of the total.

### Run conditions


- Both local and cloud servers ran at 20,000 samples per second, a batch interval of 50 ms, and a max value of 10,000. Each batch holds 1,000 integers. These are not the settings in the plan, which were 5,000 samples per second and a max value of 1,024.
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

## Feature 9, Load

The load test measures the limits of the cloud server on the samples per second, the number of clients, and the size of a batch. The Load test section of system.md gives the two parts, and docs/specs/features/09-load/validation.md gives the method.

### Run conditions

- I made every run on 2026-10-02 against the server at https://api.precision.jgangjee.com, which is one Fargate task with 0.25 vCPU on ARM64 behind a load balancer.
- The client ran as in the feature 8 runs, from `make frontend` in Chrome on the same laptop, with N = 32 and the tab in front.
- Every step used a batch interval of 50 ms and a max value of 10,000. I changed the samples per second with `make cloud-setting-update`, so the server did not restart between the steps.
- Each step has 3 runs of 30 seconds. A run passes when the p99 of the total latency is at most 100 ms and the lowest frame rate is at least 54 fps. A step passes when all 3 runs pass.
- A run of 30 seconds at 50 ms holds 600 batches when no batch is lost.
- The CPU values are from `make cloud-cpu`, which reads one value for each minute from CloudWatch. The percent is of the 0.25 vCPU of the task.

### First part, samples per second

The part used one client. The three values in a cell are the three runs, in order.

| Samples per second | Integers in a batch | p99 of the total in ms | Lowest fps | Batches | CPU average in percent | CPU maximum in percent | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20,000 | 1,000 | 28.897, 29.058, 29.075 | 60, 60, 60 | 600, 601, 601 | 5.8 to 6.1 | 6.4 | The step passes. |
| 250,000 | 12,500 | 23.066, 23.902, 23.573 | 60, 60, 60 | 600, 601, 600 | 23.5 to 23.9 | 24.4 | The step passes. |
| 500,000 | 25,000 | 34.277, 34.522, 34.131 | 60, 60, 60 | 600, 600, 601 | 42.8 to 43.0 | 43.7 | The step passes. |
| 1,000,000 | 50,000 | 55.496, 53.833, 54.902 | 60, 60, 60 | 601, 600, 601 | 81.4 | 82.7 | The step passes. |

Every step passes, so the part ended at its last step. The CPU rows are the minutes that lie inside each step. The step at 1,000,000 has one such minute, and the minute before it holds part of the step at 500,000.

### Second part, number of clients

The part used 20,000 samples per second. One Chrome tab measured, and each other client was a curl process on the laptop that read the stream and dropped the data. The row for 1 client is the first step of the first part.

| Clients in total | Curl clients | p99 of the total in ms | Batches | CPU average in percent | CPU maximum in percent | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 28.897, 29.058, 29.075 | 600, 601, 601 | 5.8 to 6.1 | 6.4 | Pass |
| 5 | 4 | 24.501, 24.571, 25.102 | 601, 600, 601 | 9.0 to 9.2 | 9.6 | Pass |
| 100 | 99 | 38.155, 37.869, 37.669 | 601, 601, 600 | 76.4 to 78.2 | 81.8 | Pass |

The plan had steps at 2, 10, 20, and 50 clients. I went from 5 clients straight to 100, and that step passes, so the other steps did not run. After each step, the number of curl clients was the number that the step started, so no curl client lost its stream.

### Limits

- The highest samples per second that passes is 1,000,000, with one client. That rate is the top of the range that the server accepts.
- The highest number of clients that passes is 100, at 20,000 samples per second.
- The largest batch that passes holds 50,000 integers, which is about 244 KB.
- No run lost a batch. Every run has 600 or 601 batches.
- The frame rate stayed at 60 fps in every run.
- The default stays at 20,000 samples per second. One client uses about 6 percent of the CPU at that rate and 82 percent at 1,000,000, and I did not test two clients at a high rate.

### What limits the server

No step failed, so the test did not find the point where the server breaks. The CPU of the task is the first limit that the numbers point at, and this is an assumption.

- With one client, the CPU rises in a straight line with the rate. It is 24 percent at 250,000, 43 percent at 500,000, and 82 percent at 1,000,000, so it reaches 100 percent at about 1,200,000 samples per second.
- At 20,000 samples per second, each client adds about 0.7 percent of CPU. The CPU is 6 percent with 1 client, 9 percent with 5 clients, and 76 to 78 percent with 100 clients, so it reaches 100 percent at about 130 clients.
- The latency has more room than the CPU. The highest p99 is 55.496 ms, which leaves 44 ms to the target.

### Limits of the measurement

- Every client shared one home link, and the extra clients were curl processes on the same laptop. 100 clients at 20,000 samples per second take about 10 MB each second on that link. A curl client does not parse or draw, so the second part loads the server and the link, and it loads only one browser.
- A batch that does not arrive gives no latency sample, so the p99 covers only the batches that arrive. The number of batches shows that none was lost in these runs.
- The round trip of the clock request was from 23.7 to 27.7 ms, so the error of the clock offset is at most 13.9 ms. With the full error added, the highest p99 is about 69 ms, which still meets the target. A difference of a few milliseconds between two steps is inside this error, which can explain why the step at 250,000 reads lower than the step at 20,000.
- The runs have no start time, because the snippet that I ran did not return one. I matched each step with the CPU rows by the time that I pasted its result, which is good to about a minute. A CPU row covers one minute, and a step is about 90 seconds, so each step has one or two rows.
- A step holds its rate for 90 seconds. The test does not show how the server behaves over hours.
- I did not test above 1,000,000 samples per second or above 100 clients, and I did not test many clients at a high rate.

