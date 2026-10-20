# Gauntlet

**Play it:** https://alediez2048.github.io/Gauntlet/ (desktop browser, keyboard)

A 2D action platformer I built in five days (January 19 to 23, 2026) as a work sample for the Gauntlet AI program. You play an office worker escaping a decaying megacorp across five levels, collecting a gem in each one that unlocks a new ability. The theme is a joke about corporate life; the engineering point is the enemy AI.

## Controls

| Key | Action |
| --- | --- |
| A / D or arrow keys | Move |
| Space or Up | Jump |
| J | Attack |
| L | Inference gem: reveal hidden threats |
| K | Training gem: power strike (3x damage, freezes nearby enemies) |
| Shift | Latency gem: dash |
| I | Resilience gem: deflect |
| Esc or P | Pause |

## Levels

1. Escape the Cubicle
2. Survive the Breakroom
3. Navigate the Red Tape
4. Outrun HR
5. Defeat the CEO (boss fight)

## How the enemy AI works

Enemies don't follow fixed scripts. `src/systems/AIController.js` keeps a rolling five-second profile of how you play: aggression, how often you jump and attack, how unpredictable your movement is, and how far you keep your distance. Each enemy scores its possible actions against that profile (utility-based decision making) and picks the best one, so a player who rushes gets punished differently from one who keeps their distance. Enemies telegraph attacks before they land, which gives a skilled player a window to react.

## Tech

- Phaser 3 and plain JavaScript, bundled with Vite
- A custom CRT post-processing shader (`src/pipelines/CRTPipeline.js`)
- Sound effects synthesized at runtime with the Web Audio API (`src/managers/SoundSynth.js`), so there are no sound files beyond the music track
- Deployed to GitHub Pages by GitHub Actions on every push

## Project layout

```
src/
  scenes/     one scene per level, plus boot, menu and a shared BaseLevelScene
  entities/   player, enemy types and the boss
  systems/    AIController (enemy decisions) and GemSystem (abilities)
  managers/   dialogue, game cycle, sound synthesis
  data/       level configuration
docs/original-design.md   the design document written before the build
```

## Run locally

```bash
npm install
npm run dev
```

## Known limitations

- Desktop and keyboard only; there are no touch controls.
- `BaseLevelScene.js` and `Level1Scene.js` are large and would be the first things to split up.
- The design document describes an optional machine learning stage for enemy behavior. It was never built; the shipped AI is the utility-based system described above.
