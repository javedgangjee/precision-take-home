Use this only for drafting Constitution

FR
- Cells keep a count of hits
- The math only works out if you subtract 1 first. Math looks like (v-1) mod N^2 but confirm this.
- row, col is y, x on screen row 0 at the bottom matching the pic
- Do 1 <= N <= 64 range.  Default 32 in honour of precision array of 1024
- Batch the stream into an array of random JSON int 

NFR
- Latency target assume 100ms from generation to render
- Scalability limits - number of clients, number of samples, network speed packet size. Measure with a stress test if feasible.
- Durability - lossy best effort

Data Model
- Settings 
samples/sec, - 1 to 100,000
batch interval, -  50ms to 1sec
max value to be binned - 10000

Backend
- Python + FastAPI
- runnable locally
- Docker image on ecs fargate (start with .25) with ALB. I’ll provide URL it will be something like precision.jgangjee.com
Testing - purest
Linting - ruff & mypy

Stream
- SSE over websocket for now. I don’t see a reason to send anything from frontend
- Send a heartbeat (FastAPI should have a ping) if nothing in 15 seconds
Frontend
- Angular on local only
- Refer to attached html design but take the brief as the main truth.
- Counts go high - try float 64 to start
- Counts stay on screen during reconnect
-Do a backoff reconnect attempt. States would be -Live, Connecting, Reconnecting
Testing - vitest (80% coverage min but 100 ideal)
Linting - ESLint

Consider
- I need a makefile with all the basics - run frontend, run backend, deploy, etc
- Deploy with CDK in python
- Backend may need an admin page to allow dynamic update of settings
- Keep log of assumptions, trade offs and ai changes as we go along in each phase

Out of scope
- Assume bonus items are writeups
- AI documentation