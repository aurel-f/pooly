# Design — Mise en prod Étape B : connexion frontend ↔ API

**Date :** 24/02/2026
**Statut :** Validé

---

## Objectif

Connecter le frontend React (déjà déployé en Docker sur `192.168.1.135:8090`) à l'API FastAPI existante (données en mémoire). C'est la première étape incrémentale avant d'ajouter PostgreSQL et l'auth.

---

## Architecture cible

```
LXC Dockge (192.168.1.135)               LXC FastAPI (192.168.1.178)
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  pooly_web (Docker) :8090    │          │  uvicorn (systemd)           │
│  Nginx                       │          │  FastAPI — port 8003         │
│  /api/* ──proxy──────────────────────►  │  GET  /actions               │
│  BACKEND_URL=192.168.1.178:8003         │  POST /actions               │
│  React SPA (statique)        │          │  GET  /health                │
└──────────────────────────────┘          └──────────────────────────────┘
```

Le frontend appelle `/api/actions` (chemin relatif). Nginx proxifie vers `http://192.168.1.178:8003/actions`. Le CORS côté API devient superflu (tout passe par le proxy).

---

## Décisions

| Décision | Choix | Raison |
|----------|-------|--------|
| Approche | Incrémentale (API en mémoire d'abord) | Dérisquer par étapes |
| Port API | 8003 | 8001 = betting-tracker-v2, éviter collision |
| Pattern infra | Identique à betting-tracker | Pattern éprouvé, copie directe |
| Config URL API | `BACKEND_URL` env var runtime via envsubst | Pas de rebuild si IP change |
| Utilisateur Nginx | Non-root (`appuser`) | Sécurité |
| Modèle API | Inchangé (`title + meta`) | Sera migré à l'Étape C |

---

## Composants modifiés

### 1. `apps/web/Dockerfile`
- Stage builder : `node:20-alpine`, `npm ci --frozen-lockfile`
- Stage production : `nginx:1.27-alpine`
- Utilisateur non-root `appuser:appgroup`
- Copie `nginx/nginx.conf.template` + `docker-entrypoint.sh`
- Healthcheck intégré

### 2. `apps/web/nginx/nginx.conf.template` (nouveau fichier)
- Proxy `location /api/` → `${BACKEND_URL}/`
- Headers sécurité : CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy
- Cache long (1y) sur assets hashés, no-cache sur `index.html`
- Gzip activé
- SPA routing (`try_files $uri /index.html`)
- Bloc deny sur fichiers `.`

### 3. `apps/web/docker-entrypoint.sh` (nouveau fichier)
```sh
#!/bin/sh
set -e
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
```

### 4. `docker-compose.yml`
- `BACKEND_URL=http://192.168.1.178:8003`
- `read_only: true` + tmpfs (`/var/cache/nginx`, `/var/run`, `/tmp`, `/etc/nginx/conf.d`)
- Resource limits : 0.5 CPU / 128M RAM
- `security_opt: no-new-privileges:true`
- Healthcheck + logging json-file

### 5. `apps/api/main.py`
- Retirer `allow_origins=["*"]` → restreindre à l'IP du LXC web (optionnel, le proxy gère déjà)

### 6. `apps/web/src/App.tsx`
- Remplacer les mock data par des appels `fetch('/api/actions')` (GET au montage, POST à la soumission du formulaire)
- Gestion d'état : `loading` + `error`

---

## Déploiement API sur LXC 192.168.1.178

### Structure
```
/opt/pooly-api/
  main.py
  requirements.txt
  venv/
```

### Service systemd `/etc/systemd/system/pooly-api.service`
```ini
[Unit]
Description=Pooly API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pooly-api
ExecStart=/opt/pooly-api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8003
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## Hors scope (Étapes suivantes)

- PostgreSQL + migration modèle Action → **Étape C**
- Auth username + bearer token → **Étape D**
- PWA manifest + service worker → **Étape E**
