import os
import io
import json
import tempfile
import subprocess
import struct
import zipfile
from contextlib import asynccontextmanager

import laspy
import numpy as np
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .providers import create_db_and_tables
from .domain.services.auth_service import auth_srvc
from .domain.entities.map import MapData


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    yield
    ...

api = FastAPI(lifespan=lifespan)

@api.post("/api/convert")
async def convert_octomap(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".ot") as temp:
        temp.write(await file.read())
        temp_path = temp.name
    try:
        result = subprocess.run(
            ["./bin/octomap2json", temp_path],
            stdout  = subprocess.PIPE,
            stderr  = subprocess.PIPE,
            text    = True,
            check   = True
        )
        map_data = json.loads(result.stdout)
        return map_data
    except subprocess.CalledProcessError as e:
        return JSONResponse(content={"error": e.stderr}, status_code=500)
    finally:
        os.unlink(temp_path)

@api.post("/api/export")
async def export_octomap(map_data: MapData): # TODO Add export types selection and update docstring
    '''
    Exports the map data to a zip file containing multiple formats.

    This endpoint returns a ZIP file containing:
    - map-voxels.ply: A mesh of the voxels as cubes.
    - map-points.ply: A point cloud of the voxel centers.
    - map-points.pcd: A point cloud of the voxel centers.
    - map-points.laz: A compressed point cloud.
    '''
    voxels_ply = _generate_voxel_mesh_ply(map_data)
    points_ply = _generate_points_ply(map_data)
    points_pcd = _generate_points_pcd(map_data)
    points_laz = _generate_points_las(map_data, do_compress=True)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("map-voxels.ply", voxels_ply)
        zip_file.writestr("map-points.ply", points_ply)
        zip_file.writestr("map-points.pcd", points_pcd)
        zip_file.writestr("map-points.laz", points_laz)

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=map-export.zip"}
    )


# _____________________________________________________________________________
# TODO Move helper functions somewhere else later 

def _generate_voxel_mesh_ply(map_data: MapData) -> str:
    num_voxels = len(map_data.voxels)
    num_vertices = num_voxels * 8
    num_faces = num_voxels * 6

    header = [
        "ply",
        "format ascii 1.0",
        f"element vertex {num_vertices}",
        "property float x",
        "property float y",
        "property float z",
        "property uchar red",
        "property uchar green",
        "property uchar blue",
        f"element face {num_faces}",
        "property list uchar int vertex_indices",
        "end_header",
    ]

    vertex_lines = []
    face_lines = []
    vertex_offset = 0

    for voxel in map_data.voxels:
        s = voxel.size if voxel.size is not None else map_data.resolution
        s_2 = s / 2
        x, y, z = voxel.x, voxel.y, voxel.z
        r, g, b = voxel.color
        
        # Assuming color is [0, 255]
        r_int = max(0, min(255, int(r)))
        g_int = max(0, min(255, int(g)))
        b_int = max(0, min(255, int(b)))

        # Vertices
        vertices = [
            (x - s_2, y - s_2, z - s_2),
            (x + s_2, y - s_2, z - s_2),
            (x + s_2, y + s_2, z - s_2),
            (x - s_2, y + s_2, z - s_2),
            (x - s_2, y - s_2, z + s_2),
            (x + s_2, y - s_2, z + s_2),
            (x + s_2, y + s_2, z + s_2),
            (x - s_2, y + s_2, z + s_2),
        ]
        for v in vertices:
            p = f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f} {r_int} {g_int} {b_int}"
            vertex_lines.append(p)

        # Faces (0-indexed, CCW from outside)
        faces = [
            (3, 2, 1, 0),
            (4, 5, 6, 7),
            (0, 1, 5, 4),
            (2, 3, 7, 6),
            (3, 0, 4, 7),
            (1, 2, 6, 5),
        ]
        for f in faces:
            face_indices = " ".join(str(i + vertex_offset) for i in f)
            face_lines.append(f"4 {face_indices}")
        
        vertex_offset += 8

    return "\n".join(header + vertex_lines + face_lines)

