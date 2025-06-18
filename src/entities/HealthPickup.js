import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../utils/constants.js';

export default class HealthPickup {
  constructor(scene, x, y, healAmount = 20) {
    this.scene = scene;
    this.healAmount = healAmount;

    this.sprite = scene.physics.add.sprite(x, y, null);
    this.sprite.setCircle(10); // Round hitbox
    this.sprite.setBounce(0.3);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.pickupInstance = this;

    // Visual: red glowing ball
    this.visual = scene.add.circle(x, y, 10, COLORS.HEALTH_PICKUP || 0xff0000);
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
    if (!this.sprite.active) return;
    this.visual.setPosition(this.sprite.x, this.sprite.y);
  }

  collect(player) {
    player.increaseHealth(this.healAmount);

    // Pickup effect
    const glow = this.scene.add.circle(this.sprite.x, this.sprite.y, 15, 0xffffff, 0.5);
    this.scene.tweens.add({
      targets: glow,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => glow.destroy()
    });

    this.destroy();
  }

  destroy() {
    this.sprite.destroy();
    this.visual.destroy();
  }
}
