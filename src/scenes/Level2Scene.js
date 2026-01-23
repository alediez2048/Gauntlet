import Phaser from 'phaser';
import BaseLevelScene from './BaseLevelScene.js';
import MiddleManager from '../entities/MiddleManager.js';

export default class Level2Scene extends BaseLevelScene {
  constructor() {
    super('Level2Scene', 'level2');
  }

  create() {
    super.create();

    // Level 2 specific: Track middle manager deaths
    this.managersKilled = 0;
    this.totalManagers = 0;
    this.hasKeycard = false;
    this.keycardCollected = false;

    // Count and track all middle managers
    this.setupManagerTracking();

    // Create locked exit barrier
    this.createExitBarrier();

    // Override the exit label
    this.exitLabel.setText('EXIT\n[LOCKED]');
    this.exitLabel.setColor('#ff4444');

    // Create manager kill HUD
    this.createManagerHUD();

    // Show level objective
    this.showLevelObjective();
  }

  setupManagerTracking() {
    // Find all middle managers and attach death listeners
    this.enemies.getChildren().forEach(enemy => {
      if (enemy instanceof MiddleManager) {
        this.totalManagers++;

        // Store original die method
        const originalDie = enemy.die.bind(enemy);

        // Override die method to track kills
        enemy.die = () => {
          // Call original die first
          originalDie();

          // Then track the kill
          this.onManagerKilled(enemy);
        };
      }
    });

    console.log(`Level 2: Tracking ${this.totalManagers} Middle Managers`);
  }

  onManagerKilled(manager) {
    this.managersKilled++;
    console.log(`Manager killed! ${this.managersKilled}/${this.totalManagers}`);

    // Update HUD
    this.updateManagerHUD();

    // Show kill effect
    this.showManagerKillEffect(manager.x, manager.y);

    // Check if all managers are dead
    if (this.managersKilled >= this.totalManagers && !this.hasKeycard) {
      this.hasKeycard = true;
      // Small delay for dramatic effect
      this.time.delayedCall(500, () => {
        this.spawnKeycard();
      });
    }
  }

  createManagerHUD() {
    this.managerHUD = this.add.container(700, 60).setScrollFactor(0).setDepth(1000);

    const bg = this.add.rectangle(0, 0, 180, 40, 0x000000, 0.7);
    this.managerHUD.add(bg);

    const icon = this.add.text(-65, 0, 'MGR', {
      font: 'bold 12px monospace',
      fill: '#ff00ff'
    }).setOrigin(0.5);
    this.managerHUD.add(icon);

    this.managerHUDText = this.add.text(15, 0, `DEFEATED: ${this.managersKilled}/${this.totalManagers}`, {
      font: '12px monospace',
      fill: '#ff00ff'
    }).setOrigin(0.5);
    this.managerHUD.add(this.managerHUDText);
  }

  updateManagerHUD() {
    if (this.managerHUDText) {
      this.managerHUDText.setText(`DEFEATED: ${this.managersKilled}/${this.totalManagers}`);

      // Pulse effect
      this.tweens.add({
        targets: this.managerHUDText,
        scale: 1.3,
        duration: 100,
        yoyo: true
      });
    }
  }

  createExitBarrier() {
    const pos = this.config.exitPosition;

    this.exitBarrier = this.add.container(pos.x, pos.y);

    // Red security barrier
    const barrier = this.add.rectangle(0, 0, 70, 100, 0xff0000, 0.6);
    this.exitBarrier.add(barrier);

    // Security stripes
    for (let i = -40; i < 45; i += 15) {
      const stripe = this.add.rectangle(0, i, 65, 5, 0xffff00, 0.8);
      this.exitBarrier.add(stripe);
    }

    // Lock icon
    const lockBg = this.add.circle(0, -10, 15, 0x000000, 0.8);
    const lockBody = this.add.rectangle(0, -5, 20, 18, 0xffaa00);
    const lockShackle = this.add.rectangle(0, -20, 14, 12, 0x000000, 0);
    lockShackle.setStrokeStyle(3, 0xffaa00);
    this.exitBarrier.add([lockBg, lockBody, lockShackle]);

    // Barrier label
    this.barrierLabel = this.add.text(0, 55, 'KEYCARD\nREQUIRED', {
      font: 'bold 9px monospace',
      fill: '#ff4444',
      align: 'center'
    }).setOrigin(0.5);
    this.exitBarrier.add(this.barrierLabel);

    // Glitch animation
    this.time.addEvent({
      delay: 200,
      callback: () => {
        if (!this.exitBarrier || !this.exitBarrier.active) return;
        barrier.setAlpha(Phaser.Math.FloatBetween(0.4, 0.7));
      },
      loop: true
    });
  }

