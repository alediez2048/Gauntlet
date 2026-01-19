# Corporate Gauntlet — Product Requirements Document (PRD)

A phased, iterative build plan for a GitHub Pages–hosted Metroidvania work sample (Gauntlet Program).

---

## 1) Product Summary

Corporate Gauntlet is a browser-based 2D Metroidvania-inspired action platformer. The player is a corporate drone who awakens in a decayed megacorp and fights "corporate drone zombies" using a modular gauntlet. Progression is driven by five AI-themed gemstones, each unlocking a new mechanic and representing an AI concept (Inference, Training, Optimization, Generalization, Alignment).

This is a work sample: it must communicate strong product thinking, scope control, and AI integration that affects gameplay (not a gimmick overlay).

---

## 2) Problem Statement

Most "AI projects" fail as product work samples because they:

- Over-index on novelty (LLM chat features) rather than experience.
- Lack scope discipline and never ship.
- Don't translate abstract AI concepts into observable user value.

We need a shippable, inspectable game that demonstrates:

- End-to-end product execution
- Iterative delivery
- Clean technical decisions
- AI implemented as a system that changes gameplay

---

## 3) Target Users

### Primary
**Gauntlet reviewers / admissions team**
- Wants to quickly assess execution skill, product judgment, and AI understanding.
- Time-constrained; needs fast proof.

### Secondary
**Peers / engineers**
- Interested in code quality, architecture, and clarity.
- Will look for a coherent roadmap and tradeoffs.

### Tertiary
**Players**
- Want a tight 10–15 minute experience with clear progression.

---

## 4) Goals, Non-Goals, and Principles

### Product Goals

- Ship a complete playable experience on GitHub Pages.
- Deliver 5 levels with meaningful capability gating (Metroidvania fundamentals).
- Each gemstone provides a distinct, learnable mechanic.
- AI component is observable (player can notice it changing behavior).
- Maintain a tight run-time (10–15 minutes), quick load, and stable FPS.

### Non-Goals

- AAA visuals, cinematic cutscenes, voice acting
- Multiplayer, procedural generation, endless modes
- Complex inventory crafting economy
- Full LLM-based dialogue system

### Product Principles (guardrails)

1. **Ship > polish:** every phase ends with a playable build.
2. **Mechanics first:** art is secondary until the loop is fun.
3. **AI must affect play:** if it's not changing tactics, it's not included.
4. **Scope is a feature:** intentionally small, high-signal demo.

---

## 5) Core Experience (Player Loop)

### Moment-to-moment loop
Explore → Encounter → Read pattern → Fight → Learn → Upgrade → Unlock path → Repeat

### Meta progression
Level completion → Gem acquired → New mechanic → New areas become accessible

### Session structure
- Level 1 teaches movement + combat + Inference gem
- Levels 2–4 expand mechanics and gating
- Level 5 culminates with system-level "Alignment" consequences

---

## 6) Game Design Requirements

### 6.1 Controls (Keyboard)

| Action | Key |
|--------|-----|
| Move | A/D or Arrow keys |
| Jump | Space |
| Attack | J |
| Dash | K (unlocks via gem) |
| Gem ability | L (contextual / selected gem) |
| Pause | Esc |

### 6.2 Player Abilities (Base)

- Movement, jump, basic attack
- Health (3–5 hearts) with short invincibility frames
- Simple checkpoint system per level

### 6.3 Enemy Types (MVP set)

| Enemy | Description |
|-------|-------------|
| **Drone Zombie** | Melee, slow, predictable |
| **Middle Manager** | Ranged, shoots "emails" (projectiles) |
| **Compliance Bot** | Tank, slow, high HP, area denial |
| **Bosses** | One per act / selective: at minimum Level 5 boss; earlier bosses optional if time allows |

### 6.4 Level Requirements

Each level must have:
- A distinct visual identity (simple palette swap allowed)
- At least one gated path requiring the previous gem's mechanic
- A gem chamber / mini-boss / objective that awards the gemstone
- Checkpoints and a clear "exit" moment

---

## 7) Gemstones → Mechanics Mapping (Detailed)

The AI themes must be "felt" as mechanics, not explained in text dumps.

### Gem 1 — Inference

**Feature:** "Prediction Window"

- Enemies have telegraphs; player can trigger a brief highlight of likely attack direction/timing.
- Cooldown-based. Short duration.

**Player value:** reduces frustration, teaches pattern recognition.

---

### Gem 2 — Training

**Feature:** "Adaptive Strike"

- Gauntlet attack slightly improves if player repeatedly lands hits with consistent timing/spacing.
- Misses reduce the benefit temporarily.

