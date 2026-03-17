# Pooly — Contexte Projet (Codex)

## Langue

Toujours répondre en **français**, quelle que soit la langue utilisée dans les messages.

## Contexte projet

App de suivi d'entretien de piscine — PWA React + TypeScript (Vite), backend FastAPI, PostgreSQL.

- **Frontend :** `/opt/pooly/apps/web/`
- **Backend :** `/opt/pooly/apps/api/`
- **Docs / specs :** `/opt/pooly/docs/`

---

## État actuel

### Frontend — ✅ Vite + React + TS + composants (24/02/2026)
- **Vite 7 + React 19 + TypeScript 5.9** dans `apps/web/src/`
- **Vitest 4 + @testing-library/react** configurés (jsdom, globals, setupFiles)
- Composants principaux implémentés (Topbar, HeroCard, ActionForm, Timeline, InfoGrid, etc.)
- Mock data + utilitaires + tests en place
- CSS global conforme au mockup
- Le mockup original conservé à la racine : `/opt/pooly/mockup.html`

### Backend
- FastAPI minimal avec **données en mémoire** (pas de DB encore)
- Endpoints existants : `GET /health`, `GET /actions`, `POST /actions`
- Modèle actuel très simplifié : `Action { id, date, title, meta }`
- Pas encore déployé en production — tourne en dev uniquement

### Infrastructure
- **Repo git initialisé** dans `/opt/pooly`, branche `master`, commit `2c0ce62`
- Docker Compose présent : service `web` → container `pooly_web` → port **8090**
- **Dockerfile web** : multi-stage Vite (build + Nginx)
- **Host Docker :** `192.168.1.135` (LXC Dockge)
- L'API n'est pas encore dans le Docker Compose

---

## Architecture cible (V1)

### Stack
- **Frontend :** Vite + React + TypeScript, PWA (manifest + service worker via `vite-plugin-pwa`), CSS global + variables
- **Backend :** FastAPI + PostgreSQL, ORM SQLModel ou SQLAlchemy
- **Auth :** username unique + bearer token par appareil — pas d'email, pas de password

### Entités DB cibles

```
User    : id, username, created_at
Product : id, name, type (seed|custom), unit_default
Action  : id, user_id, date, action_type, product_id, qty, unit, notes, created_at
```

### Endpoints API cibles

```
POST /auth/login     { username } → { token, user }
GET  /me             → { user }
GET  /products       → [product]
POST /products       { name, unit_default } → product
GET  /actions        ?from=YYYY-MM-DD&to=YYYY-MM-DD → [action]
POST /actions        → action
DELETE /actions/:id
```

Tous les endpoints protégés sauf `POST /auth/login`.

### Seeds produits (prédéfinis)
chlore, brome, sel, pH+, pH-, anti-algue, floculant, nettoyage filtre, contre-lavage, nettoyage cartouche

---

## Plan d'implémentation frontend V1

Plan complet : `docs/plans/2026-02-23-frontend-v1.md`
Design validé : `docs/plans/2026-02-23-frontend-v1-design.md`

### Avancement frontend V1

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Initialiser Vite + React + TS + Vitest | ✅ Fait (commit `2c0ce62`) |
| 2 | Types (`Action`) + mock data + tests utils | ✅ Fait (24/02/2026) |
| 3 | Fonctions utilitaires (`utils.ts`) | ✅ Fait (24/02/2026) |
| 4 | CSS global (variables + styles du mockup) | ✅ Fait (24/02/2026) |
| 5 | Composant `Topbar` | ✅ Fait (24/02/2026) |
| 6 | Composants `StatBox` + `ActionEntry` | ✅ Fait (24/02/2026) |
| 7 | Composant `ActionForm` (+ tests) | ✅ Fait (24/02/2026) |
| 8 | Composants `Timeline` + `InfoGrid` | ✅ Fait (24/02/2026) |
| 9 | Composant `HeroCard` | ✅ Fait (24/02/2026) |
| 10 | `App.tsx` — assemblage final + responsive | ✅ Fait (24/02/2026) |
| 11 | Dockerfile multi-stage (build Vite) | ✅ Fait (24/02/2026) |
| 12 | Nettoyage + mise à jour docs | ✅ Fait (24/02/2026) |

### Avancement Étape B — Mise en prod (connexion frontend ↔ API)

