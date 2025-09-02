import { Component, signal, Output, EventEmitter } from '@angular/core';
import { Projection } from '../../model/map/projection';
import { RegionBounds } from '../../model/map/region-bounds';

@Component({
  selector: 'app-map-options-component',
  imports: [],
  templateUrl: './map-options-component.html',
  styleUrl: './map-options-component.scss'
})
export class MapOptionsComponent {

  Projection = Projection;

  @Output() export = new EventEmitter<void>();

  shadingEnabled = signal(false);
  camProjectMode = signal(Projection.PERSPECTIVE);
  selectedBounds = signal<RegionBounds>({
    minX: 0, maxX: 0,
    minY: 0, maxY: 0,
    minZ: 0, maxZ: 0
  });

  handleShadingModeToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.shadingEnabled.set(checked);
  }

  handleCameraProjectionToggle(mode: Projection): void {
    this.camProjectMode.set(mode);
  }

  updateBounds(bound: keyof RegionBounds, event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.selectedBounds.update(bounds => ({
      ...bounds,
      [bound]: value
    }));
  }
}
