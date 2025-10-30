## DevOps Project 05 — Docker Swarm Orchestration (React + FastAPI + MongoDB)

This project demonstrates a simple, production-ready ToDo application orchestrated with Docker Swarm:

- frontend: React (Create React App)
- backend: FastAPI served by Uvicorn
- database: MongoDB

The stack is packaged for local development and container orchestration with Docker Swarm, including rolling updates, restart policies, overlay networking, and persistent storage for MongoDB.

---

### Architecture

- **Frontend (`frontend/`)**
  - React app served on port 3000
  - Uses `REACT_APP_API_BASE_URL` to target the backend API (defaults to `http://localhost:8000` in dev)

- **Backend (`backend/`)**
  - FastAPI application exposing a CRUD ToDo API on port 8000
  - Connects to MongoDB via `MONGODB_URL` environment variable
  - Models: `TodoItem`, `TodoUpdate`, `TodoResponse`

- **Database**
  - MongoDB 6 with named volume `mongo_data` for persistence

- **Orchestration (`docker-stack.yml`)**
  - 3 services: `frontend`, `backend`, `mongo`
  - Overlay network: `app-network`
  - Rolling update and restart policies defined for stateless services
  - Named volume `mongo_data` for MongoDB data

---

### Tech Stack

- React 18, Axios
- FastAPI, Uvicorn, Pydantic, PyMongo
- MongoDB 6
- Docker, Docker Swarm

---

### API Overview (FastAPI)

Base URL: `http://<backend-host>:8000`

- `GET /` → health/info
- `GET /todos` → list all todos
- `POST /todos` → create todo
- `GET /todos/{id}` → get todo by id
- `PUT /todos/{id}` → update todo (partial update supported)
- `DELETE /todos/{id}` → delete todo

Example payloads:

```json
// POST /todos
{
  "title": "Write docs",
  "description": "Create README for swarm project"
}
```

```json
// PUT /todos/{id}
{
  "completed": true
}
```

---

### Local Development (no Docker)

Prerequisites: Node 18+, Python 3.11+, local MongoDB (or Atlas connection string)

1) Backend

```bash
cd backend
python -m venv .venv && .venv\\Scripts\\activate   # Windows PowerShell
pip install -r requirements.txt

# Configure Mongo connection
copy env.example .env   # ensure MONGODB_URL is set

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2) Frontend

```bash
cd frontend
npm install
# optional: to point to a non-default API host
# set REACT_APP_API_BASE_URL=http://localhost:8000
npm start
```

The CRA dev server proxies API calls to `http://localhost:8000` (see `package.json`), and the app default also targets `http://localhost:8000` unless `REACT_APP_API_BASE_URL` is defined.

---

### Container Images (prebuilt)

The stack file references these images:

- frontend: `iammahendravarma20/todofrontend:v1`
- backend: `iammahendravarma20/todobackend:v1`
- database: `mongo:6`

You can replace these with locally built images if needed.

---

### Build Images Locally (optional)

1) Backend

```bash
cd backend
docker build -t todobackend:local .
```

2) Frontend

```bash
cd frontend
docker build -t todofrontend:local .
```

Then update `docker-stack.yml` to use your `:local` tags.

---

### Docker Swarm Deployment

Prerequisites: Docker Desktop (or Docker Engine) with Swarm initialized

```bash
# Initialize swarm (if not already)
docker swarm init

# Create overlay network and volume are handled by the stack; create secrets/configs first if needed

# Create required external secrets referenced in docker-stack.yml
echo "your-mongo-username" | docker secret create mongo_user -
echo "your-mongo-password" | docker secret create mongo_pass -

# Create an external config referenced by backend (contents optional/demo)
echo "BACKEND_CONFIG=demo" | docker config create backend_config -

# Deploy the stack (uses the repo folder name as stack name by default below)
docker stack deploy -c docker-stack.yml todoapp

# Verify
docker stack services todoapp
docker service ls
docker service ps todoapp_backend
```

Access:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

---

### Important Notes about Environment Variables

- The backend code uses `MONGODB_URL` (default `mongodb://localhost:27017`). In `docker-stack.yml`, the backend service currently sets `MONGO_URI`. To ensure connectivity in Swarm, use at least one of the following:
  - Update the stack to set `MONGODB_URL=mongodb://mongo:27017/devopsdb` for the backend service, or
  - Update the backend image/code to read `MONGO_URI` instead of `MONGODB_URL`.

- The `mongo_user` and `mongo_pass` secrets are referenced in the stack but not actively consumed by `mongo:6` or the backend as environment variables. If you need auth:
  - Configure Mongo with environment variables (`MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`) or an init script that reads the secrets from `/run/secrets/...`.
  - Update the backend connection string to include credentials.

- The `backend_config` Docker config is referenced but not used in code. You can remove it from the stack or mount and read it from the backend if you plan to leverage Docker configs.

---

### Troubleshooting

- Backend cannot connect to Mongo in Swarm:
  - Ensure the env var mismatch is resolved: set `MONGODB_URL` in the backend service to `mongodb://mongo:27017/devopsdb`.
  - Check network: services must share `app-network`.
  - Confirm Mongo is healthy: `docker service logs todoapp_mongo`.

- Frontend shows error fetching todos:
  - Ensure backend is reachable from your browser at `http://localhost:8000`.
  - In Swarm, if you customized ports, update `REACT_APP_API_BASE_URL` accordingly and rebuild the frontend image.

---

### Repository Structure

```
DevOps-Project-05-Docker-Swarm-Orchestration/
  docker-stack.yml         # Swarm stack with services, networks, volumes, secrets, configs
  backend/
    Dockerfile             # Python 3.11-slim + Uvicorn
    requirements.txt       # FastAPI, Uvicorn, PyMongo, etc.
    env.example            # Example for MONGODB_URL
    main.py                # FastAPI app with CRUD endpoints
  frontend/
    Dockerfile             # Node 18-alpine
    package.json           # CRA scripts + proxy config
    public/index.html
    src/App.js             # UI + Axios calls to API
    src/index.js
    src/index.css
```

---

### Roadmap / Improvements

- Align env var naming between stack and backend (`MONGODB_URL` vs `MONGO_URI`).
- Wire Docker secrets to Mongo credentials and backend connection string.
- Add healthchecks to services in `docker-stack.yml`.
- Add production-ready frontend build serving (e.g., Nginx) instead of CRA dev server image.
- CI/CD pipeline to build and push images, then update Swarm with rolling updates.

---

### License

MIT or project-specific; add your preferred license here.


