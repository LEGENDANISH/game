import Phaser from 'phaser'
import { GAME_CONFIG, COLORS } from '../utils/constants.js'
import { createStickman } from '../utils/helpers.js'
import Bullet from './Bullet.js'

export default class Enemy {
  constructor(scene, x, y) {
    this.scene = scene
    this.health = GAME_CONFIG.ENEMY.HEALTH
    this.maxHealth = GAME_CONFIG.ENEMY.HEALTH
    this.speed = GAME_CONFIG.ENEMY.SPEED
    this.direction = Math.random() > 0.5 ? 1 : -1
    this.lastDirectionChange = 0
    this.directionChangeInterval = 2000 // Change direction every 2 seconds

    // Shooting logic
    this.canShoot = true
    this.shootCooldown = 2000 // ms between shots
    this.isShooting = false
    this.lastShotTime = 0

    // Create enemy sprite for physics
    this.sprite = scene.physics.add.sprite(x, y, null)
    this.sprite.setSize(GAME_CONFIG.ENEMY.SIZE.width, GAME_CONFIG.ENEMY.SIZE.height)
    this.sprite.setBounce(0.1)
    this.sprite.enemyInstance = this // Reference for collision detection

    // Create visual stickman
    this.stickman = createStickman(scene, x, y, COLORS.ENEMY)

    // Health bar
    this.healthBarBg = scene.add.rectangle(x, y - 35, 30, 4, 0x000000, 0.5)
    this.healthBar = scene.add.rectangle(x, y - 35, 28, 2, COLORS.HEALTH_GOOD)

    // Muzzle flash effect
    this.muzzleFlash = scene.add.circle(x, y, 6, 0xfbbf24, 0.7)
    this.muzzleFlash.setVisible(false)

    // Bullets group
    this.bullets = scene.physics.add.group({
      classType: Bullet,
      runChildUpdate: true
    })

    this.walkTimer = 0
  }

  update() {
    const currentTime = this.scene.time.now

    // Change direction periodically
    if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
      this.direction *= -1
      this.lastDirectionChange = currentTime
    }

    // Basic AI movement
    this.sprite.setVelocityX(this.speed * this.direction)

    // Shooting logic
    if (this.canShoot && this.scene.player && this.scene.player.sprite) {
      const player = this.scene.player.sprite

      // Optional: Only shoot if player is within range
      const distanceToPlayer = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        player.x,
        player.y
      )

      const shootRange = 400 // pixels
      if (distanceToPlayer < shootRange && player.y > this.sprite.y - 20 && player.y < this.sprite.y + 20) {
        this.shoot()
      }
    }

    // Update visuals
    this.updateVisuals()

    // Update health bar position
    this.healthBarBg.x = this.sprite.x
    this.healthBarBg.y = this.sprite.y - 35
    this.healthBar.x = this.sprite.x - (30 - 28) / 2
    this.healthBar.y = this.sprite.y - 35

    // Update muzzle flash position
    this.muzzleFlash.x = this.sprite.x + (this.direction === 1 ? 15 : -15)
    this.muzzleFlash.y = this.sprite.y - 5
  }

  updateVisuals() {
    // Sync container position
    this.stickman.group.x = this.sprite.x
    this.stickman.group.y = this.sprite.y

    // Animate walking
    this.walkTimer += 0.15
    const wobble = Math.sin(this.walkTimer) * 1.5

    // Limbs
    this.stickman.leftArm.x = -8 + wobble
    this.stickman.leftArm.y = -5
    this.stickman.leftArm.rotation = -0.3 + wobble * 0.1

    this.stickman.rightArm.x = 8 - wobble
    this.stickman.rightArm.y = -5
    this.stickman.rightArm.rotation = 0.3 - wobble * 0.1

    this.stickman.leftLeg.x = -6 + wobble
    this.stickman.leftLeg.y = 15
    this.stickman.leftLeg.rotation = -0.2 + wobble * 0.2

    this.stickman.rightLeg.x = 6 - wobble
    this.stickman.rightLeg.y = 15
    this.stickman.rightLeg.rotation = 0.2 - wobble * 0.2

    // Flip based on direction
    this.stickman.group.setScale(this.direction, 1)
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)

    // Update health bar
    const healthRatio = this.health / this.maxHealth
    this.healthBar.scaleX = healthRatio

    // Change health bar color based on health
    if (healthRatio > 0.6) {
      this.healthBar.setFillStyle(COLORS.HEALTH_GOOD)
    } else if (healthRatio > 0.3) {
      this.healthBar.setFillStyle(COLORS.HEALTH_MEDIUM)
    } else {
      this.healthBar.setFillStyle(COLORS.HEALTH_LOW)
    }

    // Damage flash effect
    this.stickman.group.setTint(0xff6b6b)
    this.scene.time.delayedCall(150, () => {
      this.stickman.group.clearTint()
    })

    return this.health <= 0
  }

  shoot() {
    const currentTime = this.scene.time.now

    if (!this.canShoot || currentTime - this.lastShotTime < this.shootCooldown) {
      return
    }

    // Determine direction towards player
    const playerX = this.scene.player.sprite.x
    this.direction = playerX > this.sprite.x ? 1 : -1

    const offsetX = this.direction === 1 ? 15 : -15
    const bullet = new Bullet(
      this.scene,
      this.sprite.x + offsetX,
      this.sprite.y - 5,
      this.direction
    )

    this.bullets.add(bullet.sprite)

    // Muzzle flash
    this.muzzleFlash.setVisible(true)
    this.muzzleFlash.setScale(1.5)
    this.scene.tweens.add({
      targets: this.muzzleFlash,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.muzzleFlash.setVisible(false)
        this.muzzleFlash.setAlpha(0.7)
        this.muzzleFlash.setScale(1)
      }
    })

    // Arm animation
    this.scene.tweens.add({
      targets: [this.stickman.rightArm],
      scaleX: 1.3,
      duration: 100,
      yoyo: true
    })

    // Cooldown
    this.canShoot = false
    this.lastShotTime = currentTime
    this.scene.time.delayedCall(this.shootCooldown, () => {
      this.canShoot = true
    })
  }

  destroy() {
    // Death effect
    this.scene.tweens.add({
      targets: [this.stickman.group, this.healthBarBg, this.healthBar],
      alpha: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.stickman.group.destroy()
        this.healthBarBg.destroy()
        this.healthBar.destroy()
        this.sprite.destroy()
        this.bullets.destroy()
      }
    })
  }
}