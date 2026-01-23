import Phaser from 'phaser';
import BaseLevelScene from './BaseLevelScene.js';
import Boss from '../entities/Boss.js';
import { GEM_TYPES } from '../systems/GemSystem.js';

export default class Level5Scene extends BaseLevelScene {
  constructor() {
    super('Level5Scene', 'level5');
  }

  create() {
    super.create();

    // Level 5 specific: Boss with Executive Shield - only Founder Mode can break it
    this.bossSpawned = false;
    this.boss = null;
    this.bossShieldActive = true;
    this.shieldBreakCount = 0;
    this.requiredShieldBreaks = 3; // Need to break shield 3 times to defeat boss

    // Boss trigger zone
    this.bossTrigger = this.add.rectangle(1900, 400, 50, 400, 0xff0000, 0);
    this.physics.add.existing(this.bossTrigger, true);

    this.physics.add.overlap(
      this.player,
      this.bossTrigger,
      this.triggerBoss,
      null,
      this
    );

    // Listen for Founder Mode activation
    this.events.on('abilityUsed', this.onAbilityUsed, this);
    this.events.on('abilityEnded', this.onAbilityEnded, this);

    // Show level objective after intro
    this.showLevelObjective();
  }

  triggerBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;

    // Dramatic entrance
    this.cameras.main.shake(500, 0.02);

    // Boss warning
    const warning = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      'WARNING: EXECUTIVE DETECTED',
      {
        font: 'bold 24px monospace',
        fill: '#ff0000',
        backgroundColor: '#000000aa',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0);