| # | Tâche | Statut |
|---|-------|--------|
| 1 | `docker-entrypoint.sh` | ✅ commits `82557a5`, `d79d060` |
| 2 | `nginx/nginx.conf.template` | ✅ commit `b59ed64` |
| 3 | `Dockerfile` (non-root, template) | ✅ commit `e9981ac` |
| 4 | `docker-compose.yml` (BACKEND_URL, limits) | ✅ commit `6be04c6` |
| 5 | Test build Docker | ✅ OK — `:8090` fonctionnel |
| 6 | `App.tsx` → API réelle (TDD) | ✅ commit `1437164` — 7/7 tests PASS |
| 6b | Fix `globalThis` dans `App.test.tsx` | ✅ commit `db2f952` |
| 6c | Fix healthcheck (`nc -z`) | ✅ commit `63cb230` — container **healthy** |
| 7 | Déployer API sur LXC `192.168.1.178:8003` | ✅ service `pooly-api` actif, Python 3.13 |
| 8 | Test end-to-end + rebuild web | ✅ proxy → API → JSON OK, site fonctionnel |

### Journal d'actions

**25/02/2026 — Étape C terminée (PostgreSQL + modèle structuré)**

- Base PostgreSQL `pooly` + user `pooly` créés sur `192.168.1.177` (aucun impact sur betting-tracker).
- API migrée vers SQLModel (tables `Product` + `Action`) avec seeds produits.
- Passage à `psycopg[binary]` pour compatibilité Python 3.13.
- Suppression de la couche compat : API retourne désormais le format structuré.
- Frontend migré (types + ActionForm + ActionEntry + App + tests).
- Déploiement API sur `192.168.1.178:8003` + rebuild web Docker OK.

**25/02/2026 — Détails des dernières actions**
- Frontend : migration complète vers types structurés (types, utils, ActionForm, ActionEntry, Timeline, HeroCard, App, tests).
- Mock data alignée sur le nouveau modèle (`mockActions.ts`).
- API : suppression couche compat + `created_at` timezone-aware.
- Tests : `pytest` 10/10, `vitest` 10/10.
- Warnings : suppression du warning `httpx` via filtre pytest.

**25/02/2026 — Étape D démarrée (auth email + mot de passe)**
- Choix : login par email + mot de passe, session cookie, passlib (pbkdf2_sha256).
- Ajout du modèle `User` et du champ `user_id` dans `Action`.
- Endpoints auth prévus : `POST /auth/login`, `POST /auth/logout`, `GET /me`.

**25/02/2026 — Étape D (auth) — déployé**
- Auth session cookie opérationnelle, login email + mot de passe.
- Passage à `pbkdf2_sha256` (passlib) pour compatibilité Python 3.13.
- Admin seed : `admin@rocketlab.cloud` (mot de passe fourni).
- Frontend : écran de login intégré + logout.
- Tests : `pytest` 10/10, `vitest` 10/10.

**25/02/2026 — Étape E démarrée (Tasks 1-2 terminées)**
- Task 1 ✅ : Tailwind 4 installé (`tailwindcss` + `@tailwindcss/vite`), alias `@/` configuré dans vite.config.ts + tsconfig.app.json, `@import "tailwindcss"` dans index.css. Commit `eb492fa`.
- Task 2 ✅ : shadcn/ui configuré (`components.json`, `src/lib/utils.ts`), 9 composants générés dans `src/components/ui/` (button, input, select, textarea, card, label, dialog, badge, separator). Commit `b8cbd12`.
- Tests : 10/10 PASS après chaque tâche.
- Point d'arrêt : reprise à la Task 3 (migration ActionForm).

**25/02/2026 — Étape E terminée (refonte UI shadcn/ui)**
- Task 3 ✅ : ActionForm migré shadcn/ui (Select/Input/Textarea/Label/Button), fix SelectItem valeur vide.
- Task 4 ✅ : Écran login migré vers Card/Inputs shadcn.
- Task 5 ✅ : Topbar migrée (Button + props onAdd/onLogout).
- Task 6 ✅ : Nouveau layout 1 colonne (stats + historique) + Dialog formulaire.
- Task 7 ✅ : StatBox + ActionEntry migrés (Card + Badge).
- Task 8 ✅ : Nettoyage CSS (suppression styles inputs/boutons/hero/form).
- Task 9 ✅ : Rebuild Docker + vérifs `200` + container `healthy`.
- Tests : `vitest` 10/10, build `vite` OK.

