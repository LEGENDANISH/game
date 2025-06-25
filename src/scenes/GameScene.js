import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Platform from '../entities/Platform.js';
import HealthPickup from '../entities/HealthPickup.js';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';
import GunPickup from '../entities/GunPickup.js'
import createBackground from './createBackground.js';
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.gameState = {
      isGameOver: false,
      killCount: 0,
      gameTime: 0,
      enemiesAlive: 0,
      totalEnemiesSpawned: 0
    };

    this.setupWorld();
createBackground(this);
    this.createPlatforms();
    this.createPlayer();
    this.createEnemies();
    this.createHealthPickups();

    this.setupCamera();
    this.setupCollisions();
    this.setupInput();

    this.allBullets = [];
    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene');
    this.gunPickups = this.physics.add.group();
    this.spawnGunPickups();
  }

  setupWorld() {
    this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
      this.physics.world.gravity.y = 800; // Add this line to set world gravity

    this.ground = this.physics.add.staticGroup();

    const groundSprite = this.add.rectangle(
      GAME_CONFIG.WORLD.WIDTH / 2,
      GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT / 2,
      GAME_CONFIG.WORLD.WIDTH,
      GAME_CONFIG.WORLD.GROUND_HEIGHT,
      COLORS.GROUND
    );
    this.ground.add(groundSprite);
  }

 

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    const platformData = [
      { x: 300, y: 600, size: 'MEDIUM' },
      { x: 600, y: 500, size: 'SMALL' },
      { x: 900, y: 450, size: 'LARGE' },
      { x: 1300, y: 400, size: 'MEDIUM' },
      { x: 1600, y: 350, size: 'SMALL' },
      { x: 1900, y: 300, size: 'LARGE' },
      { x: 2300, y: 500, size: 'MEDIUM' },
      { x: 2600, y: 400, size: 'SMALL' },
    ];

    platformData.forEach(data => {
      const platform = new Platform(this, data.x, data.y, data.size);
      this.platforms.add(platform.sprite);
    });
  }

  createPlayer() {
    this.player = new Player(this, 100, 600);
  }

  createEnemies() {
    this.enemies = this.physics.add.group();
    const enemyPositions = [
      { x: 400, y: 650 },
      { x: 800, y: 650 },
      { x: 1200, y: 650 },
      { x: 1500, y: 650 },
      { x: 2000, y: 650 },
      { x: 2400, y: 650 }
    ];

    enemyPositions.forEach(pos => {
      const enemy = new Enemy(this, pos.x, pos.y);
      this.enemies.add(enemy.sprite);
      this.gameState.totalEnemiesSpawned++;
    });

    this.gameState.enemiesAlive = this.enemies.getChildren().length;
  }

  spawnNewEnemy() {
    if (this.gameState.enemiesAlive < 8) {
      const spawnX = Phaser.Math.Between(200, GAME_CONFIG.WORLD.WIDTH - 200);
      const spawnY = 650;

      const enemy = new Enemy(this, spawnX, spawnY);
      this.enemies.add(enemy.sprite);
      this.gameState.totalEnemiesSpawned++;

      if (enemy.bullets) {
        this.physics.add.overlap(enemy.bullets, this.player.sprite, this.enemyBulletHitPlayer, null, this);
        this.physics.add.collider(enemy.bullets, this.platforms, this.bulletHitPlatform, null, this);
      }

      this.gameState.enemiesAlive++;
      this.updateUI();
    }
  }

