import Phaser from 'phaser';
  import { COLORS } from '../utils/constants.js'; // Assuming COLORS is still available

  export default class Bullet {
    constructor(scene, x, y, direction, damage = 25) {
      this.scene = scene;
      this.direction = direction === 1 || direction === -1 ? direction : 1; // Default to 1 if invalid
      this.damage = damage;

      // Fallback values for GAME_CONFIG.BULLET
      const defaultConfig = {
        SPEED: 300,
        SIZE: { width: 8, height: 3 },
        DAMAGE: 25
      };
      const config = typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG.BULLET : defaultConfig;

      // Physics sprite
      this.sprite = scene.physics.add.sprite(x, y, null);
      this.sprite.setSize(config.SIZE.width, config.SIZE.height);
      this.sprite.setVelocityX(config.SPEED * this.direction); // Explicitly set X velocity
      this.sprite.setVelocityY(0); // Ensure no vertical movement
      this.sprite.body.allowGravity = false; // Disable gravity for bullets
      this.sprite.bulletInstance = this;

      // Visual: rectangle bullet
      this.visual = scene.add.rectangle(x, y, 8, 3, COLORS.BULLET);
      this.visual.setRotation(this.direction === 1 ? 0 : Math.PI);

      // Glow
      this.glow = scene.add.circle(x, y, 4, COLORS.BULLET, 0.3);

      // Trail
      this.trail = scene.add.graphics();
      this.trailPoints = [];

      // Destroy timer
      this.destroyTimer = scene.time.delayedCall(3000, () => {
        this.destroy();
      });
    }

    update() {
      if (!this.sprite || !this.sprite.active) return;

      // Update visuals
      const { x, y } = this.sprite;
      this.visual.setPosition(x, y);
      this.glow.setPosition(x, y);

      // Trail effect
      this.trailPoints.push({ x, y });
      if (this.trailPoints.length > 5) this.trailPoints.shift();

      this.trail.clear();
      if (this.trailPoints.length > 1) {
        this.trail.lineStyle(2, COLORS.BULLET, 0.5);
        this.trail.beginPath();
        this.trail.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
        for (let i = 1; i < this.trailPoints.length; i++) {
          this.trail.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
        }
        this.trail.strokePath();
      }

      // Off-screen cleanup
      const bounds = this.scene.physics.world.bounds;
      if (
        x < bounds.x - 50 || x > bounds.x + bounds.width + 50 ||
        y < bounds.y - 50 || y > bounds.y + bounds.height + 50
      ) {
        this.destroy();
      }
    }

    destroy() {
      if (this.destroyTimer) this.destroyTimer.remove();

      if (this.visual) this.visual.destroy();
      if (this.glow) this.glow.destroy();
      if (this.trail) this.trail.destroy();
      if (this.sprite) this.sprite.destroy();

      this.visual = this.glow = this.trail = this.sprite = null;
    }

    onHitEnemy(enemy) {
      const isDead = enemy.takeDamage(this.damage);
      this.destroy();
      return isDead;
    }
  }