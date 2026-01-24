import Phaser from 'phaser';

export default class DroneZombie extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy');

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics setup
    this.setCollideWorldBounds(true);
    this.body.setSize(28, 42);
    this.body.setOffset(7, 14);

    // Enemy stats
    this.maxHealth = 3;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.damage = 1;

    // Movement
    this.moveSpeed = 60;
    this.detectionRange = 200;
    this.attackRange = 40;
    this.patrolDirection = 1;

    // State machine
    this.state = 'patrol'; // patrol, chase, attack, hurt, dead
    this.isAttacking = false;
    this.attackCooldown = false;
    this.attackDuration = 500;
    this.attackCooldownTime = 1500;

    // Telegraph (for Inference Gem later)
    this.isTelegraphing = false;
    this.telegraphDuration = 400;

    // Reference to player (set by scene)
    this.target = null;

    // Patrol bounds
    this.patrolLeft = x - 100;
    this.patrolRight = x + 100;

    // Visual indicator for state (debug)
    this.stateIndicator = scene.add.text(x, y - 30, '', {
      font: '10px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);
  }

  setTarget(player) {
    this.target = player;
  }

  // AI Controller adaptive parameters
  setAdaptiveParams(params) {
    this.adaptiveParams = params;

    // Adjust behavior based on player profile
    if (params.telegraphMultiplier) {
      this.currentTelegraphDuration = this.telegraphDuration * params.telegraphMultiplier;
    }
    if (params.aggressionMultiplier) {
      this.currentMoveSpeed = this.moveSpeed * params.aggressionMultiplier;
    }
  }

  update() {
    if (!this.isAlive) return;

    this.updateState();
    this.executeState();
    this.updateStateIndicator();
  }

  updateState() {
    if (!this.target || !this.target.isAlive) {
      this.state = 'patrol';
      return;
    }

    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.target.x, this.target.y
    );

    if (this.isAttacking) {
      this.state = 'attack';
      return;
    }

    if (distanceToPlayer <= this.attackRange && !this.attackCooldown) {
      this.state = 'attack';
      this.beginAttack();
    } else if (distanceToPlayer <= this.detectionRange) {
      this.state = 'chase';
    } else {
      this.state = 'patrol';
    }
  }

  executeState() {
    switch (this.state) {
      case 'patrol':
        this.patrol();
        break;
      case 'chase':
        this.chase();
        break;
      case 'attack':
        // Attack handled by beginAttack
        this.setVelocityX(0);
        break;
    }
  }

  patrol() {
    this.setVelocityX(this.moveSpeed * this.patrolDirection);

    // Reverse at patrol bounds
    if (this.x >= this.patrolRight) {
      this.patrolDirection = -1;
      this.setFlipX(true);
    } else if (this.x <= this.patrolLeft) {
      this.patrolDirection = 1;
      this.setFlipX(false);
    }
  }

  chase() {
    if (!this.target) return;

    const direction = this.target.x > this.x ? 1 : -1;
    const speed = this.currentMoveSpeed || this.moveSpeed;
    this.setVelocityX(speed * 1.5 * direction);
    this.setFlipX(direction < 0);
  }

  beginAttack() {
    if (this.isAttacking || this.attackCooldown) return;

    this.isAttacking = true;
    this.isTelegraphing = true;
    this.setVelocityX(0);

    // Telegraph phase - enemy glows before attacking
    this.setTint(0xffaa00);

    this.scene.time.delayedCall(this.telegraphDuration, () => {
      if (!this.isAlive || !this.scene) return;

      this.isTelegraphing = false;
      this.setTint(0xff0000);

      // Execute attack
      this.executeAttack();

      this.scene.time.delayedCall(this.attackDuration - this.telegraphDuration, () => {
        if (!this.isAlive || !this.scene) return;
        this.isAttacking = false;
        this.attackCooldown = true;
        this.clearTint();

        this.scene.time.delayedCall(this.attackCooldownTime, () => {
          if (!this.scene) return;
          this.attackCooldown = false;
        });
      });
    });
  }

  executeAttack() {
    // Check if player is still in range
    if (!this.target || !this.target.isAlive) return;

    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.target.x, this.target.y
    );

    if (distanceToPlayer <= this.attackRange + 20) {
      const knockbackDir = this.target.x > this.x ? 1 : -1;
      this.target.takeDamage(this.damage, knockbackDir);
    }
  }

  takeDamage(amount, knockbackDirection = 0) {
    if (!this.isAlive) return;

    this.health -= amount;

    // Knockback
    this.setVelocityX(knockbackDirection * 150);
    this.setVelocityY(-100);

    // Visual feedback
    this.flashDamage();

    // Interrupt attack
    this.isAttacking = false;
    this.isTelegraphing = false;

    if (this.health <= 0) {
      this.die();
    }
  }

  flashDamage() {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.isAlive && this.scene) this.clearTint();
    });
  }

  die() {
    this.isAlive = false;
    this.state = 'dead';
    this.setTint(0x666666);
    this.setVelocityX(0);
    this.body.enable = false;

    // Screen shake on kill
    this.scene.cameras.main.shake(100, 0.005);

    // Spawn death particles - pixel dissolution effect
    this.spawnDeathParticles();

    // Corporate death message floating up
    this.showDeathMessage();

    // Chance to drop a heart (40% chance)
    if (Math.random() < 0.4 && this.scene.spawnHeartPickup) {
      this.scene.spawnHeartPickup(this.x, this.y);
    }

    // Death animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 1.5,
      y: this.y - 10,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.stateIndicator.destroy();
        this.destroy();
      }
    });
  }

  spawnDeathParticles() {
    // Pixel dissolution - corporate gray/green particles
    for (let i = 0; i < 20; i++) {
      const particle = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-12, 12),
        this.y + Phaser.Math.Between(-16, 16),
        Phaser.Math.Between(2, 6),
        Phaser.Math.Between(2, 6),
        Math.random() > 0.5 ? 0x88aa88 : 0x445544,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed - 20,
        alpha: 0,
        rotation: Math.random() * Math.PI * 2,
        duration: 400 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Spark/electricity effect
    for (let i = 0; i < 5; i++) {
      const spark = this.scene.add.circle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(1, 3),
        0xffff00,
        1
      );

      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-30, 30),
        y: spark.y + Phaser.Math.Between(-40, -10),
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }

    // Soul/data leaving body effect (ascending squares)
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        if (!this.scene) return;
        const soul = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-5, 5),
          this.y,
          4, 4,
          0x00ff88,
          0.8
        );

        this.scene.tweens.add({
          targets: soul,
          y: soul.y - 80,
          alpha: 0,
          duration: 600,
          ease: 'Power1',
          onComplete: () => soul.destroy()
        });
      });
    }
  }

  showDeathMessage() {
    const messages = [
      'TERMINATED',
      'PERFORMANCE\nUNSATISFACTORY',
      'CONTRACT\nENDED',
      'DOWNSIZED',
      'LAID OFF',
      'EXIT\nINTERVIEW',
      'SEVERANCE\nDENIED',
      'QUOTA\nUNMET'
    ];

    const msg = Phaser.Utils.Array.GetRandom(messages);
    const text = this.scene.add.text(this.x, this.y - 20, msg, {
      font: 'bold 10px monospace',
      fill: '#ff4444',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  updateStateIndicator() {
    this.stateIndicator.setPosition(this.x, this.y - 30);

    // Corporate-themed state labels
    const labels = {
      patrol: 'DRONE ZOMBIE',
      chase: 'TARGETING',
      attack: 'ATTACKING',
      dead: 'TERMINATED'
    };
    this.stateIndicator.setText(labels[this.state] || this.state.toUpperCase());

    // Color based on state
    const colors = {
      patrol: '#88ff88',
      chase: '#ffff88',
      attack: '#ff8888',
      dead: '#888888'
    };
    this.stateIndicator.setColor(colors[this.state] || '#ffffff');
  }

  // For Inference Gem - check if telegraphing
  isTelegraphingAttack() {
    return this.isTelegraphing;
  }

  // Clean up UI elements before destruction
  cleanup() {
    if (this.stateIndicator) {
      this.stateIndicator.destroy();
      this.stateIndicator = null;
    }
  }

  // Override destroy to ensure cleanup
  destroy(fromScene) {
    this.cleanup();
    super.destroy(fromScene);
  }
}
