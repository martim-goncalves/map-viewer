from contextlib import asynccontextmanager
import os
import json
import tempfile
import subprocess

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .providers import create_db_and_tables
from .domain.services.auth_service import auth_srvc


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    yield
    ...

api = FastAPI(lifespan=lifespan)

@api.post("/convert")
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


# _____________________________________________________________________________
# Mount routers and static files

api.include_router(auth_srvc)
api.mount('/', StaticFiles(directory='static', html=True), name='static')
