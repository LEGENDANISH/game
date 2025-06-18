import Phaser from 'phaser';
import CreateJoinScene from './CreateJoinScene';
import { createButton } from './Button';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    this.load.image('background', 'data:image/png;base64,...');
    this.load.image('character', 'data:image/png;base64,...');

    this.createLoadingUI();
    this.loadAssets();
  }

  createLoadingUI() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.createGradientBackground();

    this.loadingBox = this.add.graphics();
    this.loadingBox.fillStyle(0x000000, 0.3);
    this.loadingBox.lineStyle(2, 0xffffff, 0.5);
    this.loadingBox.fillRoundedRect(centerX - 160, centerY - 40, 320, 80, 10);
    this.loadingBox.strokeRoundedRect(centerX - 160, centerY - 40, 320, 80, 10);

    this.loadingText = this.add.text(centerX, centerY - 60, 'Loading...', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Kanit',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x000000, 0.3);
    this.progressBarBg.fillRoundedRect(centerX - 150, centerY - 15, 300, 30, 15);

    this.progressBar = this.add.graphics();
  }

  createGradientBackground() {
    const gradient = this.add.graphics();
    const height = this.cameras.main.height;
    const width = this.cameras.main.width;
    const steps = 50;
    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const r = Math.round(66 + (139 - 66) * ratio);
      const g = Math.round(133 + (69 - 133) * ratio);
      const b = Math.round(244 + (196 - 244) * ratio);
      const color = (r << 16) | (g << 8) | b;
      gradient.fillStyle(color, 1);
      gradient.fillRect(0, (height / steps) * i, width, height / steps + 1);
    }
    gradient.setDepth(-10);
  }

  loadAssets() {
    this.load.on('progress', (percentage) => {
      this.updateProgressBar(percentage);
    });
    this.load.on('complete', () => {
      this.cleanupLoadingUI();
      this.createMainMenuUI();
    });
  }

  updateProgressBar(percentage) {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    this.progressBar.clear();
    const barWidth = 300 * percentage;
    const steps = Math.max(1, Math.floor(barWidth / 10));
    for (let i = 0; i < steps; i++) {
      const ratio = i / Math.max(1, steps - 1);
      const r = Math.round(0 + (255 - 0) * ratio);
      const g = Math.round(191 + (255 - 191) * ratio);
      const b = 255;
      const color = (r << 16) | (g << 8) | b;
      this.progressBar.fillStyle(color, 1);
      this.progressBar.fillRect(centerX - 150 + (barWidth / steps) * i, centerY - 15, barWidth / steps + 1, 30);
    }
    this.progressBar.fillStyle(0x00bfff, 1);
    this.progressBar.fillRoundedRect(centerX - 150, centerY - 15, barWidth, 30, 15);
  }

  cleanupLoadingUI() {
    this.progressBar.destroy();
    this.progressBarBg.destroy();
    this.loadingBox.destroy();
    this.loadingText.destroy();
  }

  createMainMenuUI() {
    this.createGradientBackground();
    this.createSidebar();
    this.createCharacter();
    this.createMainButtons();
  }

  createSidebar() {
    const padding = 30;
    const centerX = this.cameras.main.centerX;
    const offsetX = -250;
    const baseY = this.cameras.main.centerY - 100;

    const leaderboardBtn = createButton.call(this, centerX + offsetX, baseY, 'Leaderboard', 0xff4757, 0xff6b6b);
    const shopBtn = createButton.call(this, centerX + offsetX, baseY + 90, 'Shop', 0x2ed573, 0x3af38f);
    const createJoinBtn = createButton.call(this, centerX + offsetX, baseY + 180, 'Create/Join', 0xfbc531, 0xffeaa7);

    leaderboardBtn.on('pointerdown', () => console.log('Leaderboard clicked'));
    shopBtn.on('pointerdown', () => console.log('Shop clicked'));
    createJoinBtn.on('pointerdown', () => this.scene.launch('CreateJoinScene'));
  }

  createCharacter() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.character = this.add.image(centerX, centerY, 'character');
    this.character.setScale(3);

    this.add.text(centerX, centerY - 100, 'Falcon.962', {
      fontSize: '20px',
      fontFamily: 'Kanit',
      fontStyle: 'bold',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { left: 10, right: 10, top: 5, bottom: 5 }
    }).setOrigin(0.5);

    this.createArrowButton(centerX - 100, centerY, '<', () => console.log('Left'));
    this.createArrowButton(centerX + 100, centerY, '>', () => console.log('Right'));
  }

  createArrowButton(x, y, label, callback) {
    const button = this.add.graphics();
    button.fillStyle(0xffffff, 0.8);
    button.lineStyle(2, 0x000000, 1);
    button.fillCircle(x, y, 25);
    button.strokeCircle(x, y, 25);

    button.setInteractive(new Phaser.Geom.Circle(x, y, 25), Phaser.Geom.Circle.Contains);

    const text = this.add.text(x, y, label, {
      fontSize: '20px',
      fontFamily: 'Kanit',
      fontStyle: 'bold',
      color: '#000'
    }).setOrigin(0.5);

    button.on('pointerdown', callback);
  }

  createMainButtons() {
    const centerX = this.cameras.main.centerX;
    const baseY = this.cameras.main.centerY - 40;
    const offsetX = 250;

    const playBtn = createButton.call(this, centerX + offsetX, baseY, 'Play', 0xffd700, 0xffed4a);
    const bestRegionBtn = createButton.call(this, centerX + offsetX, baseY + 90, 'Best Region', 0x00bfff, 0x33ccff);

    playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    bestRegionBtn.on('pointerdown', () => console.log('Best Region clicked'));
  }
}
