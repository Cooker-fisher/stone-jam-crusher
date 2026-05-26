# Game Design: Stone Jam Crusher / 石詰まり職人

## Pitch

**粉砕機を止めるな。石を読め。詰まりを抜け。**

The player is a crusher-line jam clearing worker. Stones keep flowing into a chain conveyor and hopper. When stones jam, the player must diagnose the cause and use the right tool to recover the line.

## What This Game Is

- A browser-based 2D worksite simulation.
- A short-session action puzzle.
- A jam-diagnosis game, not a pure destruction clicker.
- A game where wrong actions can make the jam worse.

## What This Game Is Not

- Not a simple rock-breaking clicker.
- Not a full 3D heavy-machinery simulator.
- Not a realistic accident simulator.
- Not a mining tycoon game at MVP stage.

## Player Fantasy

The player should feel like a field operator who can read stone behavior:

- This one is too big for the hopper.
- This one is angular and caught on the chain.
- This layered stone will split if hit along the grain.
- This bridge jam will get worse if another stone is added.
- This jam needs pulling, not hammering.

## Core Loop

1. Stones spawn from the left.
2. Stones move across the chain conveyor.
3. Stones enter the hopper/crusher inlet.
4. Some stones jam.
5. The player chooses a tool and action point.
6. The jam clears, worsens, or damages the machine.
7. The line resumes.
8. Score increases based on processed volume, uptime, and recovery quality.

## Two Required Jam Types

### 1. Chain Jam

A stone catches on the conveyor chain or gets stuck between stones.

Common causes:

- Angular shape
- High friction
- Large size
- Bad rotation angle
- Multiple stones bridging against each other

Best tools:

- Hook / chain pull
- Hammer on the catching corner
- Brief reverse or stop action in later versions

### 2. Hopper / Crusher Inlet Jam

A stone blocks the hopper or crusher inlet.

Common causes:

- Oversized stone
- Flat stone bridging across the inlet
- Hard stone refusing to bite
- Brittle stone breaking into too many fragments

Best tools:

- Hammer to reduce size
- Hook / pull to rotate
- Small-stone push only when the geometry allows it

## Stone Types

### Round Stone

- Easy to move.
- Low jam risk unless too large.
- Good tutorial stone.

### Angular Stone

- Catches on chains and edges.
- Hammering corners is effective.

### Flat Stone

- Bridges over the hopper.
- Small-stone insertion often makes the jam worse.

### Layered Stone

- Has a visible grain/fiber direction.
- Breaks well when hit along the grain.
- Wrong hammer angle is inefficient.

### Brittle Stone

- Breaks easily.
- Can create many fragments and secondary jams.

### Hard Stone

- Hammer is slow.
- Better handled by pulling/rotating before crusher bite.

## Tools

### Hammer

Primary direct action.

- Reduces stone HP.
- Can split stones.
- Most effective when hitting weak points.
- Overuse increases fatigue or tool cost in later versions.

### Hook / Chain Pull

Control and repositioning tool.

- Pulls or rotates stones.
- Best for chain jams and angled hopper jams.
- Slower than hammering, but safer for hard stones.

### Add Small Stone

Risk/reward tool.

- Can push a jam loose.
- Can destabilize a bridge.
- Can also worsen the jam by filling gaps.

### Stop / Restart Line

Safety and control tool.

- Stopping makes actions safer and more reliable.
- Uptime score drops while stopped.
- Restarting under load can damage the machine if jam remains.

## Scoring

Score should reward both throughput and judgment.

Possible score components:

- Processed tons
- Uptime
- Jam recovery speed
- Machine damage penalty
- Tool-use cost
- Number of worsened jams
- Clean recovery bonus

## Visual Tone

- Machinery and stones: semi-realistic, heavy, industrial.
- UI: clear and slightly playful.
- Human operator: optional in MVP. Avoid complex character animation early.

## Sound Direction

Sound will be critical later.

Target sounds:

- Conveyor rumble
- Chain rattle
- Stone impact
- Hammer hits
- Crack/split
- Crusher bite
- Jam warning
- Recovery flow burst

## MVP Design Rule

Prioritize a playable decision loop over realism.

If a feature does not support one of these feelings, postpone it:

- I diagnosed the jam.
- I chose the right tool.
- I cleared it efficiently.
- I made it worse by choosing poorly.
- The line recovered and stones flowed again.
