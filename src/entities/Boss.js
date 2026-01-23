import Phaser from 'phaser';
import GameCycleManager from '../managers/GameCycleManager';

export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(52, 66);
    this.body.setOffset(10, 22);
    this.setScale(1);

    // Boss stats
    this.maxHealth = 20;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.contactDamage = 2;

    // Movement
    this.moveSpeed = 80;

    // Attack patterns
    this.state = 'idle';
    this.currentPattern = 0;
    this.patterns = ['charge', 'projectile', 'slam', 'summon'];
    this.patternCooldown = false;
    this.isAttacking = false;

    // Projectiles
    this.projectiles = scene.physics.add.group();

    this.target = null;

    // Visual
    this.healthBar = scene.add.graphics();
    this.nameText = scene.add.text(x, y - 70, 'THE CEO', {
      font: 'bold 14px monospace',
      fill: '#ff8800'
    }).setOrigin(0.5);

    this.stateText = scene.add.text(x, y - 55, '', {
      font: '10px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // Start pattern cycle
    this.startPatternCycle();
  }

  setTarget(player) {
    this.target = player;
  }

  getProjectiles() {
    return this.projectiles;
  }

  startPatternCycle() {
    this.patternTimer = this.scene.time.addEvent({
      delay: 3000,
      callback: this.executePattern,
      callbackScope: this,
      loop: true
    });
  }

  update() {
    if (!this.isAlive) return;

    this.updateHealthBar();
    this.updateNamePosition();

    if (!this.isAttacking && this.target && this.target.isAlive) {
      this.moveTowardsPlayer();
    }
  }

  moveTowardsPlayer() {
    if (!this.target) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

    if (distance > 150) {
      const direction = this.target.x > this.x ? 1 : -1;
      this.setVelocityX(this.moveSpeed * direction);
      this.setFlipX(direction < 0);
    } else {
      this.setVelocityX(0);
    }
  }

  executePattern() {
    if (!this.isAlive || this.isAttacking || !this.target || !this.target.isAlive) return;

    const pattern = this.patterns[this.currentPattern];
    this.currentPattern = (this.currentPattern + 1) % this.patterns.length;

    switch (pattern) {
      case 'charge':
        this.chargeAttack();
        break;
      case 'projectile':
        this.projectileAttack();
        break;
      case 'slam':
        this.slamAttack();
        break;
      case 'summon':
        this.summonAttack();
        break;
    }
  }

  chargeAttack() {
    this.isAttacking = true;
    this.state = 'charging';

    // Telegraph
    this.setTint(0xff0000);

    this.scene.time.delayedCall(800, () => {
      if (!this.isAlive || !this.scene) return;

      // Charge towards player
      const direction = this.target.x > this.x ? 1 : -1;
      this.setVelocityX(400 * direction);

      this.scene.time.delayedCall(600, () => {
        if (!this.isAlive || !this.scene) return;
        this.setVelocityX(0);
        this.isAttacking = false;
        this.state = 'idle';
        this.clearTint();
      });
    });
  }

  projectileAttack() {
    this.isAttacking = true;
    this.state = 'shooting';

    this.setTint(0xff00ff);
    this.setVelocityX(0);

    // Fire 3 projectiles
    let shotsFired = 0;
    const fireInterval = this.scene.time.addEvent({
      delay: 300,
      callback: () => {
        if (!this.isAlive || !this.scene) {
          fireInterval.destroy();
          return;
        }

        this.fireProjectile();
        shotsFired++;

        if (shotsFired >= 3) {
          fireInterval.destroy();
          this.isAttacking = false;
          this.state = 'idle';
          this.clearTint();
        }
      },
      repeat: 2
    });
  }

  fireProjectile() {
    if (!this.target || !this.scene) return;

    const projectile = this.scene.add.rectangle(this.x, this.y, 20, 20, 0xff00ff);
    this.scene.physics.add.existing(projectile);
    projectile.body.setAllowGravity(false);
    this.projectiles.add(projectile);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    projectile.body.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
    projectile.damage = 1;

    this.scene.time.delayedCall(4000, () => {
      if (projectile && projectile.active) projectile.destroy();
    });
  }

  slamAttack() {
    this.isAttacking = true;
    this.state = 'slamming';

    this.setTint(0xff8800);
    this.setVelocityX(0);

    // Jump up
    this.setVelocityY(-500);

    this.scene.time.delayedCall(600, () => {
      if (!this.isAlive || !this.scene) return;

      // Slam down
      this.setVelocityY(600);

      this.scene.time.delayedCall(400, () => {
        if (!this.isAlive || !this.scene) return;
        // Create shockwave
        const wave1 = this.createShockwave(-1);
        const wave2 = this.createShockwave(1);

        this.scene.cameras.main.shake(300, 0.02);

        this.isAttacking = false;
        this.state = 'idle';
        this.clearTint();
      });
    });
  }

  createShockwave(direction) {
    const wave = this.scene.add.rectangle(this.x, this.y + 30, 30, 20, 0xff8800, 0.8);
    this.scene.physics.add.existing(wave);
    wave.body.setAllowGravity(false);
    wave.body.setVelocityX(200 * direction);
    wave.damage = 1;

    this.projectiles.add(wave);

    this.scene.tweens.add({
      targets: wave,
      alpha: 0,
      scaleX: 2,
      duration: 1000,
      onComplete: () => wave.destroy()
    });

    return wave;
  }

  summonAttack() {
    this.isAttacking = true;
    this.state = 'summoning';

    this.setTint(0x00ffff);
    this.setVelocityX(0);

    // Create danger zones
    const zones = [];
    for (let i = 0; i < 3; i++) {
      const zoneX = this.target.x + Phaser.Math.Between(-100, 100);
      const zone = this.scene.add.rectangle(zoneX, 550, 60, 60, 0xff0000, 0.3);
      zones.push(zone);
    }

    this.scene.time.delayedCall(1000, () => {
      if (!this.isAlive || !this.scene) {
        zones.forEach(zone => zone.destroy());
        return;
      }

      // Drop projectiles on zones
      zones.forEach(zone => {
        const proj = this.scene.add.rectangle(zone.x, 0, 40, 40, 0xff4400);
        this.scene.physics.add.existing(proj);
        proj.body.setVelocityY(400);
        proj.damage = 2;
        this.projectiles.add(proj);

        zone.destroy();

        this.scene.time.delayedCall(2000, () => {
          if (proj && proj.active) proj.destroy();
        });
      });

      this.isAttacking = false;
      this.state = 'idle';
      this.clearTint();
    });
  }

  takeDamage(amount, knockbackDirection = 0) {
    if (!this.isAlive) return;

    this.health -= amount;

    // Minimal knockback for boss
    this.setVelocityX(knockbackDirection * 30);

    this.flashDamage();

    // Enrage at low health
    if (this.health <= this.maxHealth * 0.3 && !this.enraged) {
      this.enrage();
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  enrage() {
    this.enraged = true;
    this.moveSpeed = 120;

    // Visual indicator
    this.nameText.setText('THE CEO [DESPERATE]');
    this.nameText.setColor('#ff0000');
  }

  flashDamage() {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.isAlive && this.scene && !this.isAttacking) this.clearTint();
    });
  }

  die() {
    this.isAlive = false;
    this.state = 'dead';
    this.body.enable = false;

    // Clean up timers
    if (this.patternTimer) {
      this.patternTimer.remove();
      this.patternTimer = null;
    }

    // Clean up projectiles
    if (this.projectiles) {
      this.projectiles.clear(true, true);
    }

    // Epic death
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 2,
      scaleY: 0.2,
      angle: 360,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        this.nameText.destroy();
        this.stateText.destroy();
        this.healthBar.destroy();
        this.emit('died');

        // Corporate Gauntlet: Trigger Promotion Loop
        new GameCycleManager(this.scene).triggerPromotion();

        this.destroy();
      }
    });
  }

  updateHealthBar() {
    this.healthBar.clear();

    const barWidth = 100;
    const barHeight = 8;
    const x = this.x - barWidth / 2;
    const y = this.y - 50;

    // Background
    this.healthBar.fillStyle(0x333333, 1);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health
    const healthPercent = this.health / this.maxHealth;
    const color = healthPercent > 0.3 ? 0xff8800 : 0xff0000;
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);

    // Border
    this.healthBar.lineStyle(2, 0xffffff, 1);
    this.healthBar.strokeRect(x, y, barWidth, barHeight);
  }

  updateNamePosition() {
    this.nameText.setPosition(this.x, this.y - 70);
    this.stateText.setPosition(this.x, this.y - 55);

    // Corporate-themed state labels
    const labels = {
      idle: 'THE CEO',
      charging: 'HOSTILE TAKEOVER',
      shooting: 'LAYING OFF',
      slamming: 'RESTRUCTURING',
      summoning: 'BOARD MEETING',
      dead: 'GOLDEN PARACHUTE'
    };
    this.stateText.setText(labels[this.state] || this.state.toUpperCase());
  }
}
