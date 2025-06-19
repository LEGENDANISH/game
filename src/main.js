import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import CreateJoinScene from './scenes/CreateJoinScene.js'; // Import the new scene
import MultiplayerScene from './scenes/MiltiplayerScene.js';
const config = {
  
  type: Phaser.AUTO,
  width: 1200,
  height: 600,
  parent: 'game-container',
  dom: {
    createContainer: true // This enables DOM element support
  },
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  scene: [PreloadScene,CreateJoinScene, GameScene, UIScene,MultiplayerScene]
  
};

const game = new Phaser.Game(config);