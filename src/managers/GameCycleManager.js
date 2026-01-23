export default class GameCycleManager {
  constructor(scene) {
    this.scene = scene;
  }

  triggerPromotion() {
    this.scene.cameras.main.fadeOut(2000, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      this.showPromotionText();
    });
  }

  showPromotionText() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    const msg = [
      "OPTIMIZATION COMPLETE.", "PREVIOUS CEO LIQUIDATED.",
      "ASSET #001 PROMOTED.", "", "MARKET VOLATILITY INCREASING...",
      "RESUMING OPERATIONS."
    ];

    this.scene.add.text(width / 2, height / 2, msg, {
      fontFamily: '"Courier New"', fontSize: '20px', align: 'center', color: '#00ff00'
    }).setOrigin(0.5).setScrollFactor(0);

    this.scene.time.delayedCall(5000, () => this.startNextCycle());
  }

  startNextCycle() {
    let currentCycle = this.scene.registry.get('cycle') || 0;
    this.scene.registry.set('cycle', currentCycle + 1);
    // Restart the scene - ensure 'Level1' matches your scene key
    this.scene.scene.restart();
  }

  getDifficultyMultiplier() {
    const cycle = this.scene.registry.get('cycle') || 0;
    return 1 + (cycle * 0.5);
  }
}
