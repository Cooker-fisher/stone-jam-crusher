# Codex / Claude Code Instructions

## Project

Repository: `Cooker-fisher/stone-jam-crusher`

Game title:

- English: Stone Jam Crusher
- Japanese: 石詰まり職人

## Prime Directive

Build a browser prototype for a crusher-line jam clearing game.

Do not turn this into:

- A generic rock clicker
- A mining tycoon
- A 3D simulator
- A physics research project

The core is:

> Diagnose the jam, choose the right tool, clear the line.

## Current MVP Target

Create a 60-second browser game prototype using:

- `public/index.html`
- `public/style.css`
- `public/app.js`

Use Canvas and plain JavaScript first.

## Development Rules

1. Keep changes small.
2. Keep the game playable after each PR.
3. Do not add dependencies unless necessary.
4. Do not introduce a build system yet.
5. Prefer readable code over clever abstractions.
6. Keep tuning values in a constants object.
7. Use simple shapes first; visual polish comes later.
8. Do not add mobile app packaging yet.

## First Implementation Task

Create the initial static scene.

Required files:

```text
public/index.html
public/style.css
public/app.js
```

The page should show:

- Title: Stone Jam Crusher / 石詰まり職人
- Canvas game area
- Conveyor line
- Chain section
- Hopper / crusher inlet
- Crusher body
- Several sample stones
- HUD panel with placeholder values
- Tool buttons:
  - Hammer
  - Hook / Pull
  - Add Small Stone
  - Stop / Restart

No full gameplay is required in the first implementation.

## Visual Layout

Use a side-view layout:

```text
[Stone feed] -> [Chain conveyor] -> [Hopper / crusher inlet] -> [Crusher body]
```

## Style Direction

- Industrial but simple.
- Dark steel background.
- Clear UI.
- Stones should be visually distinct by type.
- Avoid overdecorating.

## Later Gameplay Requirements

After the static scene works, implement in this order:

1. Flowing stones
2. Chain jam
3. Hopper jam
4. Hammer tool
5. Hook/pull tool
6. Small-stone push tool
7. 60-second score attack
8. End screen
9. Visual effects

## Pull Request Format

Use this PR body format:

```md
## Summary
- ...

## Files Added
- ...

## Files Updated
- ...

## Testing
- Opened public/index.html locally
- Confirmed canvas renders
- Confirmed no console errors
```

## Important Design Reminder

The game should reward judgment, not clicking speed.

Good player thoughts:

- This is a chain jam, so pulling is better.
- This is a flat bridge jam, so adding small stones may worsen it.
- This hard stone should be rotated, not hammered.
- This layered stone needs a precise hammer hit.
