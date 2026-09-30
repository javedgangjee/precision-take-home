import random
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.sse import EventSourceResponse, ServerSentEvent

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
        yield
        await broadcaster.stop()

    app = FastAPI(title="Bin There Done That", lifespan=lifespan)
    # EventSource sends Last-Event-ID when it reconnects, which some browsers may preflight.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET"],
        allow_headers=["Last-Event-ID"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/stream", response_class=EventSourceResponse)
    async def stream(request: Request) -> AsyncIterator[ServerSentEvent]:
        # The server ignores Last-Event-ID, because delivery is lossy.
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


app = create_app(load_settings())
