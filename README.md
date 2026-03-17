# Pooly

Application de suivi d'entretien de piscine — PWA React + TypeScript, backend FastAPI, PostgreSQL.

![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue)
![Stack](https://img.shields.io/badge/Backend-FastAPI-green)
![Stack](https://img.shields.io/badge/DB-PostgreSQL-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Fonctionnalités

- **Journal d'entretien** — enregistrer traitements, mesures et entretiens
- **Tableau de bord** — KPIs (pH, chlore, TAC, température), état de la piscine
- **Historique** — timeline groupée par mois, filtres, recherche
- **Graphiques** — évolution pH et chlore sur 1/3/6 mois
- **Auth complète** — inscription, connexion, mot de passe oublié/réinitialisation
- **Export / Import JSON** — sauvegarde et restauration des données
- **Multi-utilisateurs** — chaque utilisateur voit uniquement ses propres données

## Déploiement rapide

### Prérequis

- [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/) installés

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-username/pooly.git
cd pooly
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env` et renseigner au minimum :

```env
POSTGRES_PASSWORD=un-mot-de-passe-fort
SESSION_SECRET=une-chaine-aleatoire-longue   # openssl rand -hex 32
```

Les autres variables ont des valeurs par défaut. Le compte admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) est optionnel — vous pouvez vous inscrire directement depuis l'interface.

### 3. Lancer

```bash
docker compose up -d
```

L'application est disponible sur **http://localhost:8090** (ou le port défini par `WEB_PORT`).

### 4. Premier démarrage

Au premier lancement, Docker va :
1. Télécharger PostgreSQL 16
2. Construire l'image API (FastAPI)
3. Construire l'image frontend (React + Nginx)
4. Créer les tables et injecter les produits de base (chlore, pH+, pH-, etc.)

Comptez 2–3 minutes au premier build.

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `POSTGRES_PASSWORD` | — | **Requis.** Mot de passe PostgreSQL |
| `POSTGRES_USER` | `pooly` | Utilisateur PostgreSQL |
| `POSTGRES_DB` | `pooly` | Nom de la base |
| `SESSION_SECRET` | — | **Requis.** Clé secrète pour les sessions |
| `ADMIN_EMAIL` | _(vide)_ | Email du compte admin créé au démarrage |
| `ADMIN_PASSWORD` | _(vide)_ | Mot de passe du compte admin |
| `WEB_PORT` | `8090` | Port exposé pour le frontend |

## Architecture

```
┌─────────────────────────────────┐
│  web (Nginx + React SPA)        │  :8090
│  /api/* ──proxy──►              │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  api (FastAPI)                  │  :8003 (interne)
│  Auth, Actions, Products        │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  db (PostgreSQL 16)             │  :5432 (interne)
│  Volume : postgres_data         │
└─────────────────────────────────┘
```

## Structure du projet

```
pooly/
├── apps/
│   ├── api/          # Backend FastAPI
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   ├── seeds.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── tests/
│   └── web/          # Frontend React + Vite
│       ├── src/
│       ├── nginx/
│       ├── Dockerfile
│       └── package.json
├── docs/             # Specs et décisions d'architecture
├── docker-compose.yml
├── .env.example
└── README.md
```

## Développement local

### Frontend

```bash
cd apps/web
npm install
npm run dev        # http://localhost:5173
npm run test       # Vitest
```

### Backend

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Avec SQLite (pas besoin de PostgreSQL)
DATABASE_URL=sqlite:///./pooly.db SESSION_SECRET=dev uvicorn main:app --reload
```

## Commandes utiles

```bash
# Démarrer
docker compose up -d

# Voir les logs
docker compose logs -f

# Rebuild après modification du code
docker compose up -d --build

# Arrêter et supprimer les containers (les données sont conservées)
docker compose down

# Supprimer aussi les données (reset complet)
docker compose down -v
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui |
| Backend | FastAPI, SQLModel, Pydantic, passlib |
| Base de données | PostgreSQL 16 |
| Auth | Session cookie (itsdangerous), pbkdf2_sha256 |
| Déploiement | Docker Compose, Nginx 1.27, Python 3.13 |
| Tests | Vitest 4, @testing-library/react, pytest |

## Licence

MIT
