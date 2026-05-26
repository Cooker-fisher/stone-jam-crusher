# MVP Spec

## MVP Name

Stone Jam Crusher v0.1

## Goal

Create a 60-second browser prototype where stones flow into a crusher line and the player clears jams using simple tools.

The MVP must answer one question:

> Is clearing rock jams fun as a short browser game?

## Platform

- Browser
- 2D Canvas
- Vanilla JavaScript
- No build step required for v0.1
- Desktop first, mobile-friendly later

## Page Structure

The MVP should run from:

```text
public/index.html
```

## Required Files

```text
public/index.html
public/style.css
public/app.js
```

## Game Duration

- 60 seconds per run.
- Show final result at the end.
- Allow restart.

## Scene Layout

Side-view 2D scene:

```text
[Stone Feed] -> [Chain Conveyor] -> [Hopper / Crusher Inlet] -> [Crusher]
```

### Required Visual Elements

- Conveyor line
- Chain section
- Hopper / crusher inlet
- Crusher body
- Stones
- Jam warning label
- Score panel
- Tool buttons

## Stone Data Model

Each stone should have at least:

```js
{
  id,
  x,
  y,
  vx,
  radius,
  width,
  height,
  shape,          // round | angular | flat | layered | brittle | hard
  hardness,       // 0.0 - 1.0
  brittleness,    // 0.0 - 1.0
  friction,       // 0.0 - 1.0
  hp,
  jamRisk,
  state           // flowing | jammed | crushed | fragment
}
```

## MVP Stone Types

### Small Round

- Low jam risk.
- Easy to process.

### Large Round

- May jam at hopper.
- Hammer can reduce HP.

### Angular

- Higher chain jam risk.
- Hammering should be effective.

### Flat

- Higher hopper bridge jam risk.
- Small-stone push can worsen the jam.

### Hard

- Hammer damage is low.
- Pulling should be more effective.

## Required Jam Types

### Chain Jam

Triggered around the conveyor/chain zone.

Approximate conditions:

- Angular or flat stone.
- Large size.
- Random chance based on jamRisk.

Effect:

- Conveyor speed becomes 0.
- Stone state becomes `jammed`.
- UI displays `CHAIN JAM`.

### Hopper Jam

Triggered near the hopper/crusher inlet.

Approximate conditions:

- Large stone.
- Flat stone.
- Hard stone.
- Random chance based on jamRisk.

Effect:

- Conveyor speed becomes 0.
- Stone state becomes `jammed`.
- UI displays `HOPPER JAM`.

## Required Tools

### Hammer

Input:

- Select hammer.
- Click/tap jammed stone.

Effect:

- Reduces HP.
- Higher effect on angular and brittle stones.
- Lower effect on hard stones.
- If HP reaches 0, the stone breaks into smaller fragments or clears.

### Hook / Pull

Input:

- Select hook.
- Drag from jammed stone in a direction.

MVP simplification:

- A click on the jammed stone can perform a default pull.

Effect:

- Good against chain jams.
- Good against hard stones.
- May clear the jam by changing stone position.

### Add Small Stone

Input:

- Button click.

Effect:

- If the current jam is a large round/hard hopper jam, chance to push it through.
- If the current jam is flat/bridge-like, chance to worsen machine damage.

### Stop / Restart

Input:

- Button toggle.

Effect:

- Stopping line reduces risk and allows safer tool actions.
- Uptime score decreases while stopped.
- Restart resumes flow if no jam remains.

## Score

Display during play:

- Time remaining
- Processed tons
- Uptime percentage
- Jam count
- Machine damage
- Current jam type

Final result:

- Total processed tons
- Uptime
- Jam count
- Machine damage
- Final rank

## Rank Draft

- S: 現場親方
- A: 詰まり解除職人
- B: ハンマー主任
- C: 作業員
- D: 見習い

## MVP Non-goals

Do not implement these in v0.1:

- Realistic rigid-body physics
- 3D graphics
- Character animation
- Tool upgrades
- Shop/economy
- Online ranking
- PWA
- iOS/Android packaging
- Complex sound system

## Acceptance Criteria

v0.1 is acceptable when:

1. The page opens in a browser.
2. Stones move from left to right.
3. Stones sometimes jam in two distinct zones.
4. The player can choose tools.
5. Hammer and hook can clear jams.
6. Small-stone action can help or worsen the jam.
7. Score updates.
8. A 60-second run ends with a result screen.
