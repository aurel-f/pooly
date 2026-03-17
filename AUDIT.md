# Audit Pooly — 2026-03-15

## Résumé exécutif

L'application Pooly est fonctionnelle, bien structurée et dispose d'une base solide (ORM, auth par cookie, isolation des données par utilisateur, tests passing). Cependant, **3 problèmes critiques de sécurité** doivent être corrigés avant toute exposition publique : CORS wildcard avec credentials, token de réinitialisation exposé en clair dans les logs, et cookie de session transmis sans HTTPS. On recense au total **3 critiques, 7 importants et 7 mineurs**.

---

## 🔴 Critique (à corriger immédiatement)

### 1. CORS wildcard + credentials — authentification contournable

- **Fichier** : `apps/api/main.py` lignes 89–94
- **Problème** :
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],      # accepte toutes les origines
      allow_credentials=True,   # envoie les cookies de session
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  La combinaison `allow_origins=["*"]` + `allow_credentials=True` est rejetée par les navigateurs modernes (CORS spec) mais signale une intention dangereuse : n'importe quel site tiers pourrait déclencher des requêtes authentifiées au nom de l'utilisateur connecté (CSRF via XHR).
- **Risque** : Un site malveillant pourrait appeler `POST /actions` ou `DELETE /actions/:id` depuis le navigateur de l'utilisateur sans qu'il s'en aperçoive.
- **Correction** :
  ```python
  allow_origins=["http://localhost:8090", "http://192.168.1.135:8090"],
  allow_credentials=True,
  allow_methods=["GET", "POST", "PATCH", "DELETE"],
  allow_headers=["Content-Type"],
  ```

---

### 2. Token de réinitialisation de mot de passe exposé dans les logs Docker

- **Fichier** : `apps/api/main.py` ligne 226
- **Problème** :
  ```python
  print(f"[RESET LINK] http://localhost/#reset-password?token={token}", flush=True)
  ```
  Le token UUID permettant de changer le mot de passe d'un utilisateur est imprimé en clair dans stdout — et donc accessible via `docker logs pooly_api` ou tout système d'agrégation de logs (Grafana Loki, Datadog, etc.).
- **Risque** : Quiconque a accès aux logs peut usurper n'importe quel compte en volant le token avant son utilisation. Le token est valide 1 heure.
- **Correction** : Supprimer ce `print`. En production, implémenter un envoi par email réel. En développement, logger uniquement si une variable `DEBUG=true` est définie, et via `logging.debug()` plutôt que `print`.

---

### 3. Cookie de session transmis en HTTP clair

- **Fichier** : `apps/api/main.py` lignes 97–102
- **Problème** :
  ```python
  app.add_middleware(
      SessionMiddleware,
      secret_key=_require_session_secret(),
      same_site="lax",
      https_only=False,   # cookie transmis en HTTP
  )
  ```
  Avec `https_only=False`, le cookie de session est envoyé sur des connexions HTTP non chiffrées. Sur un réseau local (Wi-Fi domestique), n'importe quel appareil sur le même réseau peut intercepter le cookie via un outil passif (Wireshark).
- **Risque** : Vol de session, prise de contrôle du compte sans connaître le mot de passe.
- **Correction** : Activer HTTPS (même auto-signé en local) et passer `https_only=True`. Si HTTPS n'est pas envisagé à court terme, documenter explicitement la limitation et ne pas exposer le service sur Internet.

---

## 🟠 Important (à corriger prochainement)

### 4. Validation du mot de passe incohérente entre les formulaires

- **Fichiers** :
  - `apps/api/main.py` ligne 193 (register + PATCH /me)
  - `apps/web/src/components/LoginPage.tsx` ligne 304 (reset-password côté client)
