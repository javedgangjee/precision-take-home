import random

from app.settings import Settings


class BatchGenerator:
    """Makes batches of uniform random integers from 0 to max_value - 1.

    When samples per second times the interval is not a whole number, the
    fraction carries to the next batch, so a call can return an empty batch.
    """

    def __init__(self, settings: Settings, rng: random.Random) -> None:
        self._rng = rng
        self.update(settings)

    def update(self, settings: Settings) -> None:
        """Use new settings from the next batch, and drop the carried fraction."""
        self._population = range(settings.max_value)
        # Samples per batch, in thousandths of a sample, so the carry stays exact.
        self._per_batch_milli = settings.samples_per_second * settings.batch_interval_ms
        self._carry_milli = 0

    def next_batch(self) -> list[int]:
        count, self._carry_milli = divmod(self._carry_milli + self._per_batch_milli, 1_000)
        return self._rng.choices(self._population, k=count)
