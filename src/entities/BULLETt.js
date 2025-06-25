import Phaser from 'phaser';
import { COLORS } from '../utils/constants.js';

export default class Bullet {
  constructor(scene, x, y, direction = 1, damage = 25) {
    this.scene = scene;
    this.direction = Math.sign(direction); // Ensure direction is -1 or 1
    this.damage = damage;
    this.active = true;

    // Configuration with more descriptive naming
    this.config = {
      speed: 300, // pixels per second
      width: 8,
      height: 3,
      lifespan: 3000, // ms
      offScreenBuffer: 100 // pixels
    };

    // Initialize visuals
    this.initVisuals(x, y);
    
    // Physics (if using Arcade Physics)
    this.initPhysics();

    // Timers and state
    this.createdAt = scene.time.now;
  }

  initVisuals(x, y) {
    // Main bullet rectangle
    this.visual = this.scene.add.rectangle(
      x, y, 
      this.config.width, 
      this.config.height, 
      COLORS.BULLET
    );
    this.visual.setOrigin(0.5);
    this.visual.setRotation(this.direction === 1 ? 0 : Math.PI);

    // Glow effect
    this.glow = this.scene.add.circle(x, y, 4, COLORS.BULLET, 0.3);
    this.glow.setDepth(-1); // Place behind main bullet

    // Trail effect using particles for better performance
    this.trail = this.scene.add.particles(0, 0, 'pixel', {
      speed: 0,
      lifespan: 200,
      quantity: 1,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: COLORS.BULLET,
      emitZone: { source: new Phaser.Geom.Rectangle(0, 0, 1, 1) }
    });
    this.trail.stop();
  }

  initPhysics() {
    // If using Arcade Physics
    if (this.scene.physics) {
      this.scene.physics.add.existing(this.visual);
      this.visual.body.setVelocityX(this.config.speed * this.direction);
      this.visual.body.setCollideWorldBounds(false);
    }
  }

  update(time, delta) {
    if (!this.active) return;

    // Manual movement if not using physics
    if (!this.scene.physics) {
      const distance = (this.config.speed * delta) / 1000;
      this.visual.x += distance * this.direction;
      this.glow.x = this.visual.x;
    }

    // Update trail position
    this.trail.emitParticle(1, this.visual.x, this.visual.y);

    // Check lifespan
    if (time - this.createdAt > this.config.lifespan) {
      this.destroy();
      return;
    }

    // Check if off-screen
    this.checkOffScreen();
  }

  checkOffScreen() {
    const camera = this.scene.cameras.main;
    const buffer = this.config.offScreenBuffer;
    const x = this.visual.x;
    
    if (x < camera.worldView.x - buffer || x > camera.worldView.x + camera.width + buffer) {
      this.destroy();
    }
  }

  checkCollision(target) {
    if (!this.active || !target?.body) return false;

    // If using physics
    if (this.scene.physics) {
      return this.scene.physics.overlap(this.visual, target);
    }
    
    // Manual collision check
    return Phaser.Geom.Intersects.RectangleToRectangle(
      this.visual.getBounds(),
      target.getBounds()
    );
  }

  onHit(target) {
    if (!this.active) return;
    
    if (target.takeDamage) {
      target.takeDamage(this.damage);
    }
    
    this.destroy();
  }

  destroy() {
    if (!this.active) return;
    
    this.active = false;
    
    // Fade out effect before destruction
    this.scene.tweens.add({
      targets: [this.visual, this.glow],
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.visual.destroy();
        this.glow.destroy();
        this.trail.destroy();
      }
    });
  }

  // For external access
  get x() {
    return this.visual.x;
  }

  get y() {
    return this.visual.y;
  }
}