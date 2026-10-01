import logging
import os
from collections.abc import Mapping
from typing import Annotated, Any, Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

logger = logging.getLogger(__name__)


SamplesPerSecond = Annotated[int, Field(ge=1, le=100_000)]
BatchIntervalMs = Annotated[int, Field(ge=50, le=1_000)]
MaxValue = Annotated[int, Field(ge=1, le=10_000)]


class Settings(BaseModel):
    samples_per_second: SamplesPerSecond = 5_000
    batch_interval_ms: BatchIntervalMs = 50
    max_value: MaxValue = 1_024
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:4200"])
    # With no token, the server has no admin API.
    admin_token: str | None = None


class SettingsUpdate(BaseModel):
    """A change to the stream settings. A field that is not set keeps its value.

    Strict mode rejects a value that is not an integer, such as "20" or 20.5.
    """

    model_config = ConfigDict(extra="forbid", strict=True)

    samples_per_second: SamplesPerSecond | None = None
    batch_interval_ms: BatchIntervalMs | None = None
    max_value: MaxValue | None = None

    @model_validator(mode="after")
    def reject_null(self) -> Self:
        # None is the default for a field that is not set. A null in the request is not valid.
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} must be an integer")
        return self


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
        # A browser never sends a trailing slash in the Origin header, so strip it.
        origins = (origin.strip().rstrip("/") for origin in values["cors_origins"].split(","))
        values["cors_origins"] = [origin for origin in origins if origin]

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
