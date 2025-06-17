import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Create loading bar
    const loadingBar = this.add.graphics();
    const loadingBox = this.add.graphics();
    
    loadingBox.fillStyle(0x222222, 0.8);
    loadingBox.fillRect(this.cameras.main.width / 2 - 160, this.cameras.main.height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(
      this.cameras.main.width / 2, 
      this.cameras.main.height / 2 - 50, 
      'Loading...', 
      {
        fontSize: '20px',
        fill: '#ffffff',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5);

    this.load.on('progress', (percentage) => {
      loadingBar.clear();
      loadingBar.fillStyle(0x2563eb, 1);
      loadingBar.fillRect(
        this.cameras.main.width / 2 - 150, 
        this.cameras.main.height / 2 - 15, 
        300 * percentage, 
        30
      );
    });

    this.load.on('complete', () => {
      loadingBar.destroy();
      loadingBox.destroy();
      loadingText.destroy();
      this.createPlayButton(); // Call our new method
    });

    // Load your assets
    this.load.image('sky', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    
    // Load button image or create one programmatically
    // If you want to use an image:
    // this.load.image('play-button', 'assets/play-button.png');
  }

  createPlayButton() {
    // Add background
    this.add.image(0, 0, 'sky').setOrigin(0).setScale(
      this.cameras.main.width / 100, 
      this.cameras.main.height / 100
    );

    // Create play button (graphics version)
    const button = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      200,
      60,
      0x2563eb
    )
    .setInteractive()
    .setStrokeStyle(2, 0xffffff);

    // Button text
    const buttonText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'PLAY', 
      {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5);

    // Button hover effects
    button.on('pointerover', () => {
      button.setFillStyle(0x1d4ed8);
      button.setScale(1.05);
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x2563eb);
      button.setScale(1);
    });

    // Start game when clicked
    button.on('pointerdown', () => {
      // Add button click effect
      this.tweens.add({
        targets: button,
        scale: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.scene.start('GameScene');
        }
      });
    });

    // Add title text (optional)
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      'MY GAME',
      {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
  }
}