**Player value:** player's behavior "trains" the weapon; reinforces feedback loops.

---

### Gem 3 — Optimization

**Feature:** "Cost-Aware Combat"

- Introduce stamina/heat bar.
- Certain combos are more "efficient" (more damage per cost).

**Player value:** encourages deliberate play, mirrors optimization tradeoffs.

---

### Gem 4 — Generalization

**Feature:** "Gem Rebinding"

- Player can rebind gems at checkpoints for different effects.
- Abilities adapt to new enemy archetypes (e.g., inference highlights different tells).

**Player value:** transfer skills to new contexts; avoids one-trick abilities.

---

### Gem 5 — Alignment

**Feature:** "System Consequences"

- Player's build choices influence global enemy behavior (aggression, coordination, spawn patterns).
- "Over-optimization" triggers instability (harder patterns, emergent combos).

**Player value:** illustrates unintended consequences; forces responsibility in power.

---

## 8) AI Component Requirements (Phased)

### What "AI" means here (explicit definition)

**AI = adaptive decision-making or behavior modeling based on player state/history.**
Not a chatbox. Not random generation.

### Phase 1 AI (must ship)

**Behavior system: Utility-based scoring**

Enemies choose actions by scoring options based on:
- Distance to player
- Player aggression (time since last attack)
- Player health
- Player pattern (jump-heavy vs grounded)

Add small randomness to prevent deterministic loops.

**Observable outcome:** enemies feel like they "respond" to your style.

### Phase 2 AI (stretch)

**Lightweight client model (TensorFlow.js) OR simple bandit**

Inputs: aggression, movement entropy, damage taken, time-to-kill

Output: difficulty adjustments (spawn mix, cooldowns, aggression threshold)

Keep it small and explainable (a reviewer should understand it fast).

### Phase 3 AI (optional "wow" if time)

**Ghost run or imitation**

- Record last run and replay a "ghost drone" that demonstrates your prior behavior.
- Enemies react differently if they detect predictable loops.

---

## 9) Functional Requirements

### Gameplay
- [ ] Movement + collisions reliable
- [ ] Combat has consistent hitboxes, damage, knockback
- [ ] Enemy state machines stable
- [ ] Gems persist and unlock correctly
- [ ] Checkpoints and respawn work

### UI/UX
- [ ] Title screen + "Play"
- [ ] Pause menu
- [ ] Health display
- [ ] Gem display (5 slots)
- [ ] Minimal tutorial prompts (short, skippable)

### Performance
- [ ] Load time under ~3 seconds on typical broadband
- [ ] Stable frame rate (target 60fps, acceptable 30fps minimum)
- [ ] No memory leak over 15 min session

### Accessibility (pragmatic)
- [ ] Rebind keys (nice-to-have)
- [ ] Reduce screenshake toggle (nice-to-have)
- [ ] Clear telegraphs and readable contrast (must)

---

## 10) Non-Functional Requirements

### Deployment
- Runs on GitHub Pages
- Single command build step
- Deterministic builds (lockfile, pinned versions)

### Code Quality (as a review artifact)
- Clear folder structure
- Documented architecture
- Minimal dependencies
- Comments only where they add clarity (not noise)

### Telemetry (lightweight)
Local-only session metrics:
- death count
- time per level
- gem usage frequency

No external tracking required (privacy friendly)

---

## 11) Milestones & Phased Iterative Plan

Every phase ends with a playable build.

### Phase 0 — Setup & Vertical Slice Definition

**Outcome:** repo + build pipeline ready, stub scene loads.

**Deliverables:**
- [ ] Phaser project scaffold
- [ ] GitHub Pages deployment working
- [ ] Basic scene renders + keyboard input test

**Exit criteria:** "Hello arena" playable page is live

---

### Phase 1 — Core Loop Vertical Slice

**Outcome:** one-room combat loop that feels good.

**Scope:**
- [ ] Player movement/jump
- [ ] One enemy type
- [ ] Combat hit/knockback
- [ ] Health + death + respawn

**Exit criteria:**
- Can fight, die, restart reliably
- Combat "feels" consistent (no jank)

---

### Phase 2 — Level 1 + Inference Gem

**Outcome:** Level 1 playable end-to-end with gem award.

**Scope:**
- [ ] Level 1 map + gating
- [ ] Inference mechanic implemented
- [ ] Simple UI for gem
- [ ] Checkpoint

**Exit criteria:**
- Player can finish Level 1 and unlock gem
- Inference mechanic is noticeable and useful

---

