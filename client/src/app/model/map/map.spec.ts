import { Map } from './map';
import { MapData } from './map-data';

describe('RegionSelector', () => {
  it('should create an instance', () => {
    const mockMapData: MapData = { voxels: [], resolution: 1.0 };
    expect(new Map(mockMapData)).toBeTruthy();
  });
});
