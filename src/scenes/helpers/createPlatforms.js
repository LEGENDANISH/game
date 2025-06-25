import Platform from '../../entities/Platform.js';
import { GAME_CONFIG } from '../../utils/constants.js';

export default function createPlatforms(scene) {
  // Create platforms group for physics
  scene.platforms = scene.physics.add.staticGroup();
  
  // Define platform positions based on world size
  const worldWidth = GAME_CONFIG.WORLD.WIDTH;
  const worldHeight = GAME_CONFIG.WORLD.HEIGHT;
  const groundLevel = worldHeight - GAME_CONFIG.WORLD.GROUND_HEIGHT;
  
  const platformData = [
    { x: worldWidth * 0.15, y: groundLevel - 150, size: 'MEDIUM' },
    { x: worldWidth * 0.3, y: groundLevel - 250, size: 'SMALL' },
    { x: worldWidth * 0.45, y: groundLevel - 300, size: 'LARGE' },
    { x: worldWidth * 0.65, y: groundLevel - 350, size: 'MEDIUM' },
    { x: worldWidth * 0.8, y: groundLevel - 400, size: 'SMALL' },
    { x: worldWidth * 0.95, y: groundLevel - 450, size: 'LARGE' },
    // Add more platforms for larger worlds
    { x: worldWidth * 1.15, y: groundLevel - 250, size: 'MEDIUM' },
    { x: worldWidth * 1.3, y: groundLevel - 350, size: 'SMALL' },
  ];

  platformData.forEach(data => {
    // Only create platforms that are within the world bounds
    if (data.x < worldWidth) {
      const platform = new Platform(scene, data.x, data.y, data.size);
      
      // Set proper depth for platforms (render behind players but above ground)
      platform.sprite.setDepth(-5);
      
      scene.platforms.add(platform.sprite);
      scene.physics.add.existing(platform.sprite, true);
    }
  });
}