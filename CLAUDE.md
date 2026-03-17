# Pooly — Guide pour Claude Code

## Présentation du projet
Pooly est une application web self-hosted de suivi d'entretien pour piscines et spas.
Stack : React (frontend) · FastAPI (backend) · PostgreSQL (base de données) · Docker

## Architecture
```
apps/
  web/          # Frontend React + Vite
  api/          # Backend FastAPI (Python)
docker-compose.yml
.env.example
```

## Stack technique
- **Frontend** : React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, shadcn/ui, Sora + IBM Plex Mono (Google Fonts)
- **Backend** : FastAPI, SQLModel, PostgreSQL, passlib (pbkdf2_sha256), slowapi
- **Auth** : Sessions cookie (httpOnly, same_site=strict)
- **Déploiement** : Docker Compose (3 services : web, api, db)
- **Tests** : Vitest 4 + @testing-library/react (frontend), pytest (backend)

## Design system
- Couleurs principales : `#0a1f3c` (navy), `#38bdf8` (cyan), `#6366f1` (indigo)
- Thème clair/sombre via `data-theme` sur `<html>`, variables CSS dans `theme.css`
- **Règle absolue : aucun hex `#xxxxxx` lié au thème dans les composants TSX** — tout passe par `var(--nom-de-la-var)`
- Exception tolérée : swatches AquaChek dans `ActionForm` (couleurs physiques de bandelette)

## Fonctionnalités
- Navigation 3 pages : Journal (`DashboardPage`), Mesures (`MesuresPage`), Historique (`HistoriquePage`)
- Auth complète : login, register, forgot-password, reset-password (indicateur force mdp)
- Profil utilisateur : changement prénom + mot de passe (`PATCH /me`)
- CRUD actions : ajout, édition, suppression avec Dialog de confirmation
- Multi-installation : piscines et spas avec plages de référence adaptées (brome/chlore)
- Export / Import JSON
- PWA : manifest + service worker + bottom nav mobile
- Illustrations SVG isométriques inline (piscine + spa — 3 états : claire/trouble/verte)

## Conventions
- Langue : toujours répondre en **français**
- Pas de modification du backend sans instruction explicite
- Les corrections de style passent uniquement par les variables CSS existantes
- Après chaque modification, mettre à jour la section "Historique" de ce fichier

## Commandes utiles
```bash
# Démarrage complet (stack Docker)
cp .env.example .env   # éditer POSTGRES_PASSWORD et SESSION_SECRET
docker compose up -d --build

# Rebuild frontend uniquement
docker compose up -d --build --no-deps web

# Logs
docker compose logs -f api
docker compose logs -f web

# Tests frontend
cd apps/web && npm test

# Tests backend
cd apps/api && pytest
```

## Historique des modifications
<!-- Claude Code documente ici les changements appliqués -->
