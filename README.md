# Pookie Tracker
Lightweight progressive web app for tracking a calorie-deficit program with streaks, countdown goals, and a playful retro aesthetic.

## Overview
- **Stack** – Vite + React 19, TypeScript, Tailwind-inspired utility classes, and the `vite-plugin-pwa` manifest/workbox setup so the app can install on mobile or desktop.
- **Focus** – A single-screen daily input flow that updates a streak tracker, a countdown of calories remaining in the current “challenge,” and a weekly/history companion to encourage consistency.
- **Design** – An Aurora shader (see `src/components/Aurora.tsx`) plus custom “y2k” classes in `src/index.css` provide the neon gradient background that frames the shell, while `BottomNav` keeps Today/Week/History/Profile accessible from any tab.

## Key features
1. **Today view**
   - Enter calories eaten, burned, gym attendance, and whether the day is marked as a cheat day.
   - Saves to IndexedDB via `idb-keyval`; each save recomputes the streak, daily deficit, and a countdown reserve (starts at 45 000 calories and deducts each day’s calories-out to keep the challenge honest).
   - Provides instant feedback on whether the day met the minimum deficit (`MIN_DEFICIT`), earned the bonus deficit (`BONUS_DEFICIT`), or should be treated as a cheat.
2. **Week view**
   - Displays a full Sunday‑to‑Saturday grid of deficit data pulled from `getLogsInRange` plus gym/cheat annotations.
   - Highlights whether the week hit gym (`GYM_MIN_PER_WEEK`) and deficit consistency goals (including `MAX_CHEAT_DAYS_PER_WEEK`), then marks “Week successful” when both conditions are met.
3. **History view**
   - Lists every logged day sorted newest first with deficit, burned/eaten breakdown, and pill tags for gym/cheat/bonus.
   - Tapping a row brings that date back into the Today view for editing.
4. **Profile**
   - Stores BMR, goal weight, and program start date. Defaults to the constants in `src/lib/config.ts`.
   - Calculates recommended calories per day and minimum calories-out targets to guide any day you log.

## Architecture
- **Data model** – `src/lib/types.ts` defines `Profile` and `DailyLog`. Every entry persists to IndexedDB under `log:YYYY-MM-DD`, while profile, streak, and countdown use their own keys (`profile`, `streak`, `countdown`).
- **Rules/config** – `src/lib/config.ts` centralizes constants (`MIN_DEFICIT`, `BONUS_DEFICIT`, `GYM_MIN_PER_WEEK`, program length, etc.). `src/lib/rules.ts` exposes helpers for calories-out, deficit, minimum/bonus checks, and weekly summaries.
- **Store helpers** – `src/data/store.ts` wraps `idb-keyval` with helper functions for `getDailyLog`, `getLogsInRange`, streak/countdown rebuilding, and `applySaveEffects` (which updates streak and countdown after every save, using the deficit math from rules).
- **UI layers** – `App.tsx` stores the current tab and selected date, renders Aurora background, and includes `BottomNav`. Each `pages/*` component mounts the data logic specific to that tab, keeping the rest of the UI stateless.
- **Styling** – Tailwind-like utility classes come from `src/index.css`, including cards, pills, nav buttons, and shimmer/spaces. The Aurora shader sits behind everything and renders via `ogl`.
- **PWA support** – `vite.config.ts` registers `VitePWA` with a manifest, assets, and workbox globbing so production builds can install offline.

## Getting started
1. Install dependencies (Node 20+ recommended):
   ```bash
   npm install
   ```
2. Run the dev server (hot reload, PWA disabled in dev by default):
   ```bash
   npm run dev
   ```
3. Build for production (runs TypeScript build first):
   ```bash
   npm run build
   ```
4. Preview the production build locally:
   ```bash
   npm run preview
   ```
5. Deploy to GitHub Pages (publishes the `dist/` output):
   ```bash
   npm run deploy
   ```

## Maintainer notes
- **Constants** – Adjust `src/lib/config.ts` to change streak/deficit thresholds, allowed cheat days, or the default profile values.
- **Theme/visuals** – Update `src/index.css` and `Aurora.css` to refresh the neon shell. `Aurora.tsx` takes `colorStops`, `amplitude`, and `blend` props if you want different gradients.
- **IndexedDB management** – `applySaveEffects` keeps the countdown and streak in sync. If you migrate data, use the helper functions like `rebuildStreakFromLogs` and `rebuildCountdownFromLogs`.
- **Testing & linting** – Run `npm run lint` before committing; ESLint is configured for React + hooks + TypeScript via `eslint.config.js`.

## Troubleshooting
- **No data in Today view** – make sure the date field matches an ISO date. History rows only appear after a `DailyLog` has been saved for that date.
- **Countdown not updating** – every saved day subtracts the day’s “calories out” (BMR + burned). The countdown bottoms out at 0; rebuild it manually with `rebuildCountdownFromLogs` if you made manual edits to IndexedDB.
- **PWA icons** – `vite.config.ts` references `pwa-192.png`, `pwa-512.png`, and `pwa-512-maskable.png` from `public/`. Update those assets if you need new branding.
