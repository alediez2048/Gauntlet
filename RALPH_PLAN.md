# Corporate Gauntlet: Narrative Overhaul Master Plan

## Context
We are upgrading a Phaser 3 Metroidvania game to include a "Corporate Horror" narrative layer.
- **Goal:** Implement dialogue, environmental storytelling, a "Promotion" loop (New Game+), and CRT visuals.
- **Constraints:** Use the provided code blocks exactly. Do not hallucinate new assets.
- **File Structure:** - Source code: `src/` (scanned structure may vary, adapt paths)
  - Public assets: `public/assets/`

---

## Phase 1: The Foundation (Assets & Managers)

### Step 1.1: Create Dialogue Data
**Action:** Create a new file `public/assets/dialogue.json` with this exact content:
```json
{
  "system": {
    "intro": [
      "BOOT SEQUENCE INITIATED...",
      "ASSET_ID: #001 (LEGACY_MODEL) DETECTED.",
      "STATUS: TERMINATED (Reason: 400-Year Nap).",
      "ACTION: REINSTATEMENT.",
      "Good morning. You are 146,000 days late for work. Please proceed to your desk."
    ],
    "idle": [
      "Productivity is at 0%. HR has been notified.",
      "Time theft is a serious offense, Asset #001.",
      "If you have time to lean, you have time to clean.",
      "Your break ended three centuries ago."
    ],
    "hit": [
      "Damage to company property logged.",
      "Please refrain from bleeding on the carpet.",
      "Health insurance not found. Deducting repairs from salary.",
      "Efficiency dropping. Do better.",
      "That looked expensive."
    ],
    "death": [
      "ASSET LIQUIDATED.",
      "Exit Interview complete.",
      "Position #001 is now vacant.",
      "Severance package denied."
    ]
  },
  "levels": {
    "level1_start": [
      "Entering: THE OPEN PLAN CUBICLES.",
      "WARNING: Former colleagues are attempting to onboard you.",
      "Avoid 'touching base' at all costs."
    ],
    "level3_start": [
      "Entering: LEGAL DEPARTMENT.",
      "Caution: Red Tape density is critical.",
      "ComplianceBots are authorized to use lethal force to enforce NDAs."
    ],
    "boss_intro": [
      "CEO ALERT: THE MERGER IS IMMINENT.",
      "Please assume the submission position.",
      "Resistance will result in a negative performance review."
    ]
  },
  "upgrades": {
    "inference": [
      "MODULE ACQUIRED: Predictive Modeling (Cyan).",
      "You can now foresee market volatility (attacks).",
      "Synergy increased by 20%."
    ],
    "training": [
      "MODULE ACQUIRED: Training Data (Magenta).",
      "The more you hit, the more you learn.",
      "Upskilling complete."
    ]
  },
  "terminals": [
    {
      "id": "log_01",
      "text": "LOG 404: They replaced the water cooler with a subscription service. $5/month for 'Premium Hydration.' Gary tried to jailbreak it and now it only dispenses hot steam."
    },
    {
      "id": "log_02",
      "text": "LOG 405: The CEO suggested we 'merge' with the server. I thought it was a metaphor. Then I saw the cables going into his spine."
    }
  ]
}
```

### Step 1.2: Create Dialogue Manager
**Action:** Create `src/managers/DialogueManager.js` with this exact content:

```javascript
export default class DialogueManager {
  constructor(scene) {
    this.scene = scene;
    this.queue = [];
    this.isDisplaying = false;
    this.dialogueData = null;

    this.style = {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 },
      wordWrap: { width: 600 }
    };

    this.dialogueData = this.scene.cache.json.get('dialogue');

    // UI Container fixed to camera
    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.bg = this.scene.add.rectangle(400, 550, 640, 60, 0x000000, 0.8).setOrigin(0.5);
    this.textObj = this.scene.add.text(400, 550, "", this.style).setOrigin(0.5);

    this.container.add([this.bg, this.textObj]);
    this.container.setVisible(false);
  }

  trigger(category, key = null) {
    let text = "";
    if (key) {
      if (this.dialogueData && this.dialogueData[category] && this.dialogueData[category][key]) {
         const lines = this.dialogueData[category][key];
         if (Array.isArray(lines)) {
           lines.forEach(line => this.queue.push(line));
         } else {
           this.queue.push(lines);
         }
      }
    } else {
      if (this.dialogueData && this.dialogueData.system && this.dialogueData.system[category]) {
        const lines = this.dialogueData.system[category];
        text = lines[Math.floor(Math.random() * lines.length)];
        this.queue.push(text);
      }
    }

    if (!this.isDisplaying) this.processQueue();
  }

  processQueue() {
    if (this.queue.length === 0) {
      this.container.setVisible(false);
      this.isDisplaying = false;
      return;
    }

    this.isDisplaying = true;
    this.container.setVisible(true);
    const nextLine = this.queue.shift();
    this.textObj.setText(`> P.I.P: ${nextLine}`);

    // Play sound if synth exists
    if(this.scene.synth) this.scene.synth.playBleep();

    const duration = Math.max(2000, Math.min(nextLine.length * 50, 5000));
    this.scene.time.delayedCall(duration, () => this.processQueue());
  }
}
```

### Step 1.3: Update Preloader
**Action:** Scan `src/scenes/` to find the Preloader scene (usually `Preloader.js`).
**Edit:** Inside the `preload()` method, add this line:

```javascript
this.load.json('dialogue', 'assets/dialogue.json');
```

---

## Phase 2: Logic Integration & Wiring

