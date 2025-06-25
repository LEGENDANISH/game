import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';
import { createStickman, getHealthColor } from '../utils/helpers.js';
import Bullet from './Bullet.js';

export default class Player {
  constructor(scene, x, y, type = 'local') {
    this.scene = scene;
    this.type = type; // 'local' or 'remote'

    // State tracking
    this.isDead = false;
    this.health = GAME_CONFIG.PLAYER.MAX_HEALTH;
    this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH;
    this.isInvulnerable = false;

    // Input handling
    this.lastShotTime = 0;
    this.shootCooldown = GAME_CONFIG.PLAYER.SHOOT_COOLDOWN || 200;
    this.inputHistory = []; // For reconciliation

    // Sprite setup
    this.sprite = scene.physics.add.sprite(x, y, null);
    this.sprite.setSize(GAME_CONFIG.PLAYER.SIZE.width, GAME_CONFIG.PLAYER.SIZE.height);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0.1);
    this.sprite.setVisible(false); // Invisible physics box
    this.sprite.playerInstance = this;

    // Visual stickman
    this.stickman = createStickman(scene, x, y, type === 'local' ? COLORS.PLAYER : 0xff0000);

    // Health bars
    this.healthBarBg = scene.add.rectangle(x, y - 35, 30, 4, 0x000000, 0.5).setDepth(1).setOrigin(0, 0.5);
    this.healthBar = scene.add.rectangle(x, y - 35, 28, 2, COLORS.HEALTH_GOOD).setDepth(1).setOrigin(0, 0.5);

    // Bullets group (only for local player)
    if (type === 'local') {
      this.bullets = scene.physics.add.group();
    }

    // Muzzle flash
    this.muzzleFlash = scene.add.circle(x, y, 8, 0xfbbf24, 0.8);
    this.muzzleFlash.setVisible(false);

    // Animation properties
    this.direction = 1; // 1 = right, -1 = left
    this.animationState = 'idle';
    this.walkTimer = 0;

    // Gun handling
    this.defaultGun = {
      fireRate: GAME_CONFIG.PLAYER.SHOOT_COOLDOWN || 200,
      damage: GAME_CONFIG.PLAYER.BULLET_DAMAGE || 25,
    };
    this.currentGun = { ...this.defaultGun };
    this.specialGunBulletsLeft = 0;