spawnGunPickups() {
    const gunConfigs = [
        { fireRate: 100, damage: 20, color: 0xff00ff, bulletsToFire: 12 },
        { fireRate: 300, damage: 50, color: 0x00ffff, bulletsToFire: 5 },
        { fireRate: 150, damage: 30, color: 0xffff00, bulletsToFire: 8 }
    ];

    // Set up physics for gun pickups (only once)
    this.physics.add.collider(this.gunPickups, this.ground);
    this.physics.add.collider(this.gunPickups, this.platforms);

    this.physics.add.overlap(this.player.sprite, this.gunPickups, (playerSprite, pickupSprite) => {
        const pickup = pickupSprite.pickupInstance;
        if (pickup) pickup.collect(this.player);
    }, null, this);

    // Spawn gun pickups periodically
    this.time.addEvent({
        delay: 15000,
        loop: true,
        callback: () => {
            const x = Phaser.Math.Between(100, GAME_CONFIG.WORLD.WIDTH - 100);
            const y = Phaser.Math.Between(100, 600);
            const config = Phaser.Utils.Array.GetRandom(gunConfigs);
            const pickup = new GunPickup(this, x, y, config);
            this.gunPickups.add(pickup.sprite);
        }
    });
}
  createHealthPickups() {
    this.healthPickups = this.physics.add.group();
    this.time.addEvent({
      delay: 10000,
      callback: () => {
        const x = Phaser.Math.Between(100, GAME_CONFIG.WORLD.WIDTH - 100);
        const y = Phaser.Math.Between(100, 600);
        const pickup = new HealthPickup(this, x, y);
        this.healthPickups.add(pickup.sprite);
      },
      loop: true
    });

    this.physics.add.collider(this.healthPickups, this.ground);
    this.physics.add.collider(this.healthPickups, this.platforms);

    this.physics.add.overlap(this.player.sprite, this.healthPickups, (playerSprite, pickupSprite) => {
      const pickup = pickupSprite.pickupInstance;
      if (pickup) pickup.collect(this.player);
    }, null, this);
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
    this.cameras.main.setDeadzone(200, 100);
  }

  setupCollisions() {
    this.physics.add.collider(this.player.sprite, this.ground);
    this.physics.add.collider(this.player.sprite, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player.bullets, this.enemies, this.playerBulletHitEnemy, null, this);
    this.physics.add.collider(this.player.bullets, this.platforms, this.bulletHitPlatform, null, this);

    this.enemies.children.entries.forEach(enemySprite => {
      const enemy = enemySprite.enemyInstance;
      if (enemy && enemy.bullets) {
        this.physics.add.overlap(enemy.bullets, this.player.sprite, this.enemyBulletHitPlayer, null, this);
        this.physics.add.collider(enemy.bullets, this.platforms, this.bulletHitPlatform, null, this);
      }
    });

    this.physics.add.overlap(this.player.sprite, this.enemies, this.playerHitEnemy, null, this);
    this.physics.add.collider(this.healthPickups, this.ground);
    this.physics.add.collider(this.healthPickups, this.platforms);
    this.physics.add.overlap(this.player.sprite, this.healthPickups, (playerSprite, pickupSprite) => {
      const pickup = pickupSprite.pickupInstance;
      if (pickup) pickup.collect(this.player);
    }, null, this);
  }

  playerBulletHitEnemy(bullet, enemy) {
    if (bullet.bulletInstance?.owner === 'player') {
      this.createImpactEffect(bullet.x, bullet.y);
      bullet.bulletInstance.destroy();

      const enemyInstance = enemy.enemyInstance;
      if (enemyInstance) {
        enemyInstance.takeDamage(25);

        if (enemyInstance.health <= 0) {
          this.gameState.killCount++;
          enemyInstance.destroy();
          this.gameState.enemiesAlive--;
          this.updateUI();

          this.time.delayedCall(1000, this.spawnNewEnemy, [], this);
        }
      }
    }
  }

  enemyBulletHitPlayer(bullet) {
    if (bullet.bulletInstance?.owner === 'enemy') {
      this.createImpactEffect(bullet.x, bullet.y);
      bullet.bulletInstance.destroy();

      if (!this.player.isInvulnerable) {
        this.player.takeDamage(15);
        this.player.setInvulnerable(1000);
      }
    }
  }

  bulletHitPlatform(bullet) {
    if (bullet.bulletInstance) {
      this.createImpactEffect(bullet.x, bullet.y);
      bullet.bulletInstance.destroy();
    }
  }

  playerHitEnemy(player, enemy) {
    const enemyInstance = enemy.enemyInstance;
    if (enemyInstance && !this.player.isInvulnerable) {
      this.player.takeDamage(10);
      this.player.setInvulnerable(1000);
    }
  }

  createImpactEffect(x, y) {
    const particles = this.add.particles(x, y, 'sky', {
      speed: { min: 50, max: 100 },
      lifespan: 300,
      quantity: 5,
      tint: 0xfbbf24,
      scale: { start: 0.5, end: 0 }
    });
    this.time.delayedCall(300, () => particles.destroy());
  }

  gameOver() {
    this.gameState.isGameOver = true;
    this.physics.pause();
    this.player.sprite.setActive(false);
    this.enemies.setVelocityX(0);

    this.createGameOverUI();
    this.startRestartCountdown();
  }

  createGameOverUI() {
    this.overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(100);

    this.gameOverText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'GAME OVER',
      {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(101);
  }

  startRestartCountdown() {
    this.countdownText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      '',
      {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.countdown = 5;
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateCountdown,
      callbackScope: this,
      repeat: 5
    });
  }

  updateCountdown() {
    this.countdown--;
    this.countdownText.setText(`Restarting in ${this.countdown}...`);
    if (this.countdown <= 0) {
      this.countdownTimer.destroy();
      this.restartGame();
    }
  }

  restartGame() {
    this.scene.stop('UIScene');
    this.scene.restart();
    this.scene.launch('UIScene');
  }

  update(time, delta) {
    if (this.gameState.isGameOver) return;

    this.gameState.gameTime += delta;

    this.player?.update(this.wasd);
    this.enemies.getChildren().forEach(enemy => enemy.enemyInstance?.update(this.player));
    this.healthPickups.children.iterate(p => {
      if (p?.pickupInstance?.update) p.pickupInstance.update();
    });

    this.updateUI();

    if (this.player && this.player.health <= 0) {
      this.gameOver();
    }
  }

  updateUI() {
    if (this.uiScene && this.player) {
      this.uiScene.updateGameData({
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        killCount: this.gameState.killCount,
        gameTime: Math.floor(this.gameState.gameTime / 1000),
        enemiesAlive: this.gameState.enemiesAlive
      });
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D,SPACE');
  }

  destroy() {
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
    }
  }
}