    this.time.delayedCall(2000, () => {
      warning.destroy();
      this.spawnBoss();
    });
  }

  spawnBoss() {
    const pos = this.config.bossPosition;
    this.boss = new Boss(this, pos.x, pos.y);
    this.boss.setTarget(this.player);

    // Add boss to physics
    this.physics.add.collider(this.boss, this.platforms);

    // Player attack -> Boss (with shield check)
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.boss,
      this.handleBossHit,
      null,
      this
    );

    // Boss -> Player
    this.physics.add.overlap(
      this.player,
      this.boss,
      this.handleBossContact,
      null,
      this
    );

    // Boss projectiles -> Player
    this.physics.add.overlap(
      this.player,
      this.boss.getProjectiles(),
      this.handleBossProjectile,
      null,
      this
    );

    // Boss death event
    this.boss.on('died', this.handleBossDeath, this);

    // Create shield visual
    this.createBossShield();

    // Create shield HUD
    this.createShieldHUD();
  }

  createBossShield() {
    if (!this.boss) return;

    this.bossShield = this.add.container(this.boss.x, this.boss.y);

    // Shield layers
    this.shieldOuter = this.add.circle(0, 0, 70, 0xff8800, 0.2);
    this.shieldMiddle = this.add.circle(0, 0, 55, 0xff8800, 0.3);
    this.shieldInner = this.add.circle(0, 0, 40, 0xff8800, 0.4);
    this.bossShield.add([this.shieldOuter, this.shieldMiddle, this.shieldInner]);

    // Shield label
    this.shieldLabel = this.add.text(0, -90, 'EXECUTIVE SHIELD', {
      font: 'bold 10px monospace',
      fill: '#ff8800',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    this.bossShield.add(this.shieldLabel);

    // Hint text
    this.shieldHint = this.add.text(0, 90, 'USE FOUNDER MODE (K)', {
      font: '9px monospace',
      fill: '#ff8800',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.bossShield.add(this.shieldHint);

    // Rotating animation
    this.tweens.add({
      targets: this.shieldOuter,
      rotation: Math.PI * 2,
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    });

    this.tweens.add({
      targets: this.shieldMiddle,
      rotation: -Math.PI * 2,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    });

    // Pulse animation
    this.tweens.add({
      targets: [this.shieldOuter, this.shieldMiddle, this.shieldInner],
      scale: 1.1,
      alpha: '+=0.1',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  createShieldHUD() {
    this.shieldHUD = this.add.container(400, 50).setScrollFactor(0).setDepth(1000);

    const bg = this.add.rectangle(0, 0, 250, 50, 0x000000, 0.8);
    this.shieldHUD.add(bg);

    // Boss name
    const bossName = this.add.text(0, -12, 'THE CEO', {
      font: 'bold 12px monospace',
      fill: '#ff8800'
    }).setOrigin(0.5);
    this.shieldHUD.add(bossName);

    // Shield status
    this.shieldStatusText = this.add.text(0, 8, `SHIELD: ACTIVE (${this.shieldBreakCount}/${this.requiredShieldBreaks} breaks)`, {
      font: '10px monospace',
      fill: '#ff8800'
    }).setOrigin(0.5);
    this.shieldHUD.add(this.shieldStatusText);
  }

  onAbilityUsed(gemId) {
    if (gemId === 'alignment') {
      // Founder Mode activated - shield becomes vulnerable
      if (this.bossShieldActive && this.boss && this.boss.isAlive) {
        this.weakenShield();
      }
    }
  }

  weakenShield() {
    // Visual feedback - shield turns orange/yellow
    if (this.shieldOuter) {
      this.shieldOuter.setFillStyle(0xffff00, 0.3);
      this.shieldMiddle.setFillStyle(0xffff00, 0.4);
      this.shieldInner.setFillStyle(0xffff00, 0.5);
    }

    // Update hint
    if (this.shieldHint) {
      this.shieldHint.setText('ATTACK NOW!');
      this.shieldHint.setColor('#ffff00');
    }

    // Update HUD
    if (this.shieldStatusText) {
      this.shieldStatusText.setText('SHIELD: VULNERABLE!');
      this.shieldStatusText.setColor('#ffff00');
    }
  }

  onAbilityEnded(gemId) {
    if (gemId === 'alignment') {
      // Founder Mode ended - shield reactivates
      this.restoreShield();
    }
  }

  restoreShield() {
    if (!this.bossShieldActive || !this.boss || !this.boss.isAlive) return;

    // Visual feedback - back to orange
    if (this.shieldOuter) {
      this.shieldOuter.setFillStyle(0xff8800, 0.2);
      this.shieldMiddle.setFillStyle(0xff8800, 0.3);
      this.shieldInner.setFillStyle(0xff8800, 0.4);
    }

    // Update hint
    if (this.shieldHint) {
      this.shieldHint.setText('USE FOUNDER MODE (K)');
      this.shieldHint.setColor('#ff8800');
    }

    // Update HUD
    if (this.shieldStatusText) {
      this.shieldStatusText.setText(`SHIELD: ACTIVE (${this.shieldBreakCount}/${this.requiredShieldBreaks} breaks)`);
      this.shieldStatusText.setColor('#ff8800');
    }
  }

  handleBossHit(attackHitbox, boss) {
    if (!this.player.isAttacking || !boss.isAlive) return;

    // Check if player is in Founder Mode
    const isFounderMode = this.player.superModeActive;

    if (this.bossShieldActive && !isFounderMode) {
      // Shield blocks attack
      this.showShieldBlock();
      return;
    }

    // Deal damage
    const knockbackDir = boss.x > this.player.x ? 1 : -1;
    const damage = isFounderMode ? this.player.attackDamage * 3 : this.player.attackDamage;
    boss.takeDamage(damage, knockbackDir);

    // Check for shield break threshold
    if (isFounderMode && this.bossShieldActive) {
      this.checkShieldBreak();
    }
  }

  showShieldBlock() {
    // Visual feedback for blocked attack
    this.cameras.main.shake(100, 0.01);

    const blockText = this.add.text(
      this.boss.x,
      this.boss.y - 80,
      'SHIELD BLOCKS!',
      {
        font: 'bold 12px monospace',
        fill: '#ff8800',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: blockText,
      y: blockText.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => blockText.destroy()
    });

    // Hint to use Founder Mode
    if (!this.shieldHintShown) {
      this.shieldHintShown = true;

      const hint = this.add.text(
        this.cameras.main.scrollX + 400,
        500,
        'Use FOUNDER MODE (K) to break through the Executive Shield!',
        {
          font: '14px monospace',
          fill: '#ff8800',
          backgroundColor: '#000000cc',
          padding: { x: 15, y: 10 }
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(1500);

      this.time.delayedCall(3000, () => {
        if (hint && hint.active) {
          this.tweens.add({
            targets: hint,
            alpha: 0,
            duration: 300,
            onComplete: () => hint.destroy()
          });
        }
      });
    }
  }

  checkShieldBreak() {
    // Shield break happens at health thresholds
    const healthPercent = this.boss.health / this.boss.maxHealth;
    const requiredThreshold = 1 - ((this.shieldBreakCount + 1) / this.requiredShieldBreaks);

    if (healthPercent <= requiredThreshold && this.shieldBreakCount < this.requiredShieldBreaks) {
      this.breakShield();
    }
  }

  breakShield() {
    this.shieldBreakCount++;

    // Epic break effect
    this.cameras.main.shake(300, 0.03);
    this.cameras.main.flash(300, 255, 136, 0);

    // Shield break particles
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        this.boss.x + Phaser.Math.Between(-50, 50),
        this.boss.y + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(5, 12),
        0xff8800,
        0.8
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 100;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 600,
        onComplete: () => particle.destroy()
      });
    }

    // Announcement
    const breakText = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      `SHIELD CRACKED!\n${this.shieldBreakCount}/${this.requiredShieldBreaks}`,
      {
        font: 'bold 24px monospace',
        fill: '#ffaa00',
        align: 'center',
        backgroundColor: '#000000dd',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(1500, () => {
      if (breakText && breakText.active) {
        this.tweens.add({
          targets: breakText,
          alpha: 0,
          duration: 300,
          onComplete: () => breakText.destroy()
        });
      }
    });

    // Check if shield is fully broken
    if (this.shieldBreakCount >= this.requiredShieldBreaks) {
      this.destroyShield();
    } else {
      // Update HUD
      this.updateShieldHUD();
    }
  }

  destroyShield() {
    this.bossShieldActive = false;

    // Epic destruction
    this.cameras.main.shake(500, 0.04);
    this.cameras.main.flash(500, 255, 200, 0);

    // Destroy shield visual
    if (this.bossShield) {
      this.tweens.add({
        targets: this.bossShield,
        scale: 3,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.bossShield.destroy();
          this.bossShield = null;
        }
      });
    }

    // Big announcement
    const destroyText = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      'EXECUTIVE SHIELD DESTROYED!\n\nThe CEO is vulnerable!',
      {
        font: 'bold 24px monospace',
        fill: '#00ff00',
        align: 'center',
        backgroundColor: '#000000dd',
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

    this.time.delayedCall(2500, () => {
      if (destroyText && destroyText.active) {
        this.tweens.add({
          targets: destroyText,
          alpha: 0,
          duration: 500,
          onComplete: () => destroyText.destroy()
        });
      }
    });

    // Update HUD
    if (this.shieldStatusText) {
      this.shieldStatusText.setText('SHIELD: DESTROYED');
      this.shieldStatusText.setColor('#00ff00');
    }
  }

  updateShieldHUD() {
    if (this.shieldStatusText) {
      this.shieldStatusText.setText(`SHIELD: CRACKED (${this.shieldBreakCount}/${this.requiredShieldBreaks} breaks)`);
    }
  }

  handleBossContact(player, boss) {
    if (!boss.isAlive || player.isInvulnerable) return;
    const knockbackDir = player.x > boss.x ? 1 : -1;
    player.takeDamage(boss.contactDamage, knockbackDir);
  }

  handleBossProjectile(player, projectile) {
    if (player.isInvulnerable) return;

    // If player has shield active, reflect projectile
    if (player.shieldActive) {
      this.reflectProjectile(projectile);
      return;
    }

    const knockbackDir = player.x > projectile.x ? 1 : -1;
    player.takeDamage(projectile.damage || 1, knockbackDir);
    projectile.destroy();
  }

  reflectProjectile(projectile) {
    if (!this.boss || !this.boss.isAlive) {
      projectile.destroy();
      return;
    }

    // Change direction toward boss
    const angle = Phaser.Math.Angle.Between(
      projectile.x, projectile.y,
      this.boss.x, this.boss.y
    );

    projectile.body.setVelocity(
      Math.cos(angle) * 350,
      Math.sin(angle) * 350
    );

    // Visual change
    projectile.setFillStyle(0x00ff00);

    // Flash effect
    this.cameras.main.flash(100, 0, 255, 0);
  }

  handleBossDeath() {
    // Epic victory
    this.cameras.main.flash(1000, 255, 255, 255);

    this.time.delayedCall(1500, () => {
      this.handleLevelComplete();
    });
  }

  handleLevelComplete() {
    if (this.levelComplete) return;
    this.levelComplete = true;

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    const overlay = this.add.rectangle(
      this.cameras.main.scrollX + 400, 300,
      800, 600, 0x000000, 0.9
    ).setScrollFactor(0);

    this.add.text(
      this.cameras.main.scrollX + 400, 200,
      'CONGRATULATIONS!',
      { font: 'bold 40px monospace', fill: '#00ff00' }
    ).setOrigin(0.5).setScrollFactor(0);

    this.add.text(
      this.cameras.main.scrollX + 400, 280,
      'You have conquered Corporate Gauntlet\nand mastered all 5 AI concepts.',
      { font: '16px monospace', fill: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setScrollFactor(0);

    // Show all gems
    const gemColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff8800];
    gemColors.forEach((color, i) => {
      this.add.rectangle(
        this.cameras.main.scrollX + 300 + i * 50, 360,
        30, 30, color
      ).setScrollFactor(0);
    });

    this.add.text(
      this.cameras.main.scrollX + 400, 420,
      'Press SPACE to return to menu',
      { font: '14px monospace', fill: '#888888' }
    ).setOrigin(0.5).setScrollFactor(0);

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('MenuScene');
    });
  }

  showLevelObjective() {
    this.time.delayedCall(4000, () => {
      const objective = this.add.text(
        this.cameras.main.scrollX + 400,
        150,
        'OBJECTIVE: Defeat THE CEO\nUse Freedom Gem FOUNDER MODE (K) to break the Executive Shield!',
        {
          font: '14px monospace',
          fill: '#ff8800',
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

  // Override exit handling - need to beat boss first
  handleExitReached() {
    if (!this.boss || this.boss.isAlive) {
      if (!this.exitHintShown) {
        this.exitHintShown = true;
        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 100,
          'Defeat the boss first!',
          { font: '12px monospace', fill: '#ff8888' }
        ).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
          hint.destroy();
          this.exitHintShown = false;
        });
      }
      return;
    }

    super.handleExitReached();
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.boss && this.boss.isAlive) {
      this.boss.update();

      // Update shield position to follow boss
      if (this.bossShield && this.bossShieldActive) {
        this.bossShield.setPosition(this.boss.x, this.boss.y);
      }
    }
  }

  // Override respawn to reset Level 5 specific states
  respawnPlayer() {
    super.respawnPlayer();

    // Reset Level 5 specific states
    this.bossSpawned = false;
    this.bossShieldActive = true;
    this.shieldBreakCount = 0;
    this.shieldHintShown = false;
    this.exitHintShown = false;

    // Destroy boss if exists
    if (this.boss) {
      if (this.boss.patternTimer) {
        this.boss.patternTimer.remove();
      }
      if (this.boss.projectiles) {
        this.boss.projectiles.clear(true, true);
      }
      this.boss.destroy();
      this.boss = null;
    }

    // Destroy shield visual
    if (this.bossShield) {
      this.bossShield.destroy();
      this.bossShield = null;
    }

    // Destroy shield HUD
    if (this.shieldHUD) {
      this.shieldHUD.destroy();
      this.shieldHUD = null;
    }
  }
}
