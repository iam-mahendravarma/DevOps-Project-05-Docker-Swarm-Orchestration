## DevOps Project 05 — Docker Swarm Orchestration (React + FastAPI + MongoDB)

This repository contains a simple ToDo application demonstrating containerization and orchestration with Docker Swarm:

- **Frontend**: React app served on port 3000
- **Backend**: FastAPI service served on port 8000
- **Database**: MongoDB 6 with a persistent volume

The stack is defined in `docker-stack.yml` and uses Swarm primitives such as services, replicas, rolling updates, secrets, configs, overlay networks, and volumes.

### Repository Structure

- `frontend/`: React application, `Dockerfile`, `package.json`
- `backend/`: FastAPI application, `Dockerfile`, `requirements.txt`, `main.py`
- `docker-stack.yml`: Swarm stack definition

### Architecture

```
┌────────────┐      HTTP      ┌────────────┐        TCP        ┌───────────┐
│  Frontend  │ 3000 -> 3000   │  Backend   │ 8000 -> 8000      │  MongoDB   │
│ (React)    │ ─────────────▶ │ (FastAPI)  │ ────────────────▶ │ (mongo:6) │
└────────────┘                 └────────────┘                    └───────────┘
         \________________________ overlay network: `app-network` ______________________/
```

### Key Features for DevOps

- **Swarm-ready** with `replicas`, `update_config` (start-first), `rollback_config`, and `restart_policy`
- **Secrets and Configs**: `mongo_user`, `mongo_pass`, and `backend_config` declared as externals
- **Persistent storage** with `mongo_data` volume
- **Overlay network** for inter-service communication
- **Declarative deployment** via `docker stack deploy`

---

## Prerequisites

- Docker Engine 20.10+ with Swarm mode enabled
- Access to build or pull images referenced in `docker-stack.yml`:
  - `iammahendravarma20/todofrontend:v1`
  - `iammahendravarma20/todobackend:v1`

If you intend to build locally and push your own images, ensure you have a container registry (e.g., Docker Hub, GHCR) and are logged in.

---

## Configuration, Secrets, and Environment

The stack expects the following external objects to exist in Swarm:

- Secrets: `mongo_user`, `mongo_pass`
- Configs: `backend_config`

Create them before deploying:

```bash
# Initialize Swarm (if not already)
docker swarm init

# Create secrets (examples)
printf "mongo" | docker secret create mongo_user -
printf "mongo_password" | docker secret create mongo_pass -

# Create a dummy config for the backend
printf "BACKEND_CONFIG_VERSION=1" | docker config create backend_config -
```

Environment variables:

- The backend reads MongoDB URI from `MONGODB_URL` (see `backend/main.py`).
- In `docker-stack.yml`, the backend service currently sets `MONGO_URI=mongodb://mongo:27017/devopsdb`.

To avoid confusion, you should align the variable names one of two ways:

1) Change the stack to export `MONGODB_URL` instead of `MONGO_URI`, or
2) Update the backend code to read `MONGO_URI`.

Example (recommended) change in stack:

```yaml
environment:
  - MONGODB_URL=mongodb://mongo:27017/devopsdb
```

Frontend API base URL:

- The React app uses `REACT_APP_API_BASE_URL` if provided, otherwise defaults to `http://localhost:8000`.
- When running in Swarm, expose backend on a published port or ensure the frontend calls the backend via an ingress route/reverse proxy.

---

## Build Images (Optional, if you want to use your own registry)

```bash
# Backend
docker build -t <your-registry>/todobackend:v1 ./backend
docker push <your-registry>/todobackend:v1

# Frontend
docker build -t <your-registry>/todofrontend:v1 ./frontend
docker push <your-registry>/todofrontend:v1

# Update docker-stack.yml to use your images
```

---

## Deploy to Docker Swarm

