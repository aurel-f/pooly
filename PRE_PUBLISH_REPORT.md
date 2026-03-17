# Rapport pré-publication — 2026-03-17

## Backup
- [x] `CLAUDE.md.private` créé (`/opt/pooly/CLAUDE.md.private`)
- [x] Dossier `.backup/20260317_094306/` créé
- [x] Mémoire Claude Code sauvegardée (`.backup/20260317_094306/claude_memory/`)

---

## Sécurité

### .gitignore
- [x] Complété automatiquement — ajout de : `**/node_modules/`, `*.env`, `**/.env`, `.venv/`, `venv/`, `build/`, `.cache/`, `.backup/`, `CLAUDE.md.private`, `*.sqlite`, `*.pyo`

### Secrets dans l'historique Git
- [x] Aucun fichier `.env` jamais commité (`git ls-files | grep .env` → vide)
- [x] Aucun mot de passe réel ni token dans le code applicatif commité
- ⚠️ **ATTENTION (lecture manuelle requise)** : Le fichier `CLAUDE.md` commité dans **tous les commits** contient des IPs privées du réseau local (`192.168.1.135`, `192.168.1.178`). Ces adresses ne sont pas des secrets cryptographiques mais identifient la topologie réseau. Voir section "⚠️ Points nécessitant attention manuelle" ci-dessous.

### .env.example
- [x] Fichier présent, toutes les valeurs sont fictives (`changeme`, `change-this-to-a-long-random-secret`, `admin@example.com`, `AdminPassword1`)
- [x] `BACKEND_URL=http://api:8003` (Docker self-contained par défaut)
- [x] Commenté et documenté

### CORS (`apps/api/main.py` ligne 195–198)
- ⚠️ **ATTENTION (correction manuelle requise)** : La valeur par défaut hardcodée contient une IP privée :
  ```python
  _allowed_origins = os.getenv(
      "ALLOWED_ORIGINS",
      "http://localhost:8090,http://192.168.1.135:8090"  # ← IP privée à supprimer
  ).split(",")
  ```
  **Correction attendue** : remplacer le défaut par `"http://localhost:8090"` uniquement.

### Token de reset password
- [x] `logging.debug("[RESET LINK] token=%s", token)` — conditionnel sur `DEBUG=true`, niveau DEBUG uniquement ✅

### Cookie session
- [x] `same_site="strict"` ✅
- [x] `https_only=False` — commenté `# TODO: set True when HTTPS` (acceptable pour HTTP local)

---

## Infrastructure

### docker-compose.yml
- [x] 3 services : `db`, `api`, `web`
- [x] Toutes les variables via `.env` (pas de valeurs hardcodées)
- [x] `healthcheck` sur `db` (pg_isready) ✅
- [x] `api depends_on db` avec `condition: service_healthy` ✅
- [x] `web depends_on api` (sans condition de healthcheck — mineur)
- [x] Un seul port exposé vers l'extérieur : `${WEB_PORT:-8090}:80` ✅
- [x] Volume nommé `postgres_data` ✅
- ℹ️ Le service `api` n'a pas de `healthcheck` défini — `web` ne peut donc pas attendre que l'API soit prête (actuellement géré par retry au démarrage FastAPI). Mineur pour une stack self-hosted.

---

## Documentation

### CLAUDE.md
- [x] Réécrit pour publication — version privée sauvegardée dans `.backup/` et `CLAUDE.md.private`
- [x] Aucune IP privée, aucun mot de passe, aucune note de session dans la nouvelle version

---

## ⚠️ Points nécessitant attention manuelle

### 1. IPs privées dans l'historique Git (CRITIQUE avant publication)
**Problème** : Tous les commits depuis le début contiennent `192.168.1.135` et `192.168.1.178` dans `CLAUDE.md`. Ces IPs révèlent la topologie réseau local.

**Options** :
- **Option A (recommandée)** : Créer un nouveau repo Git avec un seul commit `initial` propre — pas d'historique exposé.
  ```bash
  rm -rf .git
  git init
  git add .
  git commit -m "feat: initial release — Pooly v1.0"
  git remote add origin <url-github>
  git push -u origin master
  ```
- **Option B** : Réécrire l'historique avec `git filter-repo` pour supprimer les IPs de tous les commits (complexe, risque d'erreur).

### 2. CORS — IP hardcodée dans main.py (IMPORTANT)
**Fichier** : `apps/api/main.py` ligne 197
**Problème** : `"http://localhost:8090,http://192.168.1.135:8090"` — l'IP privée est dans le code source.
**Correction** : Changer le défaut en `"http://localhost:8090"` uniquement.
> Demander confirmation avant de corriger.

### 3. CLAUDE.md — version actuelle non committée
Le CLAUDE.md réécrit n'est pas encore commité. À commiter avec le reste avant publication.

---

## 🚀 Prêt à publier

**Non — 2 blocants :**

1. **Historique Git contient des IPs privées** — à nettoyer (Option A recommandée : nouveau repo)
2. **CORS default contient une IP privée dans main.py** — 1 ligne à corriger

Une fois ces 2 points traités : ✅ prêt à publier.
