import logging
import random
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app import admin
from app.broadcaster import Broadcaster, epoch_us
from app.generator import BatchGenerator
from app.settings import Settings, load_settings


def create_app(settings: Settings) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        broadcaster = Broadcaster(BatchGenerator(settings, random.Random()), settings)
        broadcaster.start()
        app.state.broadcaster = broadcaster
        # The admin API changes this copy. A restart goes back to the environment values.
        app.state.settings = settings
        yield
        await broadcaster.stop()

    app = FastAPI(title="Bin There Done That", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET"],
    )

    app.include_router(admin.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # The handler is async, so the time is not read in a worker thread, which would add a delay.
    @app.get("/time")
    async def server_time(response: Response) -> dict[str, int]:
        """Return the server time, so a client can compare its clock with the server clock."""
        response.headers["Cache-Control"] = "no-store"
        return {"epoch_us": epoch_us()}

    @app.get("/stream", response_class=EventSourceResponse)
    async def stream(request: Request) -> AsyncIterator[ServerSentEvent]:
        broadcaster: Broadcaster = request.app.state.broadcaster
        queue = broadcaster.subscribe()
        # The change counter value of the last settings packet that this stream sent.
        sent_version = -1
        try:
            while True:
                # The first pass sends the settings packet as the first event. A later pass
                # sends it again after a change. The packet has no id, so it is not a batch.
                if sent_version != broadcaster.version:
                    sent_version = broadcaster.version
                    yield ServerSentEvent(raw_data=broadcaster.packet, event="update")
                batch = await queue.get()
                # A wake item sends nothing. It only starts the next pass.
                if batch is not None:
                    # The id holds the sequence number and the three server times. Each client
                    # has its own sent time, which is the time when its batch leaves the queue.
                    batch_id = f"{batch.seq}:{batch.started}:{batch.encoded}:{epoch_us()}"
                    # raw_data sends the encoded string as is, so FastAPI does not encode it again.
                    yield ServerSentEvent(raw_data=batch.text, id=batch_id)
        finally:
            broadcaster.unsubscribe(queue)

    return app


# Uvicorn sets up only its own loggers. This shows the app logs, such as each admin change.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s %(message)s")
app = create_app(load_settings())
