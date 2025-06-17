import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';
import { getHealthColor } from '../utils/helpers.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Create UI background
    this.uiBackground = this.add.graphics();
    this.uiBackground.fillStyle(COLORS.UI_BG, 0.8);
    this.uiBackground.fillRoundedRect(10, 10, 300, 120, 10);
    this.uiBackground.setScrollFactor(0);
    this.uiBackground.setDepth(100);

    // Player name
    this.playerNameText = this.add.text(25, 25, 'STICKMAN WARRIOR', {
      fontSize: '20px',
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    this.playerNameText.setScrollFactor(0);
    this.playerNameText.setDepth(101);

    // Kill counter
    this.killCountText = this.add.text(25, 55, 'Kills: 0', {
      fontSize: '16px',
      fill: '#fbbf24'
    });
    this.killCountText.setScrollFactor(0);
    this.killCountText.setDepth(101);

    // Game time
    this.gameTimeText = this.add.text(25, 80, 'Time: 0s', {
      fontSize: '16px',
      fill: '#10b981'
    });
    this.gameTimeText.setScrollFactor(0);
    this.gameTimeText.setDepth(101);

    // Health bar background
    this.healthBarBg = this.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRoundedRect(25, 100, 200, 20, 5);
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.setDepth(101);

    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(102);

    // Health text
    this.healthText = this.add.text(130, 110, '100/100', {
      fontSize: '12px',
      fill: '#ffffff',
      fontWeight: 'bold'
    });
    this.healthText.setOrigin(0.5);
    this.healthText.setScrollFactor(0);
    this.healthText.setDepth(103);

    // Controls help
    this.controlsText = this.add.text(this.cameras.main.width - 20, 20, 
      'WASD: Move & Jump\nSPACE: Shoot', {
      fontSize: '14px',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 8 },
      align: 'right'
    });
    this.controlsText.setOrigin(1, 0);
    this.controlsText.setScrollFactor(0);
    this.controlsText.setDepth(101);
    this.controlsText.setAlpha(0.8);

    // Initialize with default values
    this.gameData = {
      health: 100,
      maxHealth: 100,
      killCount: 0,
      gameTime: 0
    };
  }

  updateGameData(data) {
    this.gameData = { ...this.gameData, ...data };
    
    // Update kill counter
    this.killCountText.setText(`Kills: ${this.gameData.killCount}`);
    
    // Update game time
    const minutes = Math.floor(this.gameData.gameTime / 60);
    const seconds = this.gameData.gameTime % 60;
    this.gameTimeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    
    // Update health bar
    this.updateHealthBar();
  }

  updateHealthBar() {
    const healthRatio = this.gameData.health / this.gameData.maxHealth;
    const barWidth = 190;
    const currentWidth = barWidth * healthRatio;
    
    this.healthBar.clear();
    this.healthBar.fillStyle(getHealthColor(this.gameData.health, this.gameData.maxHealth));
    this.healthBar.fillRoundedRect(30, 105, currentWidth, 10, 3);
    
    // Update health text
    this.healthText.setText(`${this.gameData.health}/${this.gameData.maxHealth}`);
    
    // Health bar pulsing effect when low
    if (healthRatio < 0.3) {
      this.tweens.add({
        targets: this.healthBar,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        repeat: 1
      });
    }
  }

  resize() {
    // Handle screen resize
    this.controlsText.x = this.cameras.main.width - 20;
  }
}