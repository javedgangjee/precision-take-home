import logging
from typing import Any

import pytest
from pydantic import ValidationError

from app.settings import SettingsUpdate, load_settings


def test_defaults_with_no_environment() -> None:
    settings = load_settings({})

    assert settings.samples_per_second == 20_000
    assert settings.batch_interval_ms == 50
    assert settings.max_value == 10_000
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
        ("SAMPLES_PER_SECOND", "0", "samples_per_second", 20_000),
        ("SAMPLES_PER_SECOND", "1000001", "samples_per_second", 20_000),
        ("BATCH_INTERVAL_MS", "49", "batch_interval_ms", 50),
        ("BATCH_INTERVAL_MS", "1001", "batch_interval_ms", 50),
        ("MAX_VALUE", "0", "max_value", 10_000),
        ("MAX_VALUE", "10001", "max_value", 10_000),
        ("SAMPLES_PER_SECOND", "abc", "samples_per_second", 20_000),
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


def test_update_with_all_fields_at_the_upper_limits_is_valid() -> None:
    body = {"samples_per_second": 1_000_000, "batch_interval_ms": 1_000, "max_value": 10_000}

    update = SettingsUpdate.model_validate(body)

    assert update.model_dump() == body


def test_update_with_one_field_leaves_the_others_unset() -> None:
    update = SettingsUpdate.model_validate({"samples_per_second": 1})

    assert update.samples_per_second == 1
    assert update.model_fields_set == {"samples_per_second"}
    assert update.batch_interval_ms is None
    assert update.max_value is None


@pytest.mark.parametrize(
    "body",
    [
        {"samples_per_second": 0},
        {"batch_interval_ms": 49},
        {"max_value": 10_001},
        {"samples_per_second": "abc"},
        {"max_value": None},
        {"cors_origins": ["http://a.test"]},
    ],
)
def test_update_with_a_bad_value_or_an_unknown_field_is_not_valid(body: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        SettingsUpdate.model_validate(body)


def test_reads_admin_token_from_environment() -> None:
    assert load_settings({"ADMIN_TOKEN": "abc"}).admin_token == "abc"


def test_admin_token_is_unset_with_no_environment() -> None:
    assert load_settings({}).admin_token is None
