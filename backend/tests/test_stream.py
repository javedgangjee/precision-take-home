import json
import threading
import time
from collections.abc import Callable, Iterator

import httpx2
import pytest

from app.settings import Settings
from tests.conftest import LiveServer

Event = dict[str, str]
ADMIN = Settings(admin_token="test-token")
AUTH = {"Authorization": "Bearer test-token"}
# Batches made before an admin change can still be on the way: 2 in the queue and 1 in the send.
MAX_STALE = 3


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


def test_first_event_is_a_batch_of_250_integers(live_server: LiveServer) -> None:
    url = live_server(Settings())
    started = time.monotonic()

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        event = next(events(response.iter_lines()))

    assert time.monotonic() - started < 1
    values = json.loads(event["data"])
    assert len(values) == 250
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


def admin(url: str, method: str, path: str, body: dict[str, int] | None = None) -> None:
    response = httpx2.request(method, f"{url}{path}", headers=AUTH, json=body, timeout=5)
    assert response.status_code == 200


def values(event: Event) -> list[int]:
    result: list[int] = json.loads(event["data"])
    return result


def skip_stale(stream: Iterator[Event], is_new: Callable[[Event], bool]) -> Event:
    """Return the first event made after an admin change. Skip the batches made before it."""
    for _ in range(MAX_STALE + 1):
        event = next(stream)
        if is_new(event):
            return event
    raise AssertionError("no new event after the stale batches")


def test_patch_changes_the_rate_and_the_interval(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        next(stream)
        admin(
            url, "PATCH", "/admin/settings", {"samples_per_second": 20, "batch_interval_ms": 1000}
        )
        first = skip_stale(stream, lambda event: len(values(event)) == 20)
        second = next(stream)

    assert len(values(first)) == 20
    assert len(values(second)) == 20


def test_patch_changes_the_max_value(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        next(stream)
        admin(url, "PATCH", "/admin/settings", {"max_value": 3})
        skip_stale(stream, lambda event: max(values(event)) <= 2)
        event = next(stream)

    assert set(values(event)) <= {0, 1, 2}


def test_pause_stops_the_events_and_resume_goes_on_from_the_next_id(
    live_server: LiveServer,
) -> None:
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        last = next(stream)
        paused_at = time.monotonic()
        admin(url, "POST", "/admin/pause")
        threading.Timer(0.6, admin, args=(url, "POST", "/admin/resume")).start()
        # The batches sent before the pause arrive at once. The next event comes after the resume.
        while True:
            event = next(stream)
            arrived = time.monotonic() - paused_at
            if arrived > 0.5:
                break
            assert arrived < 0.1
            last = event

    assert int(event["id"]) == int(last["id"]) + 1


def test_paused_stream_sends_ping(live_server: LiveServer, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("fastapi.routing._PING_INTERVAL", 0.1)
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        admin(url, "POST", "/admin/pause")
        pings = [
            event for event in (next(stream) for _ in range(MAX_STALE + 3)) if "comment" in event
        ]

    assert pings[-2:] == [{"comment": "ping"}, {"comment": "ping"}]


def test_two_clients_get_the_same_batch_after_a_change(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    def is_new(event: Event) -> bool:
        return max(values(event)) <= 2

    with (
        httpx2.stream("GET", f"{url}/stream", timeout=5) as first,
        httpx2.stream("GET", f"{url}/stream", timeout=5) as second,
    ):
        first_stream = events(first.iter_lines())
        second_stream = events(second.iter_lines())
        next(first_stream)
        next(second_stream)
        admin(url, "PATCH", "/admin/settings", {"max_value": 3})
        a = skip_stale(first_stream, is_new)
        b = skip_stale(second_stream, is_new)
        # A client that is one batch ahead skips to match, as in the test above.
        while int(a["id"]) < int(b["id"]):
            a = next(first_stream)
        while int(b["id"]) < int(a["id"]):
            b = next(second_stream)

    assert a["id"] == b["id"]
    assert a["data"] == b["data"]
