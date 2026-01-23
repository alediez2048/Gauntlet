import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Start background music if not already playing
    if (!this.sound.get('bgm')) {
      this.sound.play('bgm', { loop: true, volume: 0.4 });
    }

    // Scene fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Dark corporate background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a12);

    // Create cyberpunk city backdrop
    this.createCityBackdrop(width, height);

    // Flickering background elements (abandoned office feel)
    this.createBackgroundAtmosphere(width, height);

    // Create data rain effect
    this.createDataRain(width, height);

    // Title with glitch effect
    this.createTitle(width, height);

    // Corporate warning ticker
    this.createWarningTicker(width, height);

    // Story crawl
    this.createStoryCrawl(width, height);

    // Menu options (appear after story)
    this.time.delayedCall(4000, () => {
      this.createMenuOptions(width, height);
    });

    // Ambient particles
    this.createAmbientParticles(width, height);

    // CRT scanlines
    this.createScanlines(width, height);
  }

  createCityBackdrop(width, height) {
    const cityGraphics = this.add.graphics();

    // Dark city silhouette at bottom
    let x = 0;
    while (x < width) {
      const buildingWidth = Phaser.Math.Between(20, 60);
      const buildingHeight = Phaser.Math.Between(80, 200);

      cityGraphics.fillStyle(0x0a0a15, 1);
      cityGraphics.fillRect(x, height - buildingHeight, buildingWidth, buildingHeight);

      // Building windows
      for (let wy = height - buildingHeight + 10; wy < height - 20; wy += 12) {
        for (let wx = x + 4; wx < x + buildingWidth - 4; wx += 8) {
          if (Math.random() > 0.4) {
            const windowColor = Math.random() > 0.8 ? 0xffaa44 : (Math.random() > 0.5 ? 0x4488ff : 0x44ff88);
            const win = this.add.rectangle(wx, wy, 4, 6, windowColor, Math.random() * 0.3 + 0.1);

            // Random window flicker
            if (Math.random() < 0.1) {
              this.tweens.add({
                targets: win,
                alpha: { from: 0.1, to: 0.5 },
                duration: 50 + Math.random() * 100,
                yoyo: true,
                repeat: -1,
                repeatDelay: Phaser.Math.Between(1000, 5000)
              });
            }
          }
        }
      }
      x += buildingWidth + Phaser.Math.Between(2, 10);
    }
  }

  createDataRain(width, height) {
    // Matrix-style data rain (subtle)
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, width);
      const chars = '01';

      for (let j = 0; j < 6; j++) {
        const char = this.add.text(
          x,
          Phaser.Math.Between(-200, 0) - j * 20,
          chars[Math.floor(Math.random() * chars.length)],
          {
            font: '10px monospace',
            fill: j === 0 ? '#44ff88' : '#00ff88'
          }
        ).setAlpha(0.15 - j * 0.02);

        this.tweens.add({
          targets: char,
          y: height + 50,
          duration: 6000 + Math.random() * 4000,
          repeat: -1,
          delay: j * 100,
          onRepeat: () => {
            char.y = -50;
            char.x = Phaser.Math.Between(0, width);
            char.setText(chars[Math.floor(Math.random() * chars.length)]);
          }
        });
      }
    }
  }

  createWarningTicker(width, height) {
    const warnings = [
      '⚠ MEGACORP SYSTEMS BREACH DETECTED ⚠',
      '>>> UNAUTHORIZED PERSONNEL IN SECTOR 7 <<<',
      '!!! GAUNTLET PROTOTYPE ACTIVATION IMMINENT !!!',
      '*** ALL EXITS SEALED ***',
      '>>> PRODUCTIVITY LEVELS CRITICAL <<<'
    ];

    this.add.rectangle(width / 2, 30, width, 22, 0x110000, 0.7);

    const tickerText = this.add.text(width, 30, warnings.join('     '), {
      font: '10px monospace',
      fill: '#ff4444'
    }).setOrigin(0, 0.5);

    this.tweens.add({
      targets: tickerText,
      x: -tickerText.width,
      duration: 25000,
      repeat: -1,
      ease: 'Linear'
    });
  }

  createScanlines(width, height) {
    const scanlines = this.add.graphics();
    scanlines.setDepth(1000);
    scanlines.setAlpha(0.04);

    for (let y = 0; y < height; y += 2) {
      scanlines.fillStyle(0x000000, 1);
      scanlines.fillRect(0, y, width, 1);
    }
  }

  createBackgroundAtmosphere(width, height) {
    // Grid of faint office elements
    for (let x = 50; x < width; x += 120) {
      for (let y = 100; y < height - 100; y += 80) {
        // Random office decoration
        const rand = Math.random();
        if (rand < 0.3) {
          const monitor = this.add.image(x, y, 'monitor').setAlpha(0.15).setScale(1.5);
          // Occasional flicker
          if (Math.random() < 0.3) {
            this.tweens.add({
              targets: monitor,
              alpha: { from: 0.1, to: 0.25 },
              duration: 100 + Math.random() * 200,
              yoyo: true,
              repeat: -1,
              repeatDelay: 2000 + Math.random() * 5000
            });
          }
        } else if (rand < 0.5) {
          this.add.image(x, y, 'plant').setAlpha(0.1).setScale(1.5);
        } else if (rand < 0.6) {
          this.add.image(x, y, 'mug').setAlpha(0.1).setScale(2);
        }
      }
    }

    // Cubicle wall silhouettes
    for (let x = 80; x < width; x += 200) {
      this.add.image(x, height / 2, 'cubicle_wall').setAlpha(0.1).setScale(1, 4);
    }

    // Vignette effect
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0);
    vignette.fillRect(0, 0, width, height);

    // Dark edges
    const edgeAlpha = 0.6;
    vignette.fillStyle(0x000000, edgeAlpha);
    vignette.fillRect(0, 0, 60, height);
    vignette.fillRect(width - 60, 0, 60, height);
    vignette.fillRect(0, 0, width, 40);
    vignette.fillRect(0, height - 40, width, 40);
  }

  createTitle(width, height) {
    // Main title
    const title = this.add.text(width / 2, 80, 'CORPORATE', {
      font: 'bold 52px monospace',
      fill: '#00ff88',
      stroke: '#003322',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = this.add.text(width / 2, 135, 'GAUNTLET', {
      font: 'bold 64px monospace',
      fill: '#ffaa00',
      stroke: '#442200',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);

    // Glitch-in animation
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 1000,
      ease: 'Steps(8)'
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 1000,
      delay: 500,
      ease: 'Steps(8)'
    });

    // Occasional title glitch
    this.time.addEvent({
      delay: 3000 + Math.random() * 4000,
      callback: () => this.glitchText(title),
      loop: true
    });

    this.time.addEvent({
      delay: 4000 + Math.random() * 3000,
      callback: () => this.glitchText(subtitle),
      loop: true
    });
  }

  glitchText(textObj) {
    const originalX = textObj.x;
    const originalColor = textObj.style.color;

    // Quick offset and color shift
    this.tweens.add({
      targets: textObj,
      x: originalX + Phaser.Math.Between(-5, 5),
      duration: 50,
      yoyo: true,
      onStart: () => {
        textObj.setTint(0xff0000);
      },
      onComplete: () => {
        textObj.clearTint();
        textObj.x = originalX;
      }
    });
  }

  createStoryCrawl(width, height) {
    const storyLines = [
      "You wake up.",
      "",
      "The fluorescent lights flicker overhead.",
      "Your desk is covered in dust.",
      "",
      "How long have you been asleep?",
      "",
      "The office is silent... but not empty.",
      "Your former colleagues still roam the halls,",
      "trapped in endless loops of corporate routine.",
      "",
      "On your wrist: THE GAUNTLET.",
      "A prototype you don't remember building.",
      "",
      "Find the gemstones. Unlock its power.",
      "Escape the MEGACORP."
    ];

    const storyText = this.add.text(width / 2, height / 2 + 40, '', {
      font: '14px monospace',
      fill: '#668899',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setAlpha(0);

    // Typewriter effect
    let currentLine = 0;
    let displayedText = '';

    this.tweens.add({
      targets: storyText,
      alpha: 1,
      duration: 500,
      delay: 1500
    });

    const typewriter = this.time.addEvent({
      delay: 150,
      callback: () => {
        if (currentLine < storyLines.length) {
          displayedText += storyLines[currentLine] + '\n';
          storyText.setText(displayedText);
          currentLine++;
        } else {
          typewriter.destroy();
          // Fade out story
          this.time.delayedCall(2000, () => {
            this.tweens.add({
              targets: storyText,
              alpha: 0.3,
              y: height / 2 + 20,
              duration: 1000
            });
          });
        }
      },
      repeat: storyLines.length - 1
    });
  }

  createMenuOptions(width, height) {
    // Play button
    const playButton = this.add.text(width / 2, height - 140, '[ INITIALIZE GAUNTLET ]', {
      font: 'bold 22px monospace',
      fill: '#00ff88',
      stroke: '#003322',
      strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    // Arena mode button
    const arenaButton = this.add.text(width / 2, height - 100, '[ COMBAT TRAINING ]', {
      font: '16px monospace',
      fill: '#888899'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    // Controls panel - more prominent
    const controlsBg = this.add.rectangle(width / 2, height - 45, 500, 60, 0x000000, 0.7)
      .setAlpha(0);

    const controlsTitle = this.add.text(width / 2, height - 65, '─── CONTROLS ───', {
      font: 'bold 12px monospace',
      fill: '#00ff88'
    }).setOrigin(0.5).setAlpha(0);

    const controls = this.add.text(width / 2, height - 45,
      'A/D: Move   SPACE: Jump   J: Attack\nK: Power Strike   L: Vision   SHIFT: Dash   R: Respawn', {
      font: '12px monospace',
      fill: '#88aacc',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5).setAlpha(0);

    // Fade in menu
    this.tweens.add({
      targets: [playButton, arenaButton, controlsBg, controlsTitle, controls],
      alpha: 1,
      duration: 500,
      delay: this.tweens.stagger(150)
    });

    // Button interactions
    playButton.on('pointerover', () => {
      playButton.setStyle({ fill: '#44ffaa' });
      this.tweens.add({
        targets: playButton,
        scale: 1.05,
        duration: 100
      });
    });

    playButton.on('pointerout', () => {
      playButton.setStyle({ fill: '#00ff88' });
      this.tweens.add({
        targets: playButton,
        scale: 1,
        duration: 100
      });
    });

    playButton.on('pointerdown', () => {
      this.startGame();
    });

    arenaButton.on('pointerover', () => {
      arenaButton.setStyle({ fill: '#aabbcc' });
    });

    arenaButton.on('pointerout', () => {
      arenaButton.setStyle({ fill: '#888899' });
    });

    arenaButton.on('pointerdown', () => {
      this.startArena();
    });

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
  }

  createAmbientParticles(width, height) {
    // Floating dust particles
    for (let i = 0; i < 30; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0x445566,
        0.3
      );

      this.tweens.add({
        targets: particle,
        y: particle.y - 100,
        x: particle.x + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 5000 + Math.random() * 5000,
        repeat: -1,
        onRepeat: () => {
          particle.y = height + 10;
          particle.x = Phaser.Math.Between(0, width);
          particle.alpha = 0.3;
        }
      });
    }
  }

  startGame() {
    // Dramatic glitch transition
    this.createTransitionEffect(() => {
      this.scene.start('Level1Scene');
    });
  }

  startArena() {
    this.createTransitionEffect(() => {
      this.scene.start('ArenaScene');
    });
  }

  createTransitionEffect(callback) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Disable further input
    this.input.enabled = false;

    // Flash effect
    this.cameras.main.flash(150, 0, 255, 136);

    // Create glitch bars
    const glitchBars = [];
    for (let i = 0; i < 15; i++) {
      const bar = this.add.rectangle(
        width / 2 + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(100, 800),
        Phaser.Math.Between(2, 10),
        Phaser.Math.Between(0, 1) > 0.5 ? 0x00ff88 : 0xffaa00,
        0.7
      );
      glitchBars.push(bar);

      this.tweens.add({
        targets: bar,
        x: bar.x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        duration: 300 + i * 30,
        ease: 'Power2'
      });
    }

    // Screen shake
    this.cameras.main.shake(400, 0.02);

    // Particle burst from center
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const particle = this.add.circle(
        width / 2,
        height / 2,
        Phaser.Math.Between(2, 5),
        0x00ff88
      );

      this.tweens.add({
        targets: particle,
        x: width / 2 + Math.cos(angle) * 500,
        y: height / 2 + Math.sin(angle) * 500,
        alpha: 0,
        scale: 0.1,
        duration: 500,
        ease: 'Power2'
      });
    }

    // Scanline sweep effect
    const scanline = this.add.rectangle(width / 2, 0, width, 4, 0x00ff88, 0.8);
    this.tweens.add({
      targets: scanline,
      y: height,
      duration: 400,
      ease: 'Linear',
      onComplete: () => scanline.destroy()
    });

    // Final fade to black
    this.time.delayedCall(300, () => {
      this.cameras.main.fade(300, 0, 0, 0, false, (camera, progress) => {
        if (progress === 1) {
          callback();
        }
      });
    });
  }
}
