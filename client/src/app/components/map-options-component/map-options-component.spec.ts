import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapOptionsComponent } from './map-options-component';

describe('MapOptionsComponent', () => {
  let component: MapOptionsComponent;
  let fixture: ComponentFixture<MapOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
