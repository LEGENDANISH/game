import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../utils/constants.js';

export default class Platform {
  constructor(scene, x, y, size = 'MEDIUM') {
    this.scene = scene;
    this.size = size;
    
    const dimensions = GAME_CONFIG.PLATFORM[size];
    
    // Create platform physics body
    this.body = scene.physics.add.staticGroup();
    this.sprite = this.body.create(x, y, null)
      .setSize(dimensions.width, dimensions.height)
      .setOffset(0, 0)
      .refreshBody();
    
    // Create visual platform
    this.visual = scene.add.rectangle(x, y, dimensions.width, dimensions.height, COLORS.PLATFORM);
    this.visual.setStrokeStyle(2, 0x1f2937);
    
    // Add some detail to make it look more like a building platform
    this.addDetails(x, y, dimensions);
  }

  addDetails(x, y, dimensions) {
    // Add some surface texture
    const surfaceDetail = this.scene.add.rectangle(
      x, 
      y - dimensions.height / 2 + 2, 
      dimensions.width - 4, 
      4, 
      0x4b5563
    );
    
    // Add support beams for larger platforms
    if (this.size === 'LARGE') {
      const leftBeam = this.scene.add.rectangle(
        x - dimensions.width / 3, 
        y + 2, 
        4, 
        8, 
        0x374151
      );
      const rightBeam = this.scene.add.rectangle(
        x + dimensions.width / 3, 
        y + 2, 
        4, 
        8, 
        0x374151
      );
    }
    
    // Add subtle shadow
    const shadow = this.scene.add.rectangle(
      x + 2, 
      y + 2, 
      dimensions.width, 
      dimensions.height, 
      0x000000, 
      0.2
    );
    shadow.setDepth(-1);
  }

  // Make the platform interactable with other physics bodies
  enableCollision(target) {
    this.scene.physics.add.collider(target, this.body);
  }
}