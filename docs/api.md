# API V1 (brouillon)

## Entities
- User: id, username, created_at
- Product: id, name, type (seed|custom), unit_default
- Action: id, user_id, date, action_type, product_id, qty, unit, notes, created_at

## Endpoints
- POST /auth/login  { username } -> { token, user }
- GET /me -> { user }
- GET /products -> [product]
- POST /products -> { name, unit_default } -> product
- GET /actions?from=YYYY-MM-DD&to=YYYY-MM-DD
- POST /actions
- DELETE /actions/:id

## Notes
- Token par appareil (bearer)
- Tous les endpoints proteges sauf /auth/login
- Seeds produits: chlore, brome, sel, pH+, pH-, anti-algue, floculant, nettoyage filtre, contre-lavage, nettoyage cartouche