  showLevelObjective() {
    this.time.delayedCall(4000, () => {
      const objective = this.add.text(
        this.cameras.main.scrollX + 400,
        150,
        `OBJECTIVE: Defeat all ${this.totalManagers} Middle Managers\nto obtain the keycard`,
        {
          font: '14px monospace',
          fill: '#ff00ff',
          align: 'center',
          backgroundColor: '#000000cc',
          padding: { x: 15, y: 10 }
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(1500);

      this.tweens.add({
        targets: objective,
        alpha: 0,
        duration: 500,
        delay: 4000,
        onComplete: () => objective.destroy()
      });
    });
  }

  showManagerKillEffect(x, y) {
    // Success text
    const successText = this.add.text(x, y - 30, `MANAGER DOWN! (${this.managersKilled}/${this.totalManagers})`, {
      font: 'bold 14px monospace',
      fill: '#ff00ff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Magenta particles
    for (let i = 0; i < 15; i++) {
      const particle = this.add.circle(
        x + Phaser.Math.Between(-20, 20),
        y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(3, 6),
        0xff00ff, 1
      );

      this.tweens.add({
        targets: particle,
        y: particle.y - 50,
        alpha: 0,
        duration: 600,
        onComplete: () => particle.destroy()
      });
    }

    this.tweens.add({
      targets: successText,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      onComplete: () => successText.destroy()
    });

    this.cameras.main.flash(100, 255, 0, 255);
  }

  spawnKeycard() {
    // Spawn keycard near player
    const keycardX = this.player.x;
    const keycardY = this.player.y - 50;

    console.log('Spawning keycard at', keycardX, keycardY);

    // Epic keycard drop effect
    this.cameras.main.shake(300, 0.02);
    this.cameras.main.flash(300, 255, 0, 255);

    // Announcement
    const announcement = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      'ALL MANAGERS DEFEATED!\n\nKEYCARD DROPPED!',
      {
        font: 'bold 24px monospace',
        fill: '#ff00ff',
        align: 'center',
        backgroundColor: '#000000dd',
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(2500, () => {
      if (announcement && announcement.active) {
        this.tweens.add({
          targets: announcement,
          alpha: 0,
          duration: 500,
          onComplete: () => announcement.destroy()
        });
      }
    });

    // Create keycard pickup
    this.keycard = this.add.container(keycardX, keycardY);

    // Keycard glow
    const glow = this.add.circle(0, 0, 25, 0xff00ff, 0.4);
    this.keycard.add(glow);

    // Keycard shape
    const card = this.add.rectangle(0, 0, 30, 20, 0xff00ff);
    this.keycard.add(card);

    // Chip on card
    const chip = this.add.rectangle(-5, 0, 8, 6, 0xffff00);
    this.keycard.add(chip);

    // Magnetic stripe
    const stripe = this.add.rectangle(0, 6, 25, 3, 0x000000);
    this.keycard.add(stripe);

    // Label
    const label = this.add.text(0, -25, 'KEYCARD', {
      font: 'bold 10px monospace',
      fill: '#ff00ff'
    }).setOrigin(0.5);
    this.keycard.add(label);

    // Physics for pickup
    this.physics.add.existing(this.keycard);
    this.keycard.body.setSize(40, 30);
    this.keycard.body.setAllowGravity(false);

    // Floating animation
    this.tweens.add({
      targets: this.keycard,
      y: keycardY - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow pulse
    this.tweens.add({
      targets: glow,
      alpha: 0.2,
      scale: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Setup pickup collision
    this.physics.add.overlap(
      this.player,
      this.keycard,
      this.handleKeycardPickup,
      null,
      this
    );
  }

  handleKeycardPickup(player, keycard) {
    if (this.keycardCollected) return;
    this.keycardCollected = true;

    console.log('Keycard collected!');

    // Collection effect
    this.cameras.main.flash(200, 255, 0, 255);

    const collectMsg = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      'KEYCARD ACQUIRED!\n\nExit is now unlocked.',
      {
        font: 'bold 20px monospace',
        fill: '#00ff00',
        align: 'center',
        backgroundColor: '#000000dd',
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(2000, () => {
      if (collectMsg && collectMsg.active) collectMsg.destroy();
    });

    // Remove keycard
    this.tweens.add({
      targets: this.keycard,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        if (this.keycard) {
          this.keycard.destroy();
          this.keycard = null;
        }
      }
    });

    // Unlock exit
    this.unlockExit();
  }

  unlockExit() {
    // Remove barrier
    if (this.exitBarrier) {
      this.tweens.add({
        targets: this.exitBarrier,
        alpha: 0,
        scale: 1.5,
        duration: 500,
        onComplete: () => {
          this.exitBarrier.destroy();
          this.exitBarrier = null;
        }
      });
    }

    // Update exit visuals
    this.exitLabel.setText('EXIT\n[UNLOCKED]');
    this.exitLabel.setColor('#00ff00');
    this.exitGlow.setFillStyle(0x00ff00, 0.5);
  }

  // Override exit handling
  handleExitReached(player, exitZone) {
    if (this.levelComplete) return;

    // Check if keycard collected
    if (!this.keycardCollected) {
      if (!this.exitHintShown) {
        this.exitHintShown = true;

        let hintMsg = 'Exit is locked!';
        if (this.managersKilled < this.totalManagers) {
          hintMsg = `Defeat all managers!\n(${this.managersKilled}/${this.totalManagers})`;
        } else if (!this.keycardCollected) {
          hintMsg = 'Collect the keycard!';
        }

        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 100,
          hintMsg,
          {
            font: '12px monospace',
            fill: '#ff4444',
            align: 'center',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
          }
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

    // Keycard collected - allow exit
    this.handleLevelComplete();
  }

  // Override respawn to reset Level 2 specific states
  respawnPlayer() {
    super.respawnPlayer();

    // Reset Level 2 specific states
    this.managersKilled = 0;
    this.hasKeycard = false;
    this.keycardCollected = false;
    this.exitHintShown = false;

    // Destroy existing keycard if any
    if (this.keycard) {
      this.keycard.destroy();
      this.keycard = null;
    }

    // Recount managers (they respawn via parent)
    this.totalManagers = 0;
    this.setupManagerTracking();

    // Update HUD
    this.updateManagerHUD();

    // Destroy existing barrier and recreate
    if (this.exitBarrier) {
      this.exitBarrier.destroy();
      this.exitBarrier = null;
    }
    this.createExitBarrier();

    // Reset exit visuals to locked state
    this.exitLabel.setText('EXIT\n[LOCKED]');
    this.exitLabel.setColor('#ff4444');
    if (this.exitGlow) {
      this.exitGlow.setFillStyle(0xff0000, 0.5);
    }
  }
}
