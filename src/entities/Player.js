import Phaser from 'phaser'
import { GAME_CONFIG, COLORS } from '../utils/constants.js'
import { createStickman } from '../utils/helpers.js'
import Bullet from './Bullet.js'
import GunPickup from './GunPickup.js'

export default class Player {
  constructor(scene, x, y, type = 'local') {
    this.scene = scene
    this.type = type // 'local' or 'remote'
    this.health = GAME_CONFIG.PLAYER.MAX_HEALTH
    this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH
    this.isInvulnerable = false
    this.lastShotTime = 0
    this.shootCooldown = 200

    // Create physics sprite - INVISIBLE collision box
    this.sprite = scene.physics.add.sprite(x, y, null)
    this.sprite.setSize(GAME_CONFIG.PLAYER.SIZE.width, GAME_CONFIG.PLAYER.SIZE.height)
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setBounce(0.1)
    this.sprite.setVisible(false) // HIDE the physics sprite
    this.sprite.playerInstance = this // Reference for collision detection

    // Create visual stickman - WHAT PLAYERS SEE
    this.stickman = createStickman(scene, x, y, type === 'local' ? COLORS.PLAYER : 0xff0000)

    // Bullets group (only for local player)
    if (type === 'local') {
      this.bullets = scene.physics.add.group()
    }

    // Muzzle flash effect
    this.muzzleFlash = scene.add.circle(x, y, 8, 0xfbbf24, 0.8)
    this.muzzleFlash.setVisible(false)

    // Animation properties
    this.direction = 1 // 1 = right, -1 = left
    this.animationState = 'idle'
    this.walkTimer = 0
    
    this.defaultGun = {
      fireRate: GAME_CONFIG.PLAYER.SHOOT_COOLDOWN || 200,
      damage: GAME_CONFIG.PLAYER.BULLET_DAMAGE || 25
    };
    this.currentGun = { ...this.defaultGun };
    this.specialGunBulletsLeft = 0;

    // Game over flag
    this.isDead = false
    this.respawnTimer = null
  }

  update(keys) {
    if (this.isDead) return
    if (this.type !== 'local') return // Only update local player input

    const speed = GAME_CONFIG.PLAYER.SPEED
    let moving = false

    // Horizontal movement
    if (keys.A.isDown) {
      this.sprite.setVelocityX(-speed)
      this.direction = -1
      moving = true
      this.animationState = 'walking'
    } else if (keys.D.isDown) {
      this.sprite.setVelocityX(speed)
      this.direction = 1
      moving = true
      this.animationState = 'walking'
    } else {
      this.sprite.setVelocityX(0)
      this.animationState = 'idle'
    }

    // Jumping
    if (keys.W.isDown && this.sprite.body.touching.down) {
      this.sprite.setVelocityY(GAME_CONFIG.PLAYER.JUMP_VELOCITY)
      this.animationState = 'jumping'
    }

    // Shooting - FIX: Use proper key check
    if (keys.SPACE.isDown) {
      this.shoot()
    }

    this.updateVisuals(moving)
    
    // Only update bullets for local player
    if (this.type === 'local' && this.bullets) {
      this.updateBullets()
    }

    // Check if player is dead
    if (this.health <= 0 && !this.isDead) {
      this.die()
    }
  }

  // NEW: Separate position update for remote players
  updatePosition(x, y, flipX = false) {
    this.sprite.setPosition(x, y)
    this.direction = flipX ? -1 : 1
    this.updateVisuals(false)
  }

  updateVisuals(moving) {
    if (this.isDead) {
      // Hide dead player
      this.stickman.group.setVisible(false)
      return
    }

    // CRITICAL FIX: Sync visual stickman with physics sprite position
    this.stickman.group.x = this.sprite.x
    this.stickman.group.y = this.sprite.y
    this.stickman.group.setVisible(true)

    // Walking animation
    if (this.animationState === 'walking' && moving) {
      this.walkTimer += 0.2
      const wobble = Math.sin(this.walkTimer) * 2

      // Animate arms
      this.stickman.leftArm.setPosition(-8 + wobble, -5).setRotation(-0.3 + wobble * 0.1)
      this.stickman.rightArm.setPosition(8 - wobble, -5).setRotation(0.3 - wobble * 0.1)

      // Animate legs
      this.stickman.leftLeg.setPosition(-6 + wobble, 15).setRotation(-0.2 + wobble * 0.2)
      this.stickman.rightLeg.setPosition(6 - wobble, 15).setRotation(0.2 - wobble * 0.2)
    } else {
      this.walkTimer = 0

      // Static idle pose
      this.stickman.leftArm.setPosition(-8, -5).setRotation(-0.3)
      this.stickman.rightArm.setPosition(8, -5).setRotation(0.3)
      this.stickman.leftLeg.setPosition(-6, 15).setRotation(-0.2)
      this.stickman.rightLeg.setPosition(6, 15).setRotation(0.2)
    }

    // Flip based on direction
    this.stickman.group.setScale(this.direction === -1 ? -1 : 1, 1)
  }

