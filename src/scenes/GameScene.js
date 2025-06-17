import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Platform from '../entities/Platform.js';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.setupWorld();
    this.createBackground();
    this.createPlatforms();
    this.createPlayer();
    this.createEnemies();
    this.setupCamera();
    this.setupCollisions();
    this.setupInput();
    
    // Launch UI scene
    this.scene.launch('UIScene');
    
    // Game state
    this.killCount = 0;
    this.gameTime = 0;
    
    // Track all bullets for updates
    this.allBullets = [];
  }

  setupWorld() {
    this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
    
    // Create ground as a static physics body (not destructible)
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

  createBackground() {
    // Sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4169E1, 0x4169E1);
    sky.fillRect(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT);
    sky.setScrollFactor(0);

    // Background buildings (far layer)
    for (let i = 0; i < 15; i++) {
      const x = i * 200 + 100;
      const height = Phaser.Math.Between(200, 400);
      const building = this.add.rectangle(x, GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT - height / 2, 150, height, 0x2d3748);
      building.setScrollFactor(0.3);
      
      // Windows
      for (let j = 0; j < Math.floor(height / 40); j++) {
        for (let k = 0; k < 3; k++) {
          if (Math.random() > 0.3) {
            const window = this.add.rectangle(
              x - 40 + k * 40, 
              GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT - height + 20 + j * 40, 
              15, 15, 
              0xfbbf24
            );
            window.setScrollFactor(0.3);
          }
        }
      }
    }

    // Midground buildings
    for (let i = 0; i < 20; i++) {
      const x = i * 150 + 75;
      const height = Phaser.Math.Between(150, 350);
      const building = this.add.rectangle(x, GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT - height / 2, 120, height, 0x1f2937);
      building.setScrollFactor(0.6);
    }

    // Clouds
    for (let i = 0; i < 8; i++) {
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.8);
      const x = i * 400 + 200;
      const y = 100 + Math.random() * 200;
      
      cloud.fillCircle(x, y, 30);
      cloud.fillCircle(x + 25, y, 25);
      cloud.fillCircle(x + 50, y, 30);
      cloud.fillCircle(x + 25, y - 15, 20);
      cloud.setScrollFactor(0.2);
    }
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
    });
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
    this.cameras.main.setDeadzone(200, 100);
  }

  setupCollisions() {
    // Player collisions
    this.physics.add.collider(this.player.sprite, this.ground);
    this.physics.add.collider(this.player.sprite, this.platforms);
    
    // Enemy collisions
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);
    
    // Player bullet collisions
    this.physics.add.overlap(this.player.bullets, this.enemies, this.playerBulletHitEnemy, null, this);
    this.physics.add.collider(this.player.bullets, this.platforms, this.bulletHitPlatform, null, this);
    // Remove ground collision for bullets - let them pass through
    
    // Enemy bullet collisions
    this.enemies.children.entries.forEach(enemySprite => {
      const enemy = enemySprite.enemyInstance;
      if (enemy && enemy.bullets) {
        this.physics.add.overlap(enemy.bullets, this.player.sprite, this.enemyBulletHitPlayer, null, this);
        this.physics.add.collider(enemy.bullets, this.platforms, this.bulletHitPlatform, null, this);
        // Remove ground collision for enemy bullets too
      }
    });
    
    // Player-enemy collision
    this.physics.add.overlap(this.player.sprite, this.enemies, this.playerHitEnemy, null, this);
  }

  playerBulletHitEnemy(bullet, enemy) {
    // Only process if it's a player bullet
    if (bullet.bulletInstance && bullet.bulletInstance.owner === 'player') {
      this.createImpactEffect(bullet.x, bullet.y);
      bullet.bulletInstance.destroy();
      
      // Find enemy instance and damage it
      const enemyInstance = enemy.enemyInstance;
      if (enemyInstance) {
        enemyInstance.takeDamage(25);
        if (enemyInstance.health <= 0) {
          this.killCount++;
          enemyInstance.destroy();
        }
      }
    }
  }

  enemyBulletHitPlayer(bullet, player) {
    // Only process if it's an enemy bullet
    if (bullet.bulletInstance && bullet.bulletInstance.owner === 'enemy') {
      this.createImpactEffect(bullet.x, bullet.y);
      bullet.bulletInstance.destroy();
      
      if (!this.player.isInvulnerable) {
        this.player.takeDamage(15);
        this.player.setInvulnerable(1000);
      }
    }
  }

  bulletHitPlatform(bullet, platform) {
    if (bullet.bulletInstance) {
      this.createImpactEffect(bullet.x, bullet.y);
      bullet.bulletInstance.destroy();
    }
  }

  playerHitEnemy(player, enemy) {
    const enemyInstance = enemy.enemyInstance;
    if (enemyInstance && !this.player.isInvulnerable) {
      this.player.takeDamage(10);
      this.player.setInvulnerable(1000); // 1 second invulnerability
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

  update(time, delta) {
    this.gameTime += delta;
    
    if (this.player) {
      this.player.update(this.wasd);
    }
    this.enemies.getChildren().forEach(enemy => {
    enemy.update()
  })

  // Update bullets
  this.player.bullets.getChildren().forEach(bullet => {
    bullet.update()
  })

  this.enemies.getChildren().forEach(enemy => {
    if (enemy.bullets) {
      enemy.bullets.getChildren().forEach(bullet => {
        bullet.update()
      })
    }
  })
    
    // Update enemies with player reference for AI
    this.enemies.children.entries.forEach(enemy => {
      if (enemy.enemyInstance) {
        enemy.enemyInstance.update(this.player);
        
        // Update enemy bullets
        if (enemy.enemyInstance.bullets) {
          enemy.enemyInstance.bullets.children.entries.forEach(bullet => {
            if (bullet.bulletInstance) {
              bullet.bulletInstance.update();
            }
          });
        }
      }
    });
    
    // Update player bullets
    if (this.player && this.player.bullets) {
      this.player.bullets.children.entries.forEach(bullet => {
        if (bullet.bulletInstance) {
          bullet.bulletInstance.update();
        }
      });
    }
    
    // Update UI scene with current data
    const uiScene = this.scene.get('UIScene');
    if (uiScene) {
      uiScene.updateGameData({
        health: this.player ? this.player.health : 0,
        maxHealth: this.player ? this.player.maxHealth : 100,
        killCount: this.killCount,
        gameTime: Math.floor(this.gameTime / 1000)
      });
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D,SPACE');
  }
}