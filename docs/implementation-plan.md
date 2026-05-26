# Implementation Plan

## Strategy

Build the game in small PRs. Do not overbuild. Every step must preserve a working browser page.

The first milestone is not realism. The first milestone is a playable jam-clearing loop.

## Milestone 0: Documentation and Project Scaffold

Files:

- README.md
- docs/game-design.md
- docs/mvp-spec.md
- docs/implementation-plan.md
- docs/codex-instructions.md

Purpose:

- Fix the concept.
- Define MVP scope.
- Prevent the project from becoming a generic clicker or overbuilt simulator.

## Milestone 1: Static Canvas Scene

Files:

- public/index.html
- public/style.css
- public/app.js

Implement:

- Canvas setup
- Responsive container
- Draw conveyor
- Draw chain section
- Draw hopper/crusher inlet
- Draw crusher body
- Draw sample stones
- Draw HUD

Acceptance:

- Opening `public/index.html` shows a recognizable crusher line.
- No gameplay required yet.

## Milestone 2: Flowing Stones

Implement:

- Game loop with requestAnimationFrame
- Stone spawning
- Stone movement left to right
- Conveyor speed
- Basic processed-ton counter
- Remove stones after crusher exit

Acceptance:

- Stones continuously flow.
- Processed score increases when stones exit.

## Milestone 3: Jam System

Implement:

- Chain jam zone
- Hopper jam zone
- Jam probability based on stone type
- Jam state machine
- Conveyor stops when jammed
- Jam warning UI

Acceptance:

- Stones sometimes jam.
- Chain jam and hopper jam are visually and textually distinct.
- The line stops during jams.

## Milestone 4: Hammer Tool

Implement:

- Tool selection UI
- Click jammed stone with hammer
- Stone HP reduction
- Stone break/clear when HP reaches 0
- Type-based damage modifiers

Acceptance:

- Hammer clears some jams.
- Hard stones resist hammer.
- Angular/brittle stones respond better.

## Milestone 5: Hook / Pull Tool

Implement:

- Hook tool selection
- MVP click-to-pull action
- Later: drag direction
- Pull action changes jam clear chance

Acceptance:

- Hook is better than hammer for hard stones and chain jams.
- Tool choice starts to matter.

## Milestone 6: Add Small Stone Action

Implement:

- Add small stone button
- Push chance for selected jam
- Worsen chance for flat/bridge jams
- Machine damage penalty

Acceptance:

- Small-stone push sometimes clears hopper jams.
- It can also make flat jams worse.

## Milestone 7: 60-second Score Attack

Implement:

- Timer
- Start/restart flow
- End screen
- Rank calculation

Acceptance:

- One full 60-second game loop is playable.
- Player sees a final result.

## Milestone 8: Feel and Feedback

Implement:

- Screen shake on hammer
- Stone cracks
- Dust particles
- Jam alarm flash
- Flow burst when jam clears
- Basic sound effects if assets are available

Acceptance:

- Clearing a jam feels good.
- Mistakes feel visibly bad without becoming gruesome or accident-focused.

## Technical Rules

- Keep v0.1 dependency-free unless there is a clear reason.
- Use plain JavaScript classes or modules.
- Keep all tunable values in a constants object.
- Do not add build tools before the MVP needs them.
- Do not add mobile packaging before the browser game is fun.

## Suggested JS Structure

```text
app.js
  constants
  Game
  StoneManager
  JamSystem
  ToolSystem
  ScoreSystem
  Renderer
```

For v0.1, keeping everything in one file is acceptable if the code remains readable.

## Tuning Priority

Tune in this order:

1. Stone movement speed
2. Jam frequency
3. Tool effectiveness
4. Score pressure
5. Visual effects

Do not tune visual polish before the jam loop works.
