from contextlib import asynccontextmanager
import os
import io
import json
import tempfile
import subprocess
import zipfile

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
async def export_octomap(map_data: MapData):
    '''
    Exports the map data to a Blender-compatible format.

    This endpoint returns a ZIP file containing two .ply files:
    - map-voxels.ply: A mesh of the voxels as cubes.
    - map-simple.ply: A point cloud of the voxel centers.
    '''
    voxels_ply = _generate_voxel_mesh_ply(map_data)
    cloud_ply = _generate_simple_mesh_ply(map_data)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("map-voxels.ply", voxels_ply)
        zip_file.writestr("map-simple.ply", cloud_ply)

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
        r_int, g_int, b_int = int(r), int(g), int(b)

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
            vertex_lines.append(f"{v[0]} {v[1]} {v[2]} {r_int} {g_int} {b_int}")

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

def _generate_simple_mesh_ply(map_data: MapData) -> str:
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
        r_int, g_int, b_int = int(r), int(g), int(b)
        vertex_lines.append(f"{x} {y} {z} {r_int} {g_int} {b_int}")

    return "\n".join(header + vertex_lines)


# _____________________________________________________________________________
# Mount routers and static files

api.include_router(auth_srvc, prefix='/api')
api.mount(
    '/api/viewer', 
    StaticFiles(directory='static', html=True),
    name = 'static'
)
