import Phaser from 'phaser';
import Player from '../entities/Player.js';
import DroneZombie from '../entities/DroneZombie.js';

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ArenaScene' });
  }

  create() {
    // Arena dimensions
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create simple platform graphics
    this.createArena(width, height);

    // Spawn player
    this.player = new Player(this, 100, height - 100);

    // Spawn enemies
    this.enemies = this.add.group();
    this.spawnEnemies();

    // Collisions
    this.setupCollisions();

    // HUD
    this.createHUD();

    // Death/Respawn handling
    this.events.on('playerDied', this.handlePlayerDeath, this);
    this.events.on('playerRespawned', this.handlePlayerRespawn, this);

    // Pause
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.pause();
      // Could launch pause menu here
    });

    // Debug info
    this.debugText = this.add.text(10, 80, '', {
      font: '12px monospace',
      fill: '#00ff00'
    });
  }

  createArena(width, height) {
    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Create platforms group
    this.platforms = this.physics.add.staticGroup();

    // Ground
    const ground = this.add.rectangle(width / 2, height - 20, width, 40, 0x4a4a6a);
    this.platforms.add(ground);
    ground.body.updateFromGameObject();

    // Platforms
    const plat1 = this.add.rectangle(200, height - 150, 150, 20, 0x4a4a6a);
    this.platforms.add(plat1);
    plat1.body.updateFromGameObject();

    const plat2 = this.add.rectangle(500, height - 200, 150, 20, 0x4a4a6a);
    this.platforms.add(plat2);
    plat2.body.updateFromGameObject();

    const plat3 = this.add.rectangle(650, height - 100, 100, 20, 0x4a4a6a);
    this.platforms.add(plat3);
    plat3.body.updateFromGameObject();

    // Walls
    const leftWall = this.add.rectangle(10, height / 2, 20, height, 0x3a3a5a);
    this.platforms.add(leftWall);
    leftWall.body.updateFromGameObject();

    const rightWall = this.add.rectangle(width - 10, height / 2, 20, height, 0x3a3a5a);
    this.platforms.add(rightWall);
    rightWall.body.updateFromGameObject();

    // Arena label
    this.add.text(width / 2, 30, 'COMBAT ARENA - PHASE 1 TEST', {
      font: '16px monospace',
      fill: '#666688'
    }).setOrigin(0.5);
  }

  spawnEnemies() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Spawn 2 drone zombies
    const enemy1 = new DroneZombie(this, 400, height - 100);
    enemy1.setTarget(this.player);
    this.enemies.add(enemy1);

    const enemy2 = new DroneZombie(this, 600, height - 100);
    enemy2.setTarget(this.player);
    this.enemies.add(enemy2);
  }

  setupCollisions() {
    // Player <-> Platforms
    this.physics.add.collider(this.player, this.platforms);

    // Enemies <-> Platforms
    this.physics.add.collider(this.enemies, this.platforms);

    // Player attack <-> Enemies
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.enemies,
      this.handleAttackHit,
      null,
      this
    );

    // Player <-> Enemies (contact damage)
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handleEnemyContact,
      null,
      this
    );
  }

  handleAttackHit(attackHitbox, enemy) {
    if (!this.player.isAttacking || !enemy.isAlive) return;

    const knockbackDir = enemy.x > this.player.x ? 1 : -1;
    enemy.takeDamage(this.player.attackDamage, knockbackDir);

    // Prevent multiple hits per attack
    // Small delay before hitbox can hit same enemy again
  }

  handleEnemyContact(player, enemy) {
    if (!enemy.isAlive || player.isInvulnerable) return;

    // Only damage if enemy is attacking or player runs into them
    if (enemy.isAttacking) return; // Attack handled by enemy's executeAttack

    // Contact damage
    const knockbackDir = player.x > enemy.x ? 1 : -1;
    player.takeDamage(enemy.damage, knockbackDir);
  }

  createHUD() {
    // Health display
    this.healthText = this.add.text(10, 10, '', {
      font: '18px monospace',
      fill: '#ff4444'
    });

    // Hearts container
    this.hearts = [];
    for (let i = 0; i < this.player.maxHealth; i++) {
      const heart = this.add.text(10 + i * 25, 35, '♥', {
        font: '20px monospace',
        fill: '#ff4444'
      });
      this.hearts.push(heart);
    }

    this.updateHUD();

    // Controls hint
    this.add.text(10, this.cameras.main.height - 30, 'A/D: Move | Space: Jump | J: Attack | ESC: Pause', {
      font: '12px monospace',
      fill: '#666688'
    });
  }

  updateHUD() {
    this.healthText.setText(`HP: ${this.player.health}/${this.player.maxHealth}`);

    // Update hearts
    this.hearts.forEach((heart, index) => {
      heart.setColor(index < this.player.health ? '#ff4444' : '#333344');
    });
  }

  handlePlayerDeath() {
    // Show death message
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const deathText = this.add.text(width / 2, height / 2 - 50, 'YOU DIED', {
      font: 'bold 48px monospace',
      fill: '#ff0000'
    }).setOrigin(0.5);

    const restartText = this.add.text(width / 2, height / 2 + 20, 'Press R to Respawn', {
      font: '20px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // Listen for restart
    this.input.keyboard.once('keydown-R', () => {
      deathText.destroy();
      restartText.destroy();
      this.respawnPlayer();
    });
  }

  respawnPlayer() {
    // Respawn at start position
    this.player.respawn(100, this.cameras.main.height - 100);

    // Respawn enemies - overlap handlers reference the group so they still work
    this.enemies.clear(true, true);
    this.spawnEnemies();

    // Need to re-add collider for new enemy instances
    this.physics.add.collider(this.enemies, this.platforms);
  }

  handlePlayerRespawn() {
    this.updateHUD();
  }

  update() {
    if (this.player && this.player.isAlive) {
      this.player.update();
      this.updateHUD();
    }

    // Update enemies
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.isAlive) {
        enemy.update();
      }
    });

    // Debug info
    const onGround = this.player.body.blocked.down ? 'Yes' : 'No';
    const enemyCount = this.enemies.getChildren().filter(e => e.isAlive).length;
    this.debugText.setText(
      `On Ground: ${onGround}\n` +
      `Velocity: ${Math.round(this.player.body.velocity.x)}, ${Math.round(this.player.body.velocity.y)}\n` +
      `Enemies: ${enemyCount}\n` +
      `Attacking: ${this.player.isAttacking}`
    );
  }
}
