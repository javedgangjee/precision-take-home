import random

from app.generator import BatchGenerator
from app.settings import Settings


def make(seed: int = 0, **values: int) -> BatchGenerator:
    return BatchGenerator(Settings.model_validate(values), random.Random(seed))


def test_default_batch_holds_250_integers() -> None:
    assert len(make().next_batch()) == 250


def test_1000_per_second_at_1000_ms_holds_1000_integers() -> None:
    generator = make(samples_per_second=1_000, batch_interval_ms=1_000)

    assert len(generator.next_batch()) == 1_000


def test_1_per_second_at_50_ms_gives_one_value_in_20_calls() -> None:
    generator = make(samples_per_second=1, batch_interval_ms=50)

    sizes = [len(generator.next_batch()) for _ in range(20)]

    assert sizes.count(0) == 19
    assert sizes.count(1) == 1


def test_30_per_second_at_50_ms_gives_30_values_in_20_calls() -> None:
    generator = make(samples_per_second=30, batch_interval_ms=50)

    assert sum(len(generator.next_batch()) for _ in range(20)) == 30


def test_values_cover_0_to_max_value_minus_1() -> None:
    generator = make(samples_per_second=100_000, batch_interval_ms=1_000, max_value=3)

    values = generator.next_batch()

    assert len(values) == 100_000
    assert set(values) == {0, 1, 2}


def test_max_value_1_gives_only_0() -> None:
    assert set(make(max_value=1).next_batch()) == {0}


def test_fixed_seed_gives_same_batch() -> None:
    assert make(seed=42).next_batch() == make(seed=42).next_batch()
