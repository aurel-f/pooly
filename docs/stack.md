# Stack V1 (proposition)

## Frontend
- Vite + React + TypeScript
- PWA: manifest + service worker minimal (vite-plugin-pwa)
- Styling: CSS (fichier global) + variables

## Backend
- FastAPI (Python) + PostgreSQL
- ORM: SQLModel ou SQLAlchemy

## Auth V1
- Username unique + token par appareil (bearer token)
- Pas d'email / pas de password

## Rationale
- Rapidite d'iteration
- Stack stable pour PWA
- API claire pour future integration Home Assistant
