import logging
import os
from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)


class Settings(BaseModel):
    samples_per_second: int = Field(default=100_000, ge=1, le=100_000)
    batch_interval_ms: int = Field(default=50, ge=50, le=1_000)
    max_value: int = Field(default=1_024, ge=1, le=10_000)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:4200"])


# Each setting reads the environment variable with the upper-case name of its field.
ENV_NAMES = {name: name.upper() for name in Settings.model_fields}


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    """Read the settings from the environment.

    A value that is out of range or not a number logs a warning and falls back to
    its default, so the server still starts.
    """
    source = os.environ if env is None else env
    values: dict[str, Any] = {}
    for field, env_name in ENV_NAMES.items():
        if env_name in source:
            values[field] = source[env_name]
    if "cors_origins" in values:
        values["cors_origins"] = [
            origin.strip() for origin in values["cors_origins"].split(",") if origin.strip()
        ]

    try:
        return Settings(**values)
    except ValidationError as error:
        for bad in {str(detail["loc"][0]) for detail in error.errors()}:
            logger.warning(
                "%s=%r is not valid, so the server uses the default",
                ENV_NAMES[bad],
                source[ENV_NAMES[bad]],
            )
            del values[bad]
        return Settings(**values)
