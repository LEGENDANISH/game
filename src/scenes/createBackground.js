import Phaser from 'phaser';

import { GAME_CONFIG, COLORS } from '../utils/constants.js';

// src/scenes/createBackground.js

export default function createBackground(scene) {

  const sky = scene.add.graphics();
  sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4169E1, 0x4169E1);
  sky.fillRect(
    0,
    0,
    GAME_CONFIG.WORLD.WIDTH,
    GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT
  );
  sky.setScrollFactor(0);

  for (let i = 0; i < 15; i++) {
    const x = i * 200 + 100;
    const height = Phaser.Math.Between(200, 400);
    const building = scene.add.rectangle(
      x,
      GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT - height / 2,
      150,
      height,
      0x2d3748
    );
    building.setScrollFactor(0.3);

    for (let j = 0; j < Math.floor(height / 40); j++) {
      for (let k = 0; k < 3; k++) {
        if (Math.random() > 0.3) {
          const window = scene.add.rectangle(
            x - 40 + k * 40,
            GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT - height + 20 + j * 40,
            15,
            15,
            0xfbbf24
          );
          window.setScrollFactor(0.3);
        }
      }
    }
  }

  for (let i = 0; i < 20; i++) {
    const x = i * 150 + 75;
    const height = Phaser.Math.Between(150, 350);
    const building = scene.add.rectangle(
      x,
      GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT - height / 2,
      120,
      height,
      0x1f2937
    );
    building.setScrollFactor(0.6);
  }

  for (let i = 0; i < 8; i++) {
    const cloud = scene.add.graphics();
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