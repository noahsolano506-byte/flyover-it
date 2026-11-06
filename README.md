# FlyOverIt.io

Launch from the hill, fly for distance, earn cash, buy upgrades, then chase record runs through obstacles you dodge or block.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default [http://127.0.0.1:5173](http://127.0.0.1:5173)).

Production build:

```bash
npm run build
npm run preview
```

## Play

- **Casual hop** — no obstacles; bank meters into upgrades.
- **Record run** — birds, balloons, and storm clouds; higher payout. Use **Block** (hull plating charges) or steer clear.
- **Hold launch** (or Space) to charge, release to fly. **W/S** or **↑/↓** to climb/dive.
- Money and upgrades persist in `localStorage` (`flyoverit-save-v1`).

## Stack

Vite + React + TypeScript, Canvas 2D flight loop, no backend.
