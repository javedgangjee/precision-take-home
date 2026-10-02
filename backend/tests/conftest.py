import socket
import threading
from collections.abc import Callable, Iterator

import pytest
import uvicorn

from app.main import create_app
from app.settings import Settings

LiveServer = Callable[[Settings], str]
# The settings packet that the server sends for the default settings.
DEFAULT_PACKET = (
    '{"samples_per_second":20000,"batch_interval_ms":50,"max_value":10000,"paused":false}'
)


@pytest.fixture
def live_server() -> Iterator[LiveServer]:
    """Run the app in Uvicorn on a free local port, and return its base URL.

    The in-process test clients wait for the end of a response, and the stream has no end.
    """
    servers: list[tuple[uvicorn.Server, threading.Thread]] = []

    def start(settings: Settings) -> str:
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        config = uvicorn.Config(
            create_app(settings), log_level="warning", timeout_graceful_shutdown=1
        )
        server = uvicorn.Server(config)
        thread = threading.Thread(target=server.run, kwargs={"sockets": [sock]}, daemon=True)
        thread.start()
        servers.append((server, thread))
        while not server.started:
            thread.join(0.01)
        return f"http://127.0.0.1:{port}"

    yield start

    for server, thread in servers:
        server.should_exit = True
        thread.join(5)
