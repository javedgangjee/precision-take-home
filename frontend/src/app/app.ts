import { Component, DOCUMENT, inject } from '@angular/core';
import { HeatMap } from './heatmap/heat-map';
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
    }
  }
}
