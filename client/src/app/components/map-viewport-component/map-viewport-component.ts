import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  Inject,
  PLATFORM_ID,
} from '@angular/core';

import { fromEvent, lastValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConversionService } from '../../services/conversion-service';
import { MapRenderer } from '../../model/map-renderer';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map-viewport-component',
  imports: [],
  templateUrl: './map-viewport-component.html',
  styleUrl: './map-viewport-component.scss'
})
export class MapViewportComponent implements OnInit, OnDestroy {

  private platformIsBrowser: boolean;

  @ViewChild('viewerCanvas', { static: true })
  viewerCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() shadingEnabled: boolean = false;
  @Output() shadingEnabledChange = new EventEmitter<boolean>();
  @Output() conversionError = new EventEmitter<string>();

  private renderer!: MapRenderer;
  private destroy$ = new Subject<void>();

  constructor(
    private conversionSrvc: ConversionService,
    @Inject(PLATFORM_ID) platformId: Object
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
      // Use the Angular service for conversion
      const json = await lastValueFrom(this.conversionSrvc.octomap2json(file));
      if (!json?.voxels || !json?.resolution) {
        console.error('Invalid JSON response:', json);
        this.conversionError.emit('Invalid JSON response from conversion.');
        return;
      }
      this.renderer.setMap(json);
      this.renderer.renderVoxels(this.shadingEnabled);
    } catch (err: any) {
      console.error('Conversion error:', err);
      this.conversionError.emit(err.message || 'Unknown conversion error.');
    }
  }

  handleShadingModeToggle(checked: boolean): void {
    this.shadingEnabled = checked;
    this.shadingEnabledChange.emit(this.shadingEnabled);
    if (!this.renderer.hasMap()) {
      if (this.shadingEnabled) {
        const message = 'No map data to render.';
        console.warn(message);
        // TODO Check more 'Angulary' way to show messages (e.g., MatSnackBar)
        alert(message);
      }
      return;
    }
    this.renderer.renderVoxels(this.shadingEnabled);
  }

  private handleSetFocus(event: MouseEvent): void {
    this.renderer.changeFocus(event);
  }

}
