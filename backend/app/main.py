import logging
import random
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app import admin
from app.broadcaster import Broadcaster
from app.generator import BatchGenerator
from app.settings import Settings, load_settings


def create_app(settings: Settings) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        broadcaster = Broadcaster(
            BatchGenerator(settings, random.Random()), settings.batch_interval_ms / 1_000
        )
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

    @app.get("/stream", response_class=EventSourceResponse)
    async def stream(request: Request) -> AsyncIterator[ServerSentEvent]:
        broadcaster: Broadcaster = request.app.state.broadcaster
        queue = broadcaster.subscribe()
        try:
            while True:
                batch = await queue.get()
                # raw_data sends the encoded string as is, so FastAPI does not encode it again.
                yield ServerSentEvent(raw_data=batch.text, id=str(batch.seq))
        finally:
            broadcaster.unsubscribe(queue)

    return app


# Uvicorn sets up only its own loggers. This shows the app logs, such as each admin change.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s %(message)s")
app = create_app(load_settings())
