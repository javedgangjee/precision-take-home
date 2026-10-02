import json
import threading
import time
from collections.abc import Callable, Iterator
from typing import Any

import httpx2
import pytest

from app.settings import Settings
from tests.conftest import DEFAULT_PACKET, LiveServer

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


def seq(event: Event) -> int:
    """Return the batch sequence number, which is the first part of the id."""
    return int(event["id"].split(":")[0])


def times(event: Event) -> list[int]:
    """Return the started, encoded, and sent times from the id, in microseconds."""
    return [int(part) for part in event["id"].split(":")[1:]]


def shared_id(event: Event) -> str:
    """Return the id without the sent time, which each client has for itself."""
    return event["id"].rsplit(":", 1)[0]


def batches(lines: Iterator[str]) -> Iterator[Event]:
    """Parse SSE lines into events, and skip the update events."""
    return (event for event in events(lines) if event.get("event") != "update")


def next_update(stream: Iterator[Event]) -> dict[str, Any]:
    """Return the settings packet of the next update event, which must come within 1 s."""
    started = time.monotonic()
    for event in stream:
        assert time.monotonic() - started < 1
        if event.get("event") == "update":
            packet: dict[str, Any] = json.loads(event["data"])
            return packet
    raise AssertionError("the stream ended with no update event")


