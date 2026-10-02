from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings

AUTH = {"Authorization": "Bearer test-token"}
DEFAULTS = {"samples_per_second": 20_000, "batch_interval_ms": 50, "max_value": 10_000}
REQUESTS = [
    ("GET", "/admin/settings", None),
    ("PATCH", "/admin/settings", {"samples_per_second": 20}),
    ("POST", "/admin/pause", None),
    ("POST", "/admin/resume", None),
]


@pytest.fixture
def client() -> Iterator[TestClient]:
    # The with block runs the lifespan, which starts the broadcaster.
    with TestClient(create_app(Settings(admin_token="test-token"))) as client:
        yield client


@pytest.fixture
def client_with_no_token() -> Iterator[TestClient]:
    with TestClient(create_app(Settings())) as client:
        yield client


def test_get_returns_the_settings_and_the_pause_state(client: TestClient) -> None:
    response = client.get("/admin/settings", headers=AUTH)

    assert response.status_code == 200
    assert response.json() == {**DEFAULTS, "paused": False}


def test_patch_changes_one_setting(client: TestClient) -> None:
    expected = {**DEFAULTS, "samples_per_second": 20, "paused": False}

    response = client.patch("/admin/settings", headers=AUTH, json={"samples_per_second": 20})

    assert response.status_code == 200
    assert response.json() == expected
    assert client.get("/admin/settings", headers=AUTH).json() == expected


@pytest.mark.parametrize(
    "body",
    [
        {"max_value": 0},
        {"samples_per_second": 20, "max_value": 0},
        {"cors_origins": ["http://a.test"]},
    ],
)
def test_patch_with_a_bad_body_changes_nothing(client: TestClient, body: dict[str, Any]) -> None:
    response = client.patch("/admin/settings", headers=AUTH, json=body)

    assert response.status_code == 422
    assert client.get("/admin/settings", headers=AUTH).json() == {**DEFAULTS, "paused": False}


def test_pause_twice_stays_paused(client: TestClient) -> None:
    for _ in range(2):
        response = client.post("/admin/pause", headers=AUTH)

        assert response.status_code == 200
        assert response.json()["paused"] is True


def test_resume_twice_stays_running(client: TestClient) -> None:
    client.post("/admin/pause", headers=AUTH)

    for _ in range(2):
        response = client.post("/admin/resume", headers=AUTH)

        assert response.status_code == 200
        assert response.json()["paused"] is False


def test_patch_during_a_pause_stays_paused(client: TestClient) -> None:
    client.post("/admin/pause", headers=AUTH)

    response = client.patch("/admin/settings", headers=AUTH, json={"samples_per_second": 20})

    assert response.status_code == 200
    assert response.json()["paused"] is True


@pytest.mark.parametrize(("method", "path", "body"), REQUESTS)
@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong"}])
def test_missing_or_wrong_token_returns_401(
    client: TestClient,
    method: str,
    path: str,
    body: dict[str, int] | None,
    headers: dict[str, str],
) -> None:
    response = client.request(method, path, headers=headers, json=body)

    assert response.status_code == 401


@pytest.mark.parametrize(("method", "path", "body"), REQUESTS)
def test_no_admin_token_returns_404(
    client_with_no_token: TestClient, method: str, path: str, body: dict[str, int] | None
) -> None:
    response = client_with_no_token.request(method, path, headers=AUTH, json=body)

    assert response.status_code == 404


def test_no_admin_token_keeps_health(client_with_no_token: TestClient) -> None:
    response = client_with_no_token.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
