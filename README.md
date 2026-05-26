# Stone Jam Crusher / 石詰まり職人

A browser game prototype about clearing rock jams in a crusher line.

## One-line Concept

**粉砕機を止めるな。石を読め。詰まりを抜け。**

This is not just a rock-crushing game.
The core game is diagnosing rock jams and choosing the right field response.

## Core Game Loop

1. Stones flow into the crusher line.
2. A stone jams at the chain conveyor or hopper/crusher inlet.
3. The player identifies why it jammed.
4. The player chooses a tool: hammer, hook/chain pull, small-stone push, or stop/restart.
5. The jam clears, worsens, or damages the machine.
6. The line resumes and the score increases.

## MVP Goal

Build a 60-second browser prototype where the player processes as much stone as possible while preventing or clearing jams.

## MVP Platform

Start with a lightweight browser game:

- HTML
- CSS
- JavaScript
- Canvas
- No heavy framework at first

After the MVP proves fun, the game can become:

- PWA
- iOS/Android via Capacitor
- Phaser-based browser game
- Unity game only if 2D prototype proves strong

## Initial Folder Plan

```text
stone-jam-crusher/
  README.md
  docs/
    game-design.md
    mvp-spec.md
    implementation-plan.md
    codex-instructions.md
  public/
    index.html
    style.css
    app.js
  assets/
    sounds/
    images/
```

## Design Principle

Do not make this a simple clicker.

The fun must come from field judgment:

- This stone should be hammered.
- This stone should be pulled.
- This jam gets worse if small stones are added.
- This layered stone breaks only when hit along the grain.

The game should look silly and simple, but the decision-making should feel surprisingly real.
