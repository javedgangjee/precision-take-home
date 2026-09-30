import asyncio
import json
import random

from app.broadcaster import Broadcaster, next_tick
from app.generator import BatchGenerator
from app.settings import Settings


def make() -> Broadcaster:
    return Broadcaster(BatchGenerator(Settings(), random.Random(0)), 0.05)


def test_two_subscribers_get_the_same_batches_in_order() -> None:
    broadcaster = make()
    first = broadcaster.subscribe()
    second = broadcaster.subscribe()

    broadcaster.publish([1, 2])
    broadcaster.publish([3])

    assert [first.get_nowait().text for _ in range(2)] == ["[1, 2]", "[3]"]
    assert [second.get_nowait().text for _ in range(2)] == ["[1, 2]", "[3]"]


def test_batch_is_encoded_once() -> None:
    broadcaster = make()
    first = broadcaster.subscribe()
    second = broadcaster.subscribe()
    values = BatchGenerator(Settings(), random.Random(0)).next_batch()

    broadcaster.publish(values)

    text = first.get_nowait().text
    assert second.get_nowait().text is text
    assert json.loads(text) == values


def test_sequence_numbers_start_at_0_and_go_up_by_1() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()

    broadcaster.publish([1])
    broadcaster.publish([2])

    assert [queue.get_nowait().seq for _ in range(2)] == [0, 1]


def test_full_queue_drops_its_oldest_batch() -> None:
    broadcaster = make()
    full = broadcaster.subscribe()
    other = broadcaster.subscribe()

    broadcaster.publish([1])
    broadcaster.publish([2])
    other_first = other.get_nowait()
    other_second = other.get_nowait()
    broadcaster.publish([3])

    assert full.qsize() == 2
    assert [full.get_nowait().seq for _ in range(2)] == [1, 2]
    assert [other_first.seq, other_second.seq, other.get_nowait().seq] == [0, 1, 2]


def test_unsubscribe_removes_the_queue() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()

    broadcaster.unsubscribe(queue)
    broadcaster.publish([1])

    assert broadcaster.subscriber_count == 0
    assert queue.empty()


def test_task_publishes_about_20_batches_per_second() -> None:
    async def run_for_1_second() -> int:
        broadcaster = make()
        broadcaster.start()
        await asyncio.sleep(1)
        await broadcaster.stop()
        return broadcaster.next_seq

    assert 18 <= asyncio.run(run_for_1_second()) <= 22


def test_next_tick_is_the_following_tick_when_on_time() -> None:
    assert next_tick(3, elapsed_s=0.16, interval_s=0.05) == 4


def test_next_tick_runs_a_tick_that_is_less_than_one_interval_late() -> None:
    assert next_tick(3, elapsed_s=0.21, interval_s=0.05) == 4


def test_next_tick_skips_the_ticks_that_a_stall_missed() -> None:
    # Ticks 4 to 99 are missed. Tick 100 runs now, and the rest are skipped.
    assert next_tick(3, elapsed_s=5.01, interval_s=0.05) == 100
