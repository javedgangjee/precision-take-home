import json
import time
from collections.abc import Iterator

import httpx2
import pytest

from app.settings import Settings
from tests.conftest import LiveServer

Event = dict[str, str]


def events(lines: Iterator[str]) -> Iterator[Event]:
    """Parse SSE lines into events. A comment line becomes an event with a comment key."""
    event: Event = {}
    for line in lines:
        if line == "":
            if event:
                yield event
            event = {}
        elif line.startswith(":"):
            event["comment"] = line[1:].strip()
        else:
            field, _, value = line.partition(": ")
            event[field] = value


def test_stream_returns_event_stream(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")


def test_first_event_is_a_batch_of_5000_integers(live_server: LiveServer) -> None:
    url = live_server(Settings())
    started = time.monotonic()

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        event = next(events(response.iter_lines()))

    assert time.monotonic() - started < 1
    values = json.loads(event["data"])
    assert len(values) == 5_000
    assert all(isinstance(value, int) and 0 <= value <= 1_023 for value in values)
    assert int(event["id"]) >= 0


def test_ids_go_up_by_1(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        ids = [int(next(stream)["id"]) for _ in range(3)]

    assert ids == [ids[0], ids[0] + 1, ids[0] + 2]


def test_two_clients_get_the_same_batch(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with (
        httpx2.stream("GET", f"{url}/stream", timeout=5) as first,
        httpx2.stream("GET", f"{url}/stream", timeout=5) as second,
    ):
        first_stream = events(first.iter_lines())
        second_stream = events(second.iter_lines())
        a = next(first_stream)
        b = next(second_stream)
        # A client that subscribed one tick earlier has one extra batch, so skip ahead to match.
        while int(a["id"]) < int(b["id"]):
            a = next(first_stream)
        while int(b["id"]) < int(a["id"]):
            b = next(second_stream)

    assert a["id"] == b["id"]
    assert a["data"] == b["data"]


def test_idle_stream_sends_ping(live_server: LiveServer, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("fastapi.routing._PING_INTERVAL", 0.1)
    url = live_server(Settings(samples_per_second=1))

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        first = next(events(response.iter_lines()))

    assert first == {"comment": "ping"}
