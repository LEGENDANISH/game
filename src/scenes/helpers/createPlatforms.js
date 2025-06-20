import Platform from '../../entities/Platform.js';

export default function createPlatforms(scene) {
  scene.platforms = scene.physics.add.staticGroup();
  
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
    const platform = new Platform(scene, data.x, data.y, data.size);
    scene.platforms.add(platform.sprite);
    scene.physics.add.existing(platform.sprite, true);
  });
}
