# Corporate Gauntlet Overhaul Plan

## Context
We are upgrading a Phaser 3 game. 
- Assets are in `public/assets/`
- Source is in `src/`

## Phase 1: Dialogue System
1. Create `public/assets/dialogue.json` with the provided JSON content.
2. Create `src/managers/DialogueManager.js` with the provided class code.
3. Update `Preloader.js` to load the JSON.

## Phase 2: Integration
1. Update `Level.js` to instantiate `DialogueManager`.
2. Add the "Damage Hook" to the Player class (30% chance to trigger 'hit' dialogue).
3. Add a "Terminal" interaction zone in Level 1 that triggers 'log_01'.

## Phase 3: The Promotion Loop
1. Create `src/managers/GameCycleManager.js`.
2. Update the Boss class to trigger `GameCycleManager.triggerPromotion()` on death.
3. Ensure the game restarts with elevated difficulty (cycle count).

## Phase 4: CRT Polish
1. Create `src/pipelines/CRTPipeline.js`.
2. Register it in `Boot.js` and enable it in `Level.js`.

## Verification
- Ensure the game loads without console errors.
- Ensure text appears on screen when `DialogueManager.trigger()` is called.
