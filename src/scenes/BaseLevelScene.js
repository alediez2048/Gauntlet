import Phaser from 'phaser';
import Player from '../entities/Player.js';
import DroneZombie from '../entities/DroneZombie.js';
import MiddleManager from '../entities/MiddleManager.js';
import ComplianceBot from '../entities/ComplianceBot.js';
import GemSystem, { GEM_TYPES, GemPickup } from '../systems/GemSystem.js';
import { LEVEL_CONFIGS } from '../data/levelConfigs.js';
import { getSharedAIController } from '../systems/AIController.js';

export default class BaseLevelScene extends Phaser.Scene {
  constructor(key, configKey) {
    super({ key });
    this.configKey = configKey;
  }

  init(data) {
    this.previousGems = data.gems || [];
    this.playerStats = data.playerStats || null;
  }

  create() {
    this.config = LEVEL_CONFIGS[this.configKey];
    const { width, height } = this.config;

    // World setup
    this.physics.world.setBounds(0, 0, width, height);
    this.add.rectangle(width / 2, height / 2, width, height, this.config.backgroundColor);

    // Scene transition fade-in
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Create parallax background layers
    this.createParallaxBackground();

    // CRT/Monitor effect overlay (adds that "viewing through security camera" feel)
    // this.createCRTEffect();

    // Gem system - restore previous gems
    this.gemSystem = new GemSystem(this);
    this.previousGems.forEach(gem => this.gemSystem.collectGem(gem));

    // AI Controller for adaptive enemy behavior
    this.aiController = getSharedAIController(this);

    // Create level
    this.createPlatforms();
    this.createDecorations();

    // Player
    this.spawnPoint = this.config.spawnPoint;
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);

    // Restore player stats if continuing
    if (this.playerStats) {
      this.player.health = this.playerStats.health;
      this.player.attackDamage = this.playerStats.attackDamage;
      // Restore gauntlet state (player always has gauntlet after Level 1)
      if (this.playerStats.hasGauntlet) {
        this.player.equipGauntlet();
      }
    } else {
      // For levels 2+, player should always have gauntlet (they got it in Level 1)
      // BaseLevelScene is used for levels 2-5
      this.player.equipGauntlet();
    }

    // Camera
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Enemies and projectiles
    this.enemies = this.add.group();
    this.projectiles = this.physics.add.group();
    this.spawnEnemies();

    // Gem pickup
    this.createGemPickup();

    // Exit
    this.createExit();

    // Collisions
    this.setupCollisions();

    // HUD
    this.createHUD();

    // Abilities
    this.setupGemAbilities();

    // Events
    this.events.on('playerDied', this.handlePlayerDeath, this);
    this.events.on('gemCollected', this.handleGemCollected, this);
    this.events.on('abilityUsed', this.handleAbilityUsed, this);
    this.events.on('abilityEnded', this.handleAbilityEnded, this);

    // Title
    this.showLevelTitle();

    this.levelComplete = false;
    this.levelTransitioning = false;
    this.transitioningToNextLevel = false;

    // Pause system
    this.isPaused = false;
    this.pauseContainer = null;
    this.setupPauseControls();
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    this.walls = this.physics.add.staticGroup();

    this.config.platforms.forEach(p => {
      const platform = this.add.rectangle(p.x + p.w / 2, p.y, p.w, p.h, 0x4a4a6a);
      this.platforms.add(platform);
      platform.body.updateFromGameObject();

      // Top highlight
      if (p.h <= 20) {
        this.add.rectangle(p.x + p.w / 2, p.y - p.h / 2 + 2, p.w, 4, 0x6a6a8a);
      }
    });

    // Boundary walls
    const height = this.config.height;
    const width = this.config.width;

    const leftWall = this.add.rectangle(0, height / 2, 20, height, 0x3a3a5a);
    this.walls.add(leftWall);
    leftWall.body.updateFromGameObject();