**25/02/2026 — Ajustements UX (après Étape E)**
- Fix transparence Dialog shadcn : ajout tokens + `@theme` Tailwind v4, variables Pooly renommées.
- ActionForm :
  - nouvelles actions (nettoyage cartouche, nettoyage filtre skimmer, mesure de pH, calibrage pH, ajout de produit)
  - produit conditionnel, unités sur la même ligne, accents corrigés
  - valeur pH quand action = “Mesure de pH”
  - Brome → unité par défaut “pastille”
  - statuts rapides (cases à cocher) ajoutés au-dessus des notes
- Indicateur “État piscine” sur l’accueil : couleur eau + niveau selon les dernières notes (eau claire / niveau OK)
- Icône état piscine : forme bassin + échelle, logo Pooly historique restauré.

**25/02/2026 — Design Étape E validé (refonte UI shadcn/ui)**
- Style cible : clean & minimal, thème shadcn default.
- Layout : une colonne — stats bar + historique complet + Dialog formulaire.
- Stack : Tailwind 4 (`@tailwindcss/vite`), shadcn/ui, composants Button/Input/Select/Card/Dialog/Badge.
- Design doc : `docs/plans/2026-02-25-shadcn-ui-design.md`
- Plan d'implémentation : `docs/plans/2026-02-25-shadcn-ui.md` (9 tâches)

**25/02/2026 — Point d'arrêt**
- Étape D terminée, déploiement OK. Reprise prévue sur durcissement auth (HTTPS cookie, rotation secret, changement de mot de passe).

**24/02/2026 — Implémentation Étape B (Tasks 1-6 / 8)**

Tasks complétées :
- **Task 1** ✅ `apps/web/docker-entrypoint.sh` — envsubst `${BACKEND_URL}`, guard fail-fast POSIX. Commits `82557a5`, `d79d060`.
- **Task 2** ✅ `apps/web/nginx/nginx.conf.template` — proxy `/api/`, headers sécurité, cache, gzip, SPA routing. Commit `b59ed64`.
- **Task 3** ✅ `apps/web/Dockerfile` — non-root `appuser:appgroup`, nginx template, entrypoint, healthcheck. Commit `e9981ac`.
- **Task 4** ✅ `docker-compose.yml` — `BACKEND_URL=http://192.168.1.178:8003`, read-only FS, tmpfs, resource limits, security_opt, healthcheck, logging. Commit `6be04c6`.
- **Task 5** ✅ Build Docker OK — `:8090` → 200, proxy `/api/actions` → 502 (attendu, API pas encore up), `proxy_pass` confirmé dans container.
- **Task 6** ✅ `App.tsx` + `App.test.tsx` — TDD : test rouge → implémentation → 7/7 tests verts. Plus de mock data, `fetch('/api/actions')`, états `loading`/`error`. Commit `1437164`.
- **Task 7** ✅ API déployée sur `192.168.1.178:8003` via sshpass (auth root/password). Fichiers dans `/opt/pooly-api/`, venv Python 3.13, service systemd `pooly-api` actif. `curl /health` → `{"status":"ok"}`, `curl /actions` → liste JSON.
- **Task 8** ✅ Test end-to-end : `curl http://localhost:8090/api/actions` → JSON via proxy Nginx. Site pleinement fonctionnel sur `http://192.168.1.135:8090`.

Bugs découverts et corrigés après vérification en conditions réelles :
- `App.test.tsx` utilisait `global` au lieu de `globalThis` → `tsc -b` échouait au build Docker. Fix : commit `db2f952`.
- Healthcheck `wget localhost:80` incompatible avec `read_only: true` et résolution IPv6 de `localhost`. Fix `nc -z 127.0.0.1 80` dans Dockerfile (`63ee9e4` → `7e5a34f`) puis découverte que `docker-compose.yml` avait sa **propre** directive `healthcheck` qui écrasait celle du Dockerfile. Fix dans les deux fichiers : commit `63cb230`. Container maintenant **healthy** ✅.
- Site accessible sur `http://192.168.1.135:8090` — affiche *"Impossible de charger les actions"* (comportement attendu, API non déployée).

