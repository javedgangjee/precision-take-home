import { Component, inject } from '@angular/core';
import { HeatMap } from './heatmap/heat-map';
import { SidePanel } from './panel/side-panel';
import { TestSource } from './source/test-source';

@Component({
  selector: 'app-root',
  imports: [HeatMap, SidePanel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // Feature 4 decides how the user picks the test source or the server.
    inject(TestSource).start();
  }
}