### Phase 3 — Level Framework + Content Pipeline

**Outcome:** repeatable pipeline to build 5 levels quickly.

**Scope:**
- [ ] Level loading system
- [ ] Shared enemy spawning configuration
- [ ] Asset pipeline (tiles/sprites)
- [ ] Data-driven level configs (JSON)

**Exit criteria:**
- New level can be created by config + tilemap
- No hardcoded "Level 1 only" logic

---

### Phase 4 — Levels 2–3 + Training + Optimization

**Outcome:** 3 levels complete, mechanics stacking.

**Scope:**
- [ ] Training mechanic (adaptive strike)
- [ ] Optimization mechanic (stamina/heat + efficient combos)
- [ ] Introduce 1–2 more enemies

**Exit criteria:**
- Levels 1–3 completable in sequence
- Abilities persist correctly
- Mechanics don't break prior levels

---

### Phase 5 — Level 4 + Generalization

**Outcome:** gem rebinding + adaptation to new threats.

**Scope:**
- [ ] Checkpoint gem rebinding UI
- [ ] Enemy variants requiring different tactics
- [ ] Level 4 gating relies on prior gems

**Exit criteria:**
- Player can rebind gems intentionally
- Level 4 demonstrates transfer/generalization

---

### Phase 6 — Level 5 + Alignment + Boss

**Outcome:** complete game with a "thesis" ending.

**Scope:**
- [ ] Alignment system consequences
- [ ] Final boss encounter
- [ ] Ending screen + run stats

**Exit criteria:**
- Full 5-level run is stable and finishable
- Alignment mechanics create meaningful tradeoffs

---

### Phase 7 — AI System v1 (parallel or after Phase 3)

**Outcome:** adaptive enemy behavior based on player style.

**Scope:**
- [ ] Utility scoring for enemy decisions
- [ ] Player behavior profiling (aggression/movement)
- [ ] Tuning pass

**Exit criteria:**
- AI behavior changes are observable
- No unfair spikes (must feel "smart," not "cheap")

---

### Phase 8 — Polish & Review Readiness

**Outcome:** looks clean, reads clean, review-ready.

**Scope:**
- [ ] Bug bash
- [ ] Performance pass
- [ ] README updates (architecture, design notes)
- [ ] Short gameplay GIFs

**Exit criteria:**
- No crash bugs
- Consistent UI
- Reviewer can understand project in 2 minutes

---

## 12) Backlog (Prioritized)

### P0 (Must ship)
- Deployment pipeline
- Core movement + combat
- Level 1–5 playable
- Gems unlock and persist
- AI behavior system v1 (rule/utility based)
- Boss in Level 5

### P1 (Should ship if time)
- Additional enemy variety
- Better telegraphs/animation polish
- Gem rebinding UI polish
- Run stats screen

### P2 (Nice-to-have)
- TensorFlow.js micro-model
- Key rebinding
- More boss fights
- Soundtrack polish

---

## 13) Acceptance Criteria (Definition of Done)

A build is "done" when:
1. It is deployed and playable on GitHub Pages
2. It meets the phase exit criteria
3. It doesn't introduce regressions (previous levels still completable)
4. The change is documented (changelog entry)

---

## 14) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Over-scoping the AI | Ship utility-based AI first; ML is optional |
| Metroidvania complexity (gating webs explode) | Linear-with-optional-branches structure; gating only uses last 1–2 gems |
| "Feels bad" combat | Prioritize vertical slice combat feel before building level content |
| Reviewer confusion | README includes: "How to play," "Why Phaser," "AI approach," "Architecture map," "Roadmap" |

---

## 15) Architecture Overview (High-level)

```
src/
├── scenes/
│   ├── BootScene.js
│   ├── MenuScene.js
│   ├── LevelScene.js
│   └── HUDScene.js
├── entities/
│   ├── Player.js
│   ├── EnemyBase.js
│   └── EnemyTypes/
├── systems/
│   ├── CombatSystem.js
│   ├── AIController.js
│   ├── Progression.js
│   └── Input.js
├── data/
│   ├── levelConfigs/
│   ├── gemDefinitions.json
│   └── tuningValues.json
└── assets/
    ├── tiles/
    ├── sprites/
    └── audio/

tools/
└── build/deploy scripts
```

---

## 16) Success Metrics

After completion, the demo should:
- Load and play without instructions within 10 seconds
- Complete 5 levels in 10–15 minutes
- Demonstrate observable AI adaptation
- Be fully inspectable on GitHub (code + commits + documentation)
- Communicate "this person ships and thinks" to reviewers
