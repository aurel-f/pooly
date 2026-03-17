# Design — Étape C : PostgreSQL + modèle structuré

**Date :** 24/02/2026
**Statut :** Validé

---

## Objectif

Remplacer le stockage en mémoire de l'API par PostgreSQL, migrer le modèle `Action` vers des champs structurés, et ajouter une table `Product` avec seeds. Le frontend est migré en Phase 2 après validation de l'API.

---

## Décisions

| Décision | Choix | Raison |
|----------|-------|--------|
| ORM | SQLModel + `create_all` | Simple, pas d'Alembic pour projet solo |
| `user_id` | Absent | Ajouté proprement à l'Étape D |
| Table Product | Complète + seeds + `GET /products` | Modèle cible V1 |
| PostgreSQL | `192.168.1.177`, base `pooly` | Même serveur que betting-tracker |
| Approche | 2 phases (API compat → frontend) | Zéro régression, testable par étape |

---

## Modèle de données

```
Product
  id          : int (PK, autoincrement)
  name        : str (ex: "Chlore")
  type        : str ("seed" | "custom")
  unit_default: str (ex: "g")

Action
  id          : int (PK, autoincrement)
  date        : date
  action_type : str (ex: "Ajout de chlore")
  product_id  : int | null (FK → Product)
  qty         : str (ex: "60")
  unit        : str (ex: "g")
  notes       : str
  created_at  : datetime (default: now)
```

Seeds produits :
`chlore, brome, sel, pH+, pH-, anti-algue, floculant, nettoyage filtre, contre-lavage, nettoyage cartouche`

---

## Architecture en 2 phases

### Phase 1 — API migrée, frontend inchangé

```
pooly_web :8090 (inchangé)
  fetch('/api/actions') → { id, date, title, meta }   ← couche compat

pooly-api :8003 (mis à jour)
  SQLModel + PostgreSQL
  GET  /actions  → construit title+meta depuis les vrais champs
  POST /actions  → accepte { title, meta } OU champs structurés
  GET  /products → liste des produits (seeds + custom)
  DELETE /actions/{id}

PostgreSQL 192.168.1.177 — base pooly
  tables : action, product
```

**Couche compat `GET /actions` :**
```python
title = action.action_type
meta  = f"{product.name} {action.qty}{action.unit}" si product_id
        sinon action.notes
```

**Couche compat `POST /actions` :**
```python
# Ancien format reçu : { date, title, meta }
action_type = payload.title
notes       = payload.meta
product_id, qty, unit = None, "", ""
```

### Phase 2 — Frontend migré

```
App.tsx charge Promise.all(['/api/actions', '/api/products'])
ActionForm envoie { date, action_type, product_id, qty, unit, notes }
ActionEntry affiche action_type + "{product.name} {qty}{unit}"
utils.ts : extractLastPh cherche dans notes (plus meta)
Couche compat supprimée de l'API
```

---

## Structure des fichiers API

```
apps/api/
  main.py          ← FastAPI app, endpoints, lifespan (create_all + seeds)
  database.py      ← engine SQLModel, get_session dependency
  models.py        ← SQLModel tables : Product, Action
  seeds.py         ← liste des produits prédéfinis + fonction insert_seeds
  requirements.txt ← + sqlmodel==0.0.16, psycopg2-binary==2.9.9
```

---

## Déploiement

### PostgreSQL (`192.168.1.177`)
```sql
CREATE DATABASE pooly;
CREATE USER pooly WITH PASSWORD 'pooly';
GRANT ALL PRIVILEGES ON DATABASE pooly TO pooly;
```

### Service systemd (`192.168.1.178`)
Ajout dans `pooly-api.service` :
```ini
Environment=DATABASE_URL=postgresql://pooly:pooly@192.168.1.177:5432/pooly
```

### Séquence
1. Créer la base sur `192.168.1.177`
2. Mettre à jour `apps/api/` + copier sur `192.168.1.178`
3. Redémarrer `pooly-api` → `create_all` + seeds au démarrage
4. Vérifier `GET /products` et `GET /actions`
5. Migrer le frontend + rebuild Docker web
6. Test end-to-end navigateur

---

## Tests

- **API** : pytest + client FastAPI en mémoire avec SQLite (pas besoin de Postgres en test)
- **Frontend** : Vitest — mock `fetch('/api/products')` + `fetch('/api/actions')`

---

## Hors scope (étapes suivantes)

- `user_id` sur les actions → **Étape D**
- Auth username + bearer token → **Étape D**
- PWA → **Étape E**
