import os
import json
import tempfile
import subprocess

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


ANGULAR_CLIENT = ['http://localhost:4200', 'http://127.0.0.1:4200']

# CORS Origins
WHITELIST = [*ANGULAR_CLIENT]

api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins = WHITELIST,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

@api.post("/convert/")
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

api.mount('/', StaticFiles(directory='static', html=True), name='static')
