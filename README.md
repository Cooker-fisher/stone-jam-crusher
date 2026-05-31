# Stone Crusher Tycoon / 石くだき工場

A mobile-first (portrait) **idle / clicker** game. Run a stone‑crushing plant:
tap to crush rocks, and upgrade your **equipment (設備)** and **crew (人員)** so the
crusher keeps breaking bigger, stronger, more valuable stones — even while
you're away.

## Play

- Live (GitHub Pages): https://cooker-fisher.github.io/stone-jam-crusher/
- Or open `public/index.html` in any browser.

## Core loop

1. A jaw crusher is fed by a pile (mass) of rocks.
2. **Tap** the glowing rock wedged in the throat to crush it (manual power).
3. The crusher **auto-crushes** over time (idle) — and keeps earning while the
   game is closed (offline income on return).
4. Crushing earns **¥**. Spend ¥ on upgrades:
   - **設備 (equipment)**: 鋼鉄ジョー / フライホイール / モーター … → more tap power & auto rate
   - **人員 (personnel)**: 作業員 / ハンマー職人 / 重機オペレーター / 親方 … → more auto rate & a global ×multiplier
5. Stones get bigger and harder as you progress
   (砂利 → 小石 → … → 巨岩 → 隕石), paying out more ¥.

## Tech

- Vanilla **HTML / CSS / JS + Canvas**. No build step, no dependencies.
- **Portrait, responsive, touch-first** (designed for phones).
- Progress saved to `localStorage`; offline earnings applied on load.
- All tuning lives in the `CONFIG` / `UPGRADES` objects at the top of `public/app.js`.

## Files

```text
public/
  index.html   # portrait shell: HUD + canvas stage + shop
  style.css     # mobile-first dark industrial UI
  app.js        # game loop, economy, save/offline, jaw-crusher renderer
.github/workflows/deploy-pages.yml  # auto-deploys public/ to GitHub Pages on push
docs/           # earlier design notes (see below)
```

## Note on direction

This project began as a *jam-clearing field puzzle* (the `docs/` files still
describe that earlier concept). It has since pivoted to an **idle / clicker
tycoon** — tap + automate + upgrade to crush ever-bigger stones. The `docs/`
will be updated to match.
