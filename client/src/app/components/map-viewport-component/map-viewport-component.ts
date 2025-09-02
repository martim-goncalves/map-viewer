import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  AfterViewInit,
  effect,
  Injector,
  runInInjectionContext
} from '@angular/core';

import { fromEvent, lastValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConversionService } from '../../services/conversion-service';
import { MapRenderer } from '../../model/map/map-renderer';
import { isPlatformBrowser } from '@angular/common';
import { MapOptionsComponent } from '../map-options-component/map-options-component';

@Component({
  selector: 'app-map-viewport-component',
  imports: [MapOptionsComponent],
  templateUrl: './map-viewport-component.html',
  styleUrl: './map-viewport-component.scss'
})
export class MapViewportComponent implements OnInit, OnDestroy, AfterViewInit {

  private platformIsBrowser: boolean;

  @ViewChild('viewerCanvas', { static: true })
  viewerCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild(MapOptionsComponent)
  mapOptions!: MapOptionsComponent;

  private renderer!: MapRenderer;
  private destroy$ = new Subject<void>();

  constructor(
    private conversionSrvc: ConversionService,
    @Inject(PLATFORM_ID) platformId: Object,
    private injector: Injector
  ) {
    this.platformIsBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.platformIsBrowser) {
      this.renderer = new MapRenderer();
      this.renderer.init(this.viewerCanvas);
      this.addEventListeners();
    } else {
      console.warn(
        '[MapViewportComponent] - (Lazy Renderer): Not running on the',
        'browser, Three.js will not be initialized.'
      );
    }
  }

  ngAfterViewInit(): void {
    if (this.platformIsBrowser) {
      runInInjectionContext(this.injector, () => {
        // Effect for shading
        effect(() => {
          const shadingEnabled = this.mapOptions.shadingEnabled();
          this.renderer.renderVoxels(shadingEnabled);
        });

        // Effect for camera projection
        effect(() => {
          const projectionMode = this.mapOptions.camProjectMode();
          this.renderer.setCameraProjectionMode(projectionMode);
        });

        // Effect for bounds
        effect(() => {
          const bounds = this.mapOptions.selectedBounds();
          const header = 'MapViewportComponent - Region Bounds:';
          const message = `${header} ${JSON.stringify(bounds)}`;
          const bboxValid = bounds.minX < bounds.maxX ||
                            bounds.minY < bounds.maxY ||
                            bounds.minZ < bounds.maxZ;
          if (bboxValid) {
            this.renderer.setBounds(bounds);
            this.renderer.renderVoxels(this.mapOptions.shadingEnabled());
            console.debug(message);
          } else {
            this.renderer.clearBounds();
            this.renderer.renderVoxels(this.mapOptions.shadingEnabled());
            console.debug(header, 'Cleared');
          }
        });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.platformIsBrowser) {
      this.renderer.destroy();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onWindowResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const size = [window.innerWidth, window.innerHeight];
    this.renderer.resize(aspect, size);
  }

  private addEventListeners(): void {
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onWindowResize());
    fromEvent(this.renderer.getDomElement(), 'dblclick')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleSetFocus(event as MouseEvent));
  }

  async handleFileInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const json = await lastValueFrom(this.conversionSrvc.octomap2json(file));
      if (!json?.voxels || !json?.resolution) {
        console.error('Invalid JSON response:', json);
        return;
      }
      this.renderer.setMap(json);
      this.renderer.renderVoxels(this.mapOptions.shadingEnabled());
    } catch (err: any) {
      console.error('Conversion error:', err);
    }
  }

  handleExport(): void {
    if (!this.renderer.hasMap()) {
      alert('No map data to export.');
      return;
    }

    const mapData = this.renderer.getMapData();
    if (mapData) {
      this.conversionSrvc.exportMap(mapData).subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map-export.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
    }
  }

  private handleSetFocus(event: MouseEvent): void {
    this.renderer.changeFocus(event);
  }
}
