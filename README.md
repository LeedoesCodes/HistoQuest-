# BasaQuest — History Module

Gamified Philippine & Davao del Norte local-history learning for Grade 5 pupils.
Part of the BasaQuest capstone. Built with **React + Phaser 3 + TypeScript + Vite**,
backed by **Supabase**.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Open the URL — you'll see the arc-select screen with the three historical arcs
(Mactan, Pugad Lawin, Datu Bago). Click an arc to select it (currently logs to
the console; the arc flow is the next thing to build).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |

## Backend (optional in dev)

The game runs without a backend (offline-mock mode). To connect Supabase:

1. Create a free project at supabase.com
2. Run `src/shared/schema.sql` in the Supabase SQL editor
3. Copy `.env.example` → `.env.local` and fill in your project URL + anon key

## Project layout

```
src/
  main.tsx              React entry (no StrictMode — see CLAUDE.md)
  App.tsx               Dev shell (stands in for the team's real shell)
  game/
    HistoryGame.tsx     THE React↔Phaser boundary + entry component
    gameConfig.ts       Phaser config + scene list
    scenes/             Phaser scenes (TitleScene, BootScene…)
  shared/               TEAM CONTRACTS — agree changes with teammates
    types.ts            Pupil, HistoryGameProps, BehaviorEvent, …
    schema.sql          Supabase/Postgres schema
    supabase.ts         Supabase client (offline-safe)
```

See [CLAUDE.md](CLAUDE.md) for architecture rules and the build order.
