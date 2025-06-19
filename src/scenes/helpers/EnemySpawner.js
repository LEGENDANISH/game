import Phaser from 'phaser';
import Enemy from '../../entities/Enemy.js';
import { GAME_CONFIG } from '../../utils/constants.js';

export class EnemySpawner {
  constructor(scene) {
    this.scene = scene;
    this.enemies = scene.physics.add.group();
    this.spawnPositions = [
      { x: 400, y: 650 }, { x: 800, y: 650 },
      { x: 1200, y: 650 }, { x: 1500, y: 650 },
      { x: 2000, y: 650 }, { x: 2400, y: 650 }
    ];
  }

  createInitialEnemies() {
    this.spawnPositions.forEach(pos => {
      this.spawnEnemy(pos.x, pos.y);
    });
    return this.enemies.getChildren().length;
  }

  spawnEnemy(x, y) {
    const enemy = new Enemy(this.scene, x, y);
    this.enemies.add(enemy.sprite);
    
    if (enemy.bullets) {
      this.scene.physics.add.overlap(enemy.bullets, this.scene.player.sprite, 
        this.scene.enemyBulletHitPlayer, null, this.scene);
      this.scene.physics.add.collider(enemy.bullets, this.scene.platforms, 
        this.scene.bulletHitPlatform, null, this.scene);
    }
    
    return enemy;
  }

  spawnNewEnemy() {
    if (this.scene.gameState.enemiesAlive < 8) {
      const x = Phaser.Math.Between(200, GAME_CONFIG.WORLD.WIDTH - 200);
      const enemy = this.spawnEnemy(x, 650);
      this.scene.time.delayedCall(1000, () => {
        this.scene.updateUI();
      });
      return enemy;
    }
    return null;
  }
}