  shoot() {
    if (this.isDead) return;
    if (this.type !== 'local') return; // Only local player can shoot

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

    // 🔥 Muzzle flash
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
      }
    });

    // 🦾 Arm animation
    this.scene.tweens.add({
      targets: [this.stickman.rightArm],
      scaleX: 1.3,
      duration: 100,
      yoyo: true
    });

    // 🔁 Track special gun usage
    if (this.specialGunBulletsLeft > 0) {
      this.specialGunBulletsLeft--;
      if (this.specialGunBulletsLeft === 0) {
        this.currentGun = { ...this.defaultGun };
      }
    }
  }

  // NEW: Handle death
  die() {
    this.isDead = true
    this.health = 0
    
    // Visual death effect
    this.applyTintToStickman(0x666666) // Gray out
    this.stickman.group.setAlpha(0.5)
    
    // Stop movement
    this.sprite.setVelocity(0, 0)
    
    // Notify scene of death
    if (this.scene.playerDied) {
      this.scene.playerDied(this)
    }
    
    // Start respawn timer (5 seconds)
    this.respawnTimer = this.scene.time.delayedCall(5000, () => {
      this.respawn()
    })
  }

  // NEW: Handle respawn
  respawn() {
    this.isDead = false
    this.health = this.maxHealth
    
    // Reset visuals
    this.resetVisuals()
    this.stickman.group.setAlpha(1)
    this.stickman.group.setVisible(true)
    
    // Move to spawn point
    const spawnPoint = this.scene.getSpawnPoint ? this.scene.getSpawnPoint() : { x: 100, y: 600 }
    this.sprite.setPosition(spawnPoint.x, spawnPoint.y)
    
    // Brief invulnerability
    this.setInvulnerable(2000)
    
    console.log('Player respawned!')
  }

  // NEW: Update health from network
  updateHealth(newHealth) {
    const oldHealth = this.health
    this.health = Math.max(0, Math.min(this.maxHealth, newHealth))
    
    if (this.health < oldHealth) {
      // Take damage visual feedback
      this.applyTintToStickman(0xff6b6b)
      this.scene.time.delayedCall(200, () => {
        this.resetVisuals()
      })
    }
    
    if (this.health <= 0 && !this.isDead) {
      this.die()
    }
  }

  switchGun(gunConfig) {
    this.currentGun = {
      fireRate: gunConfig.fireRate,
      damage: gunConfig.damage
    };
    this.specialGunBulletsLeft = gunConfig.bulletsToFire;
  }

  increaseHealth(amount) {
    this.health = Math.min(this.health + amount, this.maxHealth);

    // Optional: Visual feedback
    this.applyTintToStickman(0x10b981); // green flash
    this.scene.time.delayedCall(200, () => {
      this.resetVisuals();
    });
  }

  updateBullets() {
    if (this.isDead) return
    if (!this.bullets) return

    this.bullets.children.each(bulletSprite => {
      if (bulletSprite.bulletInstance?.update) {
        bulletSprite.bulletInstance.update()
      }
    })
  }

  takeDamage(amount, attackerId = null) {
    if (this.isDead || this.isInvulnerable) return

    this.health = Math.max(0, this.health - amount)

    // Visual damage feedback
    this.applyTintToStickman(0xff6b6b) // Red flash

    // Screen shake (only for local player)
    if (this.type === 'local') {
      this.scene.cameras.main.shake(200, 0.01)
    }

    // Reset visuals after delay
    this.scene.time.delayedCall(200, () => {
      this.resetVisuals()
    })

    // Invulnerability frames
    this.setInvulnerable(500)
    
    // Notify network if local player
    if (this.type === 'local' && this.scene.network) {
      this.scene.network.sendPlayerAction({
        type: 'DAMAGE_TAKEN',
        data: {
          health: this.health,
          damage: amount,
          attackerId: attackerId
        }
      })
    }
    
    // Check death
    if (this.health <= 0 && !this.isDead) {
      this.die()
    }
  }

  applyTintToStickman(color) {
    this.stickman.head.setFillStyle(color)
    this.stickman.body.setFillStyle(color)
    this.stickman.leftArm.setFillStyle(color)
    this.stickman.rightArm.setFillStyle(color)
    this.stickman.leftLeg.setFillStyle(color)
    this.stickman.rightLeg.setFillStyle(color)
  }

  resetVisuals() {
    const color = this.type === 'local' ? COLORS.PLAYER : 0xff0000
    this.stickman.head.setFillStyle(color)
    this.stickman.body.setFillStyle(color)
    this.stickman.leftArm.setFillStyle(color)
    this.stickman.rightArm.setFillStyle(color)
    this.stickman.leftLeg.setFillStyle(color)
    this.stickman.rightLeg.setFillStyle(color)
  }

  setInvulnerable(duration = 500) {
    this.isInvulnerable = true

    // Flashing effect
    this.scene.tweens.add({
      targets: [
        this.stickman.head,
        this.stickman.body,
        this.stickman.leftArm,
        this.stickman.rightArm,
        this.stickman.leftLeg,
        this.stickman.rightLeg
      ],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200),
      ease: 'Linear'
    })

    this.scene.time.delayedCall(duration, () => {
      this.isInvulnerable = false
      this.resetVisuals()
    })
  }

  destroy() {
    if (this.respawnTimer) {
      this.respawnTimer.destroy()
    }
    this.stickman.group.destroy()
    this.muzzleFlash.destroy()
    this.sprite.destroy()
    if (this.bullets) {
      this.bullets.destroyEach()
    }
  }
}