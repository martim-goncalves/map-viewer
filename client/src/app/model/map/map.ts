import { MapData } from "./map-data";
import { RegionBounds } from "./region-bounds";

export class Map {

  private map: MapData;
  private selection: MapData | null = null;
  public getMap = (): MapData => !this.selection ? this.map : this.selection;
  public getBounds(): RegionBounds {
    const { voxels } = this.map;
    if (voxels.length === 0) {
      return { 
        minX: 0, maxX: 0, 
        minY: 0, maxY: 0, 
        minZ: 0, maxZ: 0 
      };
    }

    return voxels.reduce((bounds, voxel) => ({
      minX: Math.floor(Math.min(bounds.minX, voxel.x)),
      maxX: Math.ceil(Math.max(bounds.maxX, voxel.x)),
      minY: Math.floor(Math.min(bounds.minY, voxel.y)),
      maxY: Math.ceil(Math.max(bounds.maxY, voxel.y)),
      minZ: Math.floor(Math.min(bounds.minZ, voxel.z)),
      maxZ: Math.ceil(Math.max(bounds.maxZ, voxel.z)),
    }), {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
      minZ: Infinity, maxZ: -Infinity,
    });
  }

  constructor(map: MapData) {
    this.map = map;
  }

  public select(region: RegionBounds): void {
    const voxels = this.map.voxels.filter(voxel => 
      voxel.x >= region.minX && voxel.x <= region.maxX &&
      voxel.y >= region.minY && voxel.y <= region.maxY &&
      voxel.z >= region.minZ && voxel.z <= region.maxZ
    );
    this.selection = { voxels: voxels, resolution: this.map.resolution };
  }

  public deselect(): void {
    this.selection = null;
  }

}