**24/02/2026 — Brainstorming Étape C (PostgreSQL + modèle structuré)**
- ORM : SQLModel + `create_all` (pas d'Alembic).
- `user_id` absent pour l'instant — ajouté à l'Étape D.
- Table `Product` complète avec seeds + `GET /products`.
- PostgreSQL sur `192.168.1.177`, base `pooly` à créer, accès SSH root.
- Approche en 2 phases : API migrée (avec couche compat) → puis frontend.
- Architecture validée (section 1 design approuvée).

**24/02/2026 — Brainstorming mise en prod Étape B**
- Décision : approche incrémentale (frontend ↔ API en mémoire d'abord, PostgreSQL + Auth après).
- API Pooly déployée sur LXC `192.168.1.178`, port **8003** (même LXC que betting-tracker-v2).
- Pattern infra : identique à betting-tracker — Nginx proxy template + `BACKEND_URL` env var runtime.
- Fichiers web à modifier : Dockerfile (non-root), nginx.conf.template (proxy /api/), docker-entrypoint.sh, docker-compose.yml.
- Frontend : remplacer mock data par `fetch('/api/actions')`.

**24/02/2026**
- Création des types et données mock : `apps/web/src/types.ts`, `apps/web/src/data/mockActions.ts`.
- Ajout des tests utilitaires : `apps/web/src/utils.test.ts` (vitest OK après implémentation).
- Implémentation des utilitaires : `apps/web/src/utils.ts` (calcul des jours en UTC pour éviter les décalages timezone).
- CSS global appliqué depuis le mockup : `apps/web/src/index.css`.
- `apps/web/src/App.css` vidé conformément au plan.
- Composant `Topbar` créé : `apps/web/src/components/Topbar.tsx`.
- Composants `StatBox` et `ActionEntry` créés : `apps/web/src/components/StatBox.tsx`, `apps/web/src/components/ActionEntry.tsx`.
- Composant `ActionForm` + tests : `apps/web/src/components/ActionForm.tsx`, `apps/web/src/components/ActionForm.test.tsx` (vitest OK).
- Composants `Timeline` et `InfoGrid` créés : `apps/web/src/components/Timeline.tsx`, `apps/web/src/components/InfoGrid.tsx`.
- Composant `HeroCard` créé : `apps/web/src/components/HeroCard.tsx` (stats calculées via utils).
- Assemblage `App.tsx` + responsive CSS : `apps/web/src/App.tsx`, `apps/web/src/index.css` (vitest OK).
- Dockerfile web remplacé par un multi-stage Vite : `apps/web/Dockerfile`.
- Nettoyage des assets Vite par défaut : `apps/web/src/assets/react.svg`, `apps/web/public/vite.svg` supprimés.
- Suppression de `apps/web/src/App.css` et mise à jour des docs de contexte.

### Décisions de design arrêtées
- Mode toggle Auto/Desktop/Mobile : **supprimé** (outil mockup uniquement)
- Lang toggle FR/EN : **décoratif** (pas de i18n pour l'instant)
- PWA : **différé** (ajouté quand l'app est stable)
- CSS : **fichier global** + variables (pas de CSS modules)
- State : **useState dans App.tsx** (pas de context nécessaire à ce stade)

### Prochaines grandes étapes (après frontend V1)
1. **Étape B** ✅ **Terminée** — Frontend connecté à l'API, site fonctionnel sur `:8090`
2. **Étape C** ✅ **Terminée** — PostgreSQL + modèle structuré + table Product
3. **Étape D** ✅ Terminée — Auth email + mot de passe (session cookie)
4. **Étape E** ✅ Terminée — Refonte UI shadcn/ui (Tailwind 4 + composants, design validé 25/02/2026)
5. **Étape F** — PWA (manifest + service worker)

---

## Déploiement actuel

### Commandes Docker (web uniquement)
```bash
cd /opt/pooly
docker compose up -d --build
```

### LXC FastAPI
- LXC : `192.168.1.178`
- Port : **8003**
- Service systemd `pooly-api` actif, API connectée PostgreSQL

### LXC PostgreSQL
- Même instance que betting-tracker : `192.168.1.177`
- Base créée : `pooly` + user `pooly`

---

## Notes de conception

- Prévu pour une intégration future avec **Home Assistant**
- PWA : utilisation depuis mobile (tablette à côté de la piscine)
- Auth sans password volontaire : usage familial/domestique, pas besoin de sécurité forte
