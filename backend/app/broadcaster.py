import asyncio
import contextlib
import json
import time
from collections.abc import Callable
from typing import NamedTuple

from pydantic import BaseModel

from app.generator import BatchGenerator
from app.settings import Settings

QUEUE_SIZE = 2


def next_tick(last_tick: int, elapsed_s: float, interval_s: float) -> int:
    """Returns the tick to run after last_tick, given the time since the start.

    After a stall, the latest tick that is due runs, and the older missed ticks
    are skipped. The server does not make batches that would only be dropped.
    """
    return max(last_tick + 1, int(elapsed_s // interval_s))


def epoch_us() -> int:
    """Returns the server time as the microseconds since the Unix epoch."""
    return time.time_ns() // 1_000


class Batch(NamedTuple):
    seq: int
    text: str
    # The two times are in microseconds since the Unix epoch. They go in the event id.
    started: int
    encoded: int


class SettingsPacket(BaseModel):
    """The settings and the pause state. The stream sends it, and the admin API returns it."""

    samples_per_second: int
    batch_interval_ms: int
    max_value: int
    paused: bool


class Broadcaster:
    """Makes one shared stream of batches and hands each batch to every subscriber.

    Each subscriber has a small queue. A full queue drops its oldest batch, so a
    slow client gets fresh data and never slows the others.

    The broadcaster also keeps the settings packet. The packet never goes into a
    queue, so a slow client cannot lose it. Each stream reads the packet from here
    when the change counter moves.
    """

    def __init__(
        self, generator: BatchGenerator, settings: Settings, clock: Callable[[], int] = epoch_us
    ) -> None:
        self._generator = generator
        self._settings = settings
        # Tests replace the clock.
        self._clock = clock
        # None is a wake item. It tells an idle stream to look at the change counter.
        self._queues: set[asyncio.Queue[Batch | None]] = set()
        self._task: asyncio.Task[None] | None = None
        # Set on each change to the settings or the pause state, to wake the run loop.
        self._changed = asyncio.Event()
        self.paused = False
        self.next_seq = 0
        # Goes up by 1 on each change to the settings or the pause state.
        self.version = 0
        self._build_packet()

    @property
    def subscriber_count(self) -> int:
        return len(self._queues)

    def subscribe(self) -> asyncio.Queue[Batch | None]:
        queue: asyncio.Queue[Batch | None] = asyncio.Queue(maxsize=QUEUE_SIZE)
        self._queues.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[Batch | None]) -> None:
        self._queues.discard(queue)

    def make_batch(self) -> None:
        """Make one batch and publish it. An empty batch is not published."""
        # The generator makes every value of the batch after this time.
        started = self._clock()
        values = self._generator.next_batch()
        if values:
            self.publish(values, started)

    def publish(self, values: list[int], started: int) -> None:
        # Encode once, so every subscriber gets the same string. The compact separators
        # drop the space after each comma, which makes a default batch 20 percent smaller.
        text = json.dumps(values, separators=(",", ":"))
        batch = Batch(self.next_seq, text, started, encoded=self._clock())
        self.next_seq += 1
        for queue in self._queues:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(batch)

    def update(self, settings: Settings) -> None:
        """Use new settings from the next batch. The schedule starts again from now."""
        self._generator.update(settings)
        self._settings = settings
        self._notify()

    def pause(self) -> None:
        if not self.paused:
            self.paused = True
            self._notify()

    def resume(self) -> None:
        """Start the schedule again from now, so the batches that the pause skipped are not sent."""
        if self.paused:
            self.paused = False
            self._notify()

    def _build_packet(self) -> None:
        self.state = SettingsPacket(
            samples_per_second=self._settings.samples_per_second,
            batch_interval_ms=self._settings.batch_interval_ms,
            max_value=self._settings.max_value,
            paused=self.paused,
        )
        # Encode once, so every stream sends the same string.
        self.packet = self.state.model_dump_json()

    def _notify(self) -> None:
        """Record a change, and wake the run loop and each stream that waits on an empty queue."""
        self._build_packet()
        self.version += 1
        self._changed.set()
        for queue in self._queues:
            # A stream with a batch in its queue wakes for the batch and then sees the change.
            if queue.empty():
                queue.put_nowait(None)

    async def run(self) -> None:
        while True:
            self._changed.clear()
            if self.paused:
                # No batch is made, so the sequence number does not advance.
                await self._changed.wait()
            else:
                await self._run_schedule()

    async def _run_schedule(self) -> None:
        """Publish batches on a fixed schedule until a setting or the pause state changes."""
        interval_s = self._settings.batch_interval_ms / 1_000
        # Schedule each tick from a fixed start, so the batches do not drift.
        start = time.monotonic()
        tick = 0
        while True:
            tick = next_tick(tick, time.monotonic() - start, interval_s)
            delay = max(0.0, start + tick * interval_s - time.monotonic())
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(self._changed.wait(), delay)
            # A change can arrive after the timeout fires and before this task runs again.
            # The check stops a batch from going out after a pause.
            if self._changed.is_set():
                return
            self.make_batch()

    def start(self) -> None:
        self._task = asyncio.create_task(self.run())

    async def stop(self) -> None:
        assert self._task is not None
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None
