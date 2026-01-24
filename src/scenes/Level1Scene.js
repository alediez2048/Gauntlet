import Phaser from 'phaser';
import Player from '../entities/Player.js';
import DroneZombie from '../entities/DroneZombie.js';
import GemSystem, { GEM_TYPES, GemPickup } from '../systems/GemSystem.js';
import DialogueManager from '../managers/DialogueManager.js';
import SoundSynth from '../managers/SoundSynth.js';

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1Scene' });
  }

  init(data) {
    // Receive data from previous scene (e.g., collected gems)
    this.previousGems = data.gems || [];
  }

  create() {
    const width = 1600; // Level width (scrolling)
    const height = 600;

    // Set world bounds
    this.physics.world.setBounds(0, 0, width, height);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Gem system
    this.gemSystem = new GemSystem(this);

    // Create level layout
    this.createLevel(width, height);

    // Spawn player at start
    this.spawnPoint = { x: 80, y: height - 100 };
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);

    // Camera follows player
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Enemies group
    this.enemies = this.add.group();
    this.spawnEnemies(height);

    // Place the Gauntlet (must collect before gems)
    this.placeGauntlet(height);

    // Place Inference Gem
    this.placeInferenceGem(height);

    // Create exit
    this.createExit(width, height);

    // Setup collisions
    this.setupCollisions();

    // HUD (fixed to camera)
    this.createHUD();

    // Gem ability input
    this.setupGemAbilities();

    // Events
    this.events.on('playerDied', this.handlePlayerDeath, this);
    this.events.on('gemCollected', this.handleGemCollected, this);
    this.events.on('abilityUsed', this.handleAbilityUsed, this);
    this.events.on('abilityEnded', this.handleAbilityEnded, this);

    // Level title
    this.showLevelTitle();

    // Corporate Gauntlet: Narrative Systems
    this.synth = new SoundSynth(this);
    this.dialogue = new DialogueManager(this);
    this.dialogue.trigger('levels', 'level1_start');

    // CRT Visual Effect
    if (this.cameras.main.setPostPipeline) {
      this.cameras.main.setPostPipeline('CRTPipeline');
    }

    // Idle Timer for corporate nagging
    this.input.on('pointermove', () => {
      if (this.idleEvent) this.idleEvent.remove();
      this.idleEvent = this.time.delayedCall(10000, () => {
        if (this.dialogue) this.dialogue.trigger('idle');
      });
    });

    // Corporate Gauntlet: Terminal Interaction
    this.createTerminal();

    // Level state flags
    this.levelComplete = false;
    this.levelTransitioning = false;
    this.transitioningToNextLevel = false;

    // Pause system
    this.isPaused = false;
    this.pauseContainer = null;
    this.setupPauseControls();
  }

  // ========== PAUSE SYSTEM ==========

  setupPauseControls() {
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  togglePause() {
    if (this.levelComplete || this.levelTransitioning) return;

    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame() {
    this.isPaused = true;
    this.physics.pause();
    this.time.paused = true;
    this.createPauseMenu();
  }

  resumeGame() {
    this.isPaused = false;
    this.physics.resume();
    this.time.paused = false;

    if (this.pauseContainer) {
      this.pauseContainer.destroy();
      this.pauseContainer = null;
    }
  }

  createPauseMenu() {
    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    this.pauseContainer.add(overlay);

    const scanLine = this.add.rectangle(400, 0, 800, 2, 0x00ff88, 0.6);
    this.pauseContainer.add(scanLine);
    this.tweens.add({ targets: scanLine, y: 600, duration: 2000, repeat: -1 });

    const pausedText = this.add.text(400, 40, '◆ SYSTEM PAUSED ◆', {
      font: 'bold 28px monospace', fill: '#00ff88', stroke: '#003322', strokeThickness: 3
    }).setOrigin(0.5);
    this.pauseContainer.add(pausedText);

    this.drawDetailedGauntlet();
    this.drawGemSlots();
    this.drawControlsSection();

    const resumeText = this.add.text(400, 560, '[ Press ESC or P to Resume ]', {
      font: '16px monospace', fill: '#00ff88'
    }).setOrigin(0.5);
    this.pauseContainer.add(resumeText);
    this.tweens.add({ targets: resumeText, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });
  }

  drawDetailedGauntlet() {
    const centerX = 400, centerY = 280;
    const g = this.add.graphics();
    this.pauseContainer.add(g);

    g.fillStyle(0xffaa00, 0.2);
    g.fillCircle(centerX, centerY, 120);

    g.fillStyle(0x444455, 1);
    g.fillRoundedRect(centerX - 45, centerY - 80, 90, 160, 15);

    g.fillStyle(0x666677, 1);
    g.fillRoundedRect(centerX - 50, centerY - 85, 100, 20, 8);
    g.fillRoundedRect(centerX - 50, centerY + 65, 100, 20, 8);

    g.lineStyle(2, 0x00ff88, 0.5);
    for (let y = centerY - 60; y < centerY + 60; y += 20) {
      g.lineBetween(centerX - 35, y, centerX + 35, y);
    }

    g.fillStyle(0x222233, 1);
    g.fillCircle(centerX, centerY, 35);
    g.lineStyle(3, 0xffaa00, 1);
    g.strokeCircle(centerX, centerY, 35);

    g.fillStyle(0xffaa00, 0.6);
    g.fillCircle(centerX, centerY, 20);
    g.fillStyle(0xffffcc, 0.8);
    g.fillCircle(centerX, centerY, 10);

    const fingerPositions = [
      { x: centerX - 30, y: centerY + 90 }, { x: centerX - 10, y: centerY + 95 },
      { x: centerX + 10, y: centerY + 95 }, { x: centerX + 30, y: centerY + 90 }
    ];
    fingerPositions.forEach(pos => {
      g.fillStyle(0x444455, 1);
      g.fillRoundedRect(pos.x - 8, pos.y, 16, 30, 5);
    });

    g.fillStyle(0x444455, 1);
    g.fillRoundedRect(centerX - 55, centerY + 40, 20, 35, 6);

    const label = this.add.text(centerX, centerY + 145, 'THE GAUNTLET', {
      font: 'bold 14px monospace', fill: '#ffaa00'
    }).setOrigin(0.5);
    this.pauseContainer.add(label);

    const coreGlow = this.add.circle(centerX, centerY, 25, 0xffaa00, 0.4);
    this.pauseContainer.add(coreGlow);
    this.tweens.add({ targets: coreGlow, scale: 1.3, alpha: 0.1, duration: 1000, yoyo: true, repeat: -1 });
  }

  drawGemSlots() {
    const centerX = 400, centerY = 280;

    const gemData = [
      { id: 'inference', name: 'INFERENCE', color: 0x00ffff, key: 'L', desc: 'See through deception', angle: -90, dist: 170 },
      { id: 'training', name: 'TRAINING', color: 0xff00ff, key: 'K', desc: '3x DMG + Freeze nearby', angle: -30, dist: 180 },
      { id: 'optimization', name: 'LATENCY', color: 0xffff00, key: 'SHIFT', desc: 'Ultra-fast dash', angle: 30, dist: 180 },
      { id: 'generalization', name: 'RESILIENCE', color: 0x00ff00, key: 'I', desc: 'Reflect projectiles', angle: 90, dist: 170 },
      { id: 'alignment', name: 'ALIGNMENT', color: 0xff8800, key: 'K', desc: 'SUPER MODE', angle: 150, dist: 160 }
    ];

    const collectedGems = this.gemSystem ? this.gemSystem.getCollectedGems() : [];
    const collectedIds = collectedGems.map(g => g.id);

    gemData.forEach((gem, index) => {
      const hasGem = collectedIds.includes(gem.id);
      const angleRad = (gem.angle * Math.PI) / 180;
      const x = centerX + Math.cos(angleRad) * gem.dist;
      const y = centerY + Math.sin(angleRad) * gem.dist;

      const lineG = this.add.graphics();
      this.pauseContainer.add(lineG);
      lineG.lineStyle(2, hasGem ? gem.color : 0x333344, hasGem ? 0.6 : 0.3);
      lineG.lineBetween(centerX, centerY, x, y);

      const slotBg = this.add.circle(x, y, 28, 0x111122, 1);
      this.pauseContainer.add(slotBg);

      if (hasGem) {
        const glow = this.add.circle(x, y, 35, gem.color, 0.3);
        this.pauseContainer.add(glow);
        this.tweens.add({ targets: glow, scale: 1.2, alpha: 0.1, duration: 800, yoyo: true, repeat: -1, delay: index * 100 });

        const gemCore = this.add.circle(x, y, 20, gem.color, 1);
        this.pauseContainer.add(gemCore);

        const shine = this.add.circle(x - 6, y - 6, 6, 0xffffff, 0.6);
        this.pauseContainer.add(shine);

        const nameText = this.add.text(x, y + 40, gem.name, {
          font: 'bold 10px monospace', fill: '#' + gem.color.toString(16).padStart(6, '0')
        }).setOrigin(0.5);
        this.pauseContainer.add(nameText);

        const keyText = this.add.text(x, y + 55, `[ ${gem.key} ]`, {
          font: '9px monospace', fill: '#ffffff'
        }).setOrigin(0.5);
        this.pauseContainer.add(keyText);

        const descText = this.add.text(x, y + 70, gem.desc, {
          font: '8px monospace', fill: '#888899'
        }).setOrigin(0.5);
        this.pauseContainer.add(descText);
      } else {
        const lockIcon = this.add.text(x, y, '?', {
          font: 'bold 24px monospace', fill: '#333344'
        }).setOrigin(0.5);
        this.pauseContainer.add(lockIcon);

        const lockedText = this.add.text(x, y + 40, 'LOCKED', {
          font: '9px monospace', fill: '#333344'
        }).setOrigin(0.5);
        this.pauseContainer.add(lockedText);
      }
    });

    const gemCount = this.add.text(400, 85, `GEMS: ${collectedIds.length} / 5`, {
      font: 'bold 16px monospace', fill: '#ffaa00'
    }).setOrigin(0.5);
    this.pauseContainer.add(gemCount);
  }

  drawControlsSection() {
    const y = 480;

    const controlsBg = this.add.rectangle(400, y, 700, 50, 0x111122, 0.8);
    this.pauseContainer.add(controlsBg);

    const title = this.add.text(400, y - 35, '─── CONTROLS ───', {
      font: 'bold 11px monospace', fill: '#00ff88'
    }).setOrigin(0.5);
    this.pauseContainer.add(title);

    const controls = this.add.text(400, y,
      'A/D: Move   SPACE: Jump   J: Attack   K: Power   L: Vision   I: Shield   SHIFT: Dash', {
      font: '11px monospace', fill: '#88aacc'
    }).setOrigin(0.5);
    this.pauseContainer.add(controls);
  }

  createLevel(width, height) {
    this.platforms = this.physics.add.staticGroup();
    this.walls = this.physics.add.staticGroup();

    // Ground sections with gaps
    this.createPlatform(0, height - 20, 400, 40);          // Start area
    this.createPlatform(500, height - 20, 300, 40);        // After first gap
    this.createPlatform(900, height - 20, 400, 40);        // Middle section
    this.createPlatform(1400, height - 20, 200, 40);       // End area

    // Platforms - Section 1 (tutorial area)
    this.createPlatform(150, height - 120, 100, 20);
    this.createPlatform(300, height - 200, 120, 20);

    // Platforms - Section 2 (first challenge)
    this.createPlatform(520, height - 150, 100, 20);
    this.createPlatform(700, height - 220, 80, 20);

    // Platforms - Section 3 (gem chamber)
    this.createPlatform(950, height - 150, 150, 20);
    this.createPlatform(1100, height - 250, 100, 20);
    this.createPlatform(1000, height - 350, 200, 20);      // Gem platform

    // Platforms - Section 4 (exit path)
    this.createPlatform(1250, height - 180, 80, 20);
    this.createPlatform(1350, height - 280, 100, 20);

    // Walls
    this.createWall(0, height / 2, 20, height);            // Left boundary
    this.createWall(width, height / 2, 20, height);        // Right boundary

    // Decorative elements
    this.addLevelDecorations(width, height);
  }

  createPlatform(x, y, w, h) {
    const platform = this.add.rectangle(x + w/2, y, w, h, 0x4a4a6a);
    this.platforms.add(platform);
    platform.body.updateFromGameObject();

    // Add edge highlights
    this.add.rectangle(x + w/2, y - h/2 + 2, w, 4, 0x6a6a8a);
  }

  createWall(x, y, w, h) {
    const wall = this.add.rectangle(x, y, w, h, 0x3a3a5a);
    this.walls.add(wall);
    wall.body.updateFromGameObject();
  }

  addLevelDecorations(width, height) {
    // Section labels
    this.add.text(80, 50, 'LEVEL 1: ESCAPE THE CUBICLE', {
      font: 'bold 14px monospace',
      fill: '#4a4a6a'
    });

    // Background pillars/details
    for (let i = 0; i < width; i += 200) {
      this.add.rectangle(i + 100, height - 200, 8, 160, 0x2a2a3e).setAlpha(0.5);
    }

    // Danger indicators near gaps
    this.add.text(420, height - 60, '!', {
      font: 'bold 24px monospace',
      fill: '#ff4444'
    }).setAlpha(0.6);

    this.add.text(820, height - 60, '!', {
      font: 'bold 24px monospace',
      fill: '#ff4444'
    }).setAlpha(0.6);

    // Arrow pointing to gauntlet (first pickup)
    this.add.text(200, height - 200, 'FREEDOM ↓', {
      font: '12px monospace',
      fill: '#ffaa00'
    }).setAlpha(0.7);

    // Arrow pointing to gem area
    this.add.text(1050, height - 430, 'INFERENCE ↓', {
      font: '12px monospace',
      fill: '#00ffff'
    }).setAlpha(0.7);
  }

  createTerminal() {
    // Corporate Gauntlet: Terminal Interaction
    // Add hidden trigger zone for environmental storytelling
    const terminalX = 600;
    const terminalY = 520;

    // Terminal visual (subtle glow)
    const terminalGlow = this.add.rectangle(terminalX, terminalY, 32, 32, 0x00ff00, 0.1);
    this.tweens.add({
      targets: terminalGlow,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // Terminal indicator
    this.add.text(terminalX, terminalY - 25, '[TERMINAL]', {
      font: '8px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5).setAlpha(0.5);

    const terminal = this.add.rectangle(terminalX, terminalY, 32, 32, 0x00ff00, 0.0).setOrigin(0.5);
    this.physics.add.existing(terminal, true);

    this.physics.add.overlap(this.player, terminal, () => {
      if (this.input.keyboard.checkDown(this.input.keyboard.addKey('UP'), 500)) {
        if (this.dialogue && this.cache.json.exists('dialogue')) {
          const log = this.cache.json.get('dialogue').terminals[0].text;
          this.dialogue.queue.push(log);
          this.dialogue.processQueue();
          terminal.destroy();
          terminalGlow.destroy();
        }
      }
    });
  }

  spawnEnemies(height) {
    // Tutorial enemy (easy, near start)
    this.createEnemy(350, height - 80, 250, 450);

    // Section 2 enemies
    this.createEnemy(600, height - 80, 500, 750);
    this.createEnemy(720, height - 260, 680, 780);

    // Section 3 enemies (guarding gem)
    this.createEnemy(1000, height - 100, 900, 1200);
    this.createEnemy(1050, height - 390, 950, 1150);

    // Section 4 enemy (near exit)
    this.createEnemy(1400, height - 80, 1350, 1500);
  }

  createEnemy(x, y, patrolLeft, patrolRight) {
    const enemy = new DroneZombie(this, x, y);
    enemy.setTarget(this.player);
    enemy.patrolLeft = patrolLeft;
    enemy.patrolRight = patrolRight;
    this.enemies.add(enemy);
    return enemy;
  }

  placeGauntlet(height) {
    // Place gauntlet on the first elevated platform - player must get it first
    const gauntletX = 200;
    const gauntletY = height - 160;

    // Gauntlet pedestal
    this.add.rectangle(gauntletX, gauntletY + 15, 40, 10, 0x4a4a6a);

    // The gauntlet itself - glowing tech device
    this.gauntlet = this.add.container(gauntletX, gauntletY);

    // Gauntlet base
    const gauntletBase = this.add.rectangle(0, 0, 24, 32, 0xdd8800);

    // Energy core
    const energyCore = this.add.rectangle(0, 0, 16, 20, 0xffee44);

    // Gem slots (empty)
    const slot1 = this.add.circle(-4, -6, 4, 0x333333);
    const slot2 = this.add.circle(4, -6, 4, 0x333333);
    const slot3 = this.add.circle(0, 2, 4, 0x333333);

    this.gauntlet.add([gauntletBase, energyCore, slot1, slot2, slot3]);

    // Physics for pickup
    this.physics.add.existing(this.gauntlet);
    this.gauntlet.body.setSize(30, 40);
    this.gauntlet.body.setAllowGravity(false);
    this.gauntlet.body.setImmovable(true);

    // Floating animation
    this.tweens.add({
      targets: this.gauntlet,
      y: gauntletY - 8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow effect
    this.gauntletGlow = this.add.circle(gauntletX, gauntletY, 25, 0xffaa00, 0.3);
    this.tweens.add({
      targets: this.gauntletGlow,
      alpha: 0.1,
      scale: 1.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Label
    this.gauntletLabel = this.add.text(gauntletX, gauntletY - 45, 'THE GAUNTLET', {
      font: 'bold 10px monospace',
      fill: '#ffaa00'
    }).setOrigin(0.5);
  }

  placeInferenceGem(height) {
    // Place on the elevated platform in section 3
    this.inferenceGem = new GemPickup(this, 1100, height - 400, GEM_TYPES.INFERENCE);
  }

  createExit(width, height) {
    // Exit door at end of level
    const exitX = width - 80;
    const exitY = height - 80;

    // Door frame
    this.add.rectangle(exitX, exitY, 60, 80, 0x2a5a2a);
    this.add.rectangle(exitX, exitY - 45, 70, 10, 0x3a7a3a);

    // Door glow (hidden initially behind blockade)
    this.exitGlow = this.add.rectangle(exitX, exitY, 50, 70, 0x00ff00, 0.3);
    this.exitGlow.setVisible(false);

    // Exit zone (physics)
    this.exitZone = this.add.rectangle(exitX, exitY, 50, 70, 0x00ff00, 0);
    this.physics.add.existing(this.exitZone, true);

    // ========== BLOCKADE - Requires Inference to break ==========
    this.blockadeActive = true;

    // Blockade container
    this.blockade = this.add.container(exitX, exitY);

    // Blockade barrier (glitchy corporate firewall)
    this.blockadeBarrier = this.add.rectangle(0, 0, 60, 90, 0xff0044, 0.8);
    this.blockade.add(this.blockadeBarrier);

    // Firewall pattern (horizontal lines)
    for (let i = -35; i < 40; i += 10) {
      const line = this.add.rectangle(0, i, 55, 2, 0xff4488, 0.6);
      this.blockade.add(line);
    }

    // Glitch effect bars
    this.blockadeGlitches = [];
    for (let i = 0; i < 5; i++) {
      const glitch = this.add.rectangle(
        Phaser.Math.Between(-25, 25),
        Phaser.Math.Between(-40, 40),
        Phaser.Math.Between(10, 40),
        Phaser.Math.Between(2, 6),
        0xff88aa, 0.8
      );
      this.blockade.add(glitch);
      this.blockadeGlitches.push(glitch);
    }

    // Blockade label
    this.blockadeLabel = this.add.text(0, -55, 'FIREWALL\n[Use Inference]', {
      font: 'bold 10px monospace',
      fill: '#ff4444',
      align: 'center'
    }).setOrigin(0.5);
    this.blockade.add(this.blockadeLabel);

    // Warning icon
    const warningIcon = this.add.text(0, 50, '⚠', {
      font: '16px monospace',
      fill: '#ffaa00'
    }).setOrigin(0.5);
    this.blockade.add(warningIcon);

    // Glitch animation for blockade - store reference to stop it later
    this.blockadeGlitchTimer = this.time.addEvent({
      delay: 150,
      callback: () => {
        if (!this.blockadeActive || !this.blockadeGlitches || this.blockadeGlitches.length === 0) return;
        this.blockadeGlitches.forEach(glitch => {
          if (glitch && glitch.active) {
            glitch.setPosition(
              Phaser.Math.Between(-25, 25),
              Phaser.Math.Between(-40, 40)
            );
            glitch.setSize(
              Phaser.Math.Between(10, 40),
              Phaser.Math.Between(2, 6)
            );
          }
        });
      },
      loop: true
    });

    // Pulsing animation for blockade
    this.tweens.add({
      targets: this.blockadeBarrier,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Label (initially shows blockade status)
    this.exitLabel = this.add.text(exitX, exitY - 100, 'EXIT BLOCKED', {
      font: '10px monospace',
      fill: '#ff4444',
      align: 'center'
    }).setOrigin(0.5);
  }

  setupCollisions() {
    // Player collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.walls);

    // Enemy collisions
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.walls);

    // Player attack -> Enemies
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.enemies,
      this.handleAttackHit,
      null,
      this
    );

    // Player <-> Enemies contact
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handleEnemyContact,
      null,
      this
    );

    // Player <-> Gauntlet
    this.physics.add.overlap(
      this.player,
      this.gauntlet,
      this.handleGauntletPickup,
      null,
      this
    );

    // Player <-> Gem
    this.physics.add.overlap(
      this.player,
      this.inferenceGem,
      this.handleGemPickup,
      null,
      this
    );

    // Player <-> Exit
    this.physics.add.overlap(
      this.player,
      this.exitZone,
      this.handleExitReached,
      null,
      this
    );

    // Fall death
    this.player.setCollideWorldBounds(false); // Allow falling
  }

  handleAttackHit(attackHitbox, enemy) {
    if (!this.player.isAttacking || !enemy.isAlive) return;
    const knockbackDir = enemy.x > this.player.x ? 1 : -1;
    enemy.takeDamage(this.player.attackDamage, knockbackDir);
  }

  handleEnemyContact(player, enemy) {
    if (!enemy.isAlive || player.isInvulnerable) return;
    if (enemy.isAttacking) return;
    const knockbackDir = player.x > enemy.x ? 1 : -1;
    player.takeDamage(enemy.damage, knockbackDir);
  }

  handleGauntletPickup(player, gauntlet) {
    if (this.player.hasGauntlet) return;

    // Equip the gauntlet (changes sprite)
    this.player.equipGauntlet();

    // Stop tweens before destroying to prevent errors
    this.tweens.killTweensOf(this.gauntlet);
    this.tweens.killTweensOf(this.gauntletGlow);

    // Remove gauntlet visuals
    if (this.gauntlet) this.gauntlet.destroy();
    if (this.gauntletGlow) this.gauntletGlow.destroy();
    if (this.gauntletLabel) this.gauntletLabel.destroy();
    this.gauntlet = null;
    this.gauntletGlow = null;
    this.gauntletLabel = null;

    // Epic pickup effect
    this.cameras.main.flash(300, 255, 170, 0);
    this.cameras.main.shake(200, 0.01);

    // Particle explosion
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        player.x,
        player.y,
        Phaser.Math.Between(3, 8),
        0xffaa00,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.1,
        duration: 500,
        onComplete: () => particle.destroy()
      });
    }

    // Show acquisition message
    const msgBg = this.add.rectangle(400, 200, 500, 150, 0x000000, 0.9)
      .setScrollFactor(0);

    const title = this.add.text(400, 160, 'THE GAUNTLET ACQUIRED!', {
      font: 'bold 24px monospace',
      fill: '#ffaa00'
    }).setOrigin(0.5).setScrollFactor(0);

    const desc = this.add.text(400, 200, 'Your key to escape this corporate nightmare.\nCollect gems to unlock your true potential!', {
      font: '14px monospace',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    const hint = this.add.text(400, 245, 'Find the Inference Gem to see through the BS!', {
      font: '12px monospace',
      fill: '#00ffff'
    }).setOrigin(0.5).setScrollFactor(0);

    this.time.delayedCall(3000, () => {
      msgBg.destroy();
      title.destroy();
      desc.destroy();
      hint.destroy();
    });
  }

  handleGemPickup(player, gemPickup) {
    if (gemPickup.collected) return;

    // Check if player has gauntlet first
    if (!this.player.hasGauntlet) {
      if (!this.gemHintShown) {
        this.gemHintShown = true;
        const hint = this.add.text(
          gemPickup.x,
          gemPickup.y - 60,
          'You need the Gauntlet first!',
          { font: '12px monospace', fill: '#ffaa00' }
        ).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
          hint.destroy();
          this.gemHintShown = false;
        });
      }
      return;
    }

    if (gemPickup.collect()) {
      this.gemSystem.collectGem(gemPickup.gemType);
    }
  }

  handleGemCollected(gemType) {
    // Enable double jump ability from the Inference Gem
    this.player.canDoubleJump = true;

    // Show collection message
    const text = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      `${gemType.name} Acquired!\n\nDOUBLE JUMP unlocked! (SPACE in air)\nPress L to activate Inference Vision\nand breach the exit firewall!`,
      {
        font: '18px monospace',
        fill: '#00ffff',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // Don't update exit label yet - blockade still active
    // Exit will be updated when blockade is destroyed

    this.time.delayedCall(3500, () => {
      if (text && text.active) text.destroy();
    });

    this.updateGemUI();
  }

  handleExitReached(player, exitZone) {
    // Prevent multiple triggers
    if (this.levelComplete) return;

    // Check if blockade is still active
    if (this.blockadeActive) {
      if (!this.exitHintShown) {
        this.exitHintShown = true;
        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 120,
          'Firewall detected!\nUse Inference (L) to breach it.',
          { font: '12px monospace', fill: '#ff4444', align: 'center' }
        ).setOrigin(0.5);

        this.time.delayedCall(2500, () => {
          if (this.scene && this.scene.isActive() && hint.active) {
            hint.destroy();
            this.exitHintShown = false;
          }
        });
      }
      return;
    }

    if (!this.gemSystem.hasGem('inference')) {
      // Show hint
      if (!this.exitHintShown) {
        this.exitHintShown = true;
        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 100,
          'Find the Inference Gem first!',
          { font: '12px monospace', fill: '#ff8888' }
        ).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
          if (this.scene && this.scene.isActive()) {
            hint.destroy();
            this.exitHintShown = false;
          }
        });
      }
      return;
    }

    // Mark level as complete immediately
    this.levelComplete = true;

    // Show the victory screen directly
    this.showLevelCompleteScreen();
  }

  showLevelCompleteScreen() {
    // Stop player and enemies manually
    if (this.player && this.player.body) {
      this.player.body.enable = false;
      this.player.setVelocity(0, 0);
    }

    this.enemies.getChildren().forEach(enemy => {
      if (enemy && enemy.body) {
        enemy.body.enable = false;
        enemy.setVelocity(0, 0);
      }
    });

    // Victory overlay
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(1000);

    this.add.text(400, 200, 'LEVEL 1 COMPLETE!', {
      font: 'bold 36px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.add.text(400, 280, 'Inference Gem Mastered!\n\nYou can now see through corporate lies!', {
      font: '16px monospace',
      fill: '#00ffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Create a CLICKABLE button to continue
    const buttonBg = this.add.rectangle(400, 400, 250, 60, 0x00aa00)
      .setScrollFactor(0)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(400, 400, 'CLICK TO CONTINUE', {
      font: 'bold 18px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    // Hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x00ff00);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x00aa00);
    });

    // Click handler
    buttonBg.on('pointerdown', () => {
      // Visual feedback that click registered
      buttonBg.setFillStyle(0xffff00);
      buttonText.setText('LOADING...');
      this.goToLevel2();
    });

    // Also add keyboard hint
    this.add.text(400, 470, '(or press any key)', {
      font: '12px monospace',
      fill: '#666666'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Any key press continues
    this.input.keyboard.once('keydown', () => {
      this.goToLevel2();
    });
  }

  goToLevel2() {
    if (this.goingToLevel2) return;
    this.goingToLevel2 = true;

    // Absolute minimum - just start the scene
    this.scene.start('Level2Scene', {
      gems: [],
      playerStats: { health: 5, attackDamage: 1, hasGauntlet: true }
    });
  }

  setupGemAbilities() {
    // L key for Inference ability
    this.input.keyboard.on('keydown-L', () => {
      if (this.gemSystem.canUseAbility('inference')) {
        this.gemSystem.useAbility('inference');
      }
    });
  }

  handleAbilityUsed(gemId, gem) {
    if (gemId === 'inference') {
      this.activateInferenceVision();
    } else if (gemId === 'training') {
      this.player.activatePowerStrike();
      this.freezeNearbyEnemies(150, 3000);
      this.showAbilityMessage('POWER STRIKE!', 0xff00ff);
    }
  }

  handleAbilityEnded(gemId) {
    if (gemId === 'inference') {
      this.deactivateInferenceVision();
    }
  }

  showAbilityMessage(text, color) {
    const msg = this.add.text(this.player.x, this.player.y - 50, text, {
      font: 'bold 16px monospace',
      fill: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => msg.destroy()
    });
  }

  freezeNearbyEnemies(range, duration) {
    const playerX = this.player.x;
    const playerY = this.player.y;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.isAlive || enemy.isFrozen) return;

      const distance = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);

      if (distance <= range) {
        // Use enemy's freeze method if available (MiddleManager has one)
        if (typeof enemy.freeze === 'function') {
          enemy.freeze(duration);
        } else {
          // Generic freeze for other enemies
          enemy.isFrozen = true;
          enemy.setVelocity(0, 0);
          enemy.setTint(0x88ffff);

          this.time.delayedCall(duration, () => {
            if (enemy && enemy.active && enemy.isFrozen) {
              enemy.isFrozen = false;
              enemy.clearTint();
              this.createUnfreezeEffect(enemy);
            }
          });
        }

        this.createFreezeEffect(enemy);

        const frozenText = this.add.text(enemy.x, enemy.y - 40, 'FROZEN!', {
          font: 'bold 12px monospace',
          fill: '#88ffff',
          stroke: '#003333',
          strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
          targets: frozenText,
          y: frozenText.y - 20,
          alpha: 0,
          duration: 1000,
          onComplete: () => frozenText.destroy()
        });
      }
    });

    this.createFreezeShockwave(playerX, playerY, range);
  }

  createFreezeEffect(enemy) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 20 + Math.random() * 15;
      const crystal = this.add.rectangle(
        enemy.x + Math.cos(angle) * dist,
        enemy.y + Math.sin(angle) * dist,
        4 + Math.random() * 4,
        8 + Math.random() * 8,
        0x88ffff, 0.8
      );
      crystal.rotation = angle + Math.PI / 2;

      this.tweens.add({
        targets: crystal,
        alpha: { from: 0, to: 0.8 },
        scale: { from: 0, to: 1 },
        duration: 200
      });

      this.time.delayedCall(3000, () => {
        if (crystal.active) {
          this.tweens.add({
            targets: crystal,
            alpha: 0,
            scale: 0,
            duration: 200,
            onComplete: () => crystal.destroy()
          });
        }
      });
    }

    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(
        enemy.x + Phaser.Math.Between(-20, 20),
        enemy.y + Phaser.Math.Between(-30, 10),
        Phaser.Math.Between(2, 5),
        0xaaffff, 0.7
      );

      this.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        duration: 600,
        delay: i * 50,
        onComplete: () => particle.destroy()
      });
    }
  }

  createUnfreezeEffect(enemy) {
    for (let i = 0; i < 10; i++) {
      const shard = this.add.rectangle(
        enemy.x + Phaser.Math.Between(-15, 15),
        enemy.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(3, 8),
        Phaser.Math.Between(3, 8),
        0x88ffff, 0.9
      );
      shard.rotation = Math.random() * Math.PI;

      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;

      this.tweens.add({
        targets: shard,
        x: shard.x + Math.cos(angle) * speed,
        y: shard.y + Math.sin(angle) * speed + 20,
        rotation: shard.rotation + Math.PI * 2,
        alpha: 0,
        duration: 400,
        onComplete: () => shard.destroy()
      });
    }
  }

  createFreezeShockwave(x, y, range) {
    const ring = this.add.circle(x, y, 10, 0x88ffff, 0);
    ring.setStrokeStyle(4, 0x88ffff, 0.8);

    this.tweens.add({
      targets: ring,
      scale: range / 10,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const particle = this.add.rectangle(x, y, 6, 3, 0xaaffff, 0.8);
      particle.rotation = angle;

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * range,
        y: y + Math.sin(angle) * range,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy()
      });
    }

    this.cameras.main.flash(100, 136, 255, 255);
  }

  // ========== HEART PICKUP SYSTEM ==========

  spawnHeartPickup(x, y) {
    const heart = this.add.container(x, y - 10);

    const glow = this.add.circle(0, 0, 18, 0xff4444, 0.4);
    heart.add(glow);

    const heartGraphics = this.add.graphics();
    heartGraphics.fillStyle(0xff2222, 1);
    heartGraphics.fillCircle(-5, -3, 7);
    heartGraphics.fillCircle(5, -3, 7);
    heartGraphics.fillTriangle(-12, 0, 12, 0, 0, 14);
    heartGraphics.fillRect(-5, -3, 10, 8);
    heart.add(heartGraphics);

    const shine = this.add.circle(-3, -5, 3, 0xffffff, 0.7);
    heart.add(shine);

    const plus = this.add.text(0, -25, '+1', {
      font: 'bold 10px monospace',
      fill: '#ff4444'
    }).setOrigin(0.5);
    heart.add(plus);

    this.physics.add.existing(heart);
    heart.body.setSize(30, 30);
    heart.body.setAllowGravity(false);

    this.tweens.add({
      targets: heart,
      y: y - 30,
      duration: 300,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: heart,
      y: y - 40,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 300
    });

    this.tweens.add({
      targets: glow,
      alpha: 0.2,
      scale: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.physics.add.overlap(
      this.player,
      heart,
      () => this.collectHeart(heart),
      null,
      this
    );

    this.time.delayedCall(10000, () => {
      if (heart && heart.active) {
        this.tweens.add({
          targets: heart,
          alpha: 0,
          scale: 0.5,
          duration: 300,
          onComplete: () => heart.destroy()
        });
      }
    });
  }

  collectHeart(heart) {
    if (!heart || !heart.active) return;

    if (this.player.health < this.player.maxHealth) {
      this.player.health = Math.min(this.player.health + 1, this.player.maxHealth);

      if (this.updateHealthDisplay) {
        this.updateHealthDisplay();
      }

      this.cameras.main.flash(100, 255, 100, 100);

      const healText = this.add.text(this.player.x, this.player.y - 40, '+1 HP', {
        font: 'bold 16px monospace',
        fill: '#00ff00',
        stroke: '#003300',
        strokeThickness: 3
      }).setOrigin(0.5);

      this.tweens.add({
        targets: healText,
        y: healText.y - 40,
        alpha: 0,
        duration: 800,
        onComplete: () => healText.destroy()
      });

      for (let i = 0; i < 10; i++) {
        const particle = this.add.circle(
          this.player.x + Phaser.Math.Between(-20, 20),
          this.player.y + Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(2, 5),
          0x00ff00,
          0.8
        );

        this.tweens.add({
          targets: particle,
          y: particle.y - 30,
          alpha: 0,
          duration: 500,
          delay: i * 30,
          onComplete: () => particle.destroy()
        });
      }
    }

    this.tweens.add({
      targets: heart,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => heart.destroy()
    });
  }

  activateInferenceVision() {
    // Visual effect - cyan overlay for inference vision
    this.inferenceOverlay = this.add.rectangle(
      this.cameras.main.scrollX + 400,
      300,
      800,
      600,
      0x00ffff,
      0.15
    ).setScrollFactor(0).setDepth(500);

    // Show all enemy attack telegraphs
    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.isAlive) return;

      // Create prediction indicator
      const indicator = this.add.container(enemy.x, enemy.y - 50);

      // Attack direction arrow
      const direction = this.player.x > enemy.x ? 1 : -1;
      const arrow = this.add.text(0, 0, direction > 0 ? '→ ATK' : 'ATK ←', {
        font: 'bold 14px monospace',
        fill: '#ff0000',
        backgroundColor: '#000000aa',
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5);

      // Attack range circle
      const range = this.add.circle(0, 50, enemy.attackRange, 0xff0000, 0.2);

      indicator.add([arrow, range]);
      enemy.predictionIndicator = indicator;

      // Highlight enemy
      enemy.setTint(0xff8888);
    });

    // Ability active indicator
    this.abilityText.setText('INFERENCE ACTIVE');
    this.abilityText.setColor('#00ffff');

    // ========== BLOCKADE DESTRUCTION ==========
    // Check if blockade is active and destroy it when Inference is used
    if (this.blockadeActive && this.blockade) {
      this.destroyBlockade();
    }
  }

  destroyBlockade() {
    this.blockadeActive = false;

    // Stop the glitch animation timer
    if (this.blockadeGlitchTimer) {
      this.blockadeGlitchTimer.remove();
      this.blockadeGlitchTimer = null;
    }

    // Clear glitches array
    this.blockadeGlitches = [];

    // Stop blockade tweens
    if (this.blockadeBarrier) {
      this.tweens.killTweensOf(this.blockadeBarrier);
    }

    // Epic destruction effect
    this.cameras.main.shake(300, 0.015);
    this.cameras.main.flash(200, 0, 255, 255);

    // Create explosion particles at blockade position
    const blockadeX = this.blockade ? this.blockade.x : 1520;
    const blockadeY = this.blockade ? this.blockade.y : 520;

    // Particle explosion
    for (let i = 0; i < 30; i++) {
      const particle = this.add.rectangle(
        blockadeX + Phaser.Math.Between(-30, 30),
        blockadeY + Phaser.Math.Between(-45, 45),
        Phaser.Math.Between(4, 12),
        Phaser.Math.Between(4, 12),
        Phaser.Math.Between(0, 1) > 0.5 ? 0xff0044 : 0x00ffff,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        rotation: Math.random() * 6,
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Data stream particles (binary/code effect)
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 30, () => {
        if (!this.scene || !this.scene.isActive()) return;
        const dataText = this.add.text(
          blockadeX + Phaser.Math.Between(-25, 25),
          blockadeY + Phaser.Math.Between(-40, 40),
          Phaser.Math.Between(0, 1) > 0.5 ? '01' : '10',
          { font: '12px monospace', fill: '#00ffff' }
        ).setOrigin(0.5);

        this.tweens.add({
          targets: dataText,
          y: dataText.y - 80,
          alpha: 0,
          duration: 500,
          onComplete: () => dataText.destroy()
        });
      });
    }

    // Shatter animation for blockade
    if (this.blockade) {
      this.tweens.add({
        targets: this.blockade,
        scale: 1.5,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          if (this.blockade) {
            this.blockade.destroy();
            this.blockade = null;
          }
          this.blockadeBarrier = null;
        }
      });
    }

    // Show exit glow
    this.exitGlow.setVisible(true);
    this.tweens.add({
      targets: this.exitGlow,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Update exit label
    this.exitLabel.setText('EXIT\n[Ready]');
    this.exitLabel.setColor('#00ff00');

    // Show message
    const msg = this.add.text(
      this.cameras.main.scrollX + 400,
      150,
      'FIREWALL BREACHED!\n\nInference reveals the truth behind corporate barriers.',
      {
        font: '18px monospace',
        fill: '#00ffff',
        align: 'center',
        backgroundColor: '#000000cc',
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setScrollFactor(0);

    this.time.delayedCall(3000, () => {
      if (msg && msg.active) msg.destroy();
    });
  }

  deactivateInferenceVision() {
    // Remove inference overlay
    if (this.inferenceOverlay) {
      this.inferenceOverlay.destroy();
      this.inferenceOverlay = null;
    }

    this.enemies.getChildren().forEach(enemy => {
      if (enemy.predictionIndicator) {
        enemy.predictionIndicator.destroy();
        enemy.predictionIndicator = null;
      }
      if (enemy.isAlive) {
        enemy.clearTint();
      }
    });

    this.abilityText.setText('L: Inference');
    this.abilityText.setColor('#888888');
  }

  createHUD() {
    // Health
    this.healthText = this.add.text(10, 10, '', {
      font: '16px monospace',
      fill: '#ff4444'
    }).setScrollFactor(0);

    this.hearts = [];
    for (let i = 0; i < this.player.maxHealth; i++) {
      const heart = this.add.text(10 + i * 22, 32, '♥', {
        font: '18px monospace',
        fill: '#ff4444'
      }).setScrollFactor(0);
      this.hearts.push(heart);
    }

    // Gem slots
    this.add.text(10, 60, 'GEMS:', {
      font: '12px monospace',
      fill: '#888888'
    }).setScrollFactor(0);

    this.gemSlots = [];
    for (let i = 0; i < 5; i++) {
      const slot = this.add.rectangle(60 + i * 25, 68, 20, 20, 0x333344)
        .setScrollFactor(0);
      this.gemSlots.push(slot);
    }

    // Ability indicator
    this.abilityText = this.add.text(10, 95, 'L: Inference (locked)', {
      font: '12px monospace',
      fill: '#444444'
    }).setScrollFactor(0);

    // Controls
    this.add.text(10, 570, 'A/D: Move | Space: Jump | J: Attack | L: Gem Ability', {
      font: '11px monospace',
      fill: '#555566'
    }).setScrollFactor(0);

    this.updateHUD();
  }

  updateHUD() {
    this.healthText.setText(`HP: ${this.player.health}/${this.player.maxHealth}`);

    this.hearts.forEach((heart, index) => {
      heart.setColor(index < this.player.health ? '#ff4444' : '#333344');
    });
  }

  updateGemUI() {
    const gems = this.gemSystem.getCollectedGems();
    gems.forEach((gem, index) => {
      if (this.gemSlots[index]) {
        this.gemSlots[index].setFillStyle(gem.color, 1);
      }
    });

    // Update ability text
    if (this.gemSystem.hasGem('inference')) {
      this.abilityText.setText('L: Inference');
      this.abilityText.setColor('#888888');
    }
  }

  handlePlayerDeath() {
    const centerX = this.cameras.main.scrollX + 400;

    const deathText = this.add.text(centerX, 250, 'YOU DIED', {
      font: 'bold 48px monospace',
      fill: '#ff0000'
    }).setOrigin(0.5).setScrollFactor(0);

    const restartText = this.add.text(centerX, 320, 'Press R to Respawn', {
      font: '20px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);

    this.input.keyboard.once('keydown-R', () => {
      deathText.destroy();
      restartText.destroy();
      this.respawnPlayer();
    });
  }

  respawnPlayer() {
    // CRITICAL: Reset all scene states first
    this.isPaused = false;
    this.levelComplete = false;
    this.levelTransitioning = false;
    this.transitioningToNextLevel = false;

    // Reset time and physics (in case paused or slowed)
    this.time.timeScale = 1;
    this.time.paused = false;
    this.physics.resume();

    // Re-enable input in case it was disabled
    this.input.enabled = true;

    // Destroy pause menu if exists
    if (this.pauseContainer) {
      this.pauseContainer.destroy();
      this.pauseContainer = null;
    }

    // Respawn player
    this.player.respawn(this.spawnPoint.x, this.spawnPoint.y);

    // Show respawn message
    this.showRespawnMessage();

    // Reset enemies
    this.enemies.clear(true, true);
    this.spawnEnemies(600);

    // Recreate gauntlet if not collected
    if (!this.player.hasGauntlet) {
      // Clean up existing gauntlet if any
      if (this.gauntlet) {
        this.tweens.killTweensOf(this.gauntlet);
        this.gauntlet.destroy();
        this.gauntlet = null;
      }
      if (this.gauntletGlow) {
        this.tweens.killTweensOf(this.gauntletGlow);
        this.gauntletGlow.destroy();
        this.gauntletGlow = null;
      }
      if (this.gauntletLabel) {
        this.gauntletLabel.destroy();
        this.gauntletLabel = null;
      }
      this.placeGauntlet(600);
    }

    this.setupCollisions();

    // Reset blockade state - recreate if gem not collected
    if (!this.gemSystem.hasGem('inference')) {
      // Clean up existing blockade
      if (this.blockadeGlitchTimer) {
        this.blockadeGlitchTimer.remove();
        this.blockadeGlitchTimer = null;
      }
      if (this.blockade) {
        this.tweens.killTweensOf(this.blockade);
        this.blockade.destroy();
        this.blockade = null;
      }
      this.blockadeGlitches = [];
      this.blockadeActive = false;

      // Blockade will be recreated when exit is recreated
      // For now, just reset the state
    }

    // Reset exit hint shown flag
    this.exitHintShown = false;

    this.updateHUD();
  }

  showRespawnMessage() {
    const messages = [
      'NOT GIVING UP',
      'FOUNDERS PERSIST',
      'FAILURE IS LEARNING',
      'ITERATE AND IMPROVE',
      'BACK IN THE GAME'
    ];

    const msg = Phaser.Utils.Array.GetRandom(messages);
    const respawnText = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      msg,
      {
        font: 'bold 24px monospace',
        fill: '#00ff88',
        stroke: '#003322',
        strokeThickness: 4
      }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    this.tweens.add({
      targets: respawnText,
      alpha: 1,
      y: 180,
      duration: 300,
      hold: 1000,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => respawnText.destroy()
    });

    this.cameras.main.flash(200, 0, 255, 136, true);
  }

  showLevelTitle() {
    const title = this.add.text(400, 200, 'LEVEL 1\n\nESCAPE THE CUBICLE', {
      font: 'bold 28px monospace',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 500,
      hold: 2000,
      yoyo: true,
      onComplete: () => title.destroy()
    });
  }

  update(time, delta) {
    // Skip normal updates if level is complete or transitioning
    if (this.levelComplete || this.levelTransitioning) return;

    // Check fall death
    if (this.player.y > 650) {
      if (this.player.isAlive) {
        this.player.die();
      }
    }

    if (this.player && this.player.isAlive) {
      this.player.update();
      this.updateHUD();
    }

    // Update enemies
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.isAlive) {
        enemy.update();

        // Update prediction indicator position if active
        if (enemy.predictionIndicator) {
          enemy.predictionIndicator.setPosition(enemy.x, enemy.y - 50);
        }
      }
    });

    // Update gem system
    this.gemSystem.update(delta);

    // Update ability cooldown display
    if (this.gemSystem.hasGem('inference')) {
      const cooldown = this.gemSystem.getCooldownPercent('inference');
      if (cooldown > 0) {
        this.abilityText.setText(`L: Inference (${Math.ceil(cooldown * 5)}s)`);
        this.abilityText.setColor('#666666');
      } else if (!this.gemSystem.isAbilityActive('inference')) {
        this.abilityText.setText('L: Inference [Ready]');
        this.abilityText.setColor('#00ffff');
      }
    }
  }

  // Clean up when leaving the scene
  shutdown() {
    // Stop all tweens
    this.tweens.killAll();

    // Remove event listeners
    this.events.off('playerDied', this.handlePlayerDeath, this);
    this.events.off('gemCollected', this.handleGemCollected, this);
    this.events.off('abilityUsed', this.handleAbilityUsed, this);
    this.events.off('abilityEnded', this.handleAbilityEnded, this);

    // Clean up keyboard listeners
    this.input.keyboard.off('keydown-L');
    this.input.keyboard.off('keydown-R');


    // Clean up player abilities
    if (this.player) {
      if (this.player.superAura) {
        this.player.superAura.remove();
      }
      if (this.player.shield) {
        this.player.shield.destroy();
      }
    }

    // Clean up gauntlet if exists
    if (this.gauntlet) {
      this.tweens.killTweensOf(this.gauntlet);
    }
    if (this.gauntletGlow) {
      this.tweens.killTweensOf(this.gauntletGlow);
    }
  }
}
