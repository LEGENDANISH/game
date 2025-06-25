import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';

export default class Bullet {
  constructor(scene, x, y, direction, damage = 25) {
    this.scene = scene;
    this.direction = direction === 1 || direction === -1 ? direction : 1;
    this.damage = damage;

    // Fallback values for GAME_CONFIG.BULLET
    const defaultConfig = {
      SPEED: 300,
      SIZE: { width: 8, height: 3 },
      DAMAGE: 25
    };
    const config = typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG.BULLET : defaultConfig;

    // Create physics sprite but disable physics body to avoid gravity
    this.sprite = scene.physics.add.sprite(x, y, null);
    this.sprite.setSize(config.SIZE.width, config.SIZE.height);
    this.sprite.body.enable = false; // Disable physics body completely
    this.sprite.bulletInstance = this;

    // Manual movement properties
    this.speed = config.SPEED * this.direction; // Pixels per second
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;

    // Visual: rectangle bullet
    this.visual = scene.add.rectangle(x, y, 8, 3, COLORS.BULLET);
    this.visual.setRotation(this.direction === 1 ? 0 : Math.PI);

    // Glow effect
    this.glow = scene.add.circle(x, y, 4, COLORS.BULLET, 0.3);

    // Trail system
    this.trail = scene.add.graphics();
    this.trailPoints = [];

    // Destroy timer (3 seconds)
    this.destroyTimer = scene.time.delayedCall(3000, () => {
      this.destroy();
    });

    // Track creation time for movement calculation
    this.startTime = scene.time.now;
  }

  update() {
    if (!this.sprite || !this.sprite.active) return;

    // Calculate new position based on time elapsed
    const currentTime = this.scene.time.now;
    const deltaTime = (currentTime - this.startTime) / 1000; // Convert to seconds
    
    // Update position manually (horizontal movement only)
    this.currentX = this.startX + (this.speed * deltaTime);
    this.currentY = this.startY; // Keep Y position constant

    // Update sprite position
    this.sprite.setPosition(this.currentX, this.currentY);

    // Update visual elements
    this.visual.setPosition(this.currentX, this.currentY);
    this.glow.setPosition(this.currentX, this.currentY);

    // Trail effect
    this.trailPoints.push({ x: this.currentX, y: this.currentY });
    if (this.trailPoints.length > 5) {
      this.trailPoints.shift();
    }

    // Draw trail
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

    // Check if bullet is off-screen and destroy it
    const bounds = this.scene.physics.world.bounds;
    if (
      this.currentX < bounds.x - 50 || 
      this.currentX > bounds.x + bounds.width + 50 ||
      this.currentY < bounds.y - 50 || 
      this.currentY > bounds.y + bounds.height + 50
    ) {
      this.destroy();
    }
  }

  // Get current position for collision detection
  getPosition() {
    return { x: this.currentX, y: this.currentY };
  }

  // Check collision with a target (manual collision detection)
  checkCollision(target) {
    if (!this.sprite || !this.sprite.active || !target) return false;

    const bulletBounds = this.sprite.getBounds();
    const targetBounds = target.getBounds ? target.getBounds() : target.body;

    return Phaser.Geom.Rectangle.Overlaps(bulletBounds, targetBounds);
  }

  destroy() {
    if (this.destroyTimer) {
      this.destroyTimer.remove();
      this.destroyTimer = null;
    }

    if (this.visual) {
      this.visual.destroy();
      this.visual = null;
    }

    if (this.glow) {
      this.glow.destroy();
      this.glow = null;
    }

    if (this.trail) {
      this.trail.destroy();
      this.trail = null;
    }

    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }

    // Clear trail points
    this.trailPoints = [];
  }

  onHitEnemy(enemy) {
    const isDead = enemy.takeDamage(this.damage);
    this.destroy();
    return isDead;
  }

  // Method to enable physics body temporarily for collision detection
  enablePhysicsForCollision() {
    if (this.sprite && this.sprite.body) {
      this.sprite.body.enable = true;
      this.sprite.body.setGravityY(0); // Ensure no gravity
      this.sprite.body.setVelocity(0, 0); // No physics movement
    }
  }

  // Method to disable physics body after collision setup
  disablePhysicsAfterCollision() {
    if (this.sprite && this.sprite.body) {
      this.sprite.body.enable = false;
    }
  }
}