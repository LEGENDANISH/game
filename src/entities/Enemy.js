import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';
import { createStickman } from '../utils/helpers.js';
import Bullet from './Bullet.js';

export default class Enemy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = GAME_CONFIG.ENEMY.HEALTH;
    this.maxHealth = GAME_CONFIG.ENEMY.HEALTH;
    this.speed = GAME_CONFIG.ENEMY.SPEED;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.lastDirectionChange = 0;
    this.directionChangeInterval = 2000;

    // Shooting logic
    this.canShoot = true;
    this.shootCooldown = 2000;
    this.lastShotTime = 0;

    // Sprite (physics body)
    this.sprite = scene.physics.add.sprite(x, y, null);
    this.sprite.setSize(GAME_CONFIG.ENEMY.SIZE.width, GAME_CONFIG.ENEMY.SIZE.height);
    this.sprite.setBounce(0.1);
    this.sprite.enemyInstance = this;

    // Visuals
    this.stickman = createStickman(scene, x, y, COLORS.ENEMY);
    this.healthBarBg = scene.add.rectangle(x, y - 35, 30, 4, 0x000000, 0.5);
    this.healthBar = scene.add.rectangle(x, y - 35, 28, 2, COLORS.HEALTH_GOOD);

    this.muzzleFlash = scene.add.circle(x, y, 6, 0xfbbf24, 0.7);
    this.muzzleFlash.setVisible(false);

    // Bullets
    this.bullets = scene.physics.add.group({
      classType: Bullet,
      runChildUpdate: true,
    });

    this.walkTimer = 0;
  }

  update() {
    const currentTime = this.scene.time.now;
    const player = this.scene.player?.sprite;
    if (!player) return;

    const distanceToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y);
    const verticalAlignment = Math.abs(player.y - this.sprite.y) < 40;
    const hasLineOfSight = verticalAlignment && distanceToPlayer < 500;

    if (hasLineOfSight) {
      if (distanceToPlayer > 100) {
        this.direction = player.x > this.sprite.x ? 1 : -1;
        this.sprite.setVelocityX(this.speed * this.direction);
      } else {
        this.sprite.setVelocityX(0);
      }

      if (this.canShoot && distanceToPlayer < 300) {
        this.shoot();
      }
    } else {
      if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
        this.direction *= -1;
        this.lastDirectionChange = currentTime;
      }
      this.sprite.setVelocityX(this.speed * this.direction);
    }

    // Sync visuals
    this.updateVisuals();

    // Sync health and flash
    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 35);
    this.healthBar.setPosition(this.sprite.x - 1, this.sprite.y - 35); // Centered
    this.muzzleFlash.setPosition(this.sprite.x + (this.direction === 1 ? 15 : -15), this.sprite.y - 5);
  }

  updateVisuals() {
    this.stickman.group.x = this.sprite.x;
    this.stickman.group.y = this.sprite.y;

    this.walkTimer += 0.15;
    const wobble = Math.sin(this.walkTimer) * 1.5;

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

    this.stickman.group.setScale(this.direction, 1);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    const ratio = this.health / this.maxHealth;

    this.healthBar.scaleX = ratio;

    if (ratio > 0.6) {
      this.healthBar.setFillStyle(COLORS.HEALTH_GOOD);
    } else if (ratio > 0.3) {
      this.healthBar.setFillStyle(COLORS.HEALTH_MEDIUM);
    } else {
      this.healthBar.setFillStyle(COLORS.HEALTH_LOW);
    }

    const { head, body, leftArm, rightArm, leftLeg, rightLeg } = this.stickman;

[head, body, leftArm, rightArm, leftLeg, rightLeg].forEach(part => {
  part.setFillStyle(0xff6b6b);
});
    this.scene.time.delayedCall(150, () => {
  const { head, body, leftArm, rightArm, leftLeg, rightLeg } = this.stickman;
  [head, body, leftArm, rightArm, leftLeg, rightLeg].forEach(part => {
    part.setFillStyle(COLORS.ENEMY);  // Restore original color
  });
});


    return this.health <= 0;
  }

  shoot() {
    const now = this.scene.time.now;
    if (!this.canShoot || now - this.lastShotTime < this.shootCooldown) return;

    const playerX = this.scene.player.sprite.x;
    this.direction = playerX > this.sprite.x ? 1 : -1;

    const offsetX = this.direction === 1 ? 15 : -15;

    // 🔥 Create bullet with damage
    const bullet = new Bullet(
      this.scene,
      this.sprite.x + offsetX,
      this.sprite.y - 5,
      this.direction,
      GAME_CONFIG.ENEMY.BULLET_DAMAGE || 15 // Or whatever default
    );

    this.bullets.add(bullet.sprite);

    // Muzzle flash animation
    this.muzzleFlash.setVisible(true);
    this.muzzleFlash.setScale(1.5);
    this.scene.tweens.add({
      targets: this.muzzleFlash,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.muzzleFlash.setVisible(false);
        this.muzzleFlash.setAlpha(0.7);
        this.muzzleFlash.setScale(1);
      }
    });

    // Arm animation
    this.scene.tweens.add({
      targets: this.stickman.rightArm,
      scaleX: 1.3,
      duration: 100,
      yoyo: true,
    });

    this.canShoot = false;
    this.lastShotTime = now;
    this.scene.time.delayedCall(this.shootCooldown, () => {
      this.canShoot = true;
    });
  }

  destroy() {
    this.scene.tweens.add({
      targets: [this.stickman.group, this.healthBarBg, this.healthBar],
      alpha: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.stickman.group.destroy();
        this.healthBarBg.destroy();
        this.healthBar.destroy();
        this.sprite.destroy();
        this.bullets.clear(true, true); // destroy all bullets
      }
    });
  }
}
