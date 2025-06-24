FROM python:3.12-slim-bullseye

# Set working directory
WORKDIR /opt/map-viewer

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
COPY . .

# Launch the server application
RUN ["python3", "-m", "server"]