- **Problème** : L'inscription vérifie `len >= 8 + majuscule + chiffre`. Le formulaire de réinitialisation du mot de passe (côté client) vérifie uniquement `len >= 8`. Si l'utilisateur passe par le reset, il peut définir un mot de passe qui serait refusé à l'inscription. De plus, `_validate_password_strength` n'est pas appelée dans `reset_password` (ligne 230–250) côté serveur — un attaquant appelant l'API directement peut définir un mot de passe de 8 caractères sans majuscule ni chiffre.
- **Risque** : Politique de sécurité contournée via le flux de reset.
- **Correction** : Appeler `_validate_password_strength(payload.password)` dans `reset_password` (ligne 245), et aligner la validation côté client (`LoginPage.tsx` ligne 304) pour utiliser `pwStrength(resetPw) < 2` plutôt que `resetPw.length < 8`.

---

### 5. Aucun rate limiting sur l'endpoint de connexion

- **Fichier** : `apps/api/main.py` ligne 177
- **Problème** : `POST /auth/login` n'a aucune protection contre les attaques par force brute. Un attaquant peut tenter un nombre illimité de combinaisons email/mot de passe.
- **Risque** : Brute-force de comptes, en particulier si les mots de passe sont faibles (pas de caractère spécial requis).
- **Correction** : Ajouter `slowapi` (rate limiter pour FastAPI) ou, plus simple, un délai progressif côté serveur. Exemple minimal :
  ```python
  from slowapi import Limiter
  from slowapi.util import get_remote_address
  limiter = Limiter(key_func=get_remote_address)
  # Sur l'endpoint :
  @limiter.limit("5/minute")
  @app.post("/auth/login")
  def login(...):
  ```

---

### 6. Migrations DDL exécutées à chaque démarrage via SQL brut

- **Fichier** : `apps/api/main.py` lignes 41–52
- **Problème** :
  ```python
  def _ensure_user_id_column(session: Session) -> None:
      session.exec(text("ALTER TABLE action ADD COLUMN IF NOT EXISTS user_id INTEGER"))

  def _ensure_first_name_column(session: Session) -> None:
      session.exec(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS first_name VARCHAR NOT NULL DEFAULT \'\''))
  ```
  Des instructions DDL sont exécutées à chaque démarrage de l'API, sans versionning. Ces colonnes existent déjà dans le modèle SQLModel et seront créées par `SQLModel.metadata.create_all` — le code est donc redondant et potentiellement trompeur. Un changement de type ou de contrainte ne serait pas appliqué.
- **Risque** : Divergence silencieuse entre schéma DB et modèles Python ; difficultés de débogage sur des environnements neufs.
- **Correction** : Supprimer `_ensure_user_id_column` et `_ensure_first_name_column` ainsi que leurs appels (lignes 80–81). Le schéma est déjà géré par `SQLModel.metadata.create_all(engine)` ligne 78.

---

### 7. Dépendances backend significativement obsolètes

