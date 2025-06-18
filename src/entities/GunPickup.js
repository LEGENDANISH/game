// entities/GunPickup.js
import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';

export default class GunPickup {
  constructor(scene, x, y, gunConfig) {
    this.scene = scene;
    this.gunConfig = gunConfig; // { fireRate, damage, color, bulletsToFire }

    // Physics sprite (used for collisions)
    this.sprite = scene.physics.add.sprite(x, y, null);
    this.sprite.setCircle(10); // circular hit area
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.pickupInstance = this;

    // Visual appearance
    this.visual = scene.add.circle(x, y, 10, gunConfig.color);
    this.visual.setDepth(10);

    // Float animation
    scene.tweens.add({
      targets: this.visual,
      y: y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update() {
    if (this.sprite.active) {
      this.visual.setPosition(this.sprite.x, this.sprite.y);
    }
  }

  collect(player) {
    if (player?.switchGun) {
      player.switchGun(this.gunConfig);
    }
    this.destroy();
  }

  destroy() {
    this.sprite.destroy();
    this.visual.destroy();
  }
}
