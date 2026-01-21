import Phaser from 'phaser';

export default class ComplianceBot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'tank');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(40, 52);
    this.body.setOffset(6, 16);
    this.setScale(1);

    // Stats - tank enemy (high HP, slow, area denial)
    this.maxHealth = 6;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.damage = 2; // Hits harder

    // Movement - very slow
    this.moveSpeed = 30;
    this.detectionRange = 180;
    this.attackRange = 50;
    this.patrolDirection = 1;

    // Slam attack (area denial)
    this.state = 'patrol';
    this.isAttacking = false;
    this.attackCooldown = false;
    this.attackDuration = 1000;
    this.attackCooldownTime = 2500;
    this.isTelegraphing = false;
    this.telegraphDuration = 800; // Long telegraph - easy to dodge

    this.target = null;
    this.patrolLeft = x - 60;
    this.patrolRight = x + 60;

    // Shockwave reference
    this.shockwave = null;

    // Visual
    this.stateIndicator = scene.add.text(x, y - 40, '', {
      font: '10px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // Health bar
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
  }

  setTarget(player) {
    this.target = player;
  }

  update() {
    if (!this.isAlive) return;

    this.updateState();
    this.executeState();
    this.updateStateIndicator();
    this.updateHealthBar();
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
        this.setVelocityX(0);
        break;
    }
  }

  patrol() {
    this.setVelocityX(this.moveSpeed * this.patrolDirection);

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
    this.setVelocityX(this.moveSpeed * direction);
    this.setFlipX(direction < 0);
  }

  beginAttack() {
    if (this.isAttacking || this.attackCooldown) return;

    this.isAttacking = true;
    this.isTelegraphing = true;
    this.setVelocityX(0);

    // Long telegraph - jump up, glow red
    this.setTint(0xff4400);

    // Show danger zone
    this.dangerZone = this.scene.add.circle(this.x, this.y + 20, 80, 0xff0000, 0.2);

    // Rise up animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      duration: this.telegraphDuration * 0.7,
      ease: 'Power2'
    });

    this.scene.time.delayedCall(this.telegraphDuration, () => {
      if (!this.isAlive) {
        if (this.dangerZone) this.dangerZone.destroy();
        return;
      }

      this.isTelegraphing = false;

      // Slam down
      this.scene.tweens.add({
        targets: this,
        y: this.y + 30,
        duration: 100,
        ease: 'Power4',
        onComplete: () => {
          this.executeSlam();
        }
      });
    });
  }

  executeSlam() {
    if (this.dangerZone) this.dangerZone.destroy();

    // Create shockwave
    this.shockwave = this.scene.add.circle(this.x, this.y + 20, 20, 0xff6600, 0.6);
    this.scene.physics.add.existing(this.shockwave, true);
    this.shockwave.damage = this.damage;

    // Expand shockwave
    this.scene.tweens.add({
      targets: this.shockwave,
      scale: 4,
      alpha: 0,
      duration: 400,
      onUpdate: () => {
        if (this.shockwave && this.shockwave.body) {
          // Update physics body size
          const scale = this.shockwave.scale;
          this.shockwave.body.setCircle(20 * scale);
          this.shockwave.body.setOffset(-20 * scale + 20, -20 * scale + 20);
        }
      },
      onComplete: () => {
        if (this.shockwave) {
          this.shockwave.destroy();
          this.shockwave = null;
        }
      }
    });

    // Screen shake
    this.scene.cameras.main.shake(200, 0.01);

    // End attack
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
  }

  getShockwave() {
    return this.shockwave;
  }

  takeDamage(amount, knockbackDirection = 0) {
    if (!this.isAlive) return;

    // Tank takes reduced knockback
    this.health -= amount;
    this.setVelocityX(knockbackDirection * 50);

    this.flashDamage();

    if (this.health <= 0) {
      this.die();
    }
  }

  flashDamage() {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.isAlive && this.scene && !this.isTelegraphing) this.clearTint();
    });
  }

  die() {
    this.isAlive = false;
    this.state = 'dead';
    this.setTint(0x444444);
    this.setVelocityX(0);
    this.body.enable = false;

    if (this.dangerZone) this.dangerZone.destroy();
    if (this.shockwave) this.shockwave.destroy();

    // Big screen shake for tank death
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.cameras.main.flash(150, 255, 100, 0);

    // Massive death particle explosion
    this.spawnDeathParticles();

    // Corporate death message
    this.showDeathMessage();

    // Slower death for big enemy
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.5,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.stateIndicator.destroy();
        this.healthBar.destroy();
        this.destroy();
      }
    });
  }

  spawnDeathParticles() {
    // Large explosion - metal/orange particles
    for (let i = 0; i < 35; i++) {
      const particle = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-20, 20),
        this.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(3, 10),
        Phaser.Math.Between(3, 10),
        Math.random() > 0.6 ? 0xff6600 : (Math.random() > 0.5 ? 0xffaa00 : 0x888888),
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 4,
        alpha: 0,
        scale: 0.1,
        duration: 600 + Math.random() * 500,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Shockwave rings
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(this.x, this.y, 15, 0xff6600, 0);
      ring.setStrokeStyle(4 - i, 0xff6600, 0.8);

      this.scene.tweens.add({
        targets: ring,
        scale: 6 + i * 2,
        alpha: 0,
        duration: 500 + i * 150,
        delay: i * 100,
        ease: 'Power2',
        onComplete: () => ring.destroy()
      });
    }

    // Smoke particles rising
    for (let i = 0; i < 12; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        if (!this.scene) return;
        const smoke = this.scene.add.circle(
          this.x + Phaser.Math.Between(-15, 15),
          this.y + Phaser.Math.Between(-10, 10),
          Phaser.Math.Between(5, 12),
          0x333333,
          0.6
        );

        this.scene.tweens.add({
          targets: smoke,
          y: smoke.y - 80 - Math.random() * 40,
          x: smoke.x + Phaser.Math.Between(-20, 20),
          scale: 2,
          alpha: 0,
          duration: 800 + Math.random() * 400,
          ease: 'Power1',
          onComplete: () => smoke.destroy()
        });
      });
    }

    // Sparks/electricity
    for (let i = 0; i < 8; i++) {
      const spark = this.scene.add.circle(
        this.x + Phaser.Math.Between(-15, 15),
        this.y + Phaser.Math.Between(-15, 15),
        2,
        0xffff00,
        1
      );

      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-50, 50),
        y: spark.y + Phaser.Math.Between(-60, -20),
        alpha: 0,
        duration: 200 + Math.random() * 200,
        onComplete: () => spark.destroy()
      });
    }

    // Falling debris
    for (let i = 0; i < 6; i++) {
      const debris = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y,
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        0x666666,
        1
      );

      this.scene.tweens.add({
        targets: debris,
        y: debris.y + 100,
        x: debris.x + Phaser.Math.Between(-30, 30),
        rotation: Math.random() * Math.PI * 3,
        alpha: 0,
        duration: 800,
        delay: Math.random() * 200,
        ease: 'Bounce.easeOut',
        onComplete: () => debris.destroy()
      });
    }
  }

  showDeathMessage() {
    const messages = [
      'COMPLIANCE\nVOIDED',
      'SYSTEM\nERROR',
      'SHUTDOWN\nCOMPLETE',
      'PROTOCOL\nBREACH',
      'FIREWALL\nDOWN',
      'AUDIT\nFAILED',
      'SECTOR\nCLEARED'
    ];

    const msg = Phaser.Utils.Array.GetRandom(messages);
    const text = this.scene.add.text(this.x, this.y - 30, msg, {
      font: 'bold 14px monospace',
      fill: '#ff6600',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      scale: 1.3,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  updateStateIndicator() {
    this.stateIndicator.setPosition(this.x, this.y - 45);

    // Corporate-themed state labels
    const labels = {
      patrol: 'VP OF SALES',
      chase: 'CLOSING DEAL',
      attack: 'POWER MOVE',
      dead: 'GOLDEN PARACHUTE'
    };
    this.stateIndicator.setText(labels[this.state] || this.state.toUpperCase());

    const colors = {
      patrol: '#88ff88',
      chase: '#ffff88',
      attack: '#ff4400',
      dead: '#888888'
    };
    this.stateIndicator.setColor(colors[this.state] || '#ffffff');
  }

  updateHealthBar() {
    this.healthBar.clear();

    const barWidth = 40;
    const barHeight = 4;
    const x = this.x - barWidth / 2;
    const y = this.y - 35;

    // Background
    this.healthBar.fillStyle(0x333333, 1);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.fillStyle(0xff4444, 1);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
  }

  isTelegraphingAttack() {
    return this.isTelegraphing;
  }
}
