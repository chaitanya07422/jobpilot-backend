# JobPilot AI — Backend

NestJS API for JobPilot AI.

**Production API:** `https://jobpilot-api.duckdns.org`  
**Health check:** `https://jobpilot-api.duckdns.org/api/v1/health`

For Oracle VM deployment and debugging guide, see **[docs/ORACLE-DEPLOYMENT.md](docs/ORACLE-DEPLOYMENT.md)**.

## Architecture

```text
Cloudflare Pages (React)
         │
    HTTPS / API
         ▼
  Oracle VM (chaitu-server)
  ├── infra/nginx-proxy-manager  →  api.yourdomain.com
  └── apps/jobpilot-backend      →  NestJS :3000 (PM2)
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
MongoDB    Qdrant      Redis
Atlas      Cloud       (cloud or infra/docker)
```

## VM layout (`chaitu-server`)

```text
~/oracle/
├── apps/
│   └── jobpilot-backend/     ← this repo
├── infra/
│   ├── docker/               ← Redis, etc. (optional)
│   ├── nginx-proxy-manager/  ← reverse proxy + SSL
│   └── portainer/
├── bots/telegram/
├── data/
├── backups/
├── logs/
└── scripts/
```

| Path | Purpose |
| ---- | ------- |
| `~/oracle/apps/jobpilot-backend` | NestJS API (PM2) |
| `~/oracle/infra/nginx-proxy-manager` | Public HTTPS → `localhost:3000` |
| `~/oracle/infra/docker` | Optional Redis container |
| `~/oracle/logs` | App logs (optional PM2 log symlink) |

## One-time setup on VM

```bash
# Node 20 + PM2 (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2

# Clone into your apps folder
cd ~/oracle/apps
git clone <repo-url> jobpilot-backend
cd jobpilot-backend
cp .env.example .env
nano .env   # Atlas, Qdrant, Redis, secrets

npm ci && npm run build
pm2 start dist/main.js --name jobpilot-api
pm2 save
pm2 startup   # follow the printed command
```

### Nginx Proxy Manager

In `~/oracle/infra/nginx-proxy-manager`, add a **Proxy Host**:

| Field | Value |
| ----- | ----- |
| Domain | `api.yourdomain.com` |
| Forward hostname | `host.docker.internal` or VM IP |
| Forward port | `3000` |
| SSL | Let's Encrypt |

No Nginx config in this repo — you already manage that in NPM.

## Auto deploy (GitHub Actions)

Push to `main` runs `.github/workflows/deploy.yml`.

**GitHub secrets:**

| Secret | Value for your VM |
| ------ | ----------------- |
| `VM_HOST` | Public IP of `chaitu-server` |
| `VM_USER` | `ubuntu` |
| `VM_SSH_KEY` | Your private SSH key |
| `APP_DIR` | `/home/ubuntu/oracle/apps/jobpilot-backend` |

## Local development

All local infra runs in Docker — MongoDB, Redis, and Qdrant.

```bash
docker compose up -d          # MongoDB + Redis + Qdrant — or: npm run docker:up
cp .env.example .env          # defaults work with Docker services above
npm install
npm run start:dev
```

| Service | URL |
| ------- | --- |
| MongoDB | `mongodb://localhost:27017/jobpilot` |
| Redis | `localhost:6379` |
| Qdrant REST | http://localhost:6333 |
| Qdrant dashboard | http://localhost:6333/dashboard |

Example `.env` for fully local stack:

```env
MONGODB_URI=mongodb://localhost:27017/jobpilot
REDIS_HOST=localhost
REDIS_PORT=6379
QDRANT_URL=http://localhost:6333
QDRANT_ENABLED=true
HEALTH_CHECK_QDRANT=false
```

To use **MongoDB Atlas** instead, set `MONGODB_URI` to your Atlas connection string in `.env`.

Stop Docker services: `docker compose down` (or `npm run docker:down`)

API: `http://localhost:3000/api/v1/health`  
Swagger: `http://localhost:3000/api/docs`

## Scripts

```bash
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run test
```