- **Fichier** : `apps/api/requirements.txt`
- **Problème** :
  | Package | Version utilisée | Dernière stable (mars 2026) | Écart |
  |---------|------------------|-----------------------------|-------|
  | `fastapi` | 0.109.2 | ~0.115.x | ~6 versions majeures |
  | `uvicorn` | 0.27.1 | ~0.34.x | ~7 versions majeures |
  | `sqlmodel` | 0.0.16 | ~0.0.22 | |
  | `passlib` | 1.7.4 | 1.7.4 (maintenance only, pas d'activité depuis 2023) | ⚠️ abandonné |

  `passlib` est en particulier préoccupant : le projet n'est plus activement maintenu. Les versions récentes de Python peuvent faire apparaître des warnings de dépréciation.
- **Risque** : Failles de sécurité non corrigées dans les dépendances, incompatibilités Python futures.
- **Correction** : Mettre à jour `fastapi`, `uvicorn`, `sqlmodel`. Pour `passlib`, envisager une migration vers `pwdlib` (maintenu activement, drop-in replacement pour pbkdf2).

---

### 8. Aucune vérification d'erreur HTTP sur `handleEdit` et `handleDelete`

- **Fichier** : `apps/web/src/App.tsx` lignes 143–147 et 165–173
- **Problème** :
  ```typescript
  // handleDelete — ligne 143
  const handleDelete = async (id: number) => {
    await fetch(`/api/actions/${id}`, { method: 'DELETE', credentials: 'same-origin' })
    setActions(prev => prev.filter(a => a.id !== id))  // appliqué même si l'API a renvoyé 404/500
    setDeletingAction(null)
  }

  // handleEdit — ligne 165
  const res = await fetch(`/api/actions/${id}`, { ... })
  const updated: Action = await res.json()  // pas de vérification res.ok
  ```
  Si l'API retourne une erreur (réseau, 500, session expirée), l'état local est quand même mis à jour, créant une désynchronisation entre le frontend et la base de données.
- **Risque** : Données affichées incorrectes après une erreur réseau ; suppression locale d'une entrée qui existe toujours en base.
- **Correction** : Ajouter `if (!res.ok) throw new Error(...)` dans les deux handlers et gérer l'erreur (toast, message utilisateur, `reload`).

---

### 9. `/api/actions` retourne toutes les lignes sans limite

- **Fichier** : `apps/api/main.py` ligne 285–286
- **Problème** :
  ```python
  return session.exec(
      select(Action).where(Action.user_id == user.id).order_by(Action.date.desc())
  ).all()
  ```
  `.all()` charge l'intégralité des actions de l'utilisateur en mémoire. Pour un utilisateur qui enregistre 1 action par jour, c'est ~365 lignes/an. Après 5 ans, ~1800 lignes chargées à chaque ouverture de l'application.
- **Risque** : Dégradation des performances frontend et backend, consommation mémoire API inutile.
- **Correction** : Ajouter des paramètres de pagination `skip`/`limit`, ou un filtre `from`/`to` par date pour ne charger que les données récentes.

---

## 🟡 Mineur (amélioration recommandée)

### 10. Prop `products` reçue mais non utilisée dans `DashboardPage`

- **Fichier** : `apps/web/src/components/DashboardPage.tsx` ligne 58
- **Problème** :
  ```typescript
  export default function DashboardPage({ actions, products: _products, onEdit, onDelete, ... })
  ```
  Le paramètre `products` est reçu (renommé `_products` pour signaler qu'il est inutilisé) mais jamais utilisé dans le composant. Il est passé inutilement depuis `App.tsx` (ligne 192).
- **Risque** : Aucun risque fonctionnel. Confusion pour les futurs mainteneurs.
- **Correction** : Retirer `products` des props de `DashboardPage` et de son appel dans `App.tsx`.

---

### 11. Index manquants sur `Action.user_id` et `Action.product_id`

- **Fichier** : `apps/api/models.py` lignes 36–37
- **Problème** :
  ```python
  user_id: Optional[int] = Field(default=None, foreign_key="user.id")   # pas d'index
  product_id: Optional[int] = Field(default=None, foreign_key="product.id")  # pas d'index
  ```
  La colonne `user_id` est utilisée dans chaque requête `WHERE Action.user_id == user.id`. Sans index, PostgreSQL effectue un sequential scan sur toute la table.
- **Risque** : Dégradation des performances à mesure que la table grossit (>1000 lignes).
- **Correction** : Ajouter `index=True` sur ces deux champs :
  ```python
  user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
  product_id: Optional[int] = Field(default=None, foreign_key="product.id", index=True)
  ```

---

### 12. Contrainte UNIQUE manquante sur `Product.name`

- **Fichier** : `apps/api/models.py` ligne 27 et `apps/api/seeds.py` ligne 21
- **Problème** : La déduplication des seeds se fait par comparaison en Python (`existing_names`), mais la base de données n'a pas de contrainte `UNIQUE` sur `Product.name`. Un bug ou une race condition au démarrage pourrait créer des doublons.
- **Risque** : Produits dupliqués dans le sélecteur du formulaire d'ajout.
- **Correction** : `name: str = Field(unique=True)` dans `models.py`.

---

### 13. Fallback SQLite dans `database.py`

- **Fichier** : `apps/api/database.py` ligne 6
- **Problème** :
  ```python
  DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pooly.db")
  ```
  Si `DATABASE_URL` n'est pas défini (erreur de configuration), l'API démarre silencieusement sur SQLite. Les comportements diffèrent entre SQLite et PostgreSQL (types, contraintes, concurrence).
- **Risque** : Démarrage en mode dégradé non détecté ; données écrites dans un fichier local ignoré lors du prochain déploiement.
- **Correction** : Rendre `DATABASE_URL` obligatoire, comme `SESSION_SECRET` :
  ```python
  DATABASE_URL = os.environ["DATABASE_URL"]  # KeyError si absent = fail-fast
  ```

---

### 14. `.dockerignore` absent pour l'API

- **Fichier** : `apps/api/Dockerfile`
- **Problème** : Le `COPY . .` (ligne 10) du Dockerfile API inclut dans le contexte de build le répertoire `.venv/` (virtualenv local ~200 Mo), les fichiers `*.pyc`, `__pycache__`, le fichier `.env` local s'il existe, et les tests. Cela ralentit les builds et risque d'embarquer des fichiers sensibles.
- **Risque** : Secrets locaux copiés dans l'image ; builds inutilement lents.
- **Correction** : Créer `apps/api/.dockerignore` :
  ```
  .venv/
  __pycache__/
  *.pyc
  .env
  tests/
  *.db
  ```

---

### 15. `same_site="lax"` insuffisant — CSRF sur navigation directe

- **Fichier** : `apps/api/main.py` ligne 100
- **Problème** : `same_site="lax"` bloque le cookie sur les requêtes cross-site initiées par du JavaScript, mais l'autorise pour les navigations top-level (liens `<a href>`, redirections). Pour une API REST sans formulaires HTML servis par le backend, `same_site="strict"` est plus approprié.
- **Risque** : Vecteur CSRF via lien externe vers un endpoint GET sensible (ex. export de données).
- **Correction** : `same_site="strict"` dans `SessionMiddleware`.

---

### 16. `main.py` monolithique — 370 lignes, toute la logique en un seul fichier

- **Fichier** : `apps/api/main.py`
- **Problème** : Modèles Pydantic, helpers d'auth, migration DDL, seeds, tous les endpoints (auth, profil, actions, produits, import) sont dans un seul fichier. L'ajout de nouvelles fonctionnalités augmentera la complexité de manière non linéaire.
- **Risque** : Aucun risque fonctionnel immédiat. Maintenabilité réduite.
- **Correction** : Découper en routers FastAPI (`routers/auth.py`, `routers/actions.py`, `routers/users.py`) lors de la prochaine refactorisation majeure.

---

## ✅ Points positifs

- **Isolation des données utilisateur correcte** : `update_action` (ligne 319) et `delete_action` (ligne 366) vérifient `action.user_id != user.id` avant d'agir — un utilisateur ne peut pas modifier ou supprimer les données d'un autre.
- **`SESSION_SECRET` obligatoire au démarrage** : `_require_session_secret()` (ligne 34) lève une `RuntimeError` si la variable est absente, empêchant un démarrage avec une clé vide.
- **`POSTGRES_PASSWORD` requise dans `docker-compose.yml`** : L'opérateur `:?` (ligne 9) force une erreur explicite si le mot de passe n'est pas défini.
- **Hash de mot de passe robuste** : `passlib` avec `pbkdf2_sha256` (ligne 18) — algorithme solide, sel automatique, itérations configurables.
- **Protection XSS nulle côté frontend** : React 19 + JSX échappe automatiquement toutes les valeurs interpolées ; aucun `dangerouslySetInnerHTML` détecté.
- **Hardening Docker sur le container web** : `read_only: true`, `no-new-privileges:true`, `tmpfs` pour les répertoires variables, limites CPU/mémoire — bonne pratique appliquée.
- **`useMemo` systématique dans `DashboardPage`** : toutes les valeurs calculées (params, phHistory, treatments, todoItems) sont mémoïsées avec des dépendances correctes.
- **`.env` exclu du dépôt git** : `.gitignore` ligne 16 — les secrets ne sont pas committés.
- **`/auth/forgot-password` ne révèle pas l'existence d'un compte** : la réponse est toujours `{"ok": true}` que l'email existe ou non (ligne 227) — protection contre l'énumération d'emails.