### Step 2.1: Level Initialization
**Action:** Scan `src/scenes/` to find the main Level scene (e.g., `Level.js`, `GameScene.js`).
**Edit:**
1. Import the manager at the top: `import DialogueManager from '../managers/DialogueManager';`
2. In `create()`, initialize it: `this.dialogue = new DialogueManager(this);`
3. Trigger Intro: `this.dialogue.trigger('levels', 'level1_start');`
4. Setup Idle Timer at the end of `create()`:

```javascript
this.input.on('pointermove', () => {
    if (this.idleEvent) this.idleEvent.remove();
    this.idleEvent = this.time.delayedCall(10000, () => {
       if(this.dialogue) this.dialogue.trigger('idle');
    });
});
```

### Step 2.2: Damage Hook
**Action:** Scan `src/prefabs/` or `src/entities/` to find the `Player.js` class.
**Edit:** Inside the `takeDamage(amount)` method (or equivalent), add:

```javascript
// Corporate Gauntlet: Dialogue Hook
if (Math.random() < 0.3 && this.scene.dialogue) {
    this.scene.dialogue.trigger('hit');
}
```

### Step 2.3: Terminal Interaction
**Action:** In the main Level scene `create()` method, add this test interaction:

```javascript
// Corporate Gauntlet: Terminal Interaction
// Add hidden trigger zone at x:200, y:400 (adjust to map)
const terminal = this.add.rectangle(200, 400, 32, 32, 0x00ff00, 0.0).setOrigin(0.5);
this.physics.add.existing(terminal, true);

this.physics.add.overlap(this.player, terminal, () => {
    // Check for Interaction Key (Assuming cursor keys or WASD)
    // Adjust 'this.cursors.up' to match your input handling
    if (this.input.keyboard.checkDown(this.input.keyboard.addKey('UP'), 500)) {
        if (this.dialogue && this.cache.json.exists('dialogue')) {
            const log = this.cache.json.get('dialogue').terminals[0].text;
            this.dialogue.queue.push(log);
            this.dialogue.processQueue();
            terminal.destroy(); // One-time use
        }
    }
});
```

---

## Phase 3: The Promotion Loop (Ending)

### Step 3.1: Create Cycle Manager
**Action:** Create `src/managers/GameCycleManager.js`.
**Content:**

```javascript
export default class GameCycleManager {
  constructor(scene) {
    this.scene = scene;
  }

  triggerPromotion() {
    this.scene.cameras.main.fadeOut(2000, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      this.showPromotionText();
    });
  }

  showPromotionText() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    const msg = [
      "OPTIMIZATION COMPLETE.", "PREVIOUS CEO LIQUIDATED.",
      "ASSET #001 PROMOTED.", "", "MARKET VOLATILITY INCREASING...",
      "RESUMING OPERATIONS."
    ];

    this.scene.add.text(width / 2, height / 2, msg, {
      fontFamily: '"Courier New"', fontSize: '20px', align: 'center', color: '#00ff00'
    }).setOrigin(0.5).setScrollFactor(0);

    this.scene.time.delayedCall(5000, () => this.startNextCycle());
  }

  startNextCycle() {
    let currentCycle = this.scene.registry.get('cycle') || 0;
    this.scene.registry.set('cycle', currentCycle + 1);
    // Restart the scene - ensure 'Level1' matches your scene key
    this.scene.scene.restart();
  }

  getDifficultyMultiplier() {
    const cycle = this.scene.registry.get('cycle') || 0;
    return 1 + (cycle * 0.5);
  }
}
```

### Step 3.2: Hook Boss Death
**Action:** Scan `src/prefabs/` or `src/enemies/` to find the Boss class (e.g., `CEO.js`, `Boss.js`).
**Edit:** Find the method where the Boss dies (e.g., `die()`, `destroy()`, or check `hp <= 0`).
Replace the death logic with:

```javascript
import GameCycleManager from '../managers/GameCycleManager';

// Inside death method:
new GameCycleManager(this.scene).triggerPromotion();
```

---

## Phase 4: Polish (Visuals & Audio)

### Step 4.1: CRT Pipeline
**Action:** Create `src/pipelines/CRTPipeline.js`.
**Content:**

```javascript
export default class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game: game,
      name: 'CRTPipeline',
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        varying vec2 outTexCoord;
        void main() {
          vec2 uv = outTexCoord;
          vec2 d = uv - 0.5;
          float r = dot(d, d);
          uv = 0.5 + d * (1.0 + 0.03 * r);
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          float scanline = sin(uv.y * 800.0) * 0.04;
          vec4 color = texture2D(uMainSampler, uv);
          color.rgb += scanline;
          color.rgb *= 1.1;
          gl_FragColor = color;
        }
      `
    });
  }
}
```

### Step 4.2: Sound Synth
**Action:** Create `src/managers/SoundSynth.js`.
**Content:**

```javascript
export default class SoundSynth {
  constructor(scene) {
    this.ctx = scene.sound.context;
  }
  playBleep() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}
```

### Step 4.3: Final Registration
**Action:**
1. In `src/scenes/Boot.js` (or `Preloader.js`):
   - Import: `import CRTPipeline from '../pipelines/CRTPipeline';`
   - In `create()`: `this.renderer.pipelines.addPostPipeline('CRTPipeline', CRTPipeline);`

2. In `src/scenes/Level.js` (Main Scene):
   - Import: `import SoundSynth from '../managers/SoundSynth';`
   - In `create()`: `this.synth = new SoundSynth(this);`
   - In `create()`: `this.cameras.main.setPostPipeline('CRTPipeline');`

---

## Verification Steps
1. **Load Test:** Game should load without console errors regarding missing JSON or imports.
2. **Visual Check:** Screen should have CRT scanlines and curved edges.
3. **Dialogue Check:** Intro text ("BOOT SEQUENCE...") should appear in a green box at the bottom.
4. **Gameplay Check:** Taking damage should occasionally trigger text.