    // Timers
    this.respawnTimer = null;
    this.respawnUI = null;
    this.countdownInterval = null;
  }

  update(keys) {
    if (this.isDead) return;

    if (this.type === 'local') {
      const speed = GAME_CONFIG.PLAYER.SPEED;
      let moving = false;
      let input = {
        moveLeft: keys.A.isDown,
        moveRight: keys.D.isDown,
        jump: keys.W.isDown && this.sprite.body.touching.down,
        shoot: keys.SPACE.isDown,
        timestamp: Date.now()
      };

      // Save input for later reconciliation
      this.inputHistory.push(input);

      // Apply input locally
      this.applyInput(input);

      // Send inputs to server
      this.scene.network.sendPlayerAction({
        type: 'INPUT',
        data: {
          input: input,
          sequence: this.inputHistory.length - 1
        }
      });

      // Update visuals
      this.updateVisuals(moving);

      // Handle bullets
      this.updateBullets();

      // Check death
      if (this.health <= 0 && !this.isDead) {
        this.die();
      }
    } else {
      // Remote players use interpolated position
      this.updateVisuals(false);
    }
  }

  applyInput(input) {
    const speed = GAME_CONFIG.PLAYER.SPEED;

    if (input.moveLeft) {
      this.sprite.setVelocityX(-speed);
      this.direction = -1;
      this.animationState = 'walking';
    } else if (input.moveRight) {
      this.sprite.setVelocityX(speed);
      this.direction = 1;
      this.animationState = 'walking';
    } else {
      this.sprite.setVelocityX(0);
      this.animationState = 'idle';
    }

    if (input.jump && this.sprite.body.touching.down) {
      this.sprite.setVelocityY(GAME_CONFIG.PLAYER.JUMP_VELOCITY);
      this.animationState = 'jumping';
    }

    if (input.shoot) {
      this.shoot();
    }
  }

  reconcile(serverState) {
    if (!serverState.inputs || !serverState.position) return;

    // If server position is different from predicted, rewind and reapply inputs
    const mismatchX = Math.abs(this.sprite.x - serverState.position.x) > 2;
    const mismatchY = Math.abs(this.sprite.y - serverState.position.y) > 2;

    if (mismatchX || mismatchY) {
      // Reset to server position
      this.sprite.setPosition(serverState.position.x, serverState.position.y);

      // Replay unconfirmed inputs
      serverState.inputs.forEach((input, index) => {
        if (this.inputHistory[index]) {
          this.applyInput(this.inputHistory[index]);
        }
      });
    }

    // Update health
    if (serverState.health !== undefined) {
      this.health = serverState.health;
      this.updateHealthBar();
    }
  }

  shoot() {
    if (this.isDead || this.type !== 'local') return;

    const currentTime = this.scene.time.now;
    if (currentTime - this.lastShotTime < this.currentGun.fireRate) return;

    this.lastShotTime = currentTime;
    const offsetX = this.direction * 20;

    const bullet = new Bullet(
      this.scene,
      this.sprite.x + offsetX,
      this.sprite.y - 5,
      this.direction,
      this.currentGun.damage
    );

    bullet.owner = 'player';
    bullet.sprite.bulletInstance = bullet;
    this.bullets.add(bullet.sprite);

    // Muzzle flash effect
    this.muzzleFlash.setPosition(this.sprite.x + this.direction * 25, this.sprite.y - 5);
    this.muzzleFlash.setVisible(true).setScale(1.5);
    this.scene.tweens.add({
      targets: this.muzzleFlash,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.muzzleFlash.setVisible(false).setAlpha(0.8).setScale(1);
      },
    });

    // Arm recoil animation
    this.scene.tweens.add({
      targets: [this.stickman.rightArm],
      scaleX: 1.3,
      duration: 100,
      yoyo: true,
    });

    // Track special gun usage
    if (this.specialGunBulletsLeft > 0) {
      this.specialGunBulletsLeft--;
      if (this.specialGunBulletsLeft === 0) {
        this.currentGun = { ...this.defaultGun };
      }
    }
  }

  updateVisuals(moving) {
    if (this.isDead) {
      this.stickman.group.setVisible(false);
      return;
    }

    // Sync visual position with physics body
    this.stickman.group.setPosition(this.sprite.x, this.sprite.y);
    this.healthBarBg.setPosition(this.sprite.x - 15, this.sprite.y - 35);
    this.healthBar.setPosition(this.sprite.x - 15, this.sprite.y - 35);

    // Walking animation
    if (this.animationState === 'walking' && moving) {
      this.walkTimer += 0.2;
      const wobble = Math.sin(this.walkTimer) * 2;
      this.stickman.leftArm.setPosition(-8 + wobble, -5).setRotation(-0.3 + wobble * 0.1);
      this.stickman.rightArm.setPosition(8 - wobble, -5).setRotation(0.3 - wobble * 0.1);
      this.stickman.leftLeg.setPosition(-6 + wobble, 15).setRotation(-0.2 + wobble * 0.2);
      this.stickman.rightLeg.setPosition(6 - wobble, 15).setRotation(0.2 - wobble * 0.2);
    } else {
      this.walkTimer = 0;
      this.stickman.leftArm.setPosition(-8, -5).setRotation(-0.3);
      this.stickman.rightArm.setPosition(8, -5).setRotation(0.3);
      this.stickman.leftLeg.setPosition(-6, 15).setRotation(-0.2);
      this.stickman.rightLeg.setPosition(6, 15).setRotation(0.2);
    }

    // Flip direction
    this.stickman.group.setScale(this.direction === -1 ? -1 : 1, 1);
  }

  takeDamage(amount, attackerId = null) {
    if (this.isDead || this.isInvulnerable) return;

    this.health = Math.max(0, Math.min(this.maxHealth, this.health - amount));
    this.applyTintToStickman(0xff6b6b); // red flash

    // Visual feedback
    this.updateHealthBar();
    this.scene.time.delayedCall(200, () => this.resetVisuals());

    // Invulnerability frames
    this.setInvulnerable(500);

    // Death check
    if (this.health <= 0 && !this.isDead) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.health = 0;

    // Visual effects
    this.applyTintToStickman(0x666666);
    this.stickman.group.setAlpha(0.5);
    this.healthBar.setVisible(false);
    this.healthBarBg.setVisible(false);
    this.sprite.setVelocity(0, 0);

    // Notify scene
    if (this.scene.playerDied) {
      this.scene.playerDied(this);
    }

    // Show respawn UI and start timer
    this.showRespawnUI();
    this.respawnTimer = this.scene.time.delayedCall(5000, () => {
      this.hideRespawnUI();
      this.respawn();
    });
  }

  respawn() {
    this.isDead = false;
    this.health = this.maxHealth;

    this.resetVisuals();
    this.stickman.group.setAlpha(1);
    this.stickman.group.setVisible(true);
    this.healthBar.setVisible(true);
    this.healthBarBg.setVisible(true);

    const spawnPoint = this.scene.getSpawnPoint ? this.scene.getSpawnPoint() : { x: 100, y: 600 };
    this.sprite.setPosition(spawnPoint.x, spawnPoint.y);

    this.setInvulnerable(2000);
    console.log('Player Respawned');
  }

  updateHealthBar() {
    const ratio = this.health / this.maxHealth;

    this.scene.tweens.add({
      targets: this.healthBar,
      scaleX: ratio,
      duration: 150,
      ease: 'Linear'
    });

    this.healthBar.setFillStyle(getHealthColor(this.health, this.maxHealth));
  }

  applyTintToStickman(color) {
    this.stickman.head.setFillStyle(color);
    this.stickman.body.setFillStyle(color);
    this.stickman.leftArm.setFillStyle(color);
    this.stickman.rightArm.setFillStyle(color);
    this.stickman.leftLeg.setFillStyle(color);
    this.stickman.rightLeg.setFillStyle(color);
  }

  resetVisuals() {
    const color = this.type === 'local' ? COLORS.PLAYER : 0xff0000;
    this.applyTintToStickman(color);
  }

  setInvulnerable(duration = 500) {
    this.isInvulnerable = true;

    this.scene.tweens.add({
      targets: [
        this.stickman.head,
        this.stickman.body,
        this.stickman.leftArm,
        this.stickman.rightArm,
        this.stickman.leftLeg,
        this.stickman.rightLeg,
      ],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200),
      ease: 'Linear',
    });

    this.scene.time.delayedCall(duration, () => {
      this.isInvulnerable = false;
      this.resetVisuals();
    });
  }

  showRespawnUI() {
    const scene = this.scene;
    const width = scene.game.config.width;
    const height = scene.game.config.height;

    if (this.respawnUI) this.hideRespawnUI();

    this.respawnOverlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(1000);
    this.respawnText = scene.add.text(width / 2, height / 2 - 30, 'Respawning...', {
      fontSize: '32px',
      fill: '#ffffff',
    }).setOrigin(0.5).setDepth(1001);

    this.countdownText = scene.add.text(width / 2, height / 2 + 10, '5', {
      fontSize: '48px',
      fill: '#ffdd57',
    }).setOrigin(0.5).setDepth(1001);

    this.respawnUI = {
      overlay: this.respawnOverlay,
      text: this.respawnText,
      countdown: this.countdownText,
    };

    let counter = 5;
    this.countdownInterval = scene.time.addEvent({
      delay: 1000,
      repeat: 5,
      callback: () => {
        counter--;
        if (counter >= 0) {
          this.countdownText.setText(counter.toString());
        }
      },
    });
  }

  hideRespawnUI() {
    if (this.respawnUI) {
      this.respawnUI.overlay.destroy();
      this.respawnUI.text.destroy();
      this.respawnUI.countdown.destroy();
      this.respawnUI = null;
    }

    if (this.countdownInterval) {
      this.countdownInterval.remove();
      this.countdownInterval = null;
    }
  }

  destroy() {
    if (this.respawnTimer) this.respawnTimer.destroy();
    this.hideRespawnUI();

    if (this.stickman?.group) this.stickman.group.destroy();
    if (this.healthBar) this.healthBar.destroy();
    if (this.healthBarBg) this.healthBarBg.destroy();
    if (this.muzzleFlash) this.muzzleFlash.destroy();

    if (this.bullets) {
      this.bullets.clear(true, true);
    }

    if (this.sprite?.active) {
      this.sprite.destroy();
    }
  }
}