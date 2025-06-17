import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';

export default class  Bullet {
  constructor(scene, x, y, direction) {
    this.scene = scene;
    this.direction = direction;
    
    // Create bullet sprite for physics
    this.sprite = scene.physics.add.sprite(x, y, null);
    
    this.sprite.setSize(GAME_CONFIG.BULLET.SIZE.width, GAME_CONFIG.BULLET.SIZE.height);
    this.sprite.bulletInstance = this; // Reference for collision detection
    
    // Create visual bullet
    this.visual = scene.add.rectangle(x, y, 8, 3, COLORS.BULLET);
    this.visual.setRotation(direction === 1 ? 0 : Math.PI); // Flip 180° if direction is -1
this.sprite.setFlipX(direction === -1); // Optional: Flip sprite if using textures
    // Add glow effect
    this.glow = scene.add.circle(x, y, 4, COLORS.BULLET, 0.3);
    
    console.log(`Bullet pos: (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)})`);  
    // Set velocity
this.sprite.setVelocity(GAME_CONFIG.BULLET.SPEED * direction, 0);
    
    // Trail effect
    this.trail = scene.add.graphics();
    this.trailPoints = [];
    
    // Auto-destroy after 3 seconds
    this.destroyTimer = scene.time.delayedCall(3000, () => {
      this.destroy();
    });
  }

  update() {
    // Check if sprite still exists
    if (!this.sprite || !this.sprite.active) return;
    
    // Update visual position
    if (this.visual) {
      this.visual.x = this.sprite.x;
      this.visual.y = this.sprite.y;
    }
    
    if (this.glow) {
      this.glow.x = this.sprite.x;
      this.glow.y = this.sprite.y;
    }
    
    // Update trail
    this.trailPoints.push({ x: this.sprite.x, y: this.sprite.y });
    if (this.trailPoints.length > 5) {
      this.trailPoints.shift();
    }
    
    if (this.trail) {
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
    }
    
    // Destroy if off-screen
    const bounds = this.scene.physics.world.bounds;
    if (this.sprite.x < bounds.x - 50 || 
        this.sprite.x > bounds.x + bounds.width + 50 ||
        this.sprite.y < bounds.y - 50 || 
        this.sprite.y > bounds.y + bounds.height + 50) {
      this.destroy();
    }
  }

  destroy() {
    // Clear the timer
    if (this.destroyTimer) {
      this.destroyTimer.remove();
    }
    
    // Destroy visual elements
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
  }

  // Method to handle collision with enemies
  onHitEnemy(enemy) {
    // Deal damage to enemy
    const isDead = enemy.takeDamage(GAME_CONFIG.BULLET.DAMAGE || 25);
    
    // Destroy the bullet
    this.destroy();
    
    return isDead;
  }
}