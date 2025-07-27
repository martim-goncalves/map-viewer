#!/bin/bash
source .venv/bin/activate
pip list | grep sql
gunicorn server.main:api -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000
