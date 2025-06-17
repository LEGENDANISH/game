// Player.js
import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';
import { createStickman } from '../utils/helpers.js';
import Bullet from './Bullet.js';

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = GAME_CONFIG.PLAYER.MAX_HEALTH;
    this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH;
    this.isInvulnerable = false;
    this.lastShotTime = 0;
    this.shootCooldown = 200;

    // Create physics sprite
    this.sprite = scene.physics.add.sprite(x, y, null);
    this.sprite.setSize(GAME_CONFIG.PLAYER.SIZE.width, GAME_CONFIG.PLAYER.SIZE.height);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0.1);
    this.sprite.playerInstance = this; // Reference for collision detection

    // Create visual stickman
    this.stickman = createStickman(scene, x, y, COLORS.PLAYER);

    // Bullets group
    this.bullets = scene.physics.add.group();

    // Muzzle flash effect
    this.muzzleFlash = scene.add.circle(x, y, 8, 0xfbbf24, 0.8);
    this.muzzleFlash.setVisible(false);

    // Animation properties
    this.direction = 1;
    this.animationState = 'idle';
    this.walkTimer = 0;
  }

  update(keys) {
    const speed = GAME_CONFIG.PLAYER.SPEED;
    let moving = false;

    // Horizontal movement
    if (keys.A.isDown) {
      this.sprite.setVelocityX(-speed);
      this.direction = -1;
      moving = true;
      this.animationState = 'walking';
    } else if (keys.D.isDown) {
      this.sprite.setVelocityX(speed);
      this.direction = 1;
      moving = true;
      this.animationState = 'walking';
    } else {
      this.sprite.setVelocityX(0);
      this.animationState = 'idle';
    }

    // Jumping
    if (keys.W.isDown && this.sprite.body.touching.down) {
      this.sprite.setVelocityY(GAME_CONFIG.PLAYER.JUMP_VELOCITY);
      this.animationState = 'jumping';
    }

    // Shooting
    if (keys.SPACE.isDown) {
      this.shoot();
    }

    this.updateVisuals(moving);
    this.updateBullets();
  }

  updateVisuals(moving) {
    // Update stickman position to match physics sprite
    this.stickman.group.x = this.sprite.x;
    this.stickman.group.y = this.sprite.y;

    // Walking animation
    if (this.animationState === 'walking' && moving) {
      this.walkTimer += 0.2;
      const wobble = Math.sin(this.walkTimer) * 2;

      // Animate limbs (relative to group origin)
      this.stickman.leftArm.x = -8 + wobble;
      this.stickman.leftArm.y = -5;
      this.stickman.leftArm.rotation = -0.3 + wobble * 0.1;

      this.stickman.rightArm.x = 8 - wobble;
      this.stickman.rightArm.y = -5;
      this.stickman.rightArm.rotation = 0.3 - wobble * 0.1;

      this.stickman.leftLeg.x = -6 + wobble;
      this.stickman.leftLeg.y = 15;
      this.stickman.leftLeg.rotation = -0.2 + wobble * 0.2;

      this.stickman.rightLeg.x = 6 - wobble;
      this.stickman.rightLeg.y = 15;
      this.stickman.rightLeg.rotation = 0.2 - wobble * 0.2;
    } else {
      // Reset to idle position
      this.stickman.leftArm.setPosition(-8, -5).setRotation(-0.3);
      this.stickman.rightArm.setPosition(8, -5).setRotation(0.3);
      this.stickman.leftLeg.setPosition(-6, 15).setRotation(-0.2);
      this.stickman.rightLeg.setPosition(6, 15).setRotation(0.2);
    }

    // Flip sprite based on direction
    this.stickman.group.setScale(this.direction, 1);
  }

  shoot() {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastShotTime < this.shootCooldown) return;

    this.lastShotTime = currentTime;
        
    // Create bullet
    const bullet = new Bullet(
      this.scene,
      this.sprite.x + this.direction * 20,
      this.sprite.y - 5,
      this.direction
    );

    this.bullets.add(bullet.sprite);

    // Muzzle flash effect
    this.muzzleFlash.x = this.sprite.x + this.direction * 25;
    this.muzzleFlash.y = this.sprite.y - 5;
    this.muzzleFlash.setVisible(true).setScale(1.5);

    this.scene.tweens.add({
      targets: this.muzzleFlash,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.muzzleFlash.setVisible(false).setAlpha(0.8).setScale(1);
      }
    });

    // Shooting animation
    this.scene.tweens.add({
      targets: this.stickman.rightArm,
      scaleX: 1.3,
      duration: 100,
      yoyo: true
    });
  }

  updateBullets() {
    this.bullets.children.entries.forEach(bulletSprite => {
      if (bulletSprite.bulletInstance) {
        bulletSprite.bulletInstance.update();
      }
    });
  }

  takeDamage(amount) {
    if (this.isInvulnerable) return;

    this.health = Math.max(0, this.health - amount);
    console.log(this.health)
    // Damage flash effect
    this.stickman.group.setTint(0xff6b6b);
    this.scene.time.delayedCall(200, () => {
      this.stickman.group.clearTint();
    });

    // Screen shake
    this.scene.cameras.main.shake(200, 0.01);

    // Temporary invulnerability
    this.setInvulnerable(1000);
  }

  setInvulnerable(duration) {
    this.isInvulnerable = true;

    // Flashing effect
    this.scene.tweens.add({
      targets: this.stickman.group,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200)
    });

    this.scene.time.delayedCall(duration, () => {
      this.isInvulnerable = false;
      this.stickman.group.setAlpha(1);
    });
  }

  destroy() {
    this.stickman.group.destroy();
    this.muzzleFlash.destroy();
    this.sprite.destroy();
    this.bullets.destroy();
  }
}