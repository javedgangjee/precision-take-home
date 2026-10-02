import asyncio
import itertools
import json
import random
from collections.abc import Callable

from app.broadcaster import Batch, Broadcaster, next_tick
from app.generator import BatchGenerator
from app.settings import Settings
from tests.conftest import DEFAULT_PACKET


def make() -> Broadcaster:
    return Broadcaster(BatchGenerator(Settings(), random.Random(0)), Settings())


def make_with_clock(settings: Settings) -> Broadcaster:
    """Make a broadcaster with a clock that returns 100 and goes up by 100 on each call."""
    clock: Callable[[], int] = itertools.count(100, 100).__next__
    return Broadcaster(BatchGenerator(settings, random.Random(0)), settings, clock)


def take(queue: asyncio.Queue[Batch | None]) -> Batch:
    """Take the next item from the queue. It must be a batch and not a wake item."""
    item = queue.get_nowait()
    assert item is not None
    return item


def test_two_subscribers_get_the_same_batches_in_order() -> None:
    broadcaster = make()
    first = broadcaster.subscribe()
    second = broadcaster.subscribe()

    broadcaster.publish([1, 2], 0)
    broadcaster.publish([3], 0)

    assert [take(first).text for _ in range(2)] == ["[1,2]", "[3]"]
    assert [take(second).text for _ in range(2)] == ["[1,2]", "[3]"]


def test_batch_is_encoded_once() -> None:
    broadcaster = make()
    first = broadcaster.subscribe()
    second = broadcaster.subscribe()
    values = BatchGenerator(Settings(), random.Random(0)).next_batch()

    broadcaster.publish(values, 0)

    text = take(first).text
    assert take(second).text is text
    assert json.loads(text) == values


def test_sequence_numbers_start_at_0_and_go_up_by_1() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()

    broadcaster.publish([1], 0)
    broadcaster.publish([2], 0)

    assert [take(queue).seq for _ in range(2)] == [0, 1]


def test_full_queue_drops_its_oldest_batch() -> None:
    broadcaster = make()
    full = broadcaster.subscribe()
    other = broadcaster.subscribe()

    broadcaster.publish([1], 0)
    broadcaster.publish([2], 0)
    other_first = take(other)
    other_second = take(other)
    broadcaster.publish([3], 0)

    assert full.qsize() == 2
    assert [take(full).seq for _ in range(2)] == [1, 2]
    assert [other_first.seq, other_second.seq, take(other).seq] == [0, 1, 2]


def test_unsubscribe_removes_the_queue() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()

    broadcaster.unsubscribe(queue)
    broadcaster.publish([1], 0)

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
        last_before = max(take(queue).seq for _ in range(queue.qsize()))
        seq_before = broadcaster.next_seq
        await asyncio.sleep(0.5)
        seq_after = broadcaster.next_seq
        published_during_pause = queue.qsize()
        broadcaster.resume()
        # The resume puts a wake item in the empty queue, ahead of the first new batch.
        assert await queue.get() is None
        first = await queue.get()
        assert first is not None
        first_after = first.seq
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


def test_packet_holds_the_default_settings_with_no_spaces() -> None:
    assert make().packet == DEFAULT_PACKET


def test_update_builds_the_packet_again_and_adds_1_to_the_counter() -> None:
    broadcaster = make()
    version = broadcaster.version

    broadcaster.update(Settings(samples_per_second=20))

    assert json.loads(broadcaster.packet)["samples_per_second"] == 20
    assert broadcaster.version == version + 1


def test_pause_sets_paused_in_the_packet_and_a_second_pause_changes_nothing() -> None:
    broadcaster = make()
    version = broadcaster.version

    broadcaster.pause()
    packet = broadcaster.packet

    assert json.loads(packet)["paused"] is True
    assert broadcaster.version == version + 1

    broadcaster.pause()

    assert broadcaster.packet == packet
    assert broadcaster.version == version + 1


def test_resume_clears_paused_in_the_packet_and_a_second_resume_changes_nothing() -> None:
    broadcaster = make()
    broadcaster.pause()
    version = broadcaster.version

    broadcaster.resume()
    packet = broadcaster.packet

    assert json.loads(packet)["paused"] is False
    assert broadcaster.version == version + 1

    broadcaster.resume()

    assert broadcaster.packet == packet
    assert broadcaster.version == version + 1


def test_update_pause_and_resume_keep_the_next_sequence_number() -> None:
    broadcaster = make()
    broadcaster.publish([1], 0)
    next_seq = broadcaster.next_seq

    broadcaster.update(Settings(samples_per_second=20))
    broadcaster.pause()
    broadcaster.resume()

    assert broadcaster.next_seq == next_seq


def test_pause_puts_one_wake_item_in_an_empty_queue() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()

    broadcaster.pause()

    assert queue.qsize() == 1
    assert not isinstance(queue.get_nowait(), Batch)


def test_pause_puts_no_wake_item_in_a_queue_with_2_batches() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()
    broadcaster.publish([1], 0)
    broadcaster.publish([2], 0)

    broadcaster.pause()

    assert queue.qsize() == 2
    assert [(batch.seq, batch.text) for batch in (take(queue), take(queue))] == [
        (0, "[1]"),
        (1, "[2]"),
    ]


def test_2_new_batches_push_a_wake_item_out_of_the_queue() -> None:
    broadcaster = make()
    queue = broadcaster.subscribe()
    broadcaster.pause()

    broadcaster.publish([1], 0)
    broadcaster.publish([2], 0)

    assert queue.qsize() == 2
    assert take(queue).seq + 1 == take(queue).seq


def test_make_batch_takes_the_started_and_encoded_times_from_the_clock() -> None:
    broadcaster = make_with_clock(Settings())
    queue = broadcaster.subscribe()

    broadcaster.make_batch()
    broadcaster.make_batch()
    first = take(queue)
    second = take(queue)

    assert (first.started, first.encoded) == (100, 200)
    assert (second.started, second.encoded) == (300, 400)


def test_make_batch_gives_the_sequence_numbers_0_and_1() -> None:
    broadcaster = make_with_clock(Settings())
    queue = broadcaster.subscribe()

    broadcaster.make_batch()
    broadcaster.make_batch()

    assert [take(queue).seq for _ in range(2)] == [0, 1]


def test_two_subscribers_get_the_same_times_for_the_same_batch() -> None:
    broadcaster = make_with_clock(Settings())
    first = broadcaster.subscribe()
    second = broadcaster.subscribe()

    broadcaster.make_batch()
    a = take(first)
    b = take(second)

    assert (a.started, a.encoded) == (b.started, b.encoded)


def test_make_batch_makes_no_batch_when_the_generator_returns_no_values() -> None:
    broadcaster = make_with_clock(Settings(samples_per_second=1, batch_interval_ms=50))
    queue = broadcaster.subscribe()

    broadcaster.make_batch()

    assert queue.empty()
    assert broadcaster.next_seq == 0
