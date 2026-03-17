# Pooly Frontend V1 — Design

**Date :** 23/02/2026
**Scope :** Frontend uniquement, mock data (pas de vrai backend)

## Objectif

Transformer le mockup HTML statique en application React + TypeScript fonctionnelle, fidèle visuellement, avec des données de démo.

## Décisions

- Mode toggle (Auto/Desktop/Mobile) : **supprimé** (outil de preview uniquement)
- Lang toggle FR/EN : **décoratif** (pas de i18n pour l'instant)
- PWA : **différé** (ajouté quand l'app est stable)
- CSS : **fichier global** + variables (repris du mockup)
- State : **useState dans App.tsx** (pas de context/store nécessaire à ce stade)

## Structure

```
apps/web/src/
  main.tsx
  App.tsx
  index.css
  types.ts
  data/mockActions.ts
  components/
    Topbar.tsx
    HeroCard.tsx
    StatBox.tsx
    Timeline.tsx
    ActionEntry.tsx
    ActionForm.tsx
    InfoGrid.tsx
```

## Types

```ts
type Action = {
  id: number
  date: string   // YYYY-MM-DD
  title: string
  meta: string
}
```

## State (App.tsx)

- `actions: Action[]` — initialisé depuis mock data
- `showForm: boolean` — contrôle la sheet mobile

## Comportement formulaire

- Desktop : formulaire toujours visible à droite
- Mobile : bottom sheet avec slide-up, FAB flottant pour l'ouvrir
- Submit : prepend dans la liste + ferme la sheet

## Stats affichées (calculées depuis mock data)

- Actions ce mois
- Jours depuis la dernière action
- Dernière mesure pH (extrait du champ meta si présent, sinon "—")
