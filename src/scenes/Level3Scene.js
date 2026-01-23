import Phaser from 'phaser';
import BaseLevelScene from './BaseLevelScene.js';

export default class Level3Scene extends BaseLevelScene {
  constructor() {
    super('Level3Scene', 'level3');
  }

  create() {
    super.create();

    // Level 3 specific: Data Packet collection with Latency gem
    this.dataPacketsCollected = 0;
    this.totalDataPackets = 5;
    this.dataPackets = [];
    this.accessKeyObtained = false;

    // Create locked exit barrier
    this.createExitBarrier();

    // Override the exit label
    this.exitLabel.setText('EXIT\n[LOCKED]');
    this.exitLabel.setColor('#ff4444');

    // Spawn data packets around the level
    this.spawnDataPackets();

    // Show level objective
    this.showLevelObjective();

    // Create data packet HUD
    this.createPacketHUD();
  }

  createExitBarrier() {
    const pos = this.config.exitPosition;

    this.exitBarrier = this.add.container(pos.x, pos.y);

    // Yellow security barrier (data firewall)
    const barrier = this.add.rectangle(0, 0, 70, 100, 0xffff00, 0.6);
    this.exitBarrier.add(barrier);

    // Data stream lines
    for (let i = -40; i < 45; i += 10) {
      const line = this.add.rectangle(0, i, 60, 2, 0x000000, 0.8);
      this.exitBarrier.add(line);
    }

    // Lock icon
    const lockBg = this.add.circle(0, -10, 15, 0x000000, 0.8);
    const lockBody = this.add.rectangle(0, -5, 20, 18, 0xffff00);
    const lockShackle = this.add.rectangle(0, -20, 14, 12, 0x000000, 0);
    lockShackle.setStrokeStyle(3, 0xffff00);
    this.exitBarrier.add([lockBg, lockBody, lockShackle]);

    // Barrier label
    this.barrierLabel = this.add.text(0, 55, 'ACCESS KEY\nREQUIRED', {
      font: 'bold 9px monospace',
      fill: '#ffff00',
      align: 'center'
    }).setOrigin(0.5);
    this.exitBarrier.add(this.barrierLabel);

    // Glitch animation
    this.time.addEvent({
      delay: 150,
      callback: () => {
        if (!this.exitBarrier || !this.exitBarrier.active) return;
        barrier.setAlpha(Phaser.Math.FloatBetween(0.4, 0.7));
      },
      loop: true
    });
  }

  spawnDataPackets() {
    // Data packet positions - spread around the level
    const packetPositions = [
      { x: 400, y: 280 },
      { x: 700, y: 420 },
      { x: 1050, y: 240 },
      { x: 1400, y: 320 },
      { x: 1700, y: 420 }
    ];

    packetPositions.forEach((pos, index) => {
      this.createDataPacket(pos.x, pos.y, index);
    });
  }

