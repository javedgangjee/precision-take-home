/// <reference lib="webworker" />

import { BatchGenerator } from './batch-generator';
import { TestSourceSettings } from './test-source-settings';

// The first message holds the settings. The worker then posts one batch string per interval.
addEventListener(
  'message',
  ({ data }: MessageEvent<TestSourceSettings>) => {
    const generator = new BatchGenerator(data);
    setInterval(() => {
      const batch = generator.next();
      if (batch !== null) postMessage(batch);
    }, data.interval);
  },
  { once: true },
);
