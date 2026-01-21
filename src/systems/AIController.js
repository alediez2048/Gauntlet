// Utility-based AI decision making system
// Enemies score actions based on multiple factors to create adaptive behavior

import Phaser from 'phaser';

export default class AIController {
  constructor(scene) {
    this.scene = scene;

    // Player behavior tracking
    this.playerProfile = {
      aggression: 0.5,      // 0 = passive, 1 = aggressive
      jumpFrequency: 0.5,   // How often player jumps
      attackFrequency: 0.5, // How often player attacks
      movementEntropy: 0.5, // How unpredictable movement is
      averageDistance: 150, // Average distance maintained
      lastPositions: [],
      lastActions: [],
      damageDealt: 0,
      damageTaken: 0
    };

    // Tracking windows
    this.trackingWindow = 5000; // 5 seconds
    this.lastUpdateTime = 0;
    this.updateInterval = 500; // Update profile every 500ms

    // Action history for tracking
    this.playerActionHistory = [];
    this.maxHistoryLength = 50;
  }

  // Called every frame to track player behavior
  update(player, delta) {
    if (!player || !player.isAlive) return;

    this.lastUpdateTime += delta;

    // Track player position
    this.playerProfile.lastPositions.push({ x: player.x, y: player.y, time: Date.now() });

    // Keep only recent positions
    const cutoff = Date.now() - this.trackingWindow;
    this.playerProfile.lastPositions = this.playerProfile.lastPositions.filter(p => p.time > cutoff);

    // Periodic profile update
    if (this.lastUpdateTime >= this.updateInterval) {
      this.updatePlayerProfile(player);
      this.lastUpdateTime = 0;
    }
  }

  // Record player actions for profiling
  recordPlayerAction(action) {
    this.playerActionHistory.push({
      action,
      time: Date.now()
    });

    // Trim history
    if (this.playerActionHistory.length > this.maxHistoryLength) {
      this.playerActionHistory.shift();
    }
  }

  updatePlayerProfile(player) {
    const recentActions = this.playerActionHistory.filter(
      a => Date.now() - a.time < this.trackingWindow
    );

    // Calculate aggression (attacks per second)
    const attacks = recentActions.filter(a => a.action === 'attack').length;
    const windowSeconds = this.trackingWindow / 1000;
    this.playerProfile.attackFrequency = Math.min(1, attacks / (windowSeconds * 2));

    // Calculate jump frequency
    const jumps = recentActions.filter(a => a.action === 'jump').length;
    this.playerProfile.jumpFrequency = Math.min(1, jumps / (windowSeconds * 3));

    // Aggression = attack frequency + forward movement tendency
    this.playerProfile.aggression = (this.playerProfile.attackFrequency * 0.7 +
      (1 - this.calculateDefensiveness()) * 0.3);

    // Movement entropy (how unpredictable)
    this.playerProfile.movementEntropy = this.calculateMovementEntropy();

    // Damage ratio
    const totalDamage = this.playerProfile.damageDealt + this.playerProfile.damageTaken + 1;
    this.playerProfile.damageRatio = this.playerProfile.damageDealt / totalDamage;
  }

  calculateDefensiveness() {
    const positions = this.playerProfile.lastPositions;
    if (positions.length < 2) return 0.5;

    // Check if player tends to move backward
    let backwardMoves = 0;
    for (let i = 1; i < positions.length; i++) {
      const prevX = positions[i - 1].x;
      const currX = positions[i].x;
      // Assuming enemies are generally to the right
      if (currX < prevX) backwardMoves++;
    }

    return backwardMoves / (positions.length - 1);
  }

  calculateMovementEntropy() {
    const positions = this.playerProfile.lastPositions;
    if (positions.length < 3) return 0.5;

    // Calculate direction changes
    let directionChanges = 0;
    let lastDirection = 0;

    for (let i = 1; i < positions.length; i++) {
      const direction = Math.sign(positions[i].x - positions[i - 1].x);
      if (direction !== 0 && direction !== lastDirection) {
        directionChanges++;
        lastDirection = direction;
      }
    }

    return Math.min(1, directionChanges / (positions.length * 0.5));
  }

  // Get utility scores for an enemy's possible actions
  getActionScores(enemy, player) {
    if (!player || !player.isAlive) {
      return { patrol: 1, chase: 0, attack: 0, retreat: 0 };
    }

    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
    const profile = this.playerProfile;

    // Base scores
    const scores = {
      patrol: 0,
      chase: 0,
      attack: 0,
      retreat: 0
    };

    // Distance factors
    const normalizedDist = Math.min(1, distance / 300);

    // PATROL: High when player is far, decreases with aggression
    scores.patrol = normalizedDist * (1 - profile.aggression * 0.5);

    // CHASE: Medium distance, higher if player is passive
    scores.chase = (1 - Math.abs(normalizedDist - 0.5) * 2) * (1 - profile.aggression * 0.3);

    // ATTACK: Close range, modified by player's defensiveness
    if (distance < enemy.attackRange * 1.5) {
      scores.attack = (1 - normalizedDist) * 0.8;

      // If player is very aggressive, be more cautious about attacking
      if (profile.aggression > 0.7) {
        scores.attack *= 0.6;
        scores.retreat += 0.3;
      }
    }

    // RETREAT: If player is aggressive and close, or if low health
    if (profile.aggression > 0.6 && distance < 100) {
      scores.retreat = profile.aggression * 0.7;
    }

    // Health modifier - retreat more when damaged
    if (enemy.health < enemy.maxHealth * 0.3) {
      scores.retreat += 0.4;
      scores.attack *= 0.5;
    }

    // Jump-heavy player - adjust attack timing
    if (profile.jumpFrequency > 0.6) {
      // Wait for landing before attacking
      if (player.body && !player.body.blocked.down) {
        scores.attack *= 0.3;
      }
    }

    // Add small randomness to prevent deterministic behavior
    Object.keys(scores).forEach(key => {
      scores[key] += (Math.random() - 0.5) * 0.1;
      scores[key] = Math.max(0, scores[key]);
    });

    return scores;
  }

  // Select best action based on scores
  selectAction(scores) {
    let bestAction = 'patrol';
    let bestScore = -1;

    Object.entries(scores).forEach(([action, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    });

    return bestAction;
  }

  // Get adaptive parameters for enemy behavior
  getAdaptiveParams(enemy) {
    const profile = this.playerProfile;

    return {
      // Aggressive players face more cautious enemies
      attackDelay: profile.aggression > 0.6 ? 1.2 : 1.0,

      // Unpredictable players face enemies with longer telegraphs
      telegraphMultiplier: profile.movementEntropy > 0.6 ? 1.3 : 1.0,

      // Jump-heavy players face enemies that aim higher
      aimOffset: profile.jumpFrequency > 0.5 ? -30 : 0,

      // Passive players face more aggressive enemies
      aggressionMultiplier: profile.aggression < 0.3 ? 1.4 : 1.0
    };
  }

  // Record damage events for profiling
  recordDamageDealt(amount) {
    this.playerProfile.damageDealt += amount;
  }

  recordDamageTaken(amount) {
    this.playerProfile.damageTaken += amount;
  }

  // Get player profile for display/debugging
  getPlayerProfile() {
    return { ...this.playerProfile };
  }
}

// Export singleton for shared state across scenes
let sharedAIController = null;

export function getSharedAIController(scene) {
  if (!sharedAIController) {
    sharedAIController = new AIController(scene);
  }
  return sharedAIController;
}

export function resetAIController() {
  sharedAIController = null;
}
