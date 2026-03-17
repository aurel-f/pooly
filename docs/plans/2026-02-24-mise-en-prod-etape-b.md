# Mise en prod Étape B — Connexion frontend ↔ API

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connecter le frontend React à l'API FastAPI existante (données en mémoire) via un proxy Nginx, et déployer l'API sur le LXC `192.168.1.178:8003`.

**Architecture:** Le container Docker web (Nginx) proxifie les requêtes `/api/*` vers l'API FastAPI sur `192.168.1.178:8003`. L'URL du backend est injectée à l'environnement via `BACKEND_URL` et substituée dans le template nginx au démarrage du container.

**Tech Stack:** Docker, Nginx (nginx.conf.template + envsubst), FastAPI, uvicorn, systemd, Vitest + @testing-library/react

---

## Task 1 : Créer `docker-entrypoint.sh`

**Files:**
- Create: `apps/web/docker-entrypoint.sh`

**Step 1: Créer le fichier**

```sh
#!/bin/sh
set -e

# Substitue uniquement ${BACKEND_URL} — les variables nginx ($host, $remote_addr…) sont préservées
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
```

**Step 2: Le rendre exécutable**

```bash
chmod +x apps/web/docker-entrypoint.sh
```

**Step 3: Vérifier**

```bash
head -3 apps/web/docker-entrypoint.sh
```
Attendu : `#!/bin/sh` sur la première ligne.

**Step 4: Commit**

```bash
git add apps/web/docker-entrypoint.sh
git commit -m "feat: add docker-entrypoint.sh with envsubst for BACKEND_URL"
```

---

## Task 2 : Créer `apps/web/nginx/nginx.conf.template`

**Files:**
- Create: `apps/web/nginx/nginx.conf.template`

**Step 1: Créer le répertoire**

```bash
mkdir -p apps/web/nginx
```

