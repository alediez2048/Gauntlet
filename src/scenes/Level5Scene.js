import BaseLevelScene from './BaseLevelScene.js';
import Boss from '../entities/Boss.js';
import { GEM_TYPES } from '../systems/GemSystem.js';

export default class Level5Scene extends BaseLevelScene {
  constructor() {
    super('Level5Scene', 'level5');
  }

  create() {
    super.create();

    // Spawn boss after player gets close to boss arena
    this.bossSpawned = false;
    this.boss = null;

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

    // Player attack -> Boss
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
  }

  handleBossHit(attackHitbox, boss) {
    if (!this.player.isAttacking || !boss.isAlive) return;
    const knockbackDir = boss.x > this.player.x ? 1 : -1;
    boss.takeDamage(this.player.attackDamage, knockbackDir);
  }

  handleBossContact(player, boss) {
    if (!boss.isAlive || player.isInvulnerable) return;
    const knockbackDir = player.x > boss.x ? 1 : -1;
    player.takeDamage(boss.contactDamage, knockbackDir);
  }

  handleBossProjectile(player, projectile) {
    if (player.isInvulnerable) return;
    const knockbackDir = player.x > projectile.x ? 1 : -1;
    player.takeDamage(projectile.damage || 1, knockbackDir);
    projectile.destroy();
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
    }
  }
}
