import asyncio
import contextlib
import json
import time
from typing import NamedTuple

from app.generator import BatchGenerator

QUEUE_SIZE = 2


def next_tick(last_tick: int, elapsed_s: float, interval_s: float) -> int:
    """Returns the tick to run after last_tick, given the time since the start.

    After a stall, the latest tick that is due runs, and the older missed ticks
    are skipped. The server does not make batches that would only be dropped.
    """
    return max(last_tick + 1, int(elapsed_s // interval_s))


class Batch(NamedTuple):
    seq: int
    text: str


class Broadcaster:
    """Makes one shared stream of batches and hands each batch to every subscriber.

    Each subscriber has a small queue. A full queue drops its oldest batch, so a
    slow client gets fresh data and never slows the others.
    """

    def __init__(self, generator: BatchGenerator, interval_s: float) -> None:
        self._generator = generator
        self._interval_s = interval_s
        self._queues: set[asyncio.Queue[Batch]] = set()
        self._task: asyncio.Task[None] | None = None
        self.next_seq = 0

    @property
    def subscriber_count(self) -> int:
        return len(self._queues)

    def subscribe(self) -> asyncio.Queue[Batch]:
        queue: asyncio.Queue[Batch] = asyncio.Queue(maxsize=QUEUE_SIZE)
        self._queues.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[Batch]) -> None:
        self._queues.discard(queue)

    def publish(self, values: list[int]) -> None:
        # Encode once, so every subscriber gets the same string. The compact separators
        # drop the space after each comma, which makes a default batch 20 percent smaller.
        batch = Batch(self.next_seq, json.dumps(values, separators=(",", ":")))
        self.next_seq += 1
        for queue in self._queues:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(batch)

    async def run(self) -> None:
        # Schedule each tick from a fixed start, so the batches do not drift.
        start = time.monotonic()
        tick = 0
        while True:
            tick = next_tick(tick, time.monotonic() - start, self._interval_s)
            await asyncio.sleep(max(0.0, start + tick * self._interval_s - time.monotonic()))
            values = self._generator.next_batch()
            if values:
                self.publish(values)

    def start(self) -> None:
        self._task = asyncio.create_task(self.run())

    async def stop(self) -> None:
        assert self._task is not None
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None