def test_stream_returns_event_stream(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")


def test_first_event_is_the_settings_packet_and_the_second_is_a_batch(
    live_server: LiveServer,
) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        first = next(stream)
        second = next(stream)

    assert first == {"event": "update", "data": DEFAULT_PACKET}
    assert "id" in second
    assert "event" not in second


def test_first_batch_has_1000_integers(live_server: LiveServer) -> None:
    url = live_server(Settings())
    started = time.monotonic()

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        event = next(batches(response.iter_lines()))

    assert time.monotonic() - started < 1
    values = json.loads(event["data"])
    assert len(values) == 1_000
    assert all(isinstance(value, int) and 0 <= value <= 9_999 for value in values)
    assert seq(event) >= 0


def test_ids_go_up_by_1(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = batches(response.iter_lines())
        ids = [seq(next(stream)) for _ in range(3)]

    assert ids == [ids[0], ids[0] + 1, ids[0] + 2]


def test_two_clients_get_the_same_batch(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with (
        httpx2.stream("GET", f"{url}/stream", timeout=5) as first,
        httpx2.stream("GET", f"{url}/stream", timeout=5) as second,
    ):
        first_stream = batches(first.iter_lines())
        second_stream = batches(second.iter_lines())
        a = next(first_stream)
        b = next(second_stream)
        # A client that subscribed one tick earlier has one extra batch, so skip ahead to match.
        while seq(a) < seq(b):
            a = next(first_stream)
        while seq(b) < seq(a):
            b = next(second_stream)

    assert shared_id(a) == shared_id(b)
    assert a["data"] == b["data"]


def test_batch_id_has_four_parts_of_digits(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        event = next(batches(response.iter_lines()))

    parts = event["id"].split(":")
    assert len(parts) == 4
    assert all(part.isascii() and part.isdigit() for part in parts)


def test_batch_times_are_in_order_and_the_data_is_an_array_of_integers(
    live_server: LiveServer,
) -> None:
    url = live_server(Settings())
    before = time.time_ns() // 1_000

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        event = next(batches(response.iter_lines()))
    after = time.time_ns() // 1_000

    started, encoded, sent = times(event)
    assert started <= encoded <= sent
    assert before <= sent <= after
    assert sent - started <= 1_000_000
    data = json.loads(event["data"])
    assert isinstance(data, list)
    assert all(isinstance(value, int) for value in data)


def test_two_clients_get_the_same_started_and_encoded_times(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with (
        httpx2.stream("GET", f"{url}/stream", timeout=5) as first,
        httpx2.stream("GET", f"{url}/stream", timeout=5) as second,
    ):
        first_stream = batches(first.iter_lines())
        second_stream = batches(second.iter_lines())
        a = next(first_stream)
        b = next(second_stream)
        # A client that subscribed one tick earlier has one extra batch, so skip ahead to match.
        while seq(a) < seq(b):
            a = next(first_stream)
        while seq(b) < seq(a):
            b = next(second_stream)

    assert seq(a) == seq(b)
    assert times(a)[:2] == times(b)[:2]


def test_started_goes_up_across_three_batches_in_a_row(live_server: LiveServer) -> None:
    url = live_server(Settings())

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = batches(response.iter_lines())
        three = [next(stream) for _ in range(3)]

    first = seq(three[0])
    assert [seq(event) for event in three] == [first, first + 1, first + 2]
    started = [times(event)[0] for event in three]
    assert started[0] < started[1] < started[2]


def test_idle_stream_sends_ping(live_server: LiveServer, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("fastapi.routing._PING_INTERVAL", 0.1)
    url = live_server(Settings(samples_per_second=1))

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        first = next(stream)
        second = next(stream)

    assert first["event"] == "update"
    assert json.loads(first["data"])["samples_per_second"] == 1
    assert second == {"comment": "ping"}


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
        stream = batches(response.iter_lines())
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
        stream = batches(response.iter_lines())
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
        stream = batches(response.iter_lines())
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

    assert seq(event) == seq(last) + 1


def test_paused_stream_sends_ping(live_server: LiveServer, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("fastapi.routing._PING_INTERVAL", 0.1)
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = batches(response.iter_lines())
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
        first_stream = batches(first.iter_lines())
        second_stream = batches(second.iter_lines())
        next(first_stream)
        next(second_stream)
        admin(url, "PATCH", "/admin/settings", {"max_value": 3})
        a = skip_stale(first_stream, is_new)
        b = skip_stale(second_stream, is_new)
        # A client that is one batch ahead skips to match, as in the test above.
        while seq(a) < seq(b):
            a = next(first_stream)
        while seq(b) < seq(a):
            b = next(second_stream)

    assert shared_id(a) == shared_id(b)
    assert a["data"] == b["data"]


def test_patch_sends_an_update_event(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        next(stream)
        admin(url, "PATCH", "/admin/settings", {"samples_per_second": 20})
        packet = next_update(stream)

    assert packet["samples_per_second"] == 20
    assert packet["paused"] is False


def test_pause_and_resume_each_send_an_update_event(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        next(stream)
        admin(url, "POST", "/admin/pause")
        after_pause = next_update(stream)
        admin(url, "POST", "/admin/resume")
        after_resume = next_update(stream)

    assert after_pause["paused"] is True
    assert after_resume["paused"] is False


def test_client_that_connects_during_a_pause_gets_paused_first(live_server: LiveServer) -> None:
    url = live_server(ADMIN)
    admin(url, "POST", "/admin/pause")

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        first = next(events(response.iter_lines()))

    assert first["event"] == "update"
    assert json.loads(first["data"])["paused"] is True


def test_update_event_leaves_no_gap_in_the_batch_ids(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    with httpx2.stream("GET", f"{url}/stream", timeout=5) as response:
        stream = events(response.iter_lines())
        next(stream)
        ids = [seq(next(stream))]
        admin(url, "PATCH", "/admin/settings", {"max_value": 3})
        # Read the batches up to the update event, and then 2 batches more.
        for event in stream:
            if event.get("event") == "update":
                break
            ids.append(seq(event))
        ids += [seq(next(stream)) for _ in range(2)]

    assert ids == list(range(ids[0], ids[0] + len(ids)))


def test_two_clients_each_get_the_update_event(live_server: LiveServer) -> None:
    url = live_server(ADMIN)

    with (
        httpx2.stream("GET", f"{url}/stream", timeout=5) as first,
        httpx2.stream("GET", f"{url}/stream", timeout=5) as second,
    ):
        first_stream = events(first.iter_lines())
        second_stream = events(second.iter_lines())
        next(first_stream)
        next(second_stream)
        admin(url, "PATCH", "/admin/settings", {"max_value": 3})
        a = next_update(first_stream)
        b = next_update(second_stream)

    assert a["max_value"] == 3
    assert b["max_value"] == 3
