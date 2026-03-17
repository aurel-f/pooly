# Design — Étape E : Refonte UI avec shadcn/ui

**Date :** 2026-02-25
**Statut :** Validé

---

## Contexte

L'interface actuelle est construite avec du CSS custom, des styles inline, et des composants HTML natifs (`input`, `select`, `button`). Le résultat est hétérogène et difficile à maintenir. L'objectif est de migrer les composants interactifs vers shadcn/ui pour un rendu clean, cohérent et accessible.

---

## Décisions

| Sujet | Décision |
|-------|----------|
| Style cible | Clean & minimal (thème shadcn default — blanc/gris neutre) |
| Layout | Stats en haut + historique en dessous (une colonne) |
| Formulaire | Dialog shadcn (accessible, focus trap) — bouton [+ Action] dans la Topbar |
| Ampleur | Refonte ciblée — composants interactifs uniquement |
| Tailwind | v4 via `@tailwindcss/vite` (pas de tailwind.config.js) |
| CSS custom | Conservé pour layout et variables de couleurs |
| Polices | Conservées (Fraunces + IBM Plex Sans) |

---

## Stack ajoutée

```
tailwindcss
@tailwindcss/vite
shadcn/ui (CLI)
class-variance-authority
clsx
tailwind-merge
lucide-react
```

### Composants shadcn installés

`Button`, `Input`, `Select`, `Textarea`, `Card`, `Label`, `Dialog`, `Badge`, `Separator`

---

## Nouveau layout

```
┌──────────────────────────────────────┐
│  Topbar : "Pooly"    [+ Action] [→]  │  ← Button shadcn
├──────────────────────────────────────┤
│  [Card] Stats : 3 actions│2j│pH 7.2  │  ← Card + Badge
├──────────────────────────────────────┤
│  Historique                          │
│  ┌─ Card ──────────────────────────┐ │
│  │ 24/02  Chlore · 60g             │ │
│  │ 23/02  Mesure pH · 7.4          │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
        [Dialog "Nouvelle action"]
```

---

## Mapping composants

| Actuel | Remplacé par |
|--------|-------------|
| `<button className="btn primary">` | `<Button>` |
| `<button className="btn ghost">` | `<Button variant="outline">` |
| `<input>` inline styled | `<Input>` |
| `<select>` natif | `<Select>` (Radix) |
| `<textarea>` inline | `<Textarea>` |
| `<label>` custom | `<Label>` |
| Div card dark `#0f191c` | `<Card>` shadcn |
| Formulaire plein écran mobile | `<Dialog>` |
| Écran login (div dark) | `<Card>` centrée |

### Composants non migrés

`Timeline`, `InfoGrid` — structure HTML simple, pas de composants interactifs, pas de valeur ajoutée à migrer.

---

## Stratégie de migration

Ordre d'implémentation :

1. Setup Tailwind 4 + shadcn init (`index.css`, `vite.config.ts`, `components.json`)
2. Installer les composants shadcn nécessaires
3. Écran de login (`App.tsx`) — Card + Input + Button
4. `ActionForm` — Select, Input, Textarea, Label, Button, Dialog
5. `HeroCard` — Card + Button
6. `StatBox` — Card mini
7. `ActionEntry` — Card + Badge
8. `Topbar` — Button logout + bouton [+ Action]
9. Nettoyage CSS custom devenu inutile dans `index.css`

---

## Tests

- Les 10 tests vitest existants restent valides (ils testent le comportement, pas les classes CSS)
- Aucune modification de logique métier ou d'appels API
- Vérification `vitest run` après chaque étape
