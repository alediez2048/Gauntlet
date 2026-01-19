# Gauntlet

A Metroidvania Work Sample for the Gauntlet Program

## Overview

Corporate Gauntlet is a small, intentionally scoped Metroidvania-style game built as a technical and creative work sample for the Gauntlet Program, a 2.5-month intensive AI training bootcamp.

The goal is not to ship a massive game. The goal is to demonstrate:

- Strong product thinking
- Tasteful technical choices
- Ability to integrate AI concepts meaningfully, not as gimmicks
- Clear scope control and execution discipline

The game is designed to run entirely in the browser and be hosted via GitHub Pages.

## Core Concept

You play as a corporate drone who wakes up from a long slumber inside a decaying megacorp.
The office is abandoned. The systems still run.
Former employees now roam as corporate drone zombies, trapped in endless loops.

Your only tool is a **Gauntlet**—a modular device that evolves as you progress.

Each level awards a **Gemstone**, representing a core AI concept.
Each gemstone unlocks a new mechanic that meaningfully changes gameplay.

This is a Metroidvania: progression is gated by capability, not keys.

## Technical Stack (Lean by Design)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Phaser 3 | Lightweight, mature ecosystem, ideal for 2D keyboard-driven games, easy GitHub Pages deployment |
| Language | JavaScript (ES6+) | |
| Hosting | GitHub Pages | |
| AI Integration | Client-side lightweight models + rule-based systems | Optional serverless inference (Phase 2) |

This stack is chosen deliberately:

- No engine bloat
- No unnecessary abstractions
- Fast iteration
- Reviewers can inspect everything directly in GitHub

## Game Structure

- **Genre:** Metroidvania / Castlevania-inspired 2D action platformer
- **Perspective:** Side-scrolling
- **Levels:** 5 handcrafted levels
- **Session Length:** ~10–15 minutes total

## Levels & AI-Themed Progression

Each level introduces one AI concept, translated into a mechanical ability.

### Level 1 — Inference Gem

**Theme:** Pattern recognition, prediction

**Mechanic Unlocked:**
- Enemies telegraph attacks with subtle patterns
- Player gains a short "prediction window" that highlights likely enemy actions

**Design Intent:**
- Teach the player to read patterns
- Mirror how inference works: limited data → probable outcome

### Level 2 — Training Gem

**Theme:** Learning through repetition

**Mechanic Unlocked:**
- Gauntlet attacks improve based on repeated usage
- Misses vs hits affect effectiveness

**Design Intent:**
- The player trains their weapon through behavior
- Reinforces feedback loops

### Level 3 — Optimization Gem

**Theme:** Efficiency and cost functions

**Mechanic Unlocked:**
- Stamina/energy system introduced
- Optimized attack paths deal more damage for less cost

**Design Intent:**
- Force tradeoffs
- Reward efficient play over brute force

### Level 4 — Generalization Gem

**Theme:** Transfer learning

**Mechanic Unlocked:**
- Abilities learned earlier adapt to new enemy types
- Player can "rebind" gems for different effects

**Design Intent:**
- Skills shouldn't only work in one context
- Poor generalization is punished

### Level 5 — Alignment Gem

**Theme:** Objective alignment & unintended consequences

**Mechanic Unlocked:**
- Player choices alter enemy behavior globally
- Overpowered builds cause systemic instability

**Design Intent:**
- The strongest build is not always the safest
- Mirrors real-world AI alignment problems

## AI Component (Non-Gimmicky)

This project intentionally avoids "LLM-in-a-box" nonsense.

### Phase 1 (Core Sample)

Enemy behavior driven by:
- Lightweight decision trees
- Utility-based scoring
- Player behavior tracking

Dynamic difficulty adjustment based on player style.

### Phase 2 (Stretch)

Optional small ML model (e.g. TensorFlow.js)

Model observes:
- Player aggression
- Movement patterns

Enemies adapt mid-run.

**The AI exists to change gameplay, not to generate text.**
