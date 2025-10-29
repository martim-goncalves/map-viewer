import { Map } from './map';
import { MapData } from './map-data';

describe('Map', () => {
  it('should create an instance', () => {
    const mockMapData: MapData = { voxels: [], resolution: 1.0 };
    expect(new Map(mockMapData)).toBeTruthy();
  });

  it('should return correct bounds', () => {
    const mapData: MapData = {
      voxels: [
        { x: 1, y: 2, z: 3, color: [0,0,0] },
        { x: -1, y: 5, z: 0, color: [0,0,0] },
        { x: 10, y: -3, z: 8, color: [0,0,0] },
      ],
      resolution: 1.0
    };
    const map = new Map(mapData);
    const bounds = map.getBounds();
    expect(bounds.minX).toBe(-1);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(-3);
    expect(bounds.maxY).toBe(5);
    expect(bounds.minZ).toBe(0);
    expect(bounds.maxZ).toBe(8);
  });

  it('should return zero bounds for empty map', () => {
    const mapData: MapData = { voxels: [], resolution: 1.0 };
    const map = new Map(mapData);
    const bounds = map.getBounds();
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(0);
    expect(bounds.minZ).toBe(0);
    expect(bounds.maxZ).toBe(0);
  });
});
