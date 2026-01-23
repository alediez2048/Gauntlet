import Phaser from 'phaser';
import CRTPipeline from '../pipelines/CRTPipeline';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load dialogue data
    this.load.json('dialogue', 'assets/dialogue.json');

    // Load background music
    this.load.audio('bgm', 'audio/bgm.m4a');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark corporate loading screen
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a12);

    // Background grid effect
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1a1a2e, 0.5);
    for (let x = 0; x < width; x += 40) {
      gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridGraphics.lineBetween(0, y, width, y);
    }

    // Animated background data streams
    for (let i = 0; i < 10; i++) {
      const streamX = Phaser.Math.Between(0, width);
      for (let j = 0; j < 4; j++) {
        const bit = this.add.rectangle(
          streamX,
          Phaser.Math.Between(-100, 0) - j * 30,
          3, 12,
          0x00ff88, 0.15
        );

        this.tweens.add({
          targets: bit,
          y: height + 50,
          duration: 4000 + Math.random() * 3000,
          repeat: -1,
          delay: j * 150,
          onRepeat: () => {
            bit.y = -50;
            bit.x = Phaser.Math.Between(0, width);
          }
        });
      }
    }

    // Floating particles
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3),
        0x334455,
        0.4
      );

      this.tweens.add({
        targets: particle,
        y: particle.y - 100,
        alpha: 0,
        duration: 3000 + Math.random() * 2000,
        repeat: -1,
        onRepeat: () => {
          particle.y = height + 20;
          particle.x = Phaser.Math.Between(0, width);
          particle.alpha = 0.4;
        }
      });
    }

    // Corporate logo with glow effect
    const logoGlow = this.add.text(width / 2, height / 2 - 100, 'MEGACORP', {
      font: 'bold 34px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5).setAlpha(0.2);

    const logo = this.add.text(width / 2, height / 2 - 100, 'MEGACORP', {
      font: 'bold 32px monospace',
      fill: '#445566'
    }).setOrigin(0.5);

    // Logo pulse animation
    this.tweens.add({
      targets: logoGlow,
      alpha: { from: 0.1, to: 0.3 },
      scale: { from: 1, to: 1.02 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    const statusText = this.add.text(width / 2, height / 2 - 60, 'SYSTEMS INITIALIZING...', {
      font: '14px monospace',
      fill: '#445566'
    }).setOrigin(0.5);

    // Blinking cursor effect
    const cursor = this.add.text(width / 2 + 110, height / 2 - 60, '_', {
      font: '14px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Progress bar with corporate styling
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a1a2e, 1);
    progressBox.fillRect(width / 2 - 160, height / 2, 320, 30);
    progressBox.lineStyle(2, 0x334455, 1);
    progressBox.strokeRect(width / 2 - 160, height / 2, 320, 30);

    const progressBar = this.add.graphics();

    // Corner brackets for progress bar
    const bracketGraphics = this.add.graphics();
    bracketGraphics.lineStyle(2, 0x00ff88, 0.5);
    // Top-left
    bracketGraphics.lineBetween(width / 2 - 170, height / 2 - 5, width / 2 - 170, height / 2 + 10);
    bracketGraphics.lineBetween(width / 2 - 170, height / 2 - 5, width / 2 - 155, height / 2 - 5);
    // Top-right
    bracketGraphics.lineBetween(width / 2 + 170, height / 2 - 5, width / 2 + 170, height / 2 + 10);
    bracketGraphics.lineBetween(width / 2 + 170, height / 2 - 5, width / 2 + 155, height / 2 - 5);
    // Bottom-left
    bracketGraphics.lineBetween(width / 2 - 170, height / 2 + 35, width / 2 - 170, height / 2 + 20);
    bracketGraphics.lineBetween(width / 2 - 170, height / 2 + 35, width / 2 - 155, height / 2 + 35);
    // Bottom-right
    bracketGraphics.lineBetween(width / 2 + 170, height / 2 + 35, width / 2 + 170, height / 2 + 20);
    bracketGraphics.lineBetween(width / 2 + 170, height / 2 + 35, width / 2 + 155, height / 2 + 35);

    const loadingText = this.add.text(width / 2, height / 2 + 50, 'Loading assets...', {
      font: '12px monospace',
      fill: '#556677'
    }).setOrigin(0.5);

    // Percent text
    const percentText = this.add.text(width / 2, height / 2 + 15, '0%', {
      font: 'bold 12px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5);

    // Corporate warning at bottom
    const warningText = this.add.text(width / 2, height - 50,
      '⚠ AUTHORIZED PERSONNEL ONLY ⚠', {
      font: '10px monospace',
      fill: '#ff4444'
    }).setOrigin(0.5).setAlpha(0.6);

    this.tweens.add({
      targets: warningText,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff88, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 + 5, 310 * value, 20);

      // Add glow effect to progress bar
      progressBar.fillStyle(0x00ff88, 0.3);
      progressBar.fillRect(width / 2 - 155, height / 2 + 3, 310 * value, 24);

      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.setText('COMPLETE');
      percentText.setColor('#00ff88');
    });
  }

  create() {
    // Register CRT Pipeline
    if (this.renderer && this.renderer.pipelines) {
      this.renderer.pipelines.addPostPipeline('CRTPipeline', CRTPipeline);
    }

    this.createPlaceholderTextures();
    this.scene.start('MenuScene');
  }

  createPlaceholderTextures() {
    // Helper function to draw the base player body (shared between both versions)
    const drawPlayerBase = (g) => {
      // Shadow/outline for depth
      g.fillStyle(0x1a2a3a, 1);
      g.fillRoundedRect(9, 15, 22, 28, 3);

      // Body base (dress shirt)
      g.fillStyle(0x4a7ab0, 1);
      g.fillRoundedRect(10, 16, 20, 26, 2);

      // Shirt shading (lighter center)
      g.fillStyle(0x5a8ac0, 1);
      g.fillRect(14, 18, 12, 20);

      // Shirt highlight
      g.fillStyle(0x6a9ad0, 0.5);
      g.fillRect(16, 20, 4, 16);

      // Head shadow
      g.fillStyle(0xddaa88, 1);
      g.fillRoundedRect(11, 2, 18, 16, 4);

      // Head (skin)
      g.fillStyle(0xffddbb, 1);
      g.fillRoundedRect(12, 3, 16, 14, 3);

      // Face highlight
      g.fillStyle(0xffeedd, 0.6);
      g.fillRect(14, 5, 6, 8);

      // Hair base (messy, just woke up)
      g.fillStyle(0x2a1a0a, 1);
      g.fillRoundedRect(11, 0, 18, 7, 2);

      // Hair detail/highlights
      g.fillStyle(0x3a2a1a, 1);
      g.fillRect(13, 1, 3, 5);
      g.fillRect(20, 2, 4, 4);
      g.fillStyle(0x4a3a2a, 0.5);
      g.fillRect(16, 1, 2, 3);

      // Messy hair strands
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(10, 3, 3, 4);
      g.fillRect(27, 4, 3, 3);
      g.fillRect(14, -1, 2, 3);
      g.fillRect(22, -1, 2, 2);

      // Eyes (tired but determined)
      g.fillStyle(0xffffff, 1);
      g.fillRect(14, 8, 5, 4);
      g.fillRect(21, 8, 5, 4);
      g.fillStyle(0x3366aa, 1);
      g.fillRect(16, 9, 3, 3);
      g.fillRect(22, 9, 3, 3);
      g.fillStyle(0x111122, 1);
      g.fillRect(17, 9, 2, 2);
      g.fillRect(23, 9, 2, 2);
      // Eye shine
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(16, 9, 1, 1);
      g.fillRect(22, 9, 1, 1);

      // Eyebrows (tired)
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(14, 7, 5, 1);
      g.fillRect(21, 7, 5, 1);

      // Nose
      g.fillStyle(0xeeccaa, 1);
      g.fillRect(19, 11, 2, 3);

      // Mouth (slight smirk)
      g.fillStyle(0xcc8877, 1);
      g.fillRect(17, 15, 6, 1);

      // Tie
      g.fillStyle(0xcc2222, 1);
      g.fillRect(18, 17, 4, 2);
      g.fillRect(18, 19, 4, 10);
      g.fillStyle(0xee3333, 1);
      g.fillRect(19, 20, 2, 8);
      g.fillTriangle(18, 29, 22, 29, 20, 34);

      // Collar
      g.fillStyle(0xeeeeee, 1);
      g.fillRect(14, 16, 4, 3);
      g.fillRect(22, 16, 4, 3);

      // Pants
      g.fillStyle(0x2a2a3a, 1);
      g.fillRect(10, 42, 9, 12);
      g.fillRect(21, 42, 9, 12);
      g.fillStyle(0x3a3a4a, 1);
      g.fillRect(12, 44, 5, 8);
      g.fillRect(23, 44, 5, 8);

      // Shoes
      g.fillStyle(0x1a1a1a, 1);
      g.fillRoundedRect(9, 52, 10, 4, 1);
      g.fillRoundedRect(21, 52, 10, 4, 1);
      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(11, 52, 6, 2);
      g.fillRect(23, 52, 6, 2);

      // Left arm (shirt sleeve)
      g.fillStyle(0x4a7ab0, 1);
      g.fillRoundedRect(2, 18, 10, 16, 2);
      g.fillStyle(0x5a8ac0, 1);
      g.fillRect(4, 20, 6, 12);

      // Left hand
      g.fillStyle(0xffddbb, 1);
      g.fillRoundedRect(3, 32, 8, 6, 2);
    };

    // ========== PLAYER (NO GAUNTLET) - Burnt Out Employee ==========
    const playerNoGauntlet = this.make.graphics({ x: 0, y: 0, add: false });
    drawPlayerBase(playerNoGauntlet);

    // Right arm (regular shirt sleeve - no gauntlet)
    playerNoGauntlet.fillStyle(0x4a7ab0, 1);
    playerNoGauntlet.fillRoundedRect(28, 18, 10, 16, 2);
    playerNoGauntlet.fillStyle(0x5a8ac0, 1);
    playerNoGauntlet.fillRect(30, 20, 6, 12);

    // Right hand (normal)
    playerNoGauntlet.fillStyle(0xffddbb, 1);
    playerNoGauntlet.fillRoundedRect(29, 32, 8, 6, 2);

    playerNoGauntlet.generateTexture('player', 42, 56);
    playerNoGauntlet.destroy();

    // ========== PLAYER WITH GAUNTLET - Corporate Hero ==========
    const playerWithGauntlet = this.make.graphics({ x: 0, y: 0, add: false });
    drawPlayerBase(playerWithGauntlet);

    // THE GAUNTLET (right arm) - glowing tech device
    // Gauntlet base
    playerWithGauntlet.fillStyle(0xdd8800, 1);
    playerWithGauntlet.fillRoundedRect(28, 16, 12, 20, 3);

    // Gauntlet gold trim
    playerWithGauntlet.fillStyle(0xffcc00, 1);
    playerWithGauntlet.fillRect(29, 17, 10, 3);
    playerWithGauntlet.fillRect(29, 32, 10, 3);

    // Gauntlet core (glowing)
    playerWithGauntlet.fillStyle(0xffee44, 1);
    playerWithGauntlet.fillRect(30, 20, 8, 12);

    // Energy gems on gauntlet - REMOVED so they can be added dynamically
    // playerWithGauntlet.fillStyle(0x00ffff, 1);
    // playerWithGauntlet.fillCircle(34, 23, 3);
    // playerWithGauntlet.fillStyle(0x88ffff, 0.8);
    // playerWithGauntlet.fillCircle(33, 22, 1);
    //
    // playerWithGauntlet.fillStyle(0xff00ff, 1);
    // playerWithGauntlet.fillCircle(34, 29, 2);
    // playerWithGauntlet.fillStyle(0xff88ff, 0.8);
    // playerWithGauntlet.fillCircle(33, 28, 1);

    // Gauntlet glow effect
    playerWithGauntlet.fillStyle(0xffaa00, 0.3);
    playerWithGauntlet.fillCircle(34, 26, 8);

    // Right hand (visible under gauntlet)
    playerWithGauntlet.fillStyle(0xffddbb, 1);
    playerWithGauntlet.fillRoundedRect(30, 34, 8, 5, 2);

    playerWithGauntlet.generateTexture('player_gauntlet', 42, 56);
    playerWithGauntlet.destroy();

    // ========== DRONE ZOMBIE - Former Employee (Infected) ==========
    const zombieG = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow for depth
    zombieG.fillStyle(0x2a3a2a, 1);
    zombieG.fillRoundedRect(7, 15, 26, 30, 3);

    // Body - tattered/stained dress shirt
    zombieG.fillStyle(0x5a6a5a, 1);
    zombieG.fillRoundedRect(8, 16, 24, 28, 2);

    // Shirt stains and tears
    zombieG.fillStyle(0x4a5a4a, 1);
    zombieG.fillRect(10, 20, 8, 6);
    zombieG.fillRect(22, 24, 6, 10);
    zombieG.fillStyle(0x3a4a3a, 1);
    zombieG.fillRect(14, 30, 6, 8);

    // Blood/coffee stains
    zombieG.fillStyle(0x553322, 0.6);
    zombieG.fillCircle(12, 22, 3);
    zombieG.fillCircle(26, 32, 4);

    // Torn areas showing decay
    zombieG.fillStyle(0x667766, 1);
    zombieG.fillRect(8, 26, 4, 6);

    // Head shadow
    zombieG.fillStyle(0x668866, 1);
    zombieG.fillRoundedRect(9, 2, 22, 18, 4);

    // Head (decayed greenish skin)
    zombieG.fillStyle(0x88aa88, 1);
    zombieG.fillRoundedRect(10, 3, 20, 16, 3);

    // Decay patches
    zombieG.fillStyle(0x779977, 1);
    zombieG.fillCircle(14, 8, 3);
    zombieG.fillCircle(26, 12, 4);
    zombieG.fillStyle(0x99bb99, 0.5);
    zombieG.fillCircle(22, 6, 2);

    // Hair - disheveled and falling out
    zombieG.fillStyle(0x222222, 1);
    zombieG.fillRect(10, 0, 20, 5);
    zombieG.fillStyle(0x333333, 1);
    zombieG.fillRect(8, 2, 5, 5);
    zombieG.fillRect(27, 3, 4, 4);
    // Bald patches
    zombieG.fillStyle(0x88aa88, 1);
    zombieG.fillCircle(18, 2, 3);
    // Stray hairs
    zombieG.fillStyle(0x222222, 1);
    zombieG.fillRect(12, -2, 2, 4);
    zombieG.fillRect(24, -1, 2, 3);

    // Hollow glowing eyes
    zombieG.fillStyle(0x111100, 1);
    zombieG.fillRect(12, 7, 6, 5);
    zombieG.fillRect(22, 7, 6, 5);
    // Eye glow
    zombieG.fillStyle(0xffff00, 1);
    zombieG.fillCircle(15, 9, 2);
    zombieG.fillCircle(25, 9, 2);
    // Bright center
    zombieG.fillStyle(0xffffaa, 1);
    zombieG.fillCircle(15, 9, 1);
    zombieG.fillCircle(25, 9, 1);
    // Glow effect
    zombieG.fillStyle(0xffff00, 0.2);
    zombieG.fillCircle(15, 9, 4);
    zombieG.fillCircle(25, 9, 4);

    // Dark circles under eyes
    zombieG.fillStyle(0x556655, 1);
    zombieG.fillRect(12, 12, 6, 2);
    zombieG.fillRect(22, 12, 6, 2);

    // Nose (crooked)
    zombieG.fillStyle(0x779977, 1);
    zombieG.fillRect(18, 11, 3, 4);

    // Mouth (slack-jawed, groaning)
    zombieG.fillStyle(0x332222, 1);
    zombieG.fillRect(15, 15, 10, 3);
    // Teeth
    zombieG.fillStyle(0xccccaa, 1);
    zombieG.fillRect(16, 15, 2, 2);
    zombieG.fillRect(20, 15, 2, 2);
    zombieG.fillRect(23, 15, 2, 2);

    // Torn tie (barely hanging on)
    zombieG.fillStyle(0x553333, 1);
    zombieG.fillRect(18, 18, 4, 8);
    zombieG.fillStyle(0x442222, 1);
    zombieG.fillRect(17, 26, 3, 4);

    // Pants (ragged)
    zombieG.fillStyle(0x2a2a3a, 1);
    zombieG.fillRect(8, 44, 11, 12);
    zombieG.fillRect(21, 44, 11, 12);
    // Tears in pants
    zombieG.fillStyle(0x667766, 1);
    zombieG.fillRect(10, 48, 4, 4);
    zombieG.fillRect(26, 50, 3, 4);

    // Shoes (one missing)
    zombieG.fillStyle(0x1a1a1a, 1);
    zombieG.fillRoundedRect(7, 54, 12, 4, 1);
    // Bare foot on other side
    zombieG.fillStyle(0x88aa88, 1);
    zombieG.fillRoundedRect(21, 54, 11, 4, 1);

    // Arms reaching out (zombie pose)
    zombieG.fillStyle(0x5a6a5a, 1);
    zombieG.fillRoundedRect(0, 18, 10, 18, 2);
    zombieG.fillRoundedRect(30, 18, 10, 18, 2);

    // Decayed hands
    zombieG.fillStyle(0x88aa88, 1);
    zombieG.fillRoundedRect(0, 34, 9, 8, 2);
    zombieG.fillRoundedRect(31, 34, 9, 8, 2);
    // Fingers
    zombieG.fillStyle(0x779977, 1);
    zombieG.fillRect(0, 36, 2, 6);
    zombieG.fillRect(3, 38, 2, 5);
    zombieG.fillRect(35, 36, 2, 6);
    zombieG.fillRect(38, 38, 2, 5);

    zombieG.generateTexture('enemy', 42, 58);
    zombieG.destroy();

    // ========== MIDDLE MANAGER - Email Shooter (Corporate Menace) ==========
    const managerG = this.make.graphics({ x: 0, y: 0, add: false });

    // Shadow
    managerG.fillStyle(0x1a1a2a, 1);
    managerG.fillRoundedRect(5, 15, 30, 32, 3);

    // Expensive suit jacket
    managerG.fillStyle(0x2a2a4a, 1);
    managerG.fillRoundedRect(6, 16, 28, 30, 3);

    // Suit lapels
    managerG.fillStyle(0x3a3a5a, 1);
    managerG.fillRect(8, 18, 6, 20);
    managerG.fillRect(26, 18, 6, 20);

    // Suit highlights
    managerG.fillStyle(0x4a4a6a, 0.5);
    managerG.fillRect(10, 20, 4, 16);
    managerG.fillRect(26, 20, 4, 16);

    // White shirt underneath
    managerG.fillStyle(0xeeeeee, 1);
    managerG.fillRect(14, 18, 12, 22);
    managerG.fillStyle(0xffffff, 0.5);
    managerG.fillRect(18, 20, 4, 18);

    // Power tie (aggressive magenta)
    managerG.fillStyle(0xdd0066, 1);
    managerG.fillRect(18, 18, 4, 3);
    managerG.fillRect(17, 21, 6, 16);
    managerG.fillStyle(0xff0088, 1);
    managerG.fillRect(18, 22, 4, 14);
    managerG.fillTriangle(17, 37, 23, 37, 20, 44);

    // Tie clip (gold)
    managerG.fillStyle(0xffcc00, 1);
    managerG.fillRect(17, 28, 6, 2);

    // Head shadow
    managerG.fillStyle(0x77aa99, 1);
    managerG.fillRoundedRect(9, 1, 22, 18, 4);

    // Head (slightly greenish corporate pallor)
    managerG.fillStyle(0x99ccbb, 1);
    managerG.fillRoundedRect(10, 2, 20, 16, 3);

    // Face highlight
    managerG.fillStyle(0xaaddcc, 0.5);
    managerG.fillRect(14, 4, 8, 10);

    // Slicked back hair (very corporate)
    managerG.fillStyle(0x111111, 1);
    managerG.fillRoundedRect(10, 0, 20, 5, 2);
    managerG.fillStyle(0x222222, 1);
    managerG.fillRect(12, 1, 16, 3);
    // Hair shine
    managerG.fillStyle(0x444444, 0.5);
    managerG.fillRect(14, 1, 8, 2);

    // Evil glasses (menacing red lenses)
    managerG.fillStyle(0x000000, 1);
    managerG.fillRoundedRect(10, 6, 20, 6, 1);
    // Left lens
    managerG.fillStyle(0x880000, 1);
    managerG.fillRect(11, 7, 7, 4);
    managerG.fillStyle(0xff2222, 0.6);
    managerG.fillRect(12, 7, 4, 3);
    // Right lens
    managerG.fillStyle(0x880000, 1);
    managerG.fillRect(22, 7, 7, 4);
    managerG.fillStyle(0xff2222, 0.6);
    managerG.fillRect(23, 7, 4, 3);
    // Glasses bridge
    managerG.fillStyle(0x333333, 1);
    managerG.fillRect(18, 8, 4, 2);
    // Lens glare
    managerG.fillStyle(0xff6666, 0.4);
    managerG.fillRect(12, 7, 2, 2);
    managerG.fillRect(23, 7, 2, 2);

    // Smug evil smile
    managerG.fillStyle(0x661133, 1);
    managerG.fillRect(14, 14, 12, 2);
    // Teeth showing
    managerG.fillStyle(0xffffff, 1);
    managerG.fillRect(15, 14, 2, 1);
    managerG.fillRect(18, 14, 2, 1);
    managerG.fillRect(21, 14, 2, 1);
    managerG.fillRect(24, 14, 2, 1);

    // Pointy chin
    managerG.fillStyle(0x99ccbb, 1);
    managerG.fillTriangle(16, 16, 24, 16, 20, 19);

    // Pants
    managerG.fillStyle(0x1a1a2a, 1);
    managerG.fillRect(8, 46, 11, 12);
    managerG.fillRect(21, 46, 11, 12);
    managerG.fillStyle(0x2a2a3a, 1);
    managerG.fillRect(10, 48, 7, 8);
    managerG.fillRect(23, 48, 7, 8);

    // Expensive shoes
    managerG.fillStyle(0x111111, 1);
    managerG.fillRoundedRect(7, 56, 12, 4, 1);
    managerG.fillRoundedRect(21, 56, 12, 4, 1);
    managerG.fillStyle(0x333333, 1);
    managerG.fillRect(9, 56, 8, 2);
    managerG.fillRect(23, 56, 8, 2);

    // Left arm (pointing accusingly)
    managerG.fillStyle(0x2a2a4a, 1);
    managerG.fillRoundedRect(0, 20, 8, 18, 2);
    managerG.fillStyle(0x99ccbb, 1);
    managerG.fillRoundedRect(0, 36, 6, 6, 2);
    // Pointing finger
    managerG.fillRect(0, 38, 2, 4);

    // Right arm with PHONE (weapon)
    managerG.fillStyle(0x2a2a4a, 1);
    managerG.fillRoundedRect(32, 18, 10, 16, 2);

    // Phone (corporate weapon)
    managerG.fillStyle(0x222222, 1);
    managerG.fillRoundedRect(34, 32, 10, 16, 2);
    // Phone screen (glowing menacingly)
    managerG.fillStyle(0x0066ff, 1);
    managerG.fillRect(35, 34, 8, 10);
    // Email notification icons
    managerG.fillStyle(0xff0000, 1);
    managerG.fillCircle(41, 36, 2);
    managerG.fillStyle(0xffffff, 1);
    managerG.fillRect(36, 38, 6, 1);
    managerG.fillRect(36, 40, 4, 1);
    // Screen glow
    managerG.fillStyle(0x0088ff, 0.3);
    managerG.fillCircle(39, 39, 8);

    // Hand holding phone
    managerG.fillStyle(0x99ccbb, 1);
    managerG.fillRect(32, 34, 4, 8);

    managerG.generateTexture('manager', 46, 60);
    managerG.destroy();

    // ========== VP OF SALES - Corporate Tank (Aggressive Closer) ==========
    const tankG = this.make.graphics({ x: 0, y: 0, add: false });

    // Large shadow (this guy is BIG)
    tankG.fillStyle(0x1a2a3a, 1);
    tankG.fillRoundedRect(5, 14, 42, 48, 4);

    // Massive body - expensive but ill-fitting suit
    tankG.fillStyle(0x2a3a5a, 1);
    tankG.fillRoundedRect(6, 16, 40, 46, 4);

    // Suit jacket straining at buttons
    tankG.fillStyle(0x3a4a6a, 1);
    tankG.fillRect(10, 20, 32, 38);

    // Suit highlights (shiny from sweat)
    tankG.fillStyle(0x4a5a7a, 0.4);
    tankG.fillRect(14, 22, 10, 30);
    tankG.fillRect(28, 22, 10, 30);

    // Buttons straining
    tankG.fillStyle(0xddcc00, 1);
    tankG.fillCircle(26, 28, 2);
    tankG.fillCircle(26, 38, 2);
    tankG.fillCircle(26, 48, 2);

    // White shirt visible (stained)
    tankG.fillStyle(0xdddddd, 1);
    tankG.fillRect(20, 18, 12, 30);
    tankG.fillStyle(0xccccbb, 1);
    tankG.fillRect(22, 24, 8, 6);

    // Power tie (red - sales aggression)
    tankG.fillStyle(0xcc0000, 1);
    tankG.fillRect(24, 18, 4, 4);
    tankG.fillRect(23, 22, 6, 26);
    tankG.fillStyle(0xff2222, 1);
    tankG.fillRect(24, 24, 4, 22);
    tankG.fillTriangle(23, 48, 29, 48, 26, 56);

    // Head shadow
    tankG.fillStyle(0x99aa99, 1);
    tankG.fillRoundedRect(11, 0, 30, 20, 5);

    // Large bald head (corporate type)
    tankG.fillStyle(0xbbccbb, 1);
    tankG.fillRoundedRect(12, 1, 28, 18, 4);

    // Shiny bald spot
    tankG.fillStyle(0xddeecc, 0.6);
    tankG.fillCircle(26, 6, 8);
    tankG.fillStyle(0xeeffdd, 0.4);
    tankG.fillCircle(24, 4, 4);

    // Some hair on sides
    tankG.fillStyle(0x444444, 1);
    tankG.fillRect(12, 4, 4, 8);
    tankG.fillRect(36, 4, 4, 8);
    tankG.fillStyle(0x555555, 0.5);
    tankG.fillRect(13, 6, 2, 4);
    tankG.fillRect(37, 6, 2, 4);

    // Angry brow ridge
    tankG.fillStyle(0x99aa99, 1);
    tankG.fillRect(14, 8, 24, 3);

    // Small angry eyes
    tankG.fillStyle(0x111111, 1);
    tankG.fillRect(16, 10, 6, 4);
    tankG.fillRect(30, 10, 6, 4);
    // Bloodshot whites
    tankG.fillStyle(0xffdddd, 1);
    tankG.fillRect(17, 11, 4, 2);
    tankG.fillRect(31, 11, 4, 2);
    // Angry pupils
    tankG.fillStyle(0x331111, 1);
    tankG.fillRect(18, 11, 2, 2);
    tankG.fillRect(32, 11, 2, 2);
    // Red veins
    tankG.fillStyle(0xff4444, 0.5);
    tankG.fillRect(17, 10, 1, 3);
    tankG.fillRect(34, 10, 1, 3);

    // Furrowed brow
    tankG.fillStyle(0x99aa99, 1);
    tankG.fillRect(18, 9, 4, 1);
    tankG.fillRect(30, 9, 4, 1);

    // Large nose
    tankG.fillStyle(0xaabbaa, 1);
    tankG.fillRect(24, 12, 4, 5);
    tankG.fillStyle(0x99aa99, 1);
    tankG.fillRect(23, 16, 6, 2);

    // Grimacing mouth (gritted teeth)
    tankG.fillStyle(0x442222, 1);
    tankG.fillRect(18, 17, 16, 3);
    // Teeth
    tankG.fillStyle(0xffffee, 1);
    for (let i = 0; i < 6; i++) {
      tankG.fillRect(19 + i * 2.5, 17, 2, 2);
    }

    // Double chin
    tankG.fillStyle(0xaabbaa, 1);
    tankG.fillRect(18, 19, 16, 2);

    // Massive arms (ready to shake hands crushingly)
    tankG.fillStyle(0x2a3a5a, 1);
    tankG.fillRoundedRect(0, 20, 10, 28, 3);
    tankG.fillRoundedRect(42, 20, 10, 28, 3);

    // Shirt cuffs
    tankG.fillStyle(0xeeeeee, 1);
    tankG.fillRect(0, 44, 10, 4);
    tankG.fillRect(42, 44, 10, 4);

    // Cufflinks (gold)
    tankG.fillStyle(0xffcc00, 1);
    tankG.fillCircle(5, 46, 2);
    tankG.fillCircle(47, 46, 2);

    // Large meaty fists
    tankG.fillStyle(0xbbccbb, 1);
    tankG.fillRoundedRect(0, 46, 12, 10, 3);
    tankG.fillRoundedRect(40, 46, 12, 10, 3);
    // Knuckle details
    tankG.fillStyle(0xaabbaa, 1);
    tankG.fillRect(2, 48, 8, 2);
    tankG.fillRect(42, 48, 8, 2);

    // Championship ring (sales awards)
    tankG.fillStyle(0xffdd00, 1);
    tankG.fillCircle(4, 52, 3);
    tankG.fillStyle(0x00aaff, 1);
    tankG.fillCircle(4, 52, 1);

    // Pants
    tankG.fillStyle(0x1a2a3a, 1);
    tankG.fillRect(10, 60, 14, 8);
    tankG.fillRect(28, 60, 14, 8);
    tankG.fillStyle(0x2a3a4a, 1);
    tankG.fillRect(12, 62, 10, 4);
    tankG.fillRect(30, 62, 10, 4);

    // Expensive shoes
    tankG.fillStyle(0x111111, 1);
    tankG.fillRoundedRect(8, 66, 16, 4, 1);
    tankG.fillRoundedRect(28, 66, 16, 4, 1);
    tankG.fillStyle(0x333333, 1);
    tankG.fillRect(10, 66, 12, 2);
    tankG.fillRect(30, 66, 12, 2);

    tankG.generateTexture('tank', 52, 70);
    tankG.destroy();

    // ========== THE EXECUTIVE - Final Boss (CEO of MEGACORP) ==========
    const bossG = this.make.graphics({ x: 0, y: 0, add: false });

    // Ominous aura/shadow
    bossG.fillStyle(0x220022, 0.3);
    bossG.fillCircle(36, 45, 40);

    // Large imposing shadow
    bossG.fillStyle(0x0a0a1a, 1);
    bossG.fillRoundedRect(9, 22, 54, 58, 5);

    // Expensive three-piece suit (black with subtle pattern)
    bossG.fillStyle(0x1a1a2a, 1);
    bossG.fillRoundedRect(10, 24, 52, 54, 4);

    // Suit jacket lapels (sharp, powerful)
    bossG.fillStyle(0x2a2a3a, 1);
    bossG.fillRect(12, 26, 10, 40);
    bossG.fillRect(50, 26, 10, 40);

    // Subtle pinstripe pattern
    for (let x = 14; x < 58; x += 4) {
      bossG.fillStyle(0x2a2a3a, 0.3);
      bossG.fillRect(x, 28, 1, 48);
    }

    // Suit highlights
    bossG.fillStyle(0x3a3a4a, 0.3);
    bossG.fillRect(16, 28, 8, 30);
    bossG.fillRect(48, 28, 8, 30);

    // Vest underneath
    bossG.fillStyle(0x2a2a3a, 1);
    bossG.fillRect(22, 26, 28, 36);
    bossG.fillStyle(0x3a3a4a, 1);
    bossG.fillRect(24, 28, 24, 32);

    // Vest buttons (gold)
    bossG.fillStyle(0xffcc00, 1);
    bossG.fillCircle(36, 34, 2);
    bossG.fillCircle(36, 44, 2);
    bossG.fillCircle(36, 54, 2);

    // Crisp white shirt
    bossG.fillStyle(0xffffff, 1);
    bossG.fillRect(30, 24, 12, 30);
    bossG.fillStyle(0xeeeeee, 1);
    bossG.fillRect(32, 26, 8, 26);

    // POWER TIE (gold with pattern)
    bossG.fillStyle(0xddaa00, 1);
    bossG.fillRect(33, 24, 6, 4);
    bossG.fillRect(32, 28, 8, 30);
    bossG.fillStyle(0xffcc00, 1);
    bossG.fillRect(33, 30, 6, 26);
    // Tie pattern (diagonal stripes)
    bossG.fillStyle(0xcc8800, 0.5);
    for (let y = 32; y < 56; y += 4) {
      bossG.fillRect(33, y, 6, 2);
    }
    bossG.fillTriangle(32, 58, 40, 58, 36, 68);

    // Tie pin (diamond)
    bossG.fillStyle(0xffffff, 1);
    bossG.fillCircle(36, 40, 2);
    bossG.fillStyle(0x88ffff, 0.8);
    bossG.fillCircle(36, 40, 1);

    // Head shadow
    bossG.fillStyle(0xbb9977, 1);
    bossG.fillRoundedRect(17, 2, 38, 26, 6);

    // Head (slightly sinister coloring)
    bossG.fillStyle(0xddbb99, 1);
    bossG.fillRoundedRect(18, 3, 36, 24, 5);

    // Face highlight
    bossG.fillStyle(0xeeccaa, 0.5);
    bossG.fillCircle(36, 14, 10);

    // Distinguished grey hair (slicked back, powerful)
    bossG.fillStyle(0x555566, 1);
    bossG.fillRoundedRect(18, 0, 36, 8, 3);
    bossG.fillStyle(0x666677, 1);
    bossG.fillRect(22, 2, 28, 4);
    // Hair highlights (silver)
    bossG.fillStyle(0x888899, 0.6);
    bossG.fillRect(26, 2, 8, 3);
    bossG.fillRect(38, 2, 6, 3);
    // Styled sides
    bossG.fillStyle(0x555566, 1);
    bossG.fillRect(16, 4, 4, 10);
    bossG.fillRect(52, 4, 4, 10);

    // Menacing eyes (glowing with power)
    // Eye sockets
    bossG.fillStyle(0x221111, 1);
    bossG.fillRoundedRect(22, 10, 10, 7, 2);
    bossG.fillRoundedRect(40, 10, 10, 7, 2);
    // Glowing red eyes
    bossG.fillStyle(0xff0000, 1);
    bossG.fillCircle(27, 13, 4);
    bossG.fillCircle(45, 13, 4);
    // Bright yellow pupils (demonic)
    bossG.fillStyle(0xffff00, 1);
    bossG.fillCircle(27, 13, 2);
    bossG.fillCircle(45, 13, 2);
    // Eye shine
    bossG.fillStyle(0xffffff, 0.8);
    bossG.fillCircle(26, 12, 1);
    bossG.fillCircle(44, 12, 1);
    // Eye glow effect
    bossG.fillStyle(0xff0000, 0.2);
    bossG.fillCircle(27, 13, 8);
    bossG.fillCircle(45, 13, 8);

    // Evil eyebrows (sharp, angular)
    bossG.fillStyle(0x444455, 1);
    bossG.fillRect(22, 8, 10, 2);
    bossG.fillRect(40, 8, 10, 2);
    // Angled for menace
    bossG.fillRect(20, 9, 4, 1);
    bossG.fillRect(48, 9, 4, 1);

    // Sharp nose
    bossG.fillStyle(0xccaa88, 1);
    bossG.fillRect(34, 15, 4, 6);
    bossG.fillStyle(0xbb9977, 1);
    bossG.fillRect(33, 20, 6, 2);

    // Sinister smile (too wide, too many teeth)
    bossG.fillStyle(0x331111, 1);
    bossG.fillRect(26, 22, 20, 4);
    // Perfect white teeth
    bossG.fillStyle(0xffffff, 1);
    for (let i = 0; i < 8; i++) {
      bossG.fillRect(27 + i * 2.3, 22, 2, 3);
    }
    // Slight red glow around mouth
    bossG.fillStyle(0xff0000, 0.1);
    bossG.fillRect(24, 21, 24, 6);

    // Strong jaw
    bossG.fillStyle(0xccaa88, 1);
    bossG.fillRect(22, 25, 28, 3);

    // Arms (commanding pose, reaching for power)
    bossG.fillStyle(0x1a1a2a, 1);
    bossG.fillRoundedRect(0, 28, 14, 30, 3);
    bossG.fillRoundedRect(58, 28, 14, 30, 3);

    // Shirt cuffs with cufflinks
    bossG.fillStyle(0xffffff, 1);
    bossG.fillRect(0, 54, 14, 4);
    bossG.fillRect(58, 54, 14, 4);
    // Diamond cufflinks
    bossG.fillStyle(0xffdd00, 1);
    bossG.fillCircle(7, 56, 3);
    bossG.fillCircle(65, 56, 3);
    bossG.fillStyle(0xffffff, 1);
    bossG.fillCircle(7, 56, 1);
    bossG.fillCircle(65, 56, 1);

    // Hands (glowing with corrupt power)
    bossG.fillStyle(0xddbb99, 1);
    bossG.fillRoundedRect(0, 56, 14, 12, 3);
    bossG.fillRoundedRect(58, 56, 14, 12, 3);

    // Energy emanating from hands
    bossG.fillStyle(0xff6600, 0.8);
    bossG.fillCircle(7, 62, 6);
    bossG.fillCircle(65, 62, 6);
    bossG.fillStyle(0xffaa00, 0.6);
    bossG.fillCircle(7, 62, 8);
    bossG.fillCircle(65, 62, 8);
    bossG.fillStyle(0xffcc00, 0.3);
    bossG.fillCircle(7, 62, 10);
    bossG.fillCircle(65, 62, 10);

    // Fingers with rings
    bossG.fillStyle(0xddbb99, 1);
    bossG.fillRect(0, 64, 4, 6);
    bossG.fillRect(4, 66, 4, 5);
    bossG.fillRect(8, 64, 4, 6);
    bossG.fillRect(60, 64, 4, 6);
    bossG.fillRect(64, 66, 4, 5);
    bossG.fillRect(68, 64, 4, 6);
    // Rings
    bossG.fillStyle(0xffcc00, 1);
    bossG.fillRect(1, 66, 3, 2);
    bossG.fillRect(69, 66, 3, 2);

    // Pants
    bossG.fillStyle(0x0a0a1a, 1);
    bossG.fillRect(14, 76, 18, 10);
    bossG.fillRect(40, 76, 18, 10);
    bossG.fillStyle(0x1a1a2a, 1);
    bossG.fillRect(16, 78, 14, 6);
    bossG.fillRect(42, 78, 14, 6);

    // Expensive Italian shoes
    bossG.fillStyle(0x0a0a0a, 1);
    bossG.fillRoundedRect(12, 84, 20, 6, 2);
    bossG.fillRoundedRect(40, 84, 20, 6, 2);
    bossG.fillStyle(0x222222, 1);
    bossG.fillRect(14, 84, 16, 3);
    bossG.fillRect(42, 84, 16, 3);
    // Shoe shine
    bossG.fillStyle(0x444444, 0.5);
    bossG.fillRect(16, 84, 8, 2);
    bossG.fillRect(44, 84, 8, 2);

    bossG.generateTexture('boss', 72, 90);
    bossG.destroy();

    // ========== ENVIRONMENT TILES ==========

    // Office floor tile
    const floorG = this.make.graphics({ x: 0, y: 0, add: false });
    floorG.fillStyle(0x3a3a4a, 1);
    floorG.fillRect(0, 0, 32, 32);
    floorG.fillStyle(0x4a4a5a, 1);
    floorG.fillRect(0, 0, 16, 16);
    floorG.fillRect(16, 16, 16, 16);
    floorG.lineStyle(1, 0x2a2a3a, 1);
    floorG.strokeRect(0, 0, 32, 32);
    floorG.generateTexture('floor', 32, 32);
    floorG.destroy();

    // Platform (desk-like)
    const platG = this.make.graphics({ x: 0, y: 0, add: false });
    platG.fillStyle(0x5a4a3a, 1);
    platG.fillRect(0, 0, 32, 16);
    platG.fillStyle(0x6a5a4a, 1);
    platG.fillRect(0, 0, 32, 4);
    platG.lineStyle(1, 0x4a3a2a, 1);
    platG.strokeRect(0, 0, 32, 16);
    platG.generateTexture('platform', 32, 16);
    platG.destroy();

    // ========== PARTICLES ==========

    // Attack particle
    const particleG = this.make.graphics({ x: 0, y: 0, add: false });
    particleG.fillStyle(0xffff00, 1);
    particleG.fillCircle(4, 4, 4);
    particleG.generateTexture('particle_yellow', 8, 8);
    particleG.destroy();

    // Damage particle
    const damageG = this.make.graphics({ x: 0, y: 0, add: false });
    damageG.fillStyle(0xff0000, 1);
    damageG.fillCircle(4, 4, 4);
    damageG.generateTexture('particle_red', 8, 8);
    damageG.destroy();

    // Gem particles
    const gemParticleG = this.make.graphics({ x: 0, y: 0, add: false });
    gemParticleG.fillStyle(0x00ffff, 1);
    gemParticleG.fillCircle(3, 3, 3);
    gemParticleG.generateTexture('particle_cyan', 6, 6);
    gemParticleG.destroy();

    // Spark particle (for impacts and energy effects)
    const sparkG = this.make.graphics({ x: 0, y: 0, add: false });
    sparkG.fillStyle(0xffffff, 1);
    sparkG.fillRect(3, 0, 2, 8);
    sparkG.fillRect(0, 3, 8, 2);
    sparkG.generateTexture('particle_spark', 8, 8);
    sparkG.destroy();

    // Energy orb (for ambient floating particles)
    const orbG = this.make.graphics({ x: 0, y: 0, add: false });
    orbG.fillStyle(0x00ff88, 0.8);
    orbG.fillCircle(6, 6, 6);
    orbG.fillStyle(0xaaffcc, 1);
    orbG.fillCircle(4, 4, 2);
    orbG.generateTexture('particle_orb', 12, 12);
    orbG.destroy();

    // Smoke/dust particle
    const smokeG = this.make.graphics({ x: 0, y: 0, add: false });
    smokeG.fillStyle(0x888888, 0.5);
    smokeG.fillCircle(8, 8, 8);
    smokeG.fillStyle(0x666666, 0.3);
    smokeG.fillCircle(10, 6, 5);
    smokeG.generateTexture('particle_smoke', 16, 16);
    smokeG.destroy();

    // Electric particle (for gauntlet effects)
    const electricG = this.make.graphics({ x: 0, y: 0, add: false });
    electricG.lineStyle(2, 0x00ffff, 1);
    electricG.beginPath();
    electricG.moveTo(0, 4);
    electricG.lineTo(4, 0);
    electricG.lineTo(6, 4);
    electricG.lineTo(10, 2);
    electricG.lineTo(8, 6);
    electricG.lineTo(12, 8);
    electricG.strokePath();
    electricG.generateTexture('particle_electric', 12, 10);
    electricG.destroy();

    // Star particle (for collection effects)
    const starG = this.make.graphics({ x: 0, y: 0, add: false });
    starG.fillStyle(0xffff00, 1);
    starG.fillTriangle(6, 0, 4, 5, 8, 5);
    starG.fillTriangle(6, 12, 4, 7, 8, 7);
    starG.fillTriangle(0, 6, 5, 4, 5, 8);
    starG.fillTriangle(12, 6, 7, 4, 7, 8);
    starG.generateTexture('particle_star', 12, 12);
    starG.destroy();

    // Fire particle
    const fireG = this.make.graphics({ x: 0, y: 0, add: false });
    fireG.fillStyle(0xff6600, 1);
    fireG.fillCircle(5, 8, 5);
    fireG.fillStyle(0xffaa00, 1);
    fireG.fillCircle(5, 6, 4);
    fireG.fillStyle(0xffff00, 1);
    fireG.fillCircle(5, 5, 2);
    fireG.generateTexture('particle_fire', 10, 12);
    fireG.destroy();

    // Shockwave ring
    const ringG = this.make.graphics({ x: 0, y: 0, add: false });
    ringG.lineStyle(3, 0xffffff, 1);
    ringG.strokeCircle(16, 16, 14);
    ringG.generateTexture('particle_ring', 32, 32);
    ringG.destroy();

    // ========== UI ELEMENTS ==========

    // Heart icon
    const heartG = this.make.graphics({ x: 0, y: 0, add: false });
    heartG.fillStyle(0xff3344, 1);
    heartG.fillCircle(5, 5, 5);
    heartG.fillCircle(11, 5, 5);
    heartG.fillTriangle(0, 7, 16, 7, 8, 16);
    heartG.generateTexture('heart', 16, 16);
    heartG.destroy();

    // Empty heart
    const heartEmptyG = this.make.graphics({ x: 0, y: 0, add: false });
    heartEmptyG.fillStyle(0x333344, 1);
    heartEmptyG.fillCircle(5, 5, 5);
    heartEmptyG.fillCircle(11, 5, 5);
    heartEmptyG.fillTriangle(0, 7, 16, 7, 8, 16);
    heartEmptyG.generateTexture('heart_empty', 16, 16);
    heartEmptyG.destroy();

    // ========== DECORATIONS ==========

    // Office monitor
    const monitorG = this.make.graphics({ x: 0, y: 0, add: false });
    monitorG.fillStyle(0x222233, 1);
    monitorG.fillRect(0, 0, 24, 20);
    monitorG.fillStyle(0x112244, 1);
    monitorG.fillRect(2, 2, 20, 14);
    monitorG.fillStyle(0x00ff00, 0.3);
    monitorG.fillRect(4, 4, 8, 2);
    monitorG.fillRect(4, 8, 12, 2);
    monitorG.fillRect(4, 12, 6, 2);
    monitorG.fillStyle(0x333344, 1);
    monitorG.fillRect(10, 20, 4, 4);
    monitorG.fillRect(6, 24, 12, 2);
    monitorG.generateTexture('monitor', 24, 26);
    monitorG.destroy();

    // Dead plant
    const plantG = this.make.graphics({ x: 0, y: 0, add: false });
    plantG.fillStyle(0x5a4a3a, 1);
    plantG.fillRect(4, 16, 8, 8);
    plantG.fillStyle(0x4a3a2a, 1);
    plantG.fillRect(2, 14, 12, 4);
    plantG.fillStyle(0x445533, 1);
    plantG.fillRect(6, 4, 4, 12);
    plantG.fillStyle(0x334422, 1);
    plantG.fillRect(2, 6, 4, 3);
    plantG.fillRect(10, 8, 4, 3);
    plantG.generateTexture('plant', 16, 24);
    plantG.destroy();

    // Coffee mug
    const mugG = this.make.graphics({ x: 0, y: 0, add: false });
    mugG.fillStyle(0xeeeeee, 1);
    mugG.fillRect(2, 2, 8, 10);
    mugG.fillStyle(0x553311, 1);
    mugG.fillRect(3, 3, 6, 4);
    mugG.fillStyle(0xeeeeee, 1);
    mugG.fillRect(10, 4, 3, 6);
    mugG.generateTexture('mug', 14, 14);
    mugG.destroy();

    // Cubicle wall
    const wallG = this.make.graphics({ x: 0, y: 0, add: false });
    wallG.fillStyle(0x6a6a7a, 1);
    wallG.fillRect(0, 0, 8, 64);
    wallG.fillStyle(0x5a5a6a, 1);
    wallG.fillRect(0, 0, 8, 4);
    wallG.fillRect(0, 30, 8, 4);
    wallG.lineStyle(1, 0x4a4a5a, 1);
    wallG.strokeRect(0, 0, 8, 64);
    wallG.generateTexture('cubicle_wall', 8, 64);
    wallG.destroy();

    // Warning sign
    const warnG = this.make.graphics({ x: 0, y: 0, add: false });
    warnG.fillStyle(0xffaa00, 1);
    warnG.fillTriangle(12, 0, 0, 20, 24, 20);
    warnG.fillStyle(0x000000, 1);
    warnG.fillTriangle(12, 4, 4, 18, 20, 18);
    warnG.fillStyle(0xffaa00, 1);
    warnG.fillRect(10, 8, 4, 6);
    warnG.fillRect(10, 15, 4, 3);
    warnG.generateTexture('warning', 24, 20);
    warnG.destroy();
  }
}