  createDataPacket(x, y, index) {
    const packet = this.add.container(x, y);

    // Outer glow
    const glow = this.add.circle(0, 0, 25, 0xffff00, 0.3);
    packet.add(glow);

    // Packet body (hexagon-ish shape using graphics)
    const body = this.add.graphics();
    body.fillStyle(0xffff00, 0.9);
    body.fillRoundedRect(-15, -15, 30, 30, 8);
    body.fillStyle(0x000000, 0.5);
    body.fillRoundedRect(-10, -10, 20, 20, 4);
    packet.add(body);

    // Data symbol (binary)
    const symbol = this.add.text(0, 0, '01', {
      font: 'bold 10px monospace',
      fill: '#ffff00'
    }).setOrigin(0.5);
    packet.add(symbol);

    // "DASH" hint
    const hint = this.add.text(0, -35, 'DASH TO COLLECT', {
      font: '8px monospace',
      fill: '#ffff00',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    packet.add(hint);

    // Physics
    this.physics.add.existing(packet);
    packet.body.setSize(40, 40);
    packet.body.setAllowGravity(false);

    // Store reference
    packet.collected = false;
    packet.index = index;
    packet.glowRef = glow;

    // Floating animation
    this.tweens.add({
      targets: packet,
      y: y - 10,
      duration: 1000 + index * 100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow pulse
    this.tweens.add({
      targets: glow,
      alpha: 0.1,
      scale: 1.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      delay: index * 150
    });

    // Binary text animation
    this.time.addEvent({
      delay: 300,
      callback: () => {
        if (packet.active && !packet.collected) {
          symbol.setText(Math.random() > 0.5 ? '01' : '10');
        }
      },
      loop: true
    });

    this.dataPackets.push(packet);

    // Setup collision - only collects while dashing
    this.physics.add.overlap(
      this.player,
      packet,
      () => this.handlePacketCollision(packet),
      null,
      this
    );
  }

  handlePacketCollision(packet) {
    // Only collect if player is dashing and packet not already collected
    if (!this.player.isDashing || packet.collected) return;

    packet.collected = true;
    this.dataPacketsCollected++;

    // Collection effect
    this.cameras.main.flash(100, 255, 255, 0);

    // Success text
    const successText = this.add.text(packet.x, packet.y - 30,
      `DATA PACKET ${this.dataPacketsCollected}/${this.totalDataPackets}`, {
      font: 'bold 12px monospace',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: successText,
      y: successText.y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => successText.destroy()
    });

    // Particle burst
    for (let i = 0; i < 15; i++) {
      const particle = this.add.rectangle(
        packet.x + Phaser.Math.Between(-10, 10),
        packet.y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        0xffff00, 1
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 50;

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 500,
        onComplete: () => particle.destroy()
      });
    }

    // Destroy packet with animation
    this.tweens.add({
      targets: packet,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        packet.destroy();
      }
    });

    // Update HUD
    this.updatePacketHUD();

    // Check if all packets collected
    this.checkAccessKey();
  }

  checkAccessKey() {
    if (this.dataPacketsCollected >= this.totalDataPackets && !this.accessKeyObtained) {
      this.accessKeyObtained = true;
      this.grantAccessKey();
    }
  }

  grantAccessKey() {
    // Epic unlock effect
    this.cameras.main.shake(300, 0.02);
    this.cameras.main.flash(300, 255, 255, 0);

    // Announcement
    const announcement = this.add.text(
      this.cameras.main.scrollX + 400,
      200,
      'ALL DATA PACKETS COLLECTED!\n\nACCESS KEY GRANTED!',
      {
        font: 'bold 24px monospace',
        fill: '#ffff00',
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

  createPacketHUD() {
    // Packet counter in top right
    this.packetHUD = this.add.container(700, 60).setScrollFactor(0).setDepth(1000);

    const bg = this.add.rectangle(0, 0, 150, 40, 0x000000, 0.7);
    this.packetHUD.add(bg);

    const icon = this.add.text(-55, 0, '01', {
      font: 'bold 14px monospace',
      fill: '#ffff00'
    }).setOrigin(0.5);
    this.packetHUD.add(icon);

    this.packetCountText = this.add.text(10, 0, `PACKETS: 0/${this.totalDataPackets}`, {
      font: '12px monospace',
      fill: '#ffff00'
    }).setOrigin(0.5);
    this.packetHUD.add(this.packetCountText);
  }

  updatePacketHUD() {
    if (this.packetCountText) {
      this.packetCountText.setText(`PACKETS: ${this.dataPacketsCollected}/${this.totalDataPackets}`);

      // Pulse effect
      this.tweens.add({
        targets: this.packetCountText,
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
        'OBJECTIVE: Collect all Data Packets\nusing Latency Dash (SHIFT) to obtain access key',
        {
          font: '14px monospace',
          fill: '#ffff00',
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

    // Check if access key obtained
    if (!this.accessKeyObtained) {
      if (!this.exitHintShown) {
        this.exitHintShown = true;

        let hintMsg = 'Exit is locked!';
        if (!this.gemSystem.hasGem('optimization')) {
          hintMsg = 'Find the Latency Gem first!';
        } else if (this.dataPacketsCollected < this.totalDataPackets) {
          hintMsg = `Collect Data Packets with SHIFT!\n(${this.dataPacketsCollected}/${this.totalDataPackets})`;
        }

        const hint = this.add.text(
          this.exitZone.x,
          this.exitZone.y - 100,
          hintMsg,
          {
            font: '12px monospace',
            fill: '#ffff00',
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

    // Access key obtained - allow exit
    this.handleLevelComplete();
  }

  // Override respawn to reset Level 3 specific states
  respawnPlayer() {
    super.respawnPlayer();

    // Reset Level 3 specific states
    this.dataPacketsCollected = 0;
    this.accessKeyObtained = false;
    this.exitHintShown = false;

    // Clear existing data packets
    this.dataPackets.forEach(packet => {
      if (packet && packet.active) {
        this.tweens.killTweensOf(packet);
        packet.destroy();
      }
    });
    this.dataPackets = [];

    // Respawn data packets
    this.spawnDataPackets();

    // Update HUD
    this.updatePacketHUD();

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
      this.exitGlow.setFillStyle(0xffff00, 0.5);
    }
  }
}
