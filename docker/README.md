# Docker

Docker configuration for containerized deployment.

## Files

- `Dockerfile` - Docker image definition
- `docker-compose.yml` - Multi-container orchestration

## Usage

Build and run with Docker Compose:
```bash
docker-compose up -d
```

Build image manually:
```bash
docker build -t cloudflare-api-platform .
```

Run container:
```bash
docker run -p 8000:8000 -p 5173:5173 cloudflare-api-platform
```

Stop containers:
```bash
docker-compose down
```

