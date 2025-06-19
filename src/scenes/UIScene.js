import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';
import { getHealthColor } from '../utils/helpers.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Main UI box
    this.uiBackground = this.add.graphics();
    this.uiBackground.fillStyle(COLORS.UI_BG, 0.8);
    this.uiBackground.fillRoundedRect(10, 10, 300, 120, 10);
    this.uiBackground.setScrollFactor(0).setDepth(100);

    this.playerNameText = this.add.text(25, 25, 'STICKMAN WARRIOR', {
      fontSize: '20px',
      fontWeight: 'bold',
      fill: '#ffffff'
    }).setScrollFactor(0).setDepth(101);

    this.killCountText = this.add.text(25, 55, 'Kills: 0', {
      fontSize: '16px',
      fill: '#fbbf24'
    }).setScrollFactor(0).setDepth(101);

    this.gameTimeText = this.add.text(25, 80, 'Time: 0:00', {
      fontSize: '16px',
      fill: '#10b981'
    }).setScrollFactor(0).setDepth(101);

    // Health bar
    this.healthBarBg = this.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRoundedRect(25, 100, 200, 20, 5);
    this.healthBarBg.setScrollFactor(0).setDepth(101);

    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0).setDepth(102);

    this.healthText = this.add.text(130, 110, '100/100', {
      fontSize: '12px',
      fill: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103);

    // Enemy counter
    this.enemyCounterBg = this.add.rectangle(
      this.cameras.main.centerX,
      30,
      150,
      40,
      0x000000,
      0.5
    ).setOrigin(0.5).setScrollFactor(0).setDepth(50);

    this.enemyCounterText = this.add.text(
      this.cameras.main.centerX,
      30,
      `Enemies: 0`,
      {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(51);

    // Controls help
    this.controlsText = this.add.text(this.cameras.main.width - 20, 20,
      'WASD: Move & Jump\nSPACE: Shoot', {
      fontSize: '14px',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 8 },
      align: 'right'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101).setAlpha(0.8);

    // Game Over Overlay (initially hidden)
    this.overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(100).setVisible(false);

    this.gameOverText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'GAME OVER',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);

    this.countdownText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      '',
      {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);

    // Initial data
    this.gameData = {
      health: 100,
      maxHealth: 100,
      killCount: 0,
      gameTime: 0,
      enemiesAlive: 0,
      isGameOver: false
    };

    // Flag to indicate UI is ready
    this.isUILoaded = true;
  }

  updateGameData(data) {
    if (!this.isUILoaded) return;

    this.gameData = { ...this.gameData, ...data };

    // Update kill count
    if (this.killCountText && this.killCountText.active) {
      this.killCountText.setText(`Kills: ${this.gameData.killCount}`);
    }

    // Update time
    const minutes = Math.floor(this.gameData.gameTime / 60);
    const seconds = this.gameData.gameTime % 60;
    if (this.gameTimeText && this.gameTimeText.active) {
      this.gameTimeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    // Update enemies alive
    if (this.enemyCounterText && this.enemyCounterText.active) {
      this.enemyCounterText.setText(`Enemies: ${this.gameData.enemiesAlive}`);
    }

    // Update health bar
    this.updateHealthBar();

    // If game is over, show overlay UI
    if (this.gameData.isGameOver) {
      this.showGameOverUI();
    }
  }

  updateHealthBar() {
    if (!this.isUILoaded) return;

    const healthRatio = this.gameData.health / this.gameData.maxHealth;
    const barWidth = 190;
    const currentWidth = barWidth * healthRatio;

    this.healthBar.clear();
    this.healthBar.fillStyle(getHealthColor(this.gameData.health, this.gameData.maxHealth));
    this.healthBar.fillRoundedRect(30, 105, currentWidth, 10, 3);

    if (this.healthText && this.healthText.active) {
      this.healthText.setText(`${this.gameData.health}/${this.gameData.maxHealth}`);
    }

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

  showGameOverUI() {
    if (!this.isUILoaded) return;

    this.overlay.setVisible(true);
    this.gameOverText.setVisible(true);
    this.countdownText.setVisible(true);

    this.countdown = 5;
    this.countdownText.setText(`Restarting in ${this.countdown}...`);

    // Remove any existing countdown timer
    if (this.countdownTimer) {
      this.countdownTimer.remove();
      this.countdownTimer = null;
    }

    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.countdown--;
        this.countdownText.setText(`Restarting in ${this.countdown}...`);
        if (this.countdown <= 0) {
          this.countdownTimer.remove();
          this.countdownTimer = null;
          const gameScene = this.scene.get('GameScene');
          if (gameScene) {
            gameScene.restartGame();
          }
        }
      },
      callbackScope: this,
      loop: false,
      repeat: 4
    });
  }

  resize() {
    if (this.controlsText && this.controlsText.active) {
      this.controlsText.x = this.cameras.main.width - 20;
    }
  }

  destroy() {
    if (this.countdownTimer) {
      this.countdownTimer.remove();
      this.countdownTimer = null;
    }
    this.isUILoaded = false;
  }
}