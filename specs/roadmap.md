# Roadmap

Every feature updates the README and the three logs in docs/ as it goes. That work covers S1 to S7 and N14 across all features.

1. **Scaffold.** The goal is a repo where the backend, the frontend, and the CDK app exist, the tests run, the linters pass, and the CDK app synthesizes, all from the Makefile. It covers N13 and S2. The status is in progress.
2. **Backend.** The goal is a FastAPI server that generates random integers and sends them in batches over Server-Sent Events. The backend allows cross-origin calls with CORSMiddleware. It reads the allowed origins from an environment variable, and the default is http://localhost:4200. It covers B2, N5, N7, N8, and N11. The status is planned.
3. **Frontend.** The goal is an Angular client that bins values, keeps counts, and draws the grid, the axis labels, the color scale, and the side panel. It covers B1, B3, B4, B5, B6, N1, N2, N3, N4, D2, and D3. The status is planned.
4. **Stream.** The goal is a client that shows the stream state, reconnects with backoff, and keeps counts on screen during a reconnect. It covers N9, N10, and D1. The status is planned.
5. **Deploy.** The goal is the backend running on ECS Fargate behind an ALB at my domain, deployed with CDK from the Makefile. It covers B2 and N13. The status is planned.
6. **Testing.** The goal is a measured generation-to-render latency and a measured set of limits from a stress test. It covers N6 and N12. The status is planned.

## Stretch goals

7. **Admin Page.** The goal is a backend page that changes the stream settings while the server runs. It covers no required item. The status is planned.
8. **Hotspots.** The goal is a generator mode where a few drifting regions get most of the hits, as in the HTML design. It covers no required item. The status is planned.
