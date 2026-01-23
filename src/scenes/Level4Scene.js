import Phaser from 'phaser';
import BaseLevelScene from './BaseLevelScene.js';

export default class Level4Scene extends BaseLevelScene {
  constructor() {
    super('Level4Scene', 'level4');
  }

  create() {
    super.create();

    // Level 4 specific: Reflect projectiles at Negativity Barrier using Resilience gem
    this.reflectedHits = 0;
    this.requiredHits = 3;
    this.barrierDestroyed = false;
    this.toxicOrbs = this.physics.add.group();

    // Create the Negativity Barrier blocking exit
    this.createNegativityBarrier();

    // Override exit label
    this.exitLabel.setText('EXIT\n[BLOCKED]');
    this.exitLabel.setColor('#ff4444');

    // Create toxic orb spawners (HR representatives shooting negativity)
    this.createToxicSpawners();

    // Show level objective
    this.showLevelObjective();

    // Create barrier HUD
    this.createBarrierHUD();

    // Listen for shield activation
    this.events.on('abilityUsed', this.onAbilityUsed, this);

    // Setup reflection collision
    this.setupReflectionMechanics();
  }

  createNegativityBarrier() {
    const pos = this.config.exitPosition;

    this.negativityBarrier = this.add.container(pos.x, pos.y);

    // Toxic green barrier
    this.barrierBg = this.add.rectangle(0, 0, 80, 120, 0x00ff00, 0.3);
    this.negativityBarrier.add(this.barrierBg);

    // Swirling toxicity effect (multiple layers)
    this.toxicLayers = [];
    for (let i = 0; i < 3; i++) {
      const layer = this.add.circle(0, 0, 35 - i * 8, 0x00ff00, 0.2 + i * 0.1);
      this.negativityBarrier.add(layer);
      this.toxicLayers.push(layer);

      // Rotating animation
      this.tweens.add({
        targets: layer,
        rotation: Math.PI * 2 * (i % 2 === 0 ? 1 : -1),
        duration: 3000 - i * 500,
        repeat: -1,
        ease: 'Linear'
      });
    }

    // Barrier icon (toxic symbol)
    const iconBg = this.add.circle(0, 0, 20, 0x000000, 0.8);
    const icon = this.add.text(0, 0, '☢', {
      font: 'bold 24px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);
    this.negativityBarrier.add([iconBg, icon]);

    // Hit counter display
    this.barrierCounter = this.add.text(0, 45, `${this.reflectedHits}/${this.requiredHits}`, {
      font: 'bold 14px monospace',
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.negativityBarrier.add(this.barrierCounter);

    // Label
    const label = this.add.text(0, 65, 'NEGATIVITY\nBARRIER', {
      font: 'bold 8px monospace',
      fill: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);
    this.negativityBarrier.add(label);

    // Physics body for barrier
    this.physics.add.existing(this.negativityBarrier);
    this.negativityBarrier.body.setSize(80, 120);
    this.negativityBarrier.body.setAllowGravity(false);
    this.negativityBarrier.body.setImmovable(true);

    // Pulsing animation
    this.tweens.add({
      targets: this.barrierBg,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  createToxicSpawners() {
    // Positions for toxic orb spawners (HR stations)
    const spawnerPositions = [
      { x: 500, y: 300 },
      { x: 900, y: 250 },
      { x: 1300, y: 280 },
      { x: 1700, y: 320 }
    ];

    this.toxicSpawners = [];

    spawnerPositions.forEach((pos, index) => {
      const spawner = this.createToxicSpawner(pos.x, pos.y, index);
      this.toxicSpawners.push(spawner);
    });
  }

  createToxicSpawner(x, y, index) {
    const spawner = this.add.container(x, y);

    // HR terminal look
    const terminal = this.add.rectangle(0, 0, 50, 60, 0x333333);
    terminal.setStrokeStyle(2, 0x00ff00);
    spawner.add(terminal);

    // Screen
    const screen = this.add.rectangle(0, -10, 35, 25, 0x001100);
    spawner.add(screen);

    // "HR" label
    const label = this.add.text(0, -10, 'HR', {
      font: 'bold 12px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);
    spawner.add(label);

    // Hint
    const hint = this.add.text(0, -50, 'REFLECT WITH I', {
      font: '8px monospace',
      fill: '#00ff00',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 2 }
    }).setOrigin(0.5);
    spawner.add(hint);

    // Spawn timer - fire toxic orbs at player
    spawner.spawnTimer = this.time.addEvent({
      delay: 2500 + index * 500,
      callback: () => this.spawnToxicOrb(x, y),
      loop: true
    });

    spawner.active = true;
    return spawner;
  }

  spawnToxicOrb(x, y) {
    if (this.barrierDestroyed || !this.player || !this.player.isAlive) return;

    const orb = this.add.container(x, y);

    // Orb visual
    const glow = this.add.circle(0, 0, 18, 0x00ff00, 0.3);
    const core = this.add.circle(0, 0, 12, 0x00ff00, 0.8);
    const inner = this.add.circle(0, 0, 6, 0xffffff, 0.5);

    orb.add([glow, core, inner]);

    // Physics
    this.physics.add.existing(orb);
    orb.body.setCircle(15);
    orb.body.setAllowGravity(false);

    // Calculate direction to player
    const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
    const speed = 180;
    orb.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    orb.isReflected = false;
    orb.damage = 1;

    // Store reference for reflection mechanics
    this.toxicOrbs.add(orb);

    // Spinning animation
    this.tweens.add({
      targets: [core, inner],
      rotation: Math.PI * 2,
      duration: 500,
      repeat: -1,
      ease: 'Linear'
    });

    // Glow pulse
    this.tweens.add({
      targets: glow,
      scale: 1.4,
      alpha: 0.1,
      duration: 300,
      yoyo: true,
      repeat: -1
    });

    // Destroy after timeout
    this.time.delayedCall(8000, () => {
      if (orb && orb.active) {
        orb.destroy();
      }
    });
  }

  setupReflectionMechanics() {
    // Player collision with toxic orbs
    this.physics.add.overlap(
      this.player,
      this.toxicOrbs,
      this.handleOrbCollision,
      null,
      this
    );

    // Reflected orbs hitting barrier
    this.physics.add.overlap(
      this.negativityBarrier,
      this.toxicOrbs,
      this.handleBarrierHit,
      null,
      this
    );
  }

  onAbilityUsed(gemId) {
    if (gemId === 'generalization') {
      // Reflect any nearby orbs
      this.reflectNearbyOrbs();
    }
  }

  reflectNearbyOrbs() {
    const reflectRange = 100;

    this.toxicOrbs.getChildren().forEach(orb => {
      if (!orb || !orb.active || orb.isReflected) return;

      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        orb.x, orb.y
      );

      if (distance < reflectRange) {
        this.reflectOrb(orb);
      }
    });
  }

  reflectOrb(orb) {
    if (orb.isReflected) return;
    orb.isReflected = true;

    // Visual change - turns yellow/orange when reflected
    orb.getAll().forEach(child => {
      if (child.type === 'Arc') {
        child.setFillStyle(0xffaa00, child.fillAlpha);
      }
    });

    // Reverse direction toward barrier
    const angle = Phaser.Math.Angle.Between(
      orb.x, orb.y,
      this.negativityBarrier.x, this.negativityBarrier.y
    );
    const speed = 300;
    orb.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Flash effect
    this.cameras.main.flash(100, 255, 170, 0);

    // Success text
    const text = this.add.text(this.player.x, this.player.y - 40, 'REFLECTED!', {
      font: 'bold 14px monospace',
      fill: '#ffaa00',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy()
    });
  }

  handleOrbCollision(player, orb) {
    if (!orb || !orb.active) return;

    // If shield is active, reflect the orb
    if (this.player.shieldActive && !orb.isReflected) {
      this.reflectOrb(orb);
      return;
    }

    // If not reflected (enemy orb), damage player
    if (!orb.isReflected && !player.isInvulnerable) {
      const knockbackDir = player.x > orb.x ? 1 : -1;
      player.takeDamage(orb.damage, knockbackDir);
      orb.destroy();
    }
  }

  handleBarrierHit(barrier, orb) {
    if (!orb || !orb.active || !orb.isReflected) return;
    if (this.barrierDestroyed) return;

    this.reflectedHits++;
    this.updateBarrierHUD();

    // Hit effect
    this.cameras.main.shake(200, 0.015);

    // Damage visual on barrier
    const hitFlash = this.add.circle(
      this.negativityBarrier.x + Phaser.Math.Between(-20, 20),
      this.negativityBarrier.y + Phaser.Math.Between(-30, 30),
      30, 0xffaa00, 0.8
    );

    this.tweens.add({
      targets: hitFlash,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => hitFlash.destroy()
    });

    // Update barrier counter
    this.barrierCounter.setText(`${this.reflectedHits}/${this.requiredHits}`);

    // Success message
    const msg = this.add.text(
      this.negativityBarrier.x,
      this.negativityBarrier.y - 70,
      `BARRIER HIT ${this.reflectedHits}/${this.requiredHits}`,
      {
        font: 'bold 12px monospace',
        fill: '#ffaa00',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => msg.destroy()
    });

    // Destroy the orb
    orb.destroy();

    // Check if barrier should be destroyed
    if (this.reflectedHits >= this.requiredHits) {
      this.destroyBarrier();
    }
  }

  destroyBarrier() {
    this.barrierDestroyed = true;

    // Stop spawners
    this.toxicSpawners.forEach(spawner => {
      if (spawner.spawnTimer) {
        spawner.spawnTimer.destroy();
      }
    });

    // Clear remaining orbs
    this.toxicOrbs.clear(true, true);

    // Epic destruction effect
    this.cameras.main.shake(500, 0.03);
    this.cameras.main.flash(500, 0, 255, 0);

    // Explosion particles
    for (let i = 0; i < 30; i++) {
      const particle = this.add.circle(
        this.negativityBarrier.x + Phaser.Math.Between(-30, 30),
        this.negativityBarrier.y + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(5, 15),
        0x00ff00,
        0.8
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 800,
        onComplete: () => particle.destroy()
      });
    }

    // Destroy barrier with animation
    this.tweens.add({
      targets: this.negativityBarrier,
      scale: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.negativityBarrier.destroy();
        this.negativityBarrier = null;
      }
    });

    // Announcement
    const announcement = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      'NEGATIVITY BARRIER DESTROYED!\n\nYou turned their toxicity against them!',
      {
        font: 'bold 20px monospace',
        fill: '#00ff00',
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

    // Unlock exit
    this.unlockExit();
  }

  unlockExit() {
    this.exitLabel.setText('EXIT\n[UNLOCKED]');
    this.exitLabel.setColor('#00ff00');
    this.exitGlow.setFillStyle(0x00ff00, 0.5);
  }

  createBarrierHUD() {
    this.barrierHUD = this.add.container(700, 60).setScrollFactor(0).setDepth(1000);

    const bg = this.add.rectangle(0, 0, 180, 40, 0x000000, 0.7);
    this.barrierHUD.add(bg);

    const icon = this.add.text(-70, 0, '☢', {
      font: 'bold 16px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);
    this.barrierHUD.add(icon);

    this.barrierHUDText = this.add.text(15, 0, `BARRIER: ${this.reflectedHits}/${this.requiredHits}`, {
      font: '12px monospace',
      fill: '#00ff00'
    }).setOrigin(0.5);
    this.barrierHUD.add(this.barrierHUDText);
  }

  updateBarrierHUD() {
    if (this.barrierHUDText) {
      this.barrierHUDText.setText(`BARRIER: ${this.reflectedHits}/${this.requiredHits}`);

      this.tweens.add({
        targets: this.barrierHUDText,
        scale: 1.3,
        duration: 100,
        yoyo: true
      });
    }
  }

  showLevelObjective() {
    this.time.delayedCall(4000, () => {
      const objective = this.add.text(
        this.cameras.main.scrollX + 400,
        150,
        'OBJECTIVE: Destroy the Negativity Barrier\nUse Resilience Shield (I) to reflect toxic orbs back!',
        {
          font: '14px monospace',
          fill: '#00ff00',
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

  // Override exit handling
  handleExitReached(player, exitZone) {
    if (this.levelComplete) return;

    if (!this.barrierDestroyed) {
      if (!this.exitHintShown) {
        this.exitHintShown = true;

        let hintMsg = 'Exit is blocked!';
        if (!this.gemSystem.hasGem('generalization')) {
          hintMsg = 'Find the Resilience Gem first!';
        } else {
          hintMsg = `Destroy the barrier with I!\n(${this.reflectedHits}/${this.requiredHits} hits)`;
        }

        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 100,
          hintMsg,
          {
            font: '12px monospace',
            fill: '#00ff00',
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

    // Barrier destroyed - allow exit
    this.handleLevelComplete();
  }

  // Override respawn to reset Level 4 specific states
  respawnPlayer() {
    super.respawnPlayer();

    // Reset Level 4 specific states
    this.reflectedHits = 0;
    this.barrierDestroyed = false;
    this.exitHintShown = false;

    // Clear toxic orbs
    this.toxicOrbs.clear(true, true);

    // Update HUD
    this.updateBarrierHUD();

    // Recreate barrier if destroyed
    if (!this.negativityBarrier) {
      this.createNegativityBarrier();
    }

    // Update barrier counter
    if (this.barrierCounter) {
      this.barrierCounter.setText(`${this.reflectedHits}/${this.requiredHits}`);
    }

    // Reset exit visuals
    this.exitLabel.setText('EXIT\n[BLOCKED]');
    this.exitLabel.setColor('#ff4444');
    if (this.exitGlow) {
      this.exitGlow.setFillStyle(0x00ff00, 0.5);
    }

    // Restart spawners
    this.toxicSpawners.forEach((spawner, index) => {
      if (spawner.spawnTimer) {
        spawner.spawnTimer.destroy();
      }
      spawner.spawnTimer = this.time.addEvent({
        delay: 2500 + index * 500,
        callback: () => this.spawnToxicOrb(spawner.x, spawner.y),
        loop: true
      });
    });
  }

  update(time, delta) {
    super.update(time, delta);

    // Clean up orbs that are out of bounds
    this.toxicOrbs.getChildren().forEach(orb => {
      if (orb && orb.active) {
        if (orb.x < -50 || orb.x > this.config.width + 50 ||
            orb.y < -50 || orb.y > this.config.height + 50) {
          orb.destroy();
        }
      }
    });
  }
}
