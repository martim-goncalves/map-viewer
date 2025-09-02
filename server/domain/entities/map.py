from pydantic import BaseModel


class VoxelData(BaseModel):
    x: float
    y: float
    z: float
    color: tuple[float, float, float]
    size: float | None = None

class MapData(BaseModel):
    voxels: list[VoxelData]
    resolution: float
