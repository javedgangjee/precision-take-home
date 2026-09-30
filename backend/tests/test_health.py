from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings

client = TestClient(create_app(Settings()))


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_the_configured_origin() -> None:
    response = client.get("/health", headers={"Origin": "http://localhost:4200"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"


def test_cors_blocks_other_origins() -> None:
    response = client.get("/health", headers={"Origin": "http://evil.test"})

    assert "access-control-allow-origin" not in response.headers


def test_cors_preflight_allows_last_event_id() -> None:
    # EventSource sends Last-Event-ID when it reconnects.
    response = client.options(
        "/stream",
        headers={
            "Origin": "http://localhost:4200",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "last-event-id",
        },
    )

    assert response.status_code == 200
    assert "last-event-id" in response.headers["access-control-allow-headers"].lower()