    const rightWall = this.add.rectangle(width, height / 2, 20, height, 0x3a3a5a);
    this.walls.add(rightWall);
    rightWall.body.updateFromGameObject();
  }

  createDecorations() {
    const { width, height, name, id } = this.config;

    // Level-specific color themes - escaping corporate hell
    const themes = {
      level1: {
        accent: 0x3388aa, bg: 0x1a1a2e, name: 'CUBICLE FARM',
        subtitle: 'Where Dreams Come to Die',
        hazard: 'CAUTION: Soul-crushing meetings ahead'
      },
      level2: {
        accent: 0x8833aa, bg: 0x2a1a2e, name: 'BREAK ROOM',
        subtitle: 'Mandatory Fun Zone',
        hazard: 'WARNING: Passive-aggressive notes everywhere'
      },
      level3: {
        accent: 0x33aa88, bg: 0x1a2a2e, name: 'RED TAPE ARCHIVE',
        subtitle: 'Bureaucracy Storage Facility',
        hazard: 'DANGER: Forms in triplicate required'
      },
      level4: {
        accent: 0x33aa33, bg: 0x1a2e1a, name: 'HR DUNGEON',
        subtitle: 'Where Complaints Disappear',
        hazard: 'NOTICE: Your concerns have been noted and ignored'
      },
      level5: {
        accent: 0xaa6633, bg: 0x2e1a1a, name: 'EXECUTIVE TOWER',
        subtitle: 'Golden Parachute Storage',
        hazard: 'RESTRICTED: Ideas and innovation forbidden'
      }
    };

    const theme = themes[id] || themes.level1;
    this.currentTheme = theme;

    // Background cubicle walls
    for (let x = 100; x < width; x += 180) {
      const wallHeight = Phaser.Math.Between(80, 150);
      this.add.image(x, height - 40 - wallHeight / 2, 'cubicle_wall')
        .setScale(1, wallHeight / 64)
        .setAlpha(0.3)
        .setTint(theme.accent);
    }

    // Office decorations scattered around
    for (let x = 80; x < width; x += Phaser.Math.Between(100, 200)) {
      const y = height - 60;
      const rand = Math.random();

      if (rand < 0.3) {
        // Monitor on desk
        const monitor = this.add.image(x, y - 40, 'monitor').setAlpha(0.6);
        // Flickering effect
        if (Math.random() < 0.2) {
          this.tweens.add({
            targets: monitor,
            alpha: { from: 0.4, to: 0.7 },
            duration: 100,
            yoyo: true,
            repeat: -1,
            repeatDelay: Phaser.Math.Between(2000, 6000)
          });
        }
      } else if (rand < 0.5) {
        // Dead plant
        this.add.image(x, y - 20, 'plant').setAlpha(0.5);
      } else if (rand < 0.65) {
        // Coffee mug
        this.add.image(x, y - 10, 'mug').setAlpha(0.4);
      } else if (rand < 0.75) {
        // Warning sign
        this.add.image(x, y - 30, 'warning').setAlpha(0.5);
      }
    }

    // Floating dust particles
    for (let i = 0; i < 40; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0x666688,
        0.3
      ).setScrollFactor(0.5); // Parallax effect

      this.tweens.add({
        targets: particle,
        y: particle.y - 80,
        alpha: 0,
        duration: 4000 + Math.random() * 3000,
        repeat: -1,
        onRepeat: () => {
          particle.y = height + 20;
          particle.x = Phaser.Math.Between(0, width);
          particle.alpha = 0.3;
        }
      });
    }

    // Atmospheric lighting (gradient overlay)
    const lighting = this.add.graphics();
    lighting.setScrollFactor(0);
    lighting.setDepth(1000);

    // Vignette removed as per user request
    // lighting.fillStyle(0x000000, 0.4);
    // lighting.fillRect(0, 0, 50, 600);
    // lighting.fillRect(750, 0, 50, 600);
    // lighting.fillStyle(0x000000, 0.3);
    // lighting.fillRect(0, 0, 800, 30);
    // lighting.fillRect(0, 570, 800, 30);

    // Add corporate propaganda posters
    this.createPropagandaPosters(width, height, theme);

    // Add environmental hazard signs
    this.createHazardSigns(width, height, theme);

    // Floating papers
    this.createFloatingPapers();

    // Fluorescent lights
    this.createFluorescentLights();

    // Blood stains / coffee spills (ominous)
    this.createStains(width, height);

    // Level intro card
    this.showLevelIntro(theme.name, id, theme);
  }

  createPropagandaPosters(width, height, theme) {
    const slogans = [
      'SYNERGY\nIS MANDATORY',
      'REPORT\nINNOVATION',
      'MEETINGS\nARE PROGRESS',
      'PROCESS\nOVER RESULTS',
      'SMILE\nOR ELSE',
      'COMPLIANCE\n= PROMOTION',
      'OVERTIME\nIS OPTIONAL*',
      'STAY IN\nYOUR LANE',
      'STARTUPS\nARE RISKY'
    ];

    for (let x = 150; x < width; x += Phaser.Math.Between(250, 400)) {
      const y = Phaser.Math.Between(80, 150);

      // Poster background
      const poster = this.add.rectangle(x, y, 60, 80, 0xeeeecc, 0.7);
      poster.setScrollFactor(0.2);

      // Poster border
      const border = this.add.rectangle(x, y, 64, 84, 0x000000, 0);
      border.setStrokeStyle(2, 0x333333, 0.5);
      border.setScrollFactor(0.2);

      // Slogan
      const slogan = Phaser.Utils.Array.GetRandom(slogans);
      const text = this.add.text(x, y, slogan, {
        font: 'bold 8px monospace',
        fill: '#333333',
        align: 'center'
      }).setOrigin(0.5).setScrollFactor(0.2);

      // Some posters are torn/damaged
      if (Math.random() < 0.3) {
        poster.setAlpha(0.4);
        text.setAlpha(0.4);
        poster.rotation = Phaser.Math.Between(-10, 10) * 0.01;
      }
    }
  }

  createHazardSigns(width, height, theme) {
    // Add warning signs at random positions
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(100, width - 100);
      const y = Phaser.Math.Between(60, 120);

      // Warning tape strips
      const tape = this.add.rectangle(x, y + 60, 120, 8, 0xffcc00, 0.6);
      tape.setScrollFactor(0.15);

      // Black stripes on tape
      for (let s = -50; s < 50; s += 20) {
        const stripe = this.add.rectangle(x + s, y + 60, 8, 8, 0x000000, 0.6);
        stripe.rotation = 0.785; // 45 degrees
        stripe.setScrollFactor(0.15);
      }
    }

    // Hazard text at level start
    const hazardText = this.add.text(100, 50, theme.hazard, {
      font: '10px monospace',
      fill: '#ff6600',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    }).setScrollFactor(0.1).setAlpha(0.7);

    // Flicker the hazard text
    this.tweens.add({
      targets: hazardText,
      alpha: { from: 0.7, to: 0.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
  }

  createStains(width, height) {
    // Random stains (coffee? blood? who knows...)
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = height - 45;

      const stain = this.add.ellipse(
        x, y,
        Phaser.Math.Between(15, 40),
        Phaser.Math.Between(5, 15),
        Math.random() < 0.7 ? 0x331100 : 0x440000,
        0.3
      );
      stain.rotation = Math.random() * Math.PI;
    }
  }

  showLevelIntro(themeName, levelId, theme) {
    const levelNum = parseInt(levelId.replace('level', ''));

    // Dark overlay with scan effect
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9)
      .setScrollFactor(0)
      .setDepth(2000);

    // Scanning line effect
    const scanLine = this.add.rectangle(400, 0, 800, 4, 0x00ff88, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    this.tweens.add({
      targets: scanLine,
      y: 600,
      duration: 2000,
      repeat: 1,
      onComplete: () => scanLine.destroy()
    });

    // MEGACORP logo header
    const logoText = this.add.text(400, 80, '◆ MEGACORP ◆', {
      font: 'bold 16px monospace',
      fill: '#334455'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Access granted text
    const accessText = this.add.text(400, 120, 'SECURITY CLEARANCE: VERIFIED', {
      font: '10px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Level number with glitch effect
    const levelText = this.add.text(400, 200, `━━━ FLOOR ${levelNum} ━━━`, {
      font: 'bold 42px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Theme name
    const themeText = this.add.text(400, 270, themeName, {
      font: 'bold 28px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Subtitle
    const subtitleText = this.add.text(400, 310, theme?.subtitle || '', {
      font: '14px monospace',
      fill: '#668899'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Level-specific flavor text - escape the corporate nightmare
    const flavorTexts = {
      level1: '"Your potential is being wasted here."',
      level2: '"The free snacks aren\'t worth your freedom."',
      level3: '"Somewhere, a startup needs you."',
      level4: '"Your side project could change everything."',
      level5: '"Break free. Build something amazing."'
    };

    const flavorText = this.add.text(400, 380, flavorTexts[levelId] || '', {
      font: 'italic 14px monospace',
      fill: '#aa8866'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Employee count (lore element)
    const employeeCount = this.add.text(400, 450, `ACTIVE EMPLOYEES: ${Phaser.Math.Between(0, 3)}  |  MISSING: ${Phaser.Math.Between(47, 156)}`, {
      font: '10px monospace',
      fill: '#ff4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Loading bar effect
    const loadingBg = this.add.rectangle(400, 520, 300, 8, 0x222233)
      .setScrollFactor(0).setDepth(2001).setAlpha(0);
    const loadingBar = this.add.rectangle(250, 520, 0, 6, 0x00ff88)
      .setScrollFactor(0).setDepth(2001).setAlpha(0).setOrigin(0, 0.5);

    // Glitch the level text occasionally
    this.time.addEvent({
      delay: 200,
      callback: () => {
        if (levelText.active) {
          levelText.x = 400 + Phaser.Math.Between(-2, 2);
          levelText.setTint(Math.random() > 0.9 ? 0xff0000 : 0xffffff);
        }
      },
      repeat: 12
    });

    // Animate in with typewriter/glitch feel
    this.tweens.add({
      targets: [logoText, accessText],
      alpha: 1,
      duration: 300,
      delay: this.tweens.stagger(200)
    });

    this.tweens.add({
      targets: [levelText, themeText, subtitleText],
      alpha: 1,
      duration: 500,
      delay: this.tweens.stagger(300, { start: 600 })
    });

    this.tweens.add({
      targets: [flavorText, employeeCount, loadingBg, loadingBar],
      alpha: 1,
      duration: 400,
      delay: 1500
    });

    // Animate loading bar
    this.tweens.add({
      targets: loadingBar,
      width: 300,
      duration: 1000,
      delay: 1800,
      ease: 'Stepped',
      easeParams: [10]
    });

    // Fade out after delay
    this.time.delayedCall(3500, () => {
      this.tweens.add({
        targets: [overlay, logoText, accessText, levelText, themeText, subtitleText, flavorText, employeeCount, loadingBg, loadingBar],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          logoText.destroy();
          accessText.destroy();
          levelText.destroy();
          themeText.destroy();
          subtitleText.destroy();
          flavorText.destroy();
          employeeCount.destroy();
          loadingBg.destroy();
          loadingBar.destroy();
        }
      });
    });
  }

  spawnEnemies() {
    this.config.enemies.forEach(e => {
      let enemy;

      switch (e.type) {
        case 'drone':
          enemy = new DroneZombie(this, e.x, e.y);
          break;
        case 'manager':
          enemy = new MiddleManager(this, e.x, e.y);
          enemy.setProjectilesGroup(this.projectiles);
          break;
        case 'tank':
          enemy = new ComplianceBot(this, e.x, e.y);
          break;
        default:
          enemy = new DroneZombie(this, e.x, e.y);
      }

      enemy.setTarget(this.player);
      enemy.patrolLeft = e.patrolLeft;
      enemy.patrolRight = e.patrolRight;
      this.enemies.add(enemy);
    });
  }

  createGemPickup() {
    const gemType = GEM_TYPES[this.config.gemType];
    const pos = this.config.gemPosition;

    // Check if already collected
    if (this.gemSystem.hasGem(gemType.id)) {
      this.gemPickup = null;
      return;
    }

    this.gemPickup = new GemPickup(this, pos.x, pos.y, gemType);
  }

  createExit() {
    const pos = this.config.exitPosition;
    const height = this.config.height;

    // Door frame
    this.add.rectangle(pos.x, pos.y, 60, 80, 0x2a5a2a);
    this.add.rectangle(pos.x, pos.y - 45, 70, 10, 0x3a7a3a);

    // Glow
    this.exitGlow = this.add.rectangle(pos.x, pos.y, 50, 70, 0x00ff00, 0.3);

    // Physics zone
    this.exitZone = this.add.rectangle(pos.x, pos.y, 50, 70, 0x00ff00, 0);
    this.physics.add.existing(this.exitZone, true);

    // Label
    const gemType = GEM_TYPES[this.config.gemType];
    const hasGem = this.gemSystem.hasGem(gemType.id);

    this.exitLabel = this.add.text(pos.x, pos.y - 80, hasGem ? 'EXIT\n[Ready]' : 'EXIT\n[Need Gem]', {
      font: '10px monospace',
      fill: hasGem ? '#00ff00' : '#888888',
      align: 'center'
    }).setOrigin(0.5);

    if (hasGem) {
      this.exitGlow.setFillStyle(0x00ff00, 0.5);
    }

    // Pulse animation
    this.tweens.add({
      targets: this.exitGlow,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.walls);
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

    // Projectiles -> Player
    this.physics.add.overlap(
      this.player,
      this.projectiles,
      this.handleProjectileHit,
      null,
      this
    );

    // Gem pickup
    if (this.gemPickup) {
      this.physics.add.overlap(
        this.player,
        this.gemPickup,
        this.handleGemPickup,
        null,
        this
      );
    }

    // Exit
    this.physics.add.overlap(
      this.player,
      this.exitZone,
      this.handleExitReached,
      null,
      this
    );
  }

  handleAttackHit(attackHitbox, enemy) {
    if (!this.player.isAttacking || !enemy.isAlive) return;
    const knockbackDir = enemy.x > this.player.x ? 1 : -1;

    // Training gem bonus damage
    let damage = this.player.attackDamage;
    if (this.gemSystem.hasGem('training') && this.player.hitStreak) {
      damage += Math.min(this.player.hitStreak * 0.1, 0.5);
    }

    enemy.takeDamage(damage, knockbackDir);

    // Increment hit streak for training gem
    if (this.gemSystem.hasGem('training')) {
      this.player.hitStreak = (this.player.hitStreak || 0) + 1;
      this.updateTrainingDisplay();
    }
  }

  handleEnemyContact(player, enemy) {
    if (!enemy.isAlive || player.isInvulnerable) return;
    if (enemy.isAttacking) return;
    const knockbackDir = player.x > enemy.x ? 1 : -1;
    player.takeDamage(enemy.damage, knockbackDir);

    // Reset hit streak
    if (this.gemSystem.hasGem('training')) {
      this.player.hitStreak = 0;
      this.updateTrainingDisplay();
    }
  }

  handleProjectileHit(player, projectile) {
    if (player.isInvulnerable) return;
    const knockbackDir = player.x > projectile.x ? 1 : -1;
    player.takeDamage(projectile.damage || 1, knockbackDir);
    projectile.destroy();

    // Reset hit streak
    if (this.gemSystem.hasGem('training')) {
      this.player.hitStreak = 0;
      this.updateTrainingDisplay();
    }
  }

  handleGemPickup(player, gemPickup) {
    if (!gemPickup || gemPickup.collected) return;
    if (gemPickup.collect()) {
      this.gemSystem.collectGem(gemPickup.gemType);
    }
  }

  handleGemCollected(gemType) {
    // Dramatic screen flash
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.shake(200, 0.01);

    // Gem collection particle burst
    this.spawnGemCollectionParticles(gemType.color);

    // Collection message - escape themed with clear key binding
    let description = '';
    let keyHint = '';
    switch (gemType.id) {
      case 'inference':
        description = 'See through corporate BS!';
        keyHint = '[ Press L to activate ]';
        break;
      case 'training':
        description = 'Learn through repetition - 3x damage!';
        keyHint = '[ Press K for Power Strike ]';
        break;
      case 'optimization':
        description = 'Move fast and break bureaucracy!';
        keyHint = '[ Press SHIFT to Dash ]';
        break;
      case 'generalization':
        description = 'Turn their negativity against them!';
        keyHint = '[ Press K for Reflect Shield ]';
        break;
      case 'alignment':
        description = 'FOUNDER MODE - Unstoppable!';
        keyHint = '[ Press K for Super Mode ]';
        break;
    }

    const gemColorHex = `#${gemType.color.toString(16).padStart(6, '0')}`;

    // Animated background panel
    const panel = this.add.rectangle(
      this.cameras.main.scrollX + 400, 200,
      0, 120, 0x000000, 0.9
    ).setScrollFactor(0).setDepth(2000);

    this.tweens.add({
      targets: panel,
      width: 400,
      duration: 200,
      ease: 'Power2'
    });

    // Gem icon spinning in
    const gemIcon = this.add.rectangle(
      this.cameras.main.scrollX + 400, 160,
      20, 20, gemType.color
    ).setScrollFactor(0).setDepth(2001).setScale(0).setRotation(Math.PI);

    this.tweens.add({
      targets: gemIcon,
      scale: 1.5,
      rotation: 0,
      duration: 400,
      delay: 100,
      ease: 'Back.easeOut'
    });

    // Pulsing glow around gem icon
    const gemGlow = this.add.circle(
      this.cameras.main.scrollX + 400, 160,
      25, gemType.color, 0.3
    ).setScrollFactor(0).setDepth(2000);

    this.tweens.add({
      targets: gemGlow,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 0.3, to: 0 },
      duration: 800,
      repeat: 3
    });

    const titleText = this.add.text(
      this.cameras.main.scrollX + 400, 195,
      `${gemType.name} Acquired!`,
      {
        font: 'bold 22px monospace',
        fill: gemColorHex
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    const descText = this.add.text(
      this.cameras.main.scrollX + 400, 225,
      description,
      {
        font: '14px monospace',
        fill: '#aaaaaa'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Key hint text - more prominent
    const keyHintText = this.add.text(
      this.cameras.main.scrollX + 400, 260,
      keyHint,
      {
        font: 'bold 16px monospace',
        fill: gemColorHex,
        backgroundColor: '#000000aa',
        padding: { x: 12, y: 6 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);

    // Animate text in
    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 300,
      delay: 200
    });

    this.tweens.add({
      targets: descText,
      alpha: 1,
      duration: 300,
      delay: 400
    });

    this.tweens.add({
      targets: keyHintText,
      alpha: 1,
      duration: 300,
      delay: 600
    });

    // Pulse the key hint for emphasis
    this.time.delayedCall(700, () => {
      this.tweens.add({
        targets: keyHintText,
        scale: { from: 1, to: 1.1 },
        duration: 400,
        yoyo: true,
        repeat: 3
      });
    });

    // Update exit
    this.exitLabel.setText('EXIT\n[Ready]');
    this.exitLabel.setColor('#00ff00');
    this.exitGlow.setFillStyle(0x00ff00, 0.5);

    // Cleanup
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [panel, gemIcon, gemGlow, titleText, descText, keyHintText],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          panel.destroy();
          gemIcon.destroy();
          gemGlow.destroy();
          titleText.destroy();
          descText.destroy();
          keyHintText.destroy();
        }
      });
    });

    this.updateGemUI();
  }

  spawnGemCollectionParticles(color) {
    const centerX = this.gemPickup ? this.gemPickup.x : this.player.x;
    const centerY = this.gemPickup ? this.gemPickup.y : this.player.y;

    // Spiral particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 4;
      const particle = this.add.circle(
        centerX,
        centerY,
        Phaser.Math.Between(2, 5),
        color,
        1
      );

      const radius = 50 + i * 5;
      this.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius - 50,
        alpha: 0,
        scale: 0,
        duration: 600 + i * 30,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Rising sparkles
    for (let i = 0; i < 15; i++) {
      const sparkle = this.add.circle(
        centerX + Phaser.Math.Between(-30, 30),
        centerY + Phaser.Math.Between(-20, 20),
        2,
        0xffffff,
        1
      );

      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - 100 - Math.random() * 50,
        alpha: 0,
        duration: 800 + Math.random() * 400,
        delay: Math.random() * 200,
        onComplete: () => sparkle.destroy()
      });
    }

    // Energy ring
    const ring = this.add.circle(centerX, centerY, 10, color, 0);
    ring.setStrokeStyle(4, color, 1);

    this.tweens.add({
      targets: ring,
      scale: 6,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy()
    });
  }

  handleExitReached() {
    // Prevent multiple triggers
    if (this.levelComplete || this.levelTransitioning) return;

    const gemType = GEM_TYPES[this.config.gemType];
    if (!this.gemSystem.hasGem(gemType.id)) {
      if (!this.exitHintShown) {
        this.exitHintShown = true;
        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 100,
          `Find the ${gemType.name} first!`,
          { font: '12px monospace', fill: '#ff8888' }
        ).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
          if (this.scene.isActive()) {
            hint.destroy();
            this.exitHintShown = false;
          }
        });
      }
      return;
    }

    // Set transitioning flag to prevent race conditions
    this.levelTransitioning = true;

    // Defer to next frame to avoid physics conflicts
    this.time.delayedCall(10, () => {
      this.handleLevelComplete();
    });
  }

  handleLevelComplete() {
    if (this.levelComplete) return;
    this.levelComplete = true;

    this.player.setVelocity(0, 0);
    if (this.player.body) this.player.body.enable = false;

    // Stop all enemies
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.body) enemy.body.enable = false;
      enemy.setVelocity(0, 0);
    });

    // Disable exit zone physics
    if (this.exitZone && this.exitZone.body) {
      this.exitZone.body.enable = false;
    }

    // Victory particle burst
    this.spawnVictoryParticles();

    // Flash effect
    this.cameras.main.flash(300, 255, 255, 255);

    const overlay = this.add.rectangle(
      this.cameras.main.scrollX + 400, 300,
      800, 600, 0x000000, 0
    ).setScrollFactor(0).setDepth(3000);

    // Fade in overlay
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.85,
      duration: 500
    });

    const gemType = GEM_TYPES[this.config.gemType];
    const gemColor = `#${gemType.color.toString(16).padStart(6, '0')}`;

    // Animated text elements
    const completeText = this.add.text(
      this.cameras.main.scrollX + 400, 250,
      `${this.config.name} COMPLETE!`,
      { font: 'bold 32px monospace', fill: '#00ff00' }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0).setScale(0.5);

    const masteredText = this.add.text(
      this.cameras.main.scrollX + 400, 320,
      `${gemType.name} Mastered`,
      { font: '18px monospace', fill: gemColor }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0);

    // Clickable button for next level
    const buttonBg = this.add.rectangle(400, 400, 250, 60, 0x00aa00)
      .setScrollFactor(0)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const buttonText = this.add.text(400, 400, 'CONTINUE', {
      font: 'bold 20px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3003).setAlpha(0);

    const hintText = this.add.text(400, 440, '(click or press any key)', {
      font: '12px monospace',
      fill: '#666666'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3003).setAlpha(0);

    // Animate text in with bounce
    this.tweens.add({
      targets: completeText,
      alpha: 1,
      scale: 1,
      duration: 500,
      delay: 300,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: masteredText,
      alpha: 1,
      duration: 400,
      delay: 600
    });

    this.tweens.add({
      targets: [buttonBg, buttonText, hintText],
      alpha: 1,
      duration: 400,
      delay: 900
    });

    // Pulse the button
    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: buttonBg,
        scaleX: { from: 1, to: 1.05 },
        scaleY: { from: 1, to: 1.05 },
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    });

    // Button hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x00ff00);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x00aa00);
    });

    // Transition function
    const goToNextLevel = () => {
      if (this.transitioningToNextLevel) return;
      this.transitioningToNextLevel = true;

      buttonBg.setFillStyle(0xffff00);
      buttonText.setText('LOADING...');

      this.createLevelTransition(() => {
        this.scene.start(this.config.nextLevel, {
          gems: this.gemSystem.getCollectedGems(),
          playerStats: {
            health: this.player.health,
            attackDamage: this.player.attackDamage,
            hasGauntlet: this.player.hasGauntlet
          }
        });
      });
    };

    // Button click
    buttonBg.on('pointerdown', goToNextLevel);

    // Any key press
    this.input.keyboard.once('keydown', goToNextLevel);

    // Floating gem particles in background
    this.time.addEvent({
      delay: 200,
      callback: () => {
        if (!this.levelComplete) return;
        const particle = this.add.circle(
          this.cameras.main.scrollX + Phaser.Math.Between(100, 700),
          600,
          Phaser.Math.Between(2, 5),
          gemType.color,
          0.6
        ).setScrollFactor(0).setDepth(2999);

        this.tweens.add({
          targets: particle,
          y: -50,
          alpha: 0,
          duration: 3000,
          onComplete: () => particle.destroy()
        });
      },
      repeat: 15
    });
  }

  spawnVictoryParticles() {
    const centerX = this.player.x;
    const centerY = this.player.y;

    // Burst of particles from player
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      const particle = this.add.circle(
        centerX,
        centerY,
        Phaser.Math.Between(3, 6),
        Phaser.Math.Between(0, 1) > 0.5 ? 0x00ff88 : 0xffaa00,
        1
      );

      this.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * speed,
        y: centerY + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Ring expansion effect
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(centerX, centerY, 10, 0x00ff88, 0);
      ring.setStrokeStyle(3, 0x00ff88, 0.8);

      this.tweens.add({
        targets: ring,
        scale: 8 + i * 2,
        alpha: 0,
        duration: 600 + i * 200,
        delay: i * 150,
        onComplete: () => ring.destroy()
      });
    }
  }

  setupGemAbilities() {
    // L key - Inference (reveal enemy attacks)
    this.input.keyboard.on('keydown-L', () => {
      if (this.gemSystem.canUseAbility('inference')) {
        this.gemSystem.useAbility('inference');
      }
    });

    // K key - Training (Power Strike), Generalization (Shield), or Alignment (Super Mode)
    this.input.keyboard.on('keydown-K', () => {
      // Priority: Alignment > Generalization > Training
      if (this.gemSystem.canUseAbility('alignment')) {
        this.gemSystem.useAbility('alignment');
      } else if (this.gemSystem.canUseAbility('generalization')) {
        this.gemSystem.useAbility('generalization');
      } else if (this.gemSystem.canUseAbility('training')) {
        this.gemSystem.useAbility('training');
      }
    });

    // SHIFT key - Optimization (Dash)
    this.input.keyboard.on('keydown-SHIFT', () => {
      if (this.gemSystem.canUseAbility('optimization')) {
        this.gemSystem.useAbility('optimization');
      }
    });
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

    // Create pause overlay
    this.createPauseMenu();
  }

  resumeGame() {
    this.isPaused = false;
    this.physics.resume();
    this.time.paused = false;

    // Destroy pause menu
    if (this.pauseContainer) {
      this.pauseContainer.destroy();
      this.pauseContainer = null;
    }
  }

  createPauseMenu() {
    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);

    // Dark overlay with scan effect
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    this.pauseContainer.add(overlay);

    // Scanning line animation
    const scanLine = this.add.rectangle(400, 0, 800, 2, 0x00ff88, 0.6);
    this.pauseContainer.add(scanLine);
    this.tweens.add({
      targets: scanLine,
      y: 600,
      duration: 2000,
      repeat: -1
    });

    // PAUSED header with glitch effect
    const pausedText = this.add.text(400, 40, '◆ SYSTEM PAUSED ◆', {
      font: 'bold 28px monospace',
      fill: '#00ff88',
      stroke: '#003322',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.pauseContainer.add(pausedText);

    // Glitch the pause text
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.isPaused && pausedText.active) {
          pausedText.x = 400 + Phaser.Math.Between(-2, 2);
        }
      },
      repeat: -1
    });

    // Draw the detailed gauntlet
    this.drawDetailedGauntlet();

    // Draw gem slots around gauntlet
    this.drawGemSlots();

    // Controls section
    this.drawControlsSection();

    // Resume instruction
    const resumeText = this.add.text(400, 560, '[ Press ESC or P to Resume ]', {
      font: '16px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5);
    this.pauseContainer.add(resumeText);

    // Pulse resume text
    this.tweens.add({
      targets: resumeText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  drawDetailedGauntlet() {
    const centerX = 400;
    const centerY = 280;
    const g = this.add.graphics();
    this.pauseContainer.add(g);

    // Gauntlet base glow
    g.fillStyle(0xffaa00, 0.2);
    g.fillCircle(centerX, centerY, 120);

    // Main gauntlet body - forearm piece
    g.fillStyle(0x444455, 1);
    g.fillRoundedRect(centerX - 45, centerY - 80, 90, 160, 15);

    // Metallic trim
    g.fillStyle(0x666677, 1);
    g.fillRoundedRect(centerX - 50, centerY - 85, 100, 20, 8);
    g.fillRoundedRect(centerX - 50, centerY + 65, 100, 20, 8);

    // Inner tech lines
    g.lineStyle(2, 0x00ff88, 0.5);
    for (let y = centerY - 60; y < centerY + 60; y += 20) {
      g.lineBetween(centerX - 35, y, centerX + 35, y);
    }

    // Central power core
    g.fillStyle(0x222233, 1);
    g.fillCircle(centerX, centerY, 35);
    g.lineStyle(3, 0xffaa00, 1);
    g.strokeCircle(centerX, centerY, 35);

    // Power core inner glow
    g.fillStyle(0xffaa00, 0.6);
    g.fillCircle(centerX, centerY, 20);
    g.fillStyle(0xffffcc, 0.8);
    g.fillCircle(centerX, centerY, 10);

    // Gauntlet fingers (simplified)
    const fingerPositions = [
      { x: centerX - 30, y: centerY + 90 },
      { x: centerX - 10, y: centerY + 95 },
      { x: centerX + 10, y: centerY + 95 },
      { x: centerX + 30, y: centerY + 90 }
    ];

    fingerPositions.forEach(pos => {
      g.fillStyle(0x444455, 1);
      g.fillRoundedRect(pos.x - 8, pos.y, 16, 30, 5);
      g.fillStyle(0x555566, 1);
      g.fillRoundedRect(pos.x - 6, pos.y + 2, 12, 8, 3);
    });

    // Thumb
    g.fillStyle(0x444455, 1);
    g.fillRoundedRect(centerX - 55, centerY + 40, 20, 35, 6);

    // Tech details on gauntlet
    g.fillStyle(0x00ff88, 0.3);
    g.fillRect(centerX - 40, centerY - 70, 8, 40);
    g.fillRect(centerX + 32, centerY - 70, 8, 40);

    // "GAUNTLET" label
    const label = this.add.text(centerX, centerY + 145, 'THE GAUNTLET', {
      font: 'bold 14px monospace',
      fill: '#ffaa00'
    }).setOrigin(0.5);
    this.pauseContainer.add(label);

    // Subtitle
    const subtitle = this.add.text(centerX, centerY + 165, 'PROTOTYPE MK-I', {
      font: '10px monospace',
      fill: '#666677'
    }).setOrigin(0.5);
    this.pauseContainer.add(subtitle);

    // Animate the power core
    const coreGlow = this.add.circle(centerX, centerY, 25, 0xffaa00, 0.4);
    this.pauseContainer.add(coreGlow);
    this.tweens.add({
      targets: coreGlow,
      scale: 1.3,
      alpha: 0.1,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  drawGemSlots() {
    const centerX = 400;
    const centerY = 280;

    // Gem data with positions around the gauntlet
    const gemData = [
      { id: 'inference', name: 'INFERENCE', color: 0x00ffff, key: 'L', desc: 'See through deception', angle: -90, dist: 170 },
      { id: 'training', name: 'TRAINING', color: 0xff00ff, key: 'K', desc: '3x DMG + Freeze nearby', angle: -30, dist: 180 },
      { id: 'optimization', name: 'OPTIMIZATION', color: 0xffff00, key: 'SHIFT', desc: 'Dash through enemies', angle: 30, dist: 180 },
      { id: 'generalization', name: 'GENERALIZATION', color: 0x00ff00, key: 'K', desc: 'Reflect projectiles', angle: 90, dist: 170 },
      { id: 'alignment', name: 'ALIGNMENT', color: 0xff8800, key: 'K', desc: 'SUPER MODE', angle: 150, dist: 160 }
    ];

    const collectedGems = this.gemSystem ? this.gemSystem.getCollectedGems() : [];
    const collectedIds = collectedGems.map(g => g.id);

    gemData.forEach((gem, index) => {
      const hasGem = collectedIds.includes(gem.id);
      const angleRad = (gem.angle * Math.PI) / 180;
      const x = centerX + Math.cos(angleRad) * gem.dist;
      const y = centerY + Math.sin(angleRad) * gem.dist;

      // Connection line to gauntlet
      const lineG = this.add.graphics();
      this.pauseContainer.add(lineG);
      lineG.lineStyle(2, hasGem ? gem.color : 0x333344, hasGem ? 0.6 : 0.3);
      lineG.lineBetween(centerX, centerY, x, y);

      // Gem slot background
      const slotBg = this.add.circle(x, y, 28, 0x111122, 1);
      this.pauseContainer.add(slotBg);

      if (hasGem) {
        // Collected gem - glowing
        const glow = this.add.circle(x, y, 35, gem.color, 0.3);
        this.pauseContainer.add(glow);
        this.tweens.add({
          targets: glow,
          scale: 1.2,
          alpha: 0.1,
          duration: 800,
          yoyo: true,
          repeat: -1,
          delay: index * 100
        });

        // Gem core
        const gemCore = this.add.circle(x, y, 20, gem.color, 1);
        this.pauseContainer.add(gemCore);

        // Gem shine
        const shine = this.add.circle(x - 6, y - 6, 6, 0xffffff, 0.6);
        this.pauseContainer.add(shine);

        // Gem border
        const border = this.add.circle(x, y, 22, gem.color, 0);
        border.setStrokeStyle(3, gem.color, 1);
        this.pauseContainer.add(border);

        // Gem name
        const nameText = this.add.text(x, y + 40, gem.name, {
          font: 'bold 10px monospace',
          fill: '#' + gem.color.toString(16).padStart(6, '0')
        }).setOrigin(0.5);
        this.pauseContainer.add(nameText);

        // Key binding
        const keyText = this.add.text(x, y + 55, `[ ${gem.key} ]`, {
          font: '9px monospace',
          fill: '#ffffff'
        }).setOrigin(0.5);
        this.pauseContainer.add(keyText);

        // Description
        const descText = this.add.text(x, y + 70, gem.desc, {
          font: '8px monospace',
          fill: '#888899'
        }).setOrigin(0.5);
        this.pauseContainer.add(descText);

      } else {
        // Locked gem slot
        const lockIcon = this.add.text(x, y, '?', {
          font: 'bold 24px monospace',
          fill: '#333344'
        }).setOrigin(0.5);
        this.pauseContainer.add(lockIcon);

        // Locked border
        const border = this.add.circle(x, y, 22, 0x333344, 0);
        border.setStrokeStyle(2, 0x333344, 0.5);
        this.pauseContainer.add(border);

        // Locked label
        const lockedText = this.add.text(x, y + 40, 'LOCKED', {
          font: '9px monospace',
          fill: '#333344'
        }).setOrigin(0.5);
        this.pauseContainer.add(lockedText);
      }
    });

    // Gem count display
    const gemCount = this.add.text(400, 85, `GEMS: ${collectedIds.length} / 5`, {
      font: 'bold 16px monospace',
      fill: '#ffaa00'
    }).setOrigin(0.5);
    this.pauseContainer.add(gemCount);
  }

  drawControlsSection() {
    const y = 480;

    // Controls background
    const controlsBg = this.add.rectangle(400, y, 700, 50, 0x111122, 0.8);
    this.pauseContainer.add(controlsBg);

    // Controls title
    const title = this.add.text(400, y - 35, '─── CONTROLS ───', {
      font: 'bold 11px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5);
    this.pauseContainer.add(title);

    // Control mappings
    const controls = this.add.text(400, y,
      'A/D: Move    SPACE: Jump    J: Attack    K: Power    L: Vision    SHIFT: Dash    R: Respawn', {
      font: '11px monospace',
      fill: '#88aacc'
    }).setOrigin(0.5);
    this.pauseContainer.add(controls);
  }

  handleAbilityUsed(gemId, gem) {
    switch (gemId) {
      case 'inference':
        this.activateInferenceVision();
        break;
      case 'training':
        this.player.activatePowerStrike();
        this.freezeNearbyEnemies(150, 3000); // 150px range, 3 second freeze
        this.showAbilityMessage('POWER STRIKE!', 0xff00ff);
        break;
      case 'optimization':
        this.player.activateDash();
        this.showAbilityMessage('DASH!', 0xffff00);
        break;
      case 'generalization':
        this.player.activateShield();
        this.showAbilityMessage('REFLECT SHIELD!', 0x00ff00);
        this.setupShieldCollision();
        break;
      case 'alignment':
        this.player.activateSuperMode();
        this.showAbilityMessage('SUPER MODE!', 0xff8800);
        break;
    }
  }

  handleAbilityEnded(gemId) {
    switch (gemId) {
      case 'inference':
        this.deactivateInferenceVision();
        break;
    }
  }

  freezeNearbyEnemies(range, duration) {
    const playerX = this.player.x;
    const playerY = this.player.y;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.isAlive || enemy.isFrozen) return;

      const distance = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);

      if (distance <= range) {
        // Freeze this enemy
        enemy.isFrozen = true;
        enemy.frozenVelocityX = enemy.body.velocity.x;
        enemy.frozenVelocityY = enemy.body.velocity.y;
        enemy.setVelocity(0, 0);
        if (enemy.body) enemy.body.moves = false;

        // Visual freeze effect - cyan tint and ice particles
        enemy.setTint(0x88ffff);

        // Create ice crystal effect around enemy
        this.createFreezeEffect(enemy);

        // "FROZEN" text
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

        // Unfreeze after duration
        this.time.delayedCall(duration, () => {
          if (enemy && enemy.active && enemy.isFrozen) {
            enemy.isFrozen = false;
            if (enemy.body) enemy.body.moves = true;
            enemy.clearTint();

            // Shatter effect when unfreezing
            this.createUnfreezeEffect(enemy);
          }
        });
      }
    });

    // Freeze shockwave visual from player
    this.createFreezeShockwave(playerX, playerY, range);
  }

  createFreezeEffect(enemy) {
    // Ice crystals forming around enemy
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 20 + Math.random() * 15;
      const crystal = this.add.rectangle(
        enemy.x + Math.cos(angle) * dist,
        enemy.y + Math.sin(angle) * dist,
        4 + Math.random() * 4,
        8 + Math.random() * 8,
        0x88ffff,
        0.8
      );
      crystal.rotation = angle + Math.PI / 2;

      this.tweens.add({
        targets: crystal,
        alpha: { from: 0, to: 0.8 },
        scale: { from: 0, to: 1 },
        duration: 200,
        onComplete: () => {
          // Sparkle effect
          this.tweens.add({
            targets: crystal,
            alpha: { from: 0.8, to: 0.4 },
            duration: 500,
            yoyo: true,
            repeat: -1
          });
        }
      });

      // Destroy crystals when enemy unfreezes
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

    // Frost breath particles
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(
        enemy.x + Phaser.Math.Between(-20, 20),
        enemy.y + Phaser.Math.Between(-30, 10),
        Phaser.Math.Between(2, 5),
        0xaaffff,
        0.7
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
    // Ice shattering effect
    for (let i = 0; i < 10; i++) {
      const shard = this.add.rectangle(
        enemy.x + Phaser.Math.Between(-15, 15),
        enemy.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(3, 8),
        Phaser.Math.Between(3, 8),
        0x88ffff,
        0.9
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
    // Expanding freeze ring
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

    // Ice particles expanding outward
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const particle = this.add.rectangle(
        x, y, 6, 3, 0xaaffff, 0.8
      );
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

    // Screen flash
    this.cameras.main.flash(100, 136, 255, 255);
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

  setupShieldCollision() {
    // Make shield reflect projectiles (only if not already set up)
    if (this.player.shield && this.projectiles && !this.shieldCollider) {
      this.shieldCollider = this.physics.add.overlap(
        this.player.shield,
        this.projectiles,
        this.handleShieldReflect,
        null,
        this
      );
    }
  }

  handleShieldReflect(shield, projectile) {
    if (!this.player.shieldActive) return;

    // Reverse projectile direction
    if (projectile.body) {
      projectile.body.velocity.x *= -1.5;
      projectile.body.velocity.y *= -1.5;
      projectile.setFillStyle(0x00ff00, 1);
      projectile.reflected = true;

      // Make reflected projectiles damage enemies
      this.physics.add.overlap(
        projectile,
        this.enemies,
        (proj, enemy) => {
          if (proj.reflected && enemy.isAlive) {
            enemy.takeDamage(2, proj.body.velocity.x > 0 ? 1 : -1);
            proj.destroy();
          }
        },
        null,
        this
      );
    }
  }

  activateInferenceVision() {
    // Create a cyan overlay effect instead of camera tint (which doesn't exist in Phaser 3)
    this.inferenceOverlay = this.add.rectangle(400, 300, 800, 600, 0x00ffff, 0.15)
      .setScrollFactor(0)
      .setDepth(998);

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.isAlive) return;

      const indicator = this.add.container(enemy.x, enemy.y - 50);
      const direction = this.player.x > enemy.x ? 1 : -1;

      const arrow = this.add.text(0, 0, direction > 0 ? '→ ATK' : 'ATK ←', {
        font: 'bold 14px monospace',
        fill: '#ff0000',
        backgroundColor: '#000000aa',
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5);

      const range = this.add.circle(0, 50, enemy.attackRange || 40, 0xff0000, 0.2);

      indicator.add([arrow, range]);
      enemy.predictionIndicator = indicator;
      enemy.setTint(0xff8888);
    });

    if (this.abilityText) {
      this.abilityText.setText('INFERENCE ACTIVE');
      this.abilityText.setColor('#00ffff');
    }
  }

  deactivateInferenceVision() {
    // Remove the cyan overlay
    if (this.inferenceOverlay) {
      this.inferenceOverlay.destroy();
      this.inferenceOverlay = null;
    }

    this.enemies.getChildren().forEach(enemy => {
      if (enemy.predictionIndicator) {
        enemy.predictionIndicator.destroy();
        enemy.predictionIndicator = null;
      }
      if (enemy.isAlive) enemy.clearTint();
    });

    if (this.abilityText) {
      this.abilityText.setText('L: Inference');
      this.abilityText.setColor('#888888');
    }
  }

  updateTrainingDisplay() {
    if (this.trainingText && this.gemSystem.hasGem('training')) {
      const streak = this.player.hitStreak || 0;
      const bonus = Math.min(streak * 10, 50);
      this.trainingText.setText(`Streak: ${streak} (+${bonus}%)`);
      this.trainingText.setColor(streak > 0 ? '#ff00ff' : '#888888');
    }
  }

  createHUD() {
    // Employee badge background
    const badgeBg = this.add.graphics().setScrollFactor(0).setDepth(999);
    badgeBg.fillStyle(0x1a1a2e, 0.9);
    badgeBg.fillRoundedRect(5, 5, 180, 110, 8);
    badgeBg.lineStyle(2, 0x3a4a5a, 1);
    badgeBg.strokeRoundedRect(5, 5, 180, 110, 8);

    // Badge header
    this.add.text(95, 14, 'EMPLOYEE STATUS', {
      font: 'bold 10px monospace',
      fill: '#556677'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Health label
    this.add.text(15, 30, 'VITALITY:', {
      font: '9px monospace',
      fill: '#668888'
    }).setScrollFactor(0).setDepth(1000);

    // Heart images for health
    this.hearts = [];
    for (let i = 0; i < this.player.maxHealth; i++) {
      const heart = this.add.image(20 + i * 20, 50, 'heart')
        .setScrollFactor(0)
        .setDepth(1000)
        .setScale(0.9);
      this.hearts.push(heart);
    }

    // Performance Metrics (gems)
    this.add.text(15, 68, 'METRICS:', {
      font: '9px monospace',
      fill: '#668888'
    }).setScrollFactor(0).setDepth(1000);

    this.gemSlots = [];
    const gemOrder = ['inference', 'training', 'optimization', 'generalization', 'alignment'];
    gemOrder.forEach((gemId, i) => {
      const gem = Object.values(GEM_TYPES).find(g => g.id === gemId);
      const hasGem = this.gemSystem.hasGem(gemId);

      // Gem slot background
      const slotBg = this.add.rectangle(25 + i * 28, 88, 22, 22, 0x222233)
        .setScrollFactor(0).setDepth(1000);

      // Gem indicator
      const slot = this.add.rectangle(25 + i * 28, 88, 16, 16, hasGem ? gem.color : 0x333344)
        .setScrollFactor(0).setDepth(1001);

      // Glow effect for collected gems
      if (hasGem) {
        this.tweens.add({
          targets: slot,
          alpha: { from: 0.7, to: 1 },
          duration: 1000,
          yoyo: true,
          repeat: -1
        });
      }

      this.gemSlots.push({ slot, gemId });
    });

    // Ability indicator (right side)
    const abilityBg = this.add.graphics().setScrollFactor(0).setDepth(999);
    abilityBg.fillStyle(0x1a1a2e, 0.9);
    abilityBg.fillRoundedRect(620, 5, 175, 50, 8);
    abilityBg.lineStyle(2, 0x3a4a5a, 1);
    abilityBg.strokeRoundedRect(620, 5, 175, 50, 8);

    this.add.text(707, 14, 'GAUNTLET POWER', {
      font: 'bold 10px monospace',
      fill: '#ffaa00'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.abilityText = this.add.text(707, 35, '[No Gem]', {
      font: '11px monospace',
      fill: '#666666'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Training streak display (appears when gem collected)
    this.trainingText = this.add.text(707, 48, '', {
      font: '9px monospace',
      fill: '#ff00ff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(false);

    // Controls hint (bottom)
    const controlsBg = this.add.graphics().setScrollFactor(0).setDepth(999);
    controlsBg.fillStyle(0x000000, 0.6);
    controlsBg.fillRect(0, 575, 800, 25);

    this.add.text(400, 587, 'A/D: Move | SPACE: Jump | J: Attack | L/K/SHIFT: Powers | R: Respawn', {
      font: '10px monospace',
      fill: '#445566'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.updateHUD();
    this.updateGemUI();
  }

  updateHUD() {
    // Update heart images
    this.hearts.forEach((heart, i) => {
      if (i < this.player.health) {
        heart.setTexture('heart');
        heart.setAlpha(1);
      } else {
        heart.setTexture('heart_empty');
        heart.setAlpha(0.5);
      }
    });

    // Update training display if gem collected
    if (this.gemSystem.hasGem('training') && this.trainingText) {
      const streak = this.player.hitStreak || 0;
      if (streak > 0) {
        this.trainingText.setVisible(true);
        this.trainingText.setText(`STREAK: ${streak}`);
      } else {
        this.trainingText.setVisible(false);
      }
    }
  }

  updateGemUI() {
    this.gemSlots.forEach(({ slot, gemId }) => {
      const gem = Object.values(GEM_TYPES).find(g => g.id === gemId);
      if (this.gemSystem.hasGem(gemId)) {
        slot.setFillStyle(gem.color, 1);
      }
    });

    // Update ability text based on collected gems
    if (this.gemSystem.hasGem('inference')) {
      this.abilityText.setText('L: Inference');
      this.abilityText.setColor('#888888');
    } else {
      this.abilityText.setText('');
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

    // Reset hit streak
    this.player.hitStreak = 0;
    this.updateTrainingDisplay();

    // Show respawn message
    this.showRespawnMessage();

    // Respawn enemies
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.spawnEnemies();

    // Re-setup collision for new enemies
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.enemies,
      this.handleAttackHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handleEnemyContact,
      null,
      this
    );

    this.updateHUD();
  }

  showLevelTitle() {
    const title = this.add.text(400, 200, `${this.configKey.toUpperCase()}\n\n${this.config.name}`, {
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

  showRespawnMessage() {
    const messages = [
      'NOT GIVING UP',
      'FOUNDERS PERSIST',
      'FAILURE IS LEARNING',
      'ITERATE AND IMPROVE',
      'BACK IN THE GAME',
      'STARTUPS NEVER DIE'
    ];

    const msg = Phaser.Utils.Array.GetRandom(messages);
    const respawnText = this.add.text(400, 200, msg, {
      font: 'bold 24px monospace',
      fill: '#00ff88',
      align: 'center',
      stroke: '#003322',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

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

    // Screen flash effect
    this.cameras.main.flash(200, 0, 255, 136, true);
  }

  update(time, delta) {
    // Skip all updates if level is complete or transitioning
    if (this.levelComplete || this.levelTransitioning) return;

    // Fall death
    if (this.player.y > this.config.height + 50 && this.player.isAlive) {
      this.player.die();
    }

    if (this.player && this.player.isAlive) {
      // Track player actions for AI
      if (this.player.isAttacking && !this.lastPlayerAttacking) {
        this.aiController.recordPlayerAction('attack');
      }
      if (this.player.body.velocity.y < -100 && this.player.body.blocked.down === false && !this.lastPlayerJumping) {
        this.aiController.recordPlayerAction('jump');
        this.lastPlayerJumping = true;
      }
      if (this.player.body.blocked.down) {
        this.lastPlayerJumping = false;
      }
      this.lastPlayerAttacking = this.player.isAttacking;

      this.player.update();
      this.updateHUD();
    }

    // Update AI controller
    this.aiController.update(this.player, delta);

    // Enemies with AI-driven behavior
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.isAlive) {
        // Get AI-recommended action scores
        const scores = this.aiController.getActionScores(enemy, this.player);
        const adaptiveParams = this.aiController.getAdaptiveParams(enemy);

        // Apply adaptive parameters to enemy
        if (enemy.setAdaptiveParams) {
          enemy.setAdaptiveParams(adaptiveParams);
        }

        enemy.update();

        if (enemy.predictionIndicator) {
          enemy.predictionIndicator.setPosition(enemy.x, enemy.y - 50);
        }

        // Tank shockwave collision
        if (enemy.getShockwave) {
          const shockwave = enemy.getShockwave();
          if (shockwave && !this.player.isInvulnerable && this.player.isAlive) {
            const dist = Phaser.Math.Distance.Between(
              this.player.x, this.player.y,
              shockwave.x, shockwave.y
            );
            if (dist < 20 * shockwave.scale + 20) {
              const knockbackDir = this.player.x > shockwave.x ? 1 : -1;
              this.player.takeDamage(shockwave.damage || 2, knockbackDir);
            }
          }
        }
      }
    });

    // Gem system
    this.gemSystem.update(delta);

    // Cooldown display
    if (this.abilityText) {
      const texts = [];
      const gems = this.gemSystem.getCollectedGems();

      if (gems.length === 0) {
        this.abilityText.setText('[No Gem]');
        this.abilityText.setColor('#666666');
      } else {
        // Sort gems by ability key for consistent display
        gems.forEach(gem => {
          const cooldown = this.gemSystem.getCooldownPercent(gem.id);
          const key = gem.abilityKey;
          let status = '[Ready]';
          let color = '#ffffff';

          if (cooldown > 0) {
            status = `(${Math.ceil(cooldown * (gem.cooldown / 1000))}s)`;
            color = '#666666';
          } else if (this.gemSystem.isAbilityActive(gem.id)) {
            status = 'ACTIVE';
            color = '#00ffff';
          } else {
            color = '#' + gem.color.toString(16).padStart(6, '0');
          }

          texts.push(`${key}: ${gem.name} ${status}`);
        });

        this.abilityText.setText(texts.join('\n'));
        this.abilityText.setColor('#ffffff'); // Individual line colors not supported in simple Text, but that's fine.
      }
    }

    // Random screen glitches
    if (Math.random() < 0.001) {
      this.triggerScreenGlitch();
    }
  }

  // ========== VISUAL EFFECTS ==========

  createParallaxBackground() {
    const { width, height } = this.config;

    // Layer 1: Deep background grid (slowest)
    const gridGraphics = this.add.graphics();
    gridGraphics.setScrollFactor(0.1);
    gridGraphics.setDepth(-100);
    gridGraphics.lineStyle(1, 0x222244, 0.3);

    for (let x = 0; x < width + 200; x += 50) {
      gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 50) {
      gridGraphics.lineBetween(0, y, width + 200, y);
    }

    // Layer 2: Floating data streams
    for (let i = 0; i < 8; i++) {
      const streamX = Phaser.Math.Between(0, width);
      const stream = this.add.graphics();
      stream.setScrollFactor(0.2);
      stream.setDepth(-90);
      stream.lineStyle(2, 0x00ff88, 0.15);
      stream.lineBetween(streamX, 0, streamX, height);

      // Animated data bits traveling down the stream
      for (let j = 0; j < 5; j++) {
        const bit = this.add.rectangle(
          streamX,
          Phaser.Math.Between(0, height),
          4, 8,
          0x00ff88, 0.4
        ).setScrollFactor(0.2).setDepth(-89);

        this.tweens.add({
          targets: bit,
          y: height + 50,
          duration: 3000 + Math.random() * 2000,
          repeat: -1,
          onRepeat: () => {
            bit.y = -50;
            bit.x = streamX + Phaser.Math.Between(-5, 5);
          }
        });
      }
    }

    // Layer 3: Distant city silhouette
    const cityGraphics = this.add.graphics();
    cityGraphics.setScrollFactor(0.15);
    cityGraphics.setDepth(-80);

    let cityX = 0;
    while (cityX < width + 200) {
      const buildingWidth = Phaser.Math.Between(30, 80);
      const buildingHeight = Phaser.Math.Between(60, 180);
      cityGraphics.fillStyle(0x111122, 0.6);
      cityGraphics.fillRect(cityX, height - buildingHeight - 40, buildingWidth, buildingHeight);

      // Building windows (blinking)
      for (let wy = height - buildingHeight - 30; wy < height - 50; wy += 15) {
        for (let wx = cityX + 5; wx < cityX + buildingWidth - 5; wx += 12) {
          if (Math.random() > 0.3) {
            const windowLight = this.add.rectangle(
              wx, wy, 6, 8,
              Math.random() > 0.7 ? 0xffffaa : 0x88aaff,
              Math.random() * 0.3 + 0.1
            ).setScrollFactor(0.15).setDepth(-79);

            // Random window flickering
            if (Math.random() < 0.1) {
              this.tweens.add({
                targets: windowLight,
                alpha: { from: 0.1, to: 0.4 },
                duration: 100 + Math.random() * 200,
                yoyo: true,
                repeat: -1,
                repeatDelay: Phaser.Math.Between(3000, 8000)
              });
            }
          }
        }
      }
      cityX += buildingWidth + Phaser.Math.Between(5, 20);
    }

    // Layer 4: Mid-ground pipes and cables
    const pipesGraphics = this.add.graphics();
    pipesGraphics.setScrollFactor(0.4);
    pipesGraphics.setDepth(-50);

    for (let i = 0; i < 6; i++) {
      const pipeY = Phaser.Math.Between(50, height - 100);
      const pipeColor = Math.random() > 0.5 ? 0x445566 : 0x334455;
      pipesGraphics.fillStyle(pipeColor, 0.5);
      pipesGraphics.fillRect(0, pipeY, width + 200, 4 + Math.random() * 4);
    }

    // Hanging cables with sway
    for (let x = 100; x < width; x += Phaser.Math.Between(150, 300)) {
      const cableStart = { x: x, y: 20 };
      const cableEnd = { x: x + Phaser.Math.Between(-50, 50), y: Phaser.Math.Between(80, 150) };
      const cableMid = { x: (cableStart.x + cableEnd.x) / 2, y: cableEnd.y + 30 };

      const cable = this.add.graphics();
      cable.setScrollFactor(0.3);
      cable.setDepth(-45);
      cable.lineStyle(2, 0x333344, 0.6);

      // Draw cable as two line segments (simulating a curve)
      cable.beginPath();
      cable.moveTo(cableStart.x, cableStart.y);
      cable.lineTo(cableMid.x, cableMid.y);
      cable.lineTo(cableEnd.x, cableEnd.y);
      cable.strokePath();
    }
  }

  createCRTEffect() {
    // Store CRT elements for cleanup
    this.crtElements = [];
    this.crtTimers = [];

    // Scanlines overlay
    const scanlines = this.add.graphics();
    scanlines.setScrollFactor(0);
    scanlines.setDepth(9999);
    scanlines.setAlpha(0.03);
    this.crtElements.push(scanlines);

    for (let y = 0; y < 600; y += 2) {
      scanlines.fillStyle(0x000000, 1);
      scanlines.fillRect(0, y, 800, 1);
    }

    // Subtle vignette
    const vignette = this.add.graphics();
    vignette.setScrollFactor(0);
    vignette.setDepth(9998);
    this.crtElements.push(vignette);

    // Manual vignette with rectangles (edge shadows)
    for (let i = 0; i < 30; i++) {
      const alpha = i * 0.015;
      vignette.fillStyle(0x000000, alpha);
      vignette.fillRect(0, 0, i * 3, 600);
      vignette.fillRect(800 - i * 3, 0, i * 3, 600);
      vignette.fillRect(0, 0, 800, i * 2);
      vignette.fillRect(0, 600 - i * 2, 800, i * 2);
    }

    // Security camera timestamp
    this.cameraTimestamp = this.add.text(650, 560, '', {
      font: '10px monospace',
      fill: '#334444'
    }).setScrollFactor(0).setDepth(10000);
    this.crtElements.push(this.cameraTimestamp);

    this.updateTimestamp();
    const timestampTimer = this.time.addEvent({
      delay: 1000,
      callback: () => this.updateTimestamp(),
      loop: true
    });
    this.crtTimers.push(timestampTimer);

    // REC indicator with blinking dot
    const recText = this.add.text(720, 15, 'REC', {
      font: 'bold 12px monospace',
      fill: '#ff0000'
    }).setScrollFactor(0).setDepth(10000);
    this.crtElements.push(recText);

    const recDot = this.add.circle(710, 20, 4, 0xff0000);
    recDot.setScrollFactor(0).setDepth(10000);
    this.crtElements.push(recDot);

    this.tweens.add({
      targets: recDot,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Occasional screen flicker
    const glitchTimer = this.time.addEvent({
      delay: Phaser.Math.Between(8000, 15000),
      callback: () => this.triggerScreenGlitch(),
      loop: true
    });
    this.crtTimers.push(glitchTimer);
  }

  // Clean up CRT effects when scene shuts down
  shutdown() {
    // Destroy CRT elements
    if (this.crtElements) {
      this.crtElements.forEach(el => {
        if (el && el.destroy) el.destroy();
      });
      this.crtElements = [];
    }

    // Remove CRT timers
    if (this.crtTimers) {
      this.crtTimers.forEach(timer => {
        if (timer) timer.remove();
      });
      this.crtTimers = [];
    }

    // Clean up event listeners
    this.events.off('playerDied', this.handlePlayerDeath, this);
    this.events.off('gemCollected', this.handleGemCollected, this);
    this.events.off('abilityUsed', this.handleAbilityUsed, this);
    this.events.off('abilityEnded', this.handleAbilityEnded, this);
  }

  updateTimestamp() {
    const now = new Date();
    const timestamp = `CAM-${this.configKey.replace('level', '')}-A ${now.toLocaleTimeString()}`;
    if (this.cameraTimestamp) {
      this.cameraTimestamp.setText(timestamp);
    }
  }

  triggerScreenGlitch() {
    // Brief screen shake
    this.cameras.main.shake(50, 0.005);

    // Horizontal glitch bars
    for (let i = 0; i < 3; i++) {
      const bar = this.add.rectangle(
        400, Phaser.Math.Between(0, 600),
        800, Phaser.Math.Between(2, 8),
        0xffffff, 0.3
      ).setScrollFactor(0).setDepth(9997);

      this.tweens.add({
        targets: bar,
        x: bar.x + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 100,
        onComplete: () => bar.destroy()
      });
    }
  }

  createFloatingPapers() {
    const { width, height } = this.config;

    // Floating paper/document particles
    for (let i = 0; i < 15; i++) {
      const paper = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(5, 10),
        0xeeeeee,
        0.4
      );

      paper.setScrollFactor(0.3);
      paper.rotation = Math.random() * Math.PI;

      this.tweens.add({
        targets: paper,
        y: paper.y + Phaser.Math.Between(50, 100),
        x: paper.x + Phaser.Math.Between(-30, 30),
        rotation: paper.rotation + Math.PI * 2,
        alpha: 0,
        duration: 8000 + Math.random() * 4000,
        repeat: -1,
        onRepeat: () => {
          paper.y = -20;
          paper.x = Phaser.Math.Between(0, width);
          paper.alpha = 0.4;
        }
      });
    }
  }

  createFluorescentLights() {
    const { width, height } = this.config;

    // Ceiling light fixtures
    for (let x = 100; x < width; x += 200) {
      // Light fixture
      const fixture = this.add.rectangle(x, 20, 80, 8, 0x888899);
      fixture.setScrollFactor(0.1);

      // Light glow
      const glow = this.add.rectangle(x, 30, 100, 200, 0xffffee, 0.05);
      glow.setScrollFactor(0.1);

      // Random flickering
      if (Math.random() < 0.3) {
        this.tweens.add({
          targets: [fixture, glow],
          alpha: { from: 0.3, to: 1 },
          duration: 50 + Math.random() * 100,
          yoyo: true,
          repeat: -1,
          repeatDelay: Phaser.Math.Between(2000, 8000),
          hold: 50
        });
      }
    }
  }

  createLevelTransition(callback) {
    this.input.enabled = false;
    this.cameras.main.flash(200, 0, 255, 136);

    const centerX = this.cameras.main.scrollX + 400;
    const centerY = 300;

    // Particle burst from center
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const distance = Phaser.Math.Between(50, 150);
      const particle = this.add.circle(
        centerX + Math.cos(angle) * 20,
        centerY + Math.sin(angle) * 20,
        Phaser.Math.Between(2, 5),
        0x00ff88
      ).setScrollFactor(0).setDepth(10001);

      this.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * distance * 3,
        y: centerY + Math.sin(angle) * distance * 3,
        alpha: 0,
        scale: 0.1,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Glitch bars
    for (let i = 0; i < 12; i++) {
      const bar = this.add.rectangle(
        centerX + Phaser.Math.Between(-100, 100),
        Phaser.Math.Between(0, 600),
        Phaser.Math.Between(50, 400),
        Phaser.Math.Between(2, 8),
        i % 2 === 0 ? 0x00ff88 : 0xffaa00,
        0.6
      ).setScrollFactor(0).setDepth(10000);

      this.tweens.add({
        targets: bar,
        x: bar.x + Phaser.Math.Between(-150, 150),
        alpha: 0,
        duration: 400,
        delay: i * 30,
        onComplete: () => bar.destroy()
      });
    }

    this.cameras.main.shake(300, 0.015);

    // Scanline sweep
    const scanline = this.add.rectangle(centerX, 0, 800, 6, 0xffffff, 0.5)
      .setScrollFactor(0).setDepth(10002);

    this.tweens.add({
      targets: scanline,
      y: 600,
      duration: 300,
      onComplete: () => scanline.destroy()
    });

    // Final fade to black
    this.time.delayedCall(400, () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (camera, progress) => {
        if (progress === 1) {
          callback();
        }
      });
    });
  }

  createHitParticles(x, y, color = 0xffff00) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      const speed = Phaser.Math.Between(50, 120);

      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 1);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Add spark effect
    for (let i = 0; i < 4; i++) {
      const spark = this.add.rectangle(
        x, y,
        Phaser.Math.Between(8, 16), 2,
        0xffffff, 0.8
      );
      spark.rotation = Math.random() * Math.PI;

      this.tweens.add({
        targets: spark,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        rotation: spark.rotation + Math.PI,
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }
  }

  createDamageParticles(x, y) {
    // Red damage particles
    this.createHitParticles(x, y, 0xff0000);

    // Screen flash
    this.cameras.main.flash(80, 255, 50, 50, false);

    // Add blood/damage splatter
    for (let i = 0; i < 5; i++) {
      const splat = this.add.circle(
        x + Phaser.Math.Between(-20, 20),
        y + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(3, 8),
        0xff0000,
        0.6
      );

      this.tweens.add({
        targets: splat,
        alpha: 0,
        scale: 1.5,
        duration: 500,
        onComplete: () => splat.destroy()
      });
    }
  }

  createDeathParticles(x, y) {
    // Large explosion of particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const distance = Phaser.Math.Between(30, 100);

      const particle = this.add.circle(
        x, y,
        Phaser.Math.Between(3, 8),
        Math.random() > 0.5 ? 0xff4400 : 0xffaa00,
        1
      );

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 20,
        alpha: 0,
        scale: 0.1,
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Shockwave ring
    const ring = this.add.circle(x, y, 10, 0xffffff, 0);
    ring.setStrokeStyle(3, 0xffaa00, 1);

    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });

    // Screen shake
    this.cameras.main.shake(200, 0.01);
  }
}
