import logging

import pytest

from app.settings import load_settings


def test_defaults_with_no_environment() -> None:
    settings = load_settings({})

    assert settings.samples_per_second == 100_000
    assert settings.batch_interval_ms == 50
    assert settings.max_value == 1_024
    assert settings.cors_origins == ["http://localhost:4200"]


def test_reads_values_from_environment() -> None:
    settings = load_settings(
        {"SAMPLES_PER_SECOND": "1", "BATCH_INTERVAL_MS": "1000", "MAX_VALUE": "1"}
    )

    assert settings.samples_per_second == 1
    assert settings.batch_interval_ms == 1_000
    assert settings.max_value == 1


def test_splits_cors_origins() -> None:
    settings = load_settings({"CORS_ORIGINS": "http://a.test,http://b.test"})

    assert settings.cors_origins == ["http://a.test", "http://b.test"]


@pytest.mark.parametrize(
    ("name", "value", "field", "default"),
    [
        ("SAMPLES_PER_SECOND", "0", "samples_per_second", 100_000),
        ("SAMPLES_PER_SECOND", "100001", "samples_per_second", 100_000),
        ("BATCH_INTERVAL_MS", "49", "batch_interval_ms", 50),
        ("BATCH_INTERVAL_MS", "1001", "batch_interval_ms", 50),
        ("MAX_VALUE", "0", "max_value", 1_024),
        ("MAX_VALUE", "10001", "max_value", 1_024),
        ("SAMPLES_PER_SECOND", "abc", "samples_per_second", 100_000),
    ],
)
def test_bad_value_warns_and_uses_default(
    caplog: pytest.LogCaptureFixture, name: str, value: str, field: str, default: int
) -> None:
    with caplog.at_level(logging.WARNING):
        settings = load_settings({name: value})

    assert getattr(settings, field) == default
    assert name in caplog.text


def test_strips_trailing_slash_from_cors_origins() -> None:
    # A browser never sends a trailing slash in the Origin header.
    settings = load_settings({"CORS_ORIGINS": "http://a.test/, http://b.test"})

    assert settings.cors_origins == ["http://a.test", "http://b.test"]
