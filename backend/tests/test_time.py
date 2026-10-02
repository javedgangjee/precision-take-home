import time

from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings

client = TestClient(create_app(Settings()))


def test_time_returns_the_server_time_in_microseconds() -> None:
    before = time.time_ns() // 1_000
    response = client.get("/time")
    after = time.time_ns() // 1_000

    assert response.status_code == 200
    body = response.json()
    assert list(body) == ["epoch_us"]
    assert isinstance(body["epoch_us"], int)
    assert before <= body["epoch_us"] <= after


def test_time_tells_a_cache_not_to_keep_the_response() -> None:
    response = client.get("/time")

    assert response.headers["cache-control"] == "no-store"


def test_cors_allows_the_configured_origin_to_read_the_time() -> None:
    response = client.get("/time", headers={"Origin": "http://localhost:4200"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"


def test_time_needs_no_token_when_the_server_has_an_admin_token() -> None:
    response = TestClient(create_app(Settings(admin_token="test-token"))).get("/time")

    assert response.status_code == 200
