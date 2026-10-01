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

    assert [first.get_nowait().text for _ in range(2)] == ["[1,2]", "[3]"]
    assert [second.get_nowait().text for _ in range(2)] == ["[1,2]", "[3]"]


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


def test_pause_publishes_no_batch_and_resume_goes_on_from_the_next_sequence_number() -> None:
    async def pause_then_resume() -> tuple[int, int, int, int]:
        broadcaster = make()
        queue = broadcaster.subscribe()
        broadcaster.start()
        await asyncio.sleep(0.2)
        broadcaster.pause()
        last_before = max(queue.get_nowait().seq for _ in range(queue.qsize()))
        seq_before = broadcaster.next_seq
        await asyncio.sleep(0.5)
        seq_after = broadcaster.next_seq
        published_during_pause = queue.qsize()
        broadcaster.resume()
        first_after = (await queue.get()).seq
        await broadcaster.stop()
        assert published_during_pause == 0
        return seq_before, seq_after, last_before, first_after

    seq_before, seq_after, last_before, first_after = asyncio.run(pause_then_resume())

    assert seq_after == seq_before
    assert first_after == last_before + 1


def test_pause_while_paused_and_resume_while_running_change_nothing() -> None:
    broadcaster = make()

    broadcaster.resume()
    assert broadcaster.paused is False
    broadcaster.pause()
    broadcaster.pause()
    assert broadcaster.paused is True
    broadcaster.resume()
    assert broadcaster.paused is False


def test_update_to_200_ms_publishes_about_5_batches_per_second() -> None:
    async def run_for_1_second_after_update() -> int:
        broadcaster = make()
        broadcaster.start()
        await asyncio.sleep(0.1)
        broadcaster.update(Settings(batch_interval_ms=200))
        seq_at_update = broadcaster.next_seq
        await asyncio.sleep(1)
        await broadcaster.stop()
        return broadcaster.next_seq - seq_at_update

    assert 4 <= asyncio.run(run_for_1_second_after_update()) <= 6


def test_resume_after_a_1_second_pause_sends_no_burst() -> None:
    async def count_in_60_ms_after_resume() -> int:
        broadcaster = make()
        broadcaster.start()
        await asyncio.sleep(0.1)
        broadcaster.pause()
        await asyncio.sleep(1)
        broadcaster.resume()
        seq_at_resume = broadcaster.next_seq
        await asyncio.sleep(0.06)
        await broadcaster.stop()
        return broadcaster.next_seq - seq_at_resume

    assert asyncio.run(count_in_60_ms_after_resume()) <= 2
