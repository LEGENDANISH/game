import Phaser from 'phaser';
import GunPickup from '../../entities/GunPickup.js';
import { GAME_CONFIG } from '../../utils/constants.js';

export class GunSpawner {
  constructor(scene) {
    this.scene = scene;
    this.gunPickups = scene.physics.add.group();
    this.gunConfigs = [
      { fireRate: 100, damage: 20, color: 0xff00ff, bulletsToFire: 12 },
      { fireRate: 300, damage: 50, color: 0x00ffff, bulletsToFire: 5 },
      { fireRate: 150, damage: 30, color: 0xffff00, bulletsToFire: 8 }
    ];
  }

  startSpawning() {
    this.scene.time.addEvent({
      delay: 15000,
      loop: true,
      callback: this.spawnGunPickup,
      callbackScope: this
    });
  }

  spawnGunPickup() {
    const x = Phaser.Math.Between(100, GAME_CONFIG.WORLD.WIDTH - 100);
    const y = Phaser.Math.Between(100, 600);
    const config = Phaser.Utils.Array.GetRandom(this.gunConfigs);
    const pickup = new GunPickup(this.scene, x, y, config);
    
    this.gunPickups.add(pickup.sprite);
    this.scene.physics.add.overlap(
      this.scene.player.sprite, 
      pickup.sprite, 
      () => pickup.collect(this.scene.player), 
      null, 
      this.scene
    );
  }
}