```bash
# 1) Initialize Swarm (if not already)
docker swarm init

# 2) Create required secrets/configs (see section above)

# 3) Deploy the stack
docker stack deploy -c docker-stack.yml todoapp

# 4) Check status
docker stack services todoapp
docker service ls
docker service ps todoapp_frontend
docker service ps todoapp_backend
docker service ps todoapp_mongo
```

Access:

- Frontend: `http://localhost:3000`
- Backend: If you expose/publish port 8000, it will be reachable at `http://localhost:8000`

Note: The provided `docker-stack.yml` maps `3000:3000` for the frontend. The backend is reachable inside the overlay network at `http://backend:8000` (service name) and by other services (e.g., frontend) if configured to call it via that address. For browser-based calls from the frontend, consider publishing backend port 8000 or fronting with a reverse proxy.

---

## Scaling and Rolling Updates

Scale services:

```bash
docker service scale todoapp_frontend=4
docker service scale todoapp_backend=4
```

Rolling update (e.g., update image tag):

```bash
docker service update \
  --image <your-registry>/todobackend:v2 \
  --update-order start-first \
  --update-parallelism 1 \
  --update-delay 10s \
  todoapp_backend
```

Rollback if needed:

```bash
docker service rollback todoapp_backend
```

---

## Persistence

MongoDB uses a named volume `mongo_data` mounted to `/data/db`. This ensures data persists across container restarts on the same node. For production-grade setups, consider:

- Swarm-aware storage providers (NFS, Portworx, Longhorn, etc.)
- Backups and point-in-time recovery

---

## Local Development (without Swarm)

Backend (FastAPI):

```bash
cd backend
python -m venv .venv && . .venv/bin/activate  # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Ensure MongoDB is available locally or via container
export MONGODB_URL="mongodb://localhost:27017"  # PowerShell: $env:MONGODB_URL="mongodb://localhost:27017"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend (React):

```bash
cd frontend
npm install

# Optionally point to a non-default backend
# PowerShell example:
$env:REACT_APP_API_BASE_URL="http://localhost:8000"
npm start
```

---

## Observability and Logs

Inspect logs:

```bash
docker service logs -f todoapp_frontend
docker service logs -f todoapp_backend
docker service logs -f todoapp_mongo
```

Health and tasks:

```bash
docker service ps todoapp_backend --no-trunc
docker node ls
docker node ps <node-id>
```

For production, integrate with:

- Centralized logging (e.g., EFK/ELK, Loki)
- Metrics (Prometheus + Grafana)
- Tracing (OpenTelemetry)

---

## Security Notes

- Use Swarm secrets for credentials; avoid plain env vars for sensitive data
- Restrict MongoDB to internal network only
- Consider network policies (segmentation) and a reverse proxy with TLS termination (Traefik, Nginx) for public endpoints

---

## Troubleshooting

- Backend cannot reach MongoDB:
  - Verify the environment variable name matches the code (`MONGODB_URL`)
  - Ensure service DNS name `mongo` resolves inside the overlay network
  - Check Mongo logs: `docker service logs todoapp_mongo`

- Frontend cannot reach Backend from browser:
  - Ensure backend port 8000 is published or route via a reverse proxy
  - Set `REACT_APP_API_BASE_URL` to a reachable host:port

- Service stuck in restart loop:
  - Inspect `docker service ps` and `docker service logs`
  - Validate secrets/configs exist and are referenced correctly

---

## API Endpoints (Backend)

- `GET /` → health message
- `GET /todos` → list todos
- `POST /todos` → create todo
- `GET /todos/{id}` → fetch single todo
- `PUT /todos/{id}` → update todo
- `DELETE /todos/{id}` → delete todo

---

## Notes on Improvements

- Align env var names between stack and backend (`MONGODB_URL` vs `MONGO_URI`)
- Publish backend port in `docker-stack.yml` or add an ingress proxy
- Add CI/CD (build, scan, push images, deploy stack)
- Add healthchecks to services for faster failure detection

---

## License

MIT (or your preferred license)


