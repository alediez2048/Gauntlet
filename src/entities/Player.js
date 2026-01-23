import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics setup
    this.setCollideWorldBounds(true);
    this.body.setSize(28, 40);
    this.body.setOffset(7, 14);
    this.setScale(1);

    // Player stats
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.isAttacking = false;
    this.isInvulnerable = false;
    this.attackCooldown = false;
    this.facingRight = true;

    // Gauntlet - required to use gem powers
    this.hasGauntlet = false;

    // Gem ability states
    this.isPowerStriking = false;
    this.isDashing = false;
    this.shieldActive = false;
    this.superModeActive = false;
    this.shield = null;
    this.superAura = null;

    // Movement config
    this.moveSpeed = 200;
    this.jumpForce = -400;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;

    // Attack config
    this.attackDamage = 1;
    this.attackDuration = 300;
    this.attackCooldownTime = 400;
    this.invulnerabilityTime = 1000;

    // Create attack hitbox (initially disabled) - larger hitbox for easier combat
    this.attackHitbox = scene.add.rectangle(x, y, 55, 45, 0xffaa00, 0);
    scene.physics.add.existing(this.attackHitbox, false);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.setVisible(false);

    // Gauntlet glow effect
    this.gauntletGlow = scene.add.circle(x + 20, y, 12, 0xffaa00, 0.3);
    this.gauntletGlow.setVisible(false);

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.J
    });

    // Track attack key state to prevent holding
    this.attackKeyWasPressed = false;

    // Track ground state for landing particles
    this.wasOnGround = true;
    this.footstepTimer = 0;
  }

  update() {
    if (!this.isAlive) return;

    const onGround = this.body.blocked.down || this.body.touching.down;

    // Landing particles
    if (onGround && !this.wasOnGround) {
      this.spawnLandingParticles();
    }
    this.wasOnGround = onGround;

    // Footstep particles while moving on ground
    if (onGround && Math.abs(this.body.velocity.x) > 50) {
      this.footstepTimer += 16;
      if (this.footstepTimer > 150) {
        this.spawnFootstepDust();
        this.footstepTimer = 0;
      }
    }

    this.handleMovement();
    this.handleJump();
    this.handleAttack();
    this.updateAttackHitbox();
    this.updateAbilities();
    this.updateGauntletVisuals();
  }

  updateGauntletVisuals() {
    // Initialize graphics if not exists
    if (!this.gemGraphics) {
      this.gemGraphics = this.scene.add.graphics();
      this.gemGraphics.setDepth(1000); // High depth to always be visible
    }

    this.gemGraphics.clear();

    // Only draw if player has gauntlet
    if (!this.hasGauntlet) return;

    const gems = this.scene.gemSystem ? this.scene.gemSystem.getCollectedGems() : [];
    if (gems.length === 0) return;

    const centerX = this.x;
    const centerY = this.y;
    const dir = this.flipX ? -1 : 1;

    // Gauntlet position offsets (adjusted to match the gauntlet on sprite)
    const gauntletX = centerX + (13 * dir);
    const gauntletY = centerY - 2;

    // Draw gems with better visibility
    gems.forEach((gem, index) => {
      let gx = gauntletX;
      let gy = gauntletY;

      // Position each gem type in a specific slot on the gauntlet
      if (gem.id === 'inference') {
        gy = gauntletY - 6; // Top slot
      } else if (gem.id === 'training') {
        gy = gauntletY + 2; // Middle slot
      } else if (gem.id === 'optimization') {
        gy = gauntletY + 8; // Lower slot
        gx = gauntletX - (2 * dir);
      } else if (gem.id === 'generalization') {
        gy = gauntletY - 2;
        gx = gauntletX + (4 * dir);
      } else if (gem.id === 'alignment') {
        gy = gauntletY - 12; // Top of gauntlet
      }

      // Draw gem glow (outer)
      this.gemGraphics.fillStyle(gem.color, 0.4);
      this.gemGraphics.fillCircle(gx, gy, 6);

      // Draw gem core
      this.gemGraphics.fillStyle(gem.color, 1);
      this.gemGraphics.fillCircle(gx, gy, 4);

      // Draw gem shine highlight
      this.gemGraphics.fillStyle(0xffffff, 0.7);
      this.gemGraphics.fillCircle(gx - 1, gy - 1, 2);
    });
  }

  spawnLandingParticles() {
    // Dust cloud on landing
    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y + 16,
        Phaser.Math.Between(2, 4),
        0x888888,
        0.6
      );

      const direction = i < 3 ? -1 : 1;
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + direction * (15 + Math.random() * 20),
        y: particle.y - 5 - Math.random() * 10,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => particle.destroy()
      });
    }
  }

  spawnFootstepDust() {
    const particle = this.scene.add.circle(
      this.x + (this.facingRight ? -8 : 8),
      this.y + 15,
      Phaser.Math.Between(1, 3),
      0x666666,
      0.4
    );

    this.scene.tweens.add({
      targets: particle,
      y: particle.y - 10,
      alpha: 0,
      duration: 200,
      onComplete: () => particle.destroy()
    });
  }

  handleMovement() {
    const leftPressed = this.cursors.left.isDown || this.keys.left.isDown;
    const rightPressed = this.cursors.right.isDown || this.keys.right.isDown;

    if (leftPressed && !this.isAttacking) {
      this.setVelocityX(-this.moveSpeed);
      this.facingRight = false;
      this.setFlipX(true);
    } else if (rightPressed && !this.isAttacking) {
      this.setVelocityX(this.moveSpeed);
      this.facingRight = true;
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }
  }

  handleJump() {
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump);
    const onGround = this.body.blocked.down || this.body.touching.down;

    if (onGround) {
      this.hasDoubleJumped = false;
    }

    if (jumpPressed) {
      if (onGround) {
        this.setVelocityY(this.jumpForce);
        this.spawnJumpParticles();
      } else if (this.canDoubleJump && !this.hasDoubleJumped) {
        this.setVelocityY(this.jumpForce);
        this.hasDoubleJumped = true;
        this.spawnDoubleJumpParticles();
      }
    }
  }

  spawnJumpParticles() {
    // Burst of dust when jumping
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + 16,
        Phaser.Math.Between(2, 4),
        0x888888,
        0.5
      );

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-15, 15),
        y: particle.y + 10,
        alpha: 0,
        duration: 250,
        onComplete: () => particle.destroy()
      });
    }
  }

  spawnDoubleJumpParticles() {
    // Gauntlet energy burst for double jump
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.scene.add.circle(
        this.x,
        this.y,
        3,
        0xffaa00,
        0.8
      );

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 30,
        y: particle.y + Math.sin(angle) * 30,
        alpha: 0,
        scale: 0,
        duration: 300,
        onComplete: () => particle.destroy()
      });
    }

    // Ring effect
    const ring = this.scene.add.circle(this.x, this.y, 5, 0xffaa00, 0);
    ring.setStrokeStyle(2, 0xffaa00, 0.8);

    this.scene.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy()
    });
  }

  handleAttack() {
    const attackPressed = this.keys.attack.isDown;

    // Only trigger attack on key down, not hold
    if (attackPressed && !this.attackKeyWasPressed && !this.attackCooldown && !this.isAttacking) {
      this.performAttack();
    }

    this.attackKeyWasPressed = attackPressed;
  }

  performAttack() {
    this.isAttacking = true;
    this.attackCooldown = true;
    this.attackHitbox.body.enable = true;

    // Show gauntlet glow
    this.gauntletGlow.setVisible(true);
    this.gauntletGlow.setAlpha(0.8);

    // Spawn attack particles
    this.spawnAttackParticles();

    // Small screen shake
    this.scene.cameras.main.shake(50, 0.003);

    // Gauntlet pulse animation
    this.scene.tweens.add({
      targets: this.gauntletGlow,
      scale: { from: 1, to: 2 },
      alpha: { from: 0.8, to: 0 },
      duration: this.attackDuration
    });

    // End attack after duration
    this.scene.time.delayedCall(this.attackDuration, () => {
      if (!this.scene || !this.isAlive) return;
      this.isAttacking = false;
      this.attackHitbox.body.enable = false;
      this.gauntletGlow.setVisible(false);
      this.gauntletGlow.setScale(1);
    });

    // Reset cooldown
    this.scene.time.delayedCall(this.attackCooldownTime, () => {
      if (!this.scene) return;
      this.attackCooldown = false;
    });
  }

  spawnAttackParticles() {
    const offsetX = this.facingRight ? 30 : -30;
    const baseX = this.x + offsetX;
    const baseY = this.y;

    // Create energy particles
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.circle(
        baseX + Phaser.Math.Between(-10, 10),
        baseY + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(2, 5),
        0xffaa00,
        1
      );

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + (this.facingRight ? 40 : -40) + Phaser.Math.Between(-20, 20),
        y: particle.y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        scale: 0,
        duration: 200 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  updateAttackHitbox() {
    const offsetX = this.facingRight ? 35 : -35;
    this.attackHitbox.setPosition(this.x + offsetX, this.y);

    // Update gauntlet glow position
    const glowOffsetX = this.facingRight ? 20 : -20;
    this.gauntletGlow.setPosition(this.x + glowOffsetX, this.y);
  }

  takeDamage(amount, knockbackDirection = 0) {
    if (this.isInvulnerable || !this.isAlive) return;

    this.health -= amount;
    this.isInvulnerable = true;

    // Corporate Gauntlet: Dialogue Hook
    if (Math.random() < 0.3 && this.scene.dialogue) {
      this.scene.dialogue.trigger('hit');
    }

    // Knockback
    const knockbackForce = 250;
    this.setVelocityX(knockbackDirection * knockbackForce);
    this.setVelocityY(-150);

    // Screen shake
    this.scene.cameras.main.shake(150, 0.01);

    // Damage particles
    this.spawnDamageParticles();

    // Visual feedback - flash red
    this.flashDamage();

    // Check death
    if (this.health <= 0) {
      this.die();
      return;
    }

    // Invulnerability period
    this.scene.time.delayedCall(this.invulnerabilityTime, () => {
      if (!this.scene || !this.isAlive) return;
      this.isInvulnerable = false;
      this.setAlpha(1);
    });
  }

  spawnDamageParticles() {
    for (let i = 0; i < 12; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-15, 15),
        this.y + Phaser.Math.Between(-20, 10),
        Phaser.Math.Between(2, 4),
        0xff3333,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed + 30,
        alpha: 0,
        scale: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  flashDamage() {
    let flashCount = 0;
    const flashTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        this.setAlpha(this.alpha === 1 ? 0.3 : 1);
        this.setTint(flashCount % 2 === 0 ? 0xff0000 : 0xffffff);
        flashCount++;
        if (flashCount >= 10) {
          flashTimer.destroy();
          this.setAlpha(1);
          this.clearTint();
        }
      },
      repeat: 9
    });
  }

  die() {
    this.isAlive = false;
    this.setTint(0xff0000);
    this.setVelocityX(0);

    // Clean up ability states
    this.isPowerStriking = false;
    this.isDashing = false;
    this.shieldActive = false;
    this.superModeActive = false;

    if (this.shield) {
      this.shield.destroy();
      this.shield = null;
    }
    if (this.superAura) {
      this.superAura.remove();
      this.superAura = null;
    }

    // Screen effects
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.cameras.main.flash(200, 255, 0, 0);

    // Gauntlet overload particles
    this.spawnDeathParticles();

    // Dramatic slow-mo effect
    this.scene.time.timeScale = 0.5;
    this.scene.time.delayedCall(500, () => {
      if (this.scene) this.scene.time.timeScale = 1;
    });

    // Death animation - fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        if (this.scene) {
          this.scene.events.emit('playerDied');
        }
      }
    });
  }

  spawnDeathParticles() {
    // Gauntlet energy dispersing
    for (let i = 0; i < 25; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-15, 15),
        this.y + Phaser.Math.Between(-20, 10),
        Phaser.Math.Between(2, 5),
        Math.random() > 0.5 ? 0xffaa00 : 0xff4444,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Data stream effect (binary looking)
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        if (!this.scene) return;
        const data = this.scene.add.text(
          this.x + Phaser.Math.Between(-20, 20),
          this.y,
          Math.random() > 0.5 ? '1' : '0',
          { font: '12px monospace', fill: '#00ff00' }
        ).setOrigin(0.5);

        this.scene.tweens.add({
          targets: data,
          y: data.y - 60,
          alpha: 0,
          duration: 500,
          onComplete: () => data.destroy()
        });
      });
    }
  }

  showDeathMessage() {
    const messages = [
      'EMPLOYEE TERMINATED',
      'PERFORMANCE FAILURE',
      'PRODUCTIVITY: 0%',
      'MISSION FAILED',
      'SYSTEM SHUTDOWN'
    ];

    const msg = Phaser.Utils.Array.GetRandom(messages);
    const overlay = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0)
      .setScrollFactor(0).setDepth(5000);

    this.scene.tweens.add({
      targets: overlay,
      fillAlpha: 0.7,
      duration: 500
    });

    const text = this.scene.add.text(
      this.scene.cameras.main.scrollX + 400,
      200,
      msg,
      {
        font: 'bold 36px monospace',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(5001).setAlpha(0);

    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      duration: 300,
      delay: 200
    });
  }

  respawn(x, y) {
    this.setPosition(x, y);
    this.health = this.maxHealth;
    this.isAlive = true;
    this.isInvulnerable = false;
    this.setAlpha(1);
    this.clearTint();
    this.setVelocity(0, 0);

    // Reset attack states - critical for movement to work
    this.isAttacking = false;
    this.attackCooldown = false;
    this.attackHitbox.body.enable = false;
    this.attackKeyWasPressed = false;

    // Reset ability states
    this.isPowerStriking = false;
    this.isDashing = false;
    this.shieldActive = false;
    this.superModeActive = false;

    // Re-enable physics body in case it was disabled
    if (this.body) {
      this.body.enable = true;
    }

    this.scene.events.emit('playerRespawned');
  }

  // Equip the gauntlet - changes player appearance
  equipGauntlet() {
    if (this.hasGauntlet) return;

    this.hasGauntlet = true;
    this.setTexture('player_gauntlet');
    this.gauntletGlow.setVisible(true);
  }

  // Get attack hitbox for collision detection
  getAttackHitbox() {
    return this.attackHitbox;
  }

  // ========== GEM ABILITIES ==========

  // TRAINING GEM - Power Strike (3x damage single hit)
  activatePowerStrike() {
    if (this.isPowerStriking) return;

    this.isPowerStriking = true;
    this.attackDamage *= 3;

    // Visual effect - glow purple
    this.setTint(0xff00ff);
    this.gauntletGlow.setFillStyle(0xff00ff, 0.8);

    // Create power aura
    const aura = this.scene.add.circle(this.x, this.y, 30, 0xff00ff, 0.4);
    this.scene.tweens.add({
      targets: aura,
      scale: 2,
      alpha: 0,
      duration: 800,
      onComplete: () => aura.destroy()
    });

    // Auto-attack when power strike is activated (makes it much easier to use)
    if (!this.isAttacking && !this.attackCooldown) {
      this.performAttack();
    }

    // Power lasts 1.5 seconds - enough time to land a hit
    this.scene.time.delayedCall(1500, () => {
      if (!this.scene) return;
      this.isPowerStriking = false;
      this.attackDamage = Math.round(this.attackDamage / 3);
      this.clearTint();
      this.gauntletGlow.setFillStyle(0xffaa00, 0.3);
    });
  }

  // OPTIMIZATION GEM - Dash through enemies
  activateDash() {
    if (this.isDashing) return;

    this.isDashing = true;
    this.isInvulnerable = true;

    // Dash direction based on facing
    const dashSpeed = 600;
    const direction = this.facingRight ? 1 : -1;
    this.setVelocityX(dashSpeed * direction);

    // Visual effect - yellow streak
    this.setTint(0xffff00);
    this.setAlpha(0.7);

    // Leave afterimages
    for (let i = 0; i < 4; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        if (!this.scene) return;
        const ghost = this.scene.add.rectangle(
          this.x, this.y, 28, 40, 0xffff00, 0.5
        );
        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 200,
          onComplete: () => ghost.destroy()
        });
      });
    }

    this.scene.time.delayedCall(200, () => {
      if (!this.scene) return;
      this.isDashing = false;
      this.isInvulnerable = false;
      this.clearTint();
      this.setAlpha(1);
    });
  }

  // GENERALIZATION GEM - Reflect Shield
  activateShield() {
    if (this.shieldActive) return;

    this.shieldActive = true;

    // Create visible shield
    this.shield = this.scene.add.circle(this.x, this.y, 50, 0x00ff00, 0.3);
    this.shield.setStrokeStyle(3, 0x00ff00, 1);

    // Shield hitbox for reflecting projectiles
    this.scene.physics.add.existing(this.shield, false);
    this.shield.body.setCircle(50);
    this.shield.body.setAllowGravity(false);

    this.scene.time.delayedCall(2000, () => {
      if (!this.scene) return;
      this.shieldActive = false;
      if (this.shield) {
        this.shield.destroy();
        this.shield = null;
      }
    });
  }

  // ALIGNMENT GEM - Super Mode
  activateSuperMode() {
    if (this.superModeActive) return;

    this.superModeActive = true;
    this.isInvulnerable = true;
    this.attackDamage *= 2;

    // Epic visual effect
    this.setTint(0xff8800);

    // Particle aura
    this.superAura = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.scene || !this.superModeActive) return;
        const particle = this.scene.add.circle(
          this.x + Phaser.Math.Between(-20, 20),
          this.y + Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(3, 6),
          0xff8800, 0.8
        );
        this.scene.tweens.add({
          targets: particle,
          y: particle.y - 40,
          alpha: 0,
          duration: 400,
          onComplete: () => particle.destroy()
        });
      },
      loop: true
    });

    // Screen effect
    this.scene.cameras.main.flash(300, 255, 136, 0);

    this.scene.time.delayedCall(5000, () => {
      if (!this.scene) return;
      this.superModeActive = false;
      this.isInvulnerable = false;
      this.attackDamage = Math.round(this.attackDamage / 2);
      this.clearTint();
      if (this.superAura) {
        this.superAura.remove();
        this.superAura = null;
      }
    });
  }

  // Update shield position
  updateAbilities() {
    if (this.shield && this.shieldActive) {
      this.shield.setPosition(this.x, this.y);
    }
  }

  // Get shield for collision detection
  getShield() {
    return this.shield;
  }
}
