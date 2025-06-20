import { GAME_CONFIG, COLORS } from '../../utils/constants.js';

export default function setupWorld(scene) {
  scene.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
  scene.ground = scene.physics.add.staticGroup();

  const groundSprite = scene.add.rectangle(
    GAME_CONFIG.WORLD.WIDTH / 2,
    GAME_CONFIG.WORLD.HEIGHT - GAME_CONFIG.WORLD.GROUND_HEIGHT / 2,
    GAME_CONFIG.WORLD.WIDTH,
    GAME_CONFIG.WORLD.GROUND_HEIGHT,
    COLORS.GROUND
  );
  
  scene.ground.add(groundSprite);
  scene.physics.add.existing(groundSprite, true);
}
