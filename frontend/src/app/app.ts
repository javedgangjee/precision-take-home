import { Component, DOCUMENT, inject } from '@angular/core';
import { HeatMap } from './heatmap/heat-map';
import { ClockSync } from './latency/clock-sync';
import { exposeLatency, LatencyTracker } from './latency/latency-tracker';
import { SidePanel } from './panel/side-panel';
import { ServerSource } from './source/server-source';
import { readSourceSettings } from './source/source-settings';
import { TestSource } from './source/test-source';

@Component({
  selector: 'app-root',
  imports: [HeatMap, SidePanel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // The URL query picks the source. Only one source runs at a time.
    const settings = readSourceSettings(inject(DOCUMENT).location.search);
    if (settings.source === 'frontend') {
      inject(TestSource).start();
    } else {
      inject(ServerSource).start(settings.streamUrl);
      // The latency needs the server times, so only the server source has the measurement.
      void inject(ClockSync).start(settings.timeUrl);
      exposeLatency(inject(LatencyTracker));
    }
  }
}
