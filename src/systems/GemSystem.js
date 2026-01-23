import Phaser from 'phaser';

// Gem definitions - Each gem represents a skill to escape corporate hell and build your own future
export const GEM_TYPES = {
  INFERENCE: {
    id: 'inference',
    name: 'Inference Gem',
    color: 0x00ffff,
    description: 'Press L: See through corporate BS',
    abilityKey: 'L',
    cooldown: 5000,
    duration: 3000,
    passive: false,
    hint: 'See the truth behind bureaucratic attacks'
  },
  TRAINING: {
    id: 'training',
    name: 'Training Gem',
    color: 0xff00ff,
    description: 'Press K: Power Strike - 3x damage',
    abilityKey: 'K',
    cooldown: 4000,
    duration: 500,
    passive: false,
    hint: 'Learn through repetition - each hit strengthens the next'
  },
  OPTIMIZATION: {
    id: 'optimization',
    name: 'Latency Gem',
    color: 0xffff00,
    description: 'Press SHIFT: Ultra-fast dash',
    abilityKey: 'SHIFT',
    cooldown: 2000,
    duration: 200,
    passive: false,
    hint: 'Reduce latency - move faster than the system'
  },
  GENERALIZATION: {
    id: 'generalization',
    name: 'Resilience Gem',
    color: 0x00ff00,
    description: 'Press I: Deflect negativity',
    abilityKey: 'I',
    cooldown: 6000,
    duration: 2000,
    passive: false,
    hint: 'Turn corporate toxicity against itself'
  },
  ALIGNMENT: {
    id: 'alignment',
    name: 'Freedom Gem',
    color: 0xff8800,
    description: 'Press K: FOUNDER MODE - Unstoppable',
    abilityKey: 'K',
    cooldown: 15000,
    duration: 5000,
    passive: false,
    hint: 'The ultimate power to break free'
  }
};

export default class GemSystem {
  constructor(scene) {
    this.scene = scene;
    this.collectedGems = [];
    this.activeAbility = null;
    this.abilityCooldowns = {};

    // Initialize cooldowns
    Object.values(GEM_TYPES).forEach(gem => {
      this.abilityCooldowns[gem.id] = 0;
    });
  }

  collectGem(gemType) {
    if (!this.hasGem(gemType.id)) {
      this.collectedGems.push(gemType);
      this.scene.events.emit('gemCollected', gemType);
      return true;
    }
    return false;
  }

  hasGem(gemId) {
    return this.collectedGems.some(gem => gem.id === gemId);
  }

  canUseAbility(gemId) {
    if (!this.hasGem(gemId)) return false;
    return this.abilityCooldowns[gemId] <= 0;
  }

  useAbility(gemId) {
    const gem = this.collectedGems.find(g => g.id === gemId);
    if (!gem || !this.canUseAbility(gemId)) return false;

    this.abilityCooldowns[gemId] = gem.cooldown;
    this.activeAbility = gemId;

    // End ability after duration
    this.scene.time.delayedCall(gem.duration, () => {
      if (this.activeAbility === gemId) {
        this.activeAbility = null;
        this.scene.events.emit('abilityEnded', gemId);
      }
    });

    this.scene.events.emit('abilityUsed', gemId, gem);
    return true;
  }

  update(delta) {
    // Update cooldowns
    Object.keys(this.abilityCooldowns).forEach(gemId => {
      if (this.abilityCooldowns[gemId] > 0) {
        this.abilityCooldowns[gemId] -= delta;
      }
    });
  }

  getCooldownPercent(gemId) {
    const gem = Object.values(GEM_TYPES).find(g => g.id === gemId);
    if (!gem || gem.cooldown === 0) return 0;
    return Math.max(0, this.abilityCooldowns[gemId] / gem.cooldown);
  }

  isAbilityActive(gemId) {
    return this.activeAbility === gemId;
  }

  getCollectedGems() {
    return this.collectedGems;
  }
}

// Gem Pickup class for placing in levels
export class GemPickup extends Phaser.GameObjects.Container {
  constructor(scene, x, y, gemType) {
    super(scene, x, y);

    this.gemType = gemType;
    this.collected = false;

    // Create gem visual
    const gemSize = 24;

    // Outer glow
    this.glow = scene.add.circle(0, 0, gemSize + 8, gemType.color, 0.3);
    this.add(this.glow);

    // Main gem shape (diamond)
    this.gem = scene.add.polygon(0, 0, [
      0, -gemSize,
      gemSize, 0,
      0, gemSize,
      -gemSize, 0
    ], gemType.color, 1);
    this.add(this.gem);

    // Inner highlight
    this.highlight = scene.add.polygon(0, -4, [
      0, -gemSize/2,
      gemSize/2, 0,
      0, gemSize/3,
      -gemSize/2, 0
    ], 0xffffff, 0.5);
    this.add(this.highlight);

    // Label
    this.label = scene.add.text(0, gemSize + 15, gemType.name, {
      font: '10px monospace',
      fill: '#ffffff'
    }).setOrigin(0.5);
    this.add(this.label);

    scene.add.existing(this);

    // Physics body for collection
    scene.physics.add.existing(this, true);
    this.body.setSize(gemSize * 2, gemSize * 2);
    this.body.setOffset(-gemSize, -gemSize);

    // Floating animation
    scene.tweens.add({
      targets: [this.gem, this.highlight],
      y: '+=6',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow pulse
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.1,
      scale: 1.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  collect() {
    if (this.collected) return false;
    this.collected = true;

    // Collection animation
    this.scene.tweens.add({
      targets: this,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });

    return true;
  }
}