def _generate_points_ply(map_data: MapData) -> str:
    num_vertices = len(map_data.voxels)

    header = [
        "ply",
        "format ascii 1.0",
        f"element vertex {num_vertices}",
        "property float x",
        "property float y",
        "property float z",
        "property uchar red",
        "property uchar green",
        "property uchar blue",
        "end_header",
    ]

    vertex_lines = []
    for voxel in map_data.voxels:
        x, y, z = voxel.x, voxel.y, voxel.z
        r, g, b = voxel.color
        r_int = max(0, min(255, int(r)))
        g_int = max(0, min(255, int(g)))
        b_int = max(0, min(255, int(b)))
        p = f"{x:.6f} {y:.6f} {z:.6f} {r_int} {g_int} {b_int}"
        vertex_lines.append(p)

    return "\n".join(header + vertex_lines)

def _generate_points_pcd(map_data: MapData) -> str:
    num_points = len(map_data.voxels)
    header = [
        "VERSION .7",
        "FIELDS x y z rgb",
        "SIZE 4 4 4 4",
        "TYPE F F F F",
        "COUNT 1 1 1 1",
        f"WIDTH {num_points}",
        "HEIGHT 1",
        "VIEWPOINT 0 0 0 1 0 0 0",
        f"POINTS {num_points}",
        "DATA ascii",
    ]

    point_lines = []
    for voxel in map_data.voxels:
        x, y, z = voxel.x, voxel.y, voxel.z
        r, g, b = voxel.color
        
        r_int = max(0, min(255, int(r)))
        g_int = max(0, min(255, int(g)))
        b_int = max(0, min(255, int(b)))
        rgb_int = (r_int << 16) | (g_int << 8) | b_int
        
        packed = struct.pack('I', rgb_int)
        rgb_float = struct.unpack('f', packed)[0]

        point_lines.append(f"{x:.6f} {y:.6f} {z:.6f} {rgb_float}")

    return "\n".join(header + point_lines)

def _generate_points_las(
    map_data: MapData, 
    do_compress: bool = False
) -> bytes:
    '''
    Generates a LAS or LAZ file from map data.

    Args:
        map_data (MapData): Discrete map, representing a point cloud or 
        flattened octomap, in JSON format.
        
        do_compress (bool, optional): Compress data and output a LAZ file 
        instead. Defaults to False.

    Returns:
        bytes: The content of the LAS or LAZ file.
    '''
    # Point format 3 contains RGB color information.
    header = laspy.LasHeader(version="1.4", point_format=3)
    
    # Set scale to match map resolution for proper coordinate representation
    header.scales = np.array([map_data.resolution] * 3)
    
    # Find the minimum coordinate to set the offset
    points_array = np.array([[v.x, v.y, v.z] for v in map_data.voxels])
    min_coords = points_array.min(axis=0)
    header.offsets = min_coords

    las = laspy.LasData(header)

    las.x = points_array[:, 0]
    las.y = points_array[:, 1]
    las.z = points_array[:, 2]

    # Convert 8-bit RGB (0-255) to 16-bit (0-65535) for LAS format
    colors = np.array([
        [max(0, min(255, int(v.color[0]))), 
         max(0, min(255, int(v.color[1]))), 
         max(0, min(255, int(v.color[2])))] 
        for v in map_data.voxels
    ], dtype = np.uint16)
    las.red = colors[:, 0] * 257 # Scale 0-255 to 0-65535
    las.green = colors[:, 1] * 257
    las.blue = colors[:, 2] * 257

    output_buffer = io.BytesIO()
    with laspy.open(
        output_buffer, 
        mode = "w", 
        header = las.header, 
        do_compress = do_compress, 
        closefd = False
    ) as writer:
        writer.write_points(las.points)
    
    return output_buffer.getvalue()


# _____________________________________________________________________________
# Mount routers and static files

api.include_router(auth_srvc, prefix='/api')
api.mount(
    '/api/viewer', 
    StaticFiles(directory='static', html=True),
    name = 'static'
)
