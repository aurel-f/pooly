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

### 2026-03-17 — Corrections pré-publication
- Suppression `container_name: pooly_web` (`docker-compose.yml`) — empêchait l'isolation Docker
- Suppression fichiers parasites : `mockup.html`, `mockup-shadcn.html`, `progress.md`, `pooly-icon.svg`, `pooly-logo.svg`, `pooly-water-*.svg` (dupliqués à la racine, originals dans `apps/web/src/assets/`)
- Suppression `AUDIT.md`, `PRE_PUBLISH_REPORT.md`, `PUBLISH_READY.md` (contenaient IPs privées) + ajout au `.gitignore`
- `APP_BASE_URL` branchée dans `main.py` — lue au démarrage, utilisée dans le logging debug de `forgot-password` pour construire le lien complet `{APP_BASE_URL}/#reset-password?token={token}`
- Fichiers modifiés : `docker-compose.yml`, `apps/api/main.py`, `.gitignore`

### 2026-03-17 — Check pré-publication — instance isolée pooly-test
- Test dans `/tmp/pooly-test-run/pooly-fresh` (clone local isolé)
- `COMPOSE_PROJECT_NAME=pooly-test` — aucun impact sur la prod
- Build complet `--no-cache` : API (Python/pip) + Web (Node/Vite/Nginx) — ✅ sans erreur
- Démarrage et santé des 3 services vérifiés : db healthy, api running, web healthy
- Tests fonctionnels : frontend 200, API health 200, register 200, login+session 200, 5 tables DB, 10 seeds produits
- Instance de test nettoyée après les tests (containers, volumes, images, dossier tmp)
- Instance de production vérifiée intacte avant et après
- **1 bug bloquant trouvé** : `container_name: pooly_web` hardcodé dans docker-compose.yml — empêche l'isolation Docker (à corriger)
- 3 vulnérabilités npm high (dev deps uniquement, non incluses en prod) — non bloquantes
- Résultat : CORRECTIONS NÉCESSAIRES (1 bloquante — container_name)
- Rapport : `PUBLISH_READY.md` (ajouté au .gitignore)
- Fichiers modifiés : `CLAUDE.md`, `.gitignore`

### 2026-03-17 — Mention licence dans la sidebar
- Ajout "Pooly v1.0.0 · MIT License" en bas de sidebar (après "Déconnexion")
- IBM Plex Mono 10px, `rgba(255,255,255,0.15)`, `userSelect: none`
- Couleur fixe blanc semi-transparent — cohérente clair/sombre (sidebar toujours sombre)
- Fichiers modifiés : `apps/web/src/components/Topbar.tsx`

### 2026-03-17 — Publication GitHub v1.0.0
- README.md remplacé par version bilingue FR/EN (ancien conservé dans `README.md.old`, ignoré par git)
- Fichier LICENSE MIT créé (`Copyright (c) 2026 aurel-f`)
- `README.md.old` ajouté au `.gitignore`
- Repo cible : https://github.com/aurel-f/pooly
