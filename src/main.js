import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import ArenaScene from './scenes/ArenaScene.js';
import Level1Scene from './scenes/Level1Scene.js';
import Level2Scene from './scenes/Level2Scene.js';
import Level3Scene from './scenes/Level3Scene.js';
import Level4Scene from './scenes/Level4Scene.js';
import Level5Scene from './scenes/Level5Scene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false // Set to true for hitbox debugging
    }
  },
  scene: [BootScene, MenuScene, ArenaScene, Level1Scene, Level2Scene, Level3Scene, Level4Scene, Level5Scene]
};

const game = new Phaser.Game(config);