**Step 2: Créer le template**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # ── Sécurité ──────────────────────────────────────────────────────────────

    server_tokens off;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ── Cache ─────────────────────────────────────────────────────────────────

    location ~* \.(js|css|woff2?|ttf|eot|svg|png|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # ── Proxy API → backend FastAPI ────────────────────────────────────────────

    location /api/ {
        proxy_pass ${BACKEND_URL}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    # ── SPA routing ───────────────────────────────────────────────────────────

    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Bloquer fichiers sensibles ─────────────────────────────────────────────

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ── Compression ───────────────────────────────────────────────────────────

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
```

**Step 3: Vérifier la syntaxe nginx (optionnel si nginx disponible localement)**

```bash
# Si nginx est installé sur l'hôte :
nginx -t -c $(pwd)/apps/web/nginx/nginx.conf.template 2>&1 || true
# Sinon, la vérification se fera au build Docker (Task 5)
```

**Step 4: Commit**

```bash
git add apps/web/nginx/nginx.conf.template
git commit -m "feat: add nginx.conf.template with /api proxy and security headers"
```

---

## Task 3 : Mettre à jour `apps/web/Dockerfile`

**Files:**
- Modify: `apps/web/Dockerfile`

**Step 1: Remplacer le contenu du Dockerfile**

```dockerfile
# ── Stage 1 : Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

LABEL maintainer="pooly"
LABEL description="Pooly — build stage"

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile --cache /tmp/.npm-cache

COPY . .
RUN npm run build

# ── Stage 2 : Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Sécurité : utilisateur non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copie du build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie du template nginx et de l'entrypoint
COPY nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Supprime la config Nginx par défaut
RUN rm -f /etc/nginx/conf.d/default.conf

# Permissions
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
```

**Step 2: Commit**

```bash
git add apps/web/Dockerfile
git commit -m "feat: update Dockerfile with non-root user, nginx template and entrypoint"
```

---

## Task 4 : Mettre à jour `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Remplacer le contenu**

```yaml
services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      target: production
    image: pooly-web:latest
    container_name: pooly_web
    restart: unless-stopped
    ports:
      - "8090:80"
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /var/run
      - /tmp
      - /etc/nginx/conf.d
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M
        reservations:
          cpus: "0.1"
          memory: 32M
    security_opt:
      - no-new-privileges:true
    environment:
      - BACKEND_URL=http://192.168.1.178:8003
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:80/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: update docker-compose with BACKEND_URL, security and resource limits"
```

---

## Task 5 : Tester l'infra web (build Docker)

**Prérequis :** Être sur le LXC Dockge `192.168.1.135` (ou avoir Docker disponible localement).

**Step 1: Build**

```bash
cd /opt/pooly
docker compose build --no-cache
```
Attendu : `Successfully built` sans erreur.

**Step 2: Démarrer**

```bash
docker compose up -d
```
Attendu : container `pooly_web` en état `Up`.

**Step 3: Vérifier que le frontend répond**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/
```
Attendu : `200`

**Step 4: Vérifier que le proxy /api/ répond correctement (avant que l'API soit up)**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/api/actions
```
Attendu : `502` (Bad Gateway — l'API n'est pas encore déployée, c'est normal).

**Step 5: Vérifier le template nginx dans le container**

```bash
docker exec pooly_web cat /etc/nginx/conf.d/default.conf | grep proxy_pass
```
Attendu : `proxy_pass http://192.168.1.178:8003/;`

---

## Task 6 : Intégration API dans `App.tsx` (TDD)

**Files:**
- Create: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Écrire le test qui échoue**

Créer `apps/web/src/App.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import App from './App'

const mockActions = [
  { id: 1, date: '2026-02-23', title: 'Nettoyage cartouche', meta: 'Filtre propre' },
]

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockActions),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches actions from /api/actions on mount', async () => {
    render(<App />)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/actions')
    })
  })
})
```

**Step 2: Lancer le test — vérifier qu'il échoue**

```bash
cd /opt/pooly/apps/web
npm test -- --run App.test.tsx
```
Attendu : FAIL — `fetch` n'est pas appelé car `App.tsx` utilise encore `mockActions`.

**Step 3: Mettre à jour `App.tsx`**

```tsx
import { useState, useEffect } from 'react'
import type { Action } from './types'
import Topbar from './components/Topbar'
import HeroCard from './components/HeroCard'
import ActionForm from './components/ActionForm'
import InfoGrid from './components/InfoGrid'

export default function App() {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch('/api/actions')
      .then(res => res.json())
      .then(data => setActions(data))
      .catch(() => setError('Impossible de charger les actions'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (newAction: Omit<Action, 'id'>) => {
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAction),
    })
    const action: Action = await res.json()
    setActions(prev => [action, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
  }

  if (loading) return <div className="page"><p style={{ padding: 24 }}>Chargement…</p></div>
  if (error) return <div className="page"><p style={{ padding: 24, color: 'var(--danger)' }}>{error}</p></div>

  return (
    <div className="page">
      <Topbar />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
          gap: 24,
          alignItems: 'stretch',
        }}
        className="hero"
      >
        <HeroCard actions={actions} onOpenForm={() => setShowForm(true)} />

        <div className="form-desktop">
          <ActionForm onAdd={handleAdd} />
        </div>
      </section>

      <InfoGrid />

      {showForm && (
        <ActionForm onAdd={handleAdd} onClose={() => setShowForm(false)} mobileSheet />
      )}

      {!showForm && (
        <button
          className="btn primary open-form"
          onClick={() => setShowForm(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 20,
            borderRadius: 999,
            padding: '14px 18px',
          }}
        >
          Ajouter une action
        </button>
      )}
    </div>
  )
}
```

**Step 4: Lancer tous les tests — vérifier qu'ils passent**

```bash
cd /opt/pooly/apps/web
npm test -- --run
```
Attendu : tous les tests PASS (App.test.tsx + ActionForm.test.tsx + utils.test.ts).

**Step 5: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat: connect App.tsx to real API via fetch /api/actions"
```

---

## Task 7 : Déployer l'API sur LXC 192.168.1.178

**Prérequis :** Accès SSH au LXC `192.168.1.178`.

**Step 1: Copier les fichiers de l'API sur le LXC**

```bash
# Depuis /opt/pooly sur le LXC Dockge (192.168.1.135) :
ssh 192.168.1.178 "mkdir -p /opt/pooly-api"
scp apps/api/main.py apps/api/requirements.txt 192.168.1.178:/opt/pooly-api/
```

**Step 2: Créer le virtualenv et installer les dépendances**

```bash
ssh 192.168.1.178
cd /opt/pooly-api
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

**Step 3: Tester que l'API démarre manuellement**

```bash
# Sur le LXC 192.168.1.178 :
venv/bin/uvicorn main:app --host 0.0.0.0 --port 8003 &
sleep 2
curl http://localhost:8003/health
# Attendu : {"status":"ok"}
kill %1
```

**Step 4: Créer le service systemd**

Créer `/etc/systemd/system/pooly-api.service` :

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

**Step 5: Activer et démarrer le service**

```bash
systemctl daemon-reload
systemctl enable --now pooly-api
systemctl status pooly-api
```
Attendu : `Active: active (running)`.

**Step 6: Vérifier depuis l'extérieur**

```bash
# Depuis n'importe quelle machine du réseau :
curl http://192.168.1.178:8003/health
# Attendu : {"status":"ok"}

curl http://192.168.1.178:8003/actions
# Attendu : liste JSON des 3 actions en mémoire
```

---

## Task 8 : Test end-to-end + rebuild web

**Step 1: Rebuild le container web (pour embarquer les modifications App.tsx)**

```bash
# Sur le LXC Dockge (192.168.1.135) :
cd /opt/pooly
docker compose up -d --build
```

**Step 2: Vérifier le proxy end-to-end**

```bash
curl http://localhost:8090/api/actions
```
Attendu : liste JSON des actions depuis l'API (ex: `[{"id":1,"date":"2026-02-23",...}]`).

**Step 3: Tester depuis un navigateur**

Ouvrir `http://192.168.1.135:8090` — l'app doit afficher les vraies données de l'API (pas les mock data).

**Step 4: Commit final si tout est vert**

```bash
git add -A
git status
# Vérifier qu'il n'y a rien d'inattendu
git commit -m "feat: mise en prod étape B complete - frontend connecté à l'API via proxy Nginx"
```

---

## Récapitulatif des tâches

| # | Tâche | Fichiers | Durée |
|---|-------|----------|-------|
| 1 | Créer `docker-entrypoint.sh` | `apps/web/docker-entrypoint.sh` | 2 min |
| 2 | Créer `nginx.conf.template` | `apps/web/nginx/nginx.conf.template` | 5 min |
| 3 | Mettre à jour `Dockerfile` | `apps/web/Dockerfile` | 3 min |
| 4 | Mettre à jour `docker-compose.yml` | `docker-compose.yml` | 3 min |
| 5 | Tester le build Docker | — | 5 min |
| 6 | Intégrer API dans `App.tsx` (TDD) | `App.tsx`, `App.test.tsx` | 10 min |
| 7 | Déployer API sur LXC | `/opt/pooly-api/`, systemd | 10 min |
| 8 | Test end-to-end + rebuild | — | 5 min |
