/// <reference lib="webworker" />

import { BatchGenerator } from './batch-generator';
import { BatchQueue } from './batch-queue';
import { TestSourceSettings } from './test-source-settings';

// The first message holds the settings. The worker then makes one batch per interval
// and puts it in the queue. Each later message is an ack from the main thread.
const queue = new BatchQueue((batch) => postMessage(batch));

addEventListener(
  'message',
  ({ data }: MessageEvent<TestSourceSettings>) => {
    const generator = new BatchGenerator(data);
    setInterval(() => {
      const batch = generator.next();
      if (batch !== null) queue.push(batch);
    }, data.interval);
    addEventListener('message', () => queue.ack());
  },
  { once: true },
);
