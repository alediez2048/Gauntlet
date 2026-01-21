import Phaser from 'phaser';
import Player from '../entities/Player.js';
import DroneZombie from '../entities/DroneZombie.js';
import GemSystem, { GEM_TYPES, GemPickup } from '../systems/GemSystem.js';

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

    // Level state flags
    this.levelComplete = false;
    this.levelTransitioning = false;
    this.transitioningToNextLevel = false;
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
    this.add.text(1050, height - 430, 'CLARITY ↓', {
      font: '12px monospace',
      fill: '#00ffff'
    }).setAlpha(0.7);
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

    // Door glow
    this.exitGlow = this.add.rectangle(exitX, exitY, 50, 70, 0x00ff00, 0.3);

    // Exit zone (physics)
    this.exitZone = this.add.rectangle(exitX, exitY, 50, 70, 0x00ff00, 0);
    this.physics.add.existing(this.exitZone, true);

    // Label (initially shows requirement)
    this.exitLabel = this.add.text(exitX, exitY - 80, 'EXIT\n[Need Gem]', {
      font: '10px monospace',
      fill: '#888888',
      align: 'center'
    }).setOrigin(0.5);

    // Pulsing animation
    this.tweens.add({
      targets: this.exitGlow,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
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

    const hint = this.add.text(400, 245, 'Find the Clarity Gem to see through the BS!', {
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
    // Show collection message
    const text = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      `${gemType.name} Acquired!\n\nPress L to reveal enemy attacks`,
      {
        font: '20px monospace',
        fill: '#00ffff',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // Update exit
    this.exitLabel.setText('EXIT\n[Ready]');
    this.exitLabel.setColor('#00ff00');
    this.exitGlow.setFillStyle(0x00ff00, 0.5);

    this.time.delayedCall(3000, () => {
      text.destroy();
    });

    this.updateGemUI();
  }

  handleExitReached(player, exitZone) {
    // Prevent multiple triggers
    if (this.levelComplete) return;

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

    this.add.text(400, 280, 'Clarity Gem Mastered!\n\nYou can now see through corporate lies!', {
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
    }
  }

  handleAbilityEnded(gemId) {
    if (gemId === 'inference') {
      this.deactivateInferenceVision();
    }
  }

  activateInferenceVision() {
    // Visual effect - screen tint
    this.cameras.main.setTint(0xaaffff);

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
  }

  deactivateInferenceVision() {
    // Remove visual effects
    this.cameras.main.clearTint();

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
