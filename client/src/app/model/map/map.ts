import { MapData } from "./map-data";
import { RegionBounds } from "./region-bounds";

export class Map {

  private map: MapData;
  private selection: MapData | null = null;
  public getMap = (): MapData => !this.selection ? this.map : this.selection;

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
