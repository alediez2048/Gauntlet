import Phaser from 'phaser';

export default class MiddleManager extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'manager');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(30, 44);
    this.body.setOffset(8, 14);

    // Stats - ranged enemy (2 hits to kill when frozen)
    this.maxHealth = 2;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.damage = 1;
    this.isFrozen = false;

    // Movement - stays at range
    this.moveSpeed = 40;
    this.detectionRange = 300;
    this.preferredRange = 150; // Tries to maintain this distance
    this.attackRange = 250;
    this.patrolDirection = 1;

    // Ranged attack
    this.state = 'patrol';
    this.isAttacking = false;
    this.attackCooldown = false;
    this.attackDuration = 600;
    this.attackCooldownTime = 2000;
    this.isTelegraphing = false;
    this.telegraphDuration = 500;

    // Projectiles group (set by scene)
    this.projectiles = null;

    this.target = null;
    this.patrolLeft = x - 80;
    this.patrolRight = x + 80;

    // Visual
    this.stateIndicator = scene.add.text(x, y - 30, '', {
      font: '10px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);
  }

  setTarget(player) {
    this.target = player;
  }

  setProjectilesGroup(group) {
    this.projectiles = group;
  }

  update() {
    if (!this.isAlive) return;

    this.updateState();
    this.executeState();
    this.updateStateIndicator();
  }

  updateState() {
    // Don't update state while frozen
    if (this.isFrozen) {
      this.state = 'frozen';
      return;
    }

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
      // In range - attack
      if (distanceToPlayer < this.preferredRange) {
        this.state = 'retreat';
      } else {
        this.state = 'attack';
        this.beginAttack();
      }
    } else if (distanceToPlayer <= this.detectionRange) {
      if (distanceToPlayer < this.preferredRange) {
        this.state = 'retreat';
      } else {
        this.state = 'approach';
      }
    } else {
      this.state = 'patrol';
    }
  }

  executeState() {
    // Don't execute movement when frozen
    if (this.isFrozen) {
      this.setVelocityX(0);
      return;
    }

    switch (this.state) {
      case 'patrol':
        this.patrol();
        break;
      case 'approach':
        this.approach();
        break;
      case 'retreat':
        this.retreat();
        break;
      case 'attack':
        this.setVelocityX(0);
        break;
    }
  }

  patrol() {
    // Check for edges before moving
    if (this.isAtEdge(this.patrolDirection)) {
      this.patrolDirection *= -1;
      this.setFlipX(this.patrolDirection < 0);
    }

    this.setVelocityX(this.moveSpeed * this.patrolDirection);

    if (this.x >= this.patrolRight) {
      this.patrolDirection = -1;
      this.setFlipX(true);
    } else if (this.x <= this.patrolLeft) {
      this.patrolDirection = 1;
      this.setFlipX(false);
    }
  }

  approach() {
    if (!this.target) return;
    const direction = this.target.x > this.x ? 1 : -1;

    // Don't walk off edges when approaching
    if (this.isAtEdge(direction)) {
      this.setVelocityX(0);
      return;
    }

    this.setVelocityX(this.moveSpeed * direction);
    this.setFlipX(direction < 0);
  }

  retreat() {
    if (!this.target) return;
    const direction = this.target.x > this.x ? -1 : 1; // Move away

    // Don't walk off edges when retreating
    if (this.isAtEdge(direction)) {
      this.setVelocityX(0);
      return;
    }

    this.setVelocityX(this.moveSpeed * 1.5 * direction);
    this.setFlipX(direction > 0);
  }

  // Check if there's a pit/edge in the given direction
  isAtEdge(direction) {
    // Only check when on ground
    if (!this.body.blocked.down) return false;

    // Check a point ahead and below
    const checkX = this.x + (direction * 25);
    const checkY = this.y + 40;

    // Use a simple raycast-like check - see if there's a platform below
    const platforms = this.scene.platforms;
    if (!platforms) return false;

    let hasGroundAhead = false;
    platforms.getChildren().forEach(platform => {
      if (hasGroundAhead) return;

      const bounds = platform.getBounds();
      if (checkX >= bounds.left && checkX <= bounds.right &&
          checkY >= bounds.top && checkY <= bounds.bottom + 20) {
        hasGroundAhead = true;
      }
    });

    return !hasGroundAhead;
  }

  beginAttack() {
    if (this.isAttacking || this.attackCooldown) return;

    this.isAttacking = true;
    this.isTelegraphing = true;
    this.setVelocityX(0);

    // Telegraph - glow before shooting
    this.setTint(0xffaa00);

    // Show aim line
    this.aimLine = this.scene.add.graphics();
    this.updateAimLine();

    this.scene.time.delayedCall(this.telegraphDuration, () => {
      if (!this.isAlive) {
        if (this.aimLine) this.aimLine.destroy();
        return;
      }

      this.isTelegraphing = false;
      this.setTint(0xff00ff);

      if (this.aimLine) this.aimLine.destroy();

      // Fire projectile
      this.fireProjectile();

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

  updateAimLine() {
    if (!this.aimLine || !this.target) return;

    this.aimLine.clear();
    this.aimLine.lineStyle(2, 0xff0000, 0.5);
    this.aimLine.lineBetween(this.x, this.y, this.target.x, this.target.y);
  }

  fireProjectile() {
    if (!this.target || !this.projectiles) return;

    const projectile = this.scene.add.rectangle(this.x, this.y, 16, 8, 0xff00ff);
    this.scene.physics.add.existing(projectile);
    projectile.body.setAllowGravity(false);
    this.projectiles.add(projectile);

    // Calculate direction to player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const speed = 200;

    projectile.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    projectile.rotation = angle;
    projectile.damage = this.damage;

    // Destroy after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  takeDamage(amount, knockbackDirection = 0) {
    if (!this.isAlive) return;

    // Frozen enemies take guaranteed 1 damage minimum per hit
    const actualDamage = this.isFrozen ? Math.max(amount, 1) : amount;
    this.health -= actualDamage;

    // Less knockback if frozen
    if (!this.isFrozen) {
      this.setVelocityX(knockbackDirection * 120);
      this.setVelocityY(-80);
    }

    this.flashDamage();

    // Cancel attack
    this.isAttacking = false;
    this.isTelegraphing = false;
    if (this.aimLine) {
      this.aimLine.destroy();
      this.aimLine = null;
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  freeze(duration) {
    if (!this.isAlive) return;

    this.isFrozen = true;
    this.setVelocityX(0);
    this.setVelocityY(0);
    this.setTint(0x88ffff);

    // Cancel any attack in progress
    this.isAttacking = false;
    this.isTelegraphing = false;
    if (this.aimLine) {
      this.aimLine.destroy();
      this.aimLine = null;
    }

    // Unfreeze after duration
    if (this.freezeTimer) {
      this.freezeTimer.destroy();
    }

    this.freezeTimer = this.scene.time.delayedCall(duration, () => {
      if (this.isAlive && this.scene) {
        this.isFrozen = false;
        this.clearTint();
      }
    });
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

    if (this.aimLine) this.aimLine.destroy();

    // Screen shake
    this.scene.cameras.main.shake(100, 0.005);

    // Death particles - purple energy dissolution
    this.spawnDeathParticles();

    // Corporate death message
    this.showDeathMessage();

    // Chance to drop a heart (50% chance for managers)
    if (Math.random() < 0.5 && this.scene.spawnHeartPickup) {
      this.scene.spawnHeartPickup(this.x, this.y);
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 1.4,
      y: this.y - 20,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.stateIndicator.destroy();
        this.destroy();
      }
    });
  }

  spawnDeathParticles() {
    // Purple/magenta energy particles
    for (let i = 0; i < 18; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-12, 12),
        this.y + Phaser.Math.Between(-16, 16),
        Phaser.Math.Between(2, 5),
        Math.random() > 0.5 ? 0xff00ff : 0xaa44ff,
        1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 70;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed - 30,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Email/memo particles flying out
    for (let i = 0; i < 6; i++) {
      const memo = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + Phaser.Math.Between(-10, 10),
        8, 6,
        0xffffff,
        0.8
      );
      memo.rotation = Math.random() * Math.PI;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 50 + Math.random() * 40;

      this.scene.tweens.add({
        targets: memo,
        x: memo.x + Math.cos(angle) * speed,
        y: memo.y + Math.sin(angle) * speed,
        rotation: memo.rotation + Math.PI * 2,
        alpha: 0,
        duration: 600 + Math.random() * 300,
        ease: 'Power1',
        onComplete: () => memo.destroy()
      });
    }

    // Data stream rising
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 60, () => {
        if (!this.scene) return;
        const data = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-6, 6),
          this.y,
          3, 3,
          0xff00ff,
          0.9
        );

        this.scene.tweens.add({
          targets: data,
          y: data.y - 70,
          alpha: 0,
          duration: 500,
          ease: 'Power1',
          onComplete: () => data.destroy()
        });
      });
    }
  }

  showDeathMessage() {
    const messages = [
      'MEETING\nCANCELLED',
      'SYNERGY\nFAILED',
      'INBOX\nZERO',
      'REVIEW\nSKIPPED',
      'MEMO\nDELETED',
      'KPI\nMISSED',
      'BUDGET\nCUT'
    ];

    const msg = Phaser.Utils.Array.GetRandom(messages);
    const text = this.scene.add.text(this.x, this.y - 25, msg, {
      font: 'bold 10px monospace',
      fill: '#ff44ff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 45,
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
      patrol: 'MIDDLE MANAGER',
      approach: 'MICROMANAGING',
      retreat: 'DELEGATING',
      attack: 'PERFORMANCE REVIEW',
      frozen: 'ON HOLD',
      dead: 'LAID OFF'
    };
    this.stateIndicator.setText(labels[this.state] || this.state.toUpperCase());

    const colors = {
      patrol: '#88ff88',
      approach: '#ffff88',
      retreat: '#88ffff',
      attack: '#ff88ff',
      frozen: '#88ffff',
      dead: '#888888'
    };
    this.stateIndicator.setColor(colors[this.state] || '#ffffff');
  }

  isTelegraphingAttack() {
    return this.isTelegraphing;
  }
}
