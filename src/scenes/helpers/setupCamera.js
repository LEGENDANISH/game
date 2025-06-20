import { GAME_CONFIG } from '../../utils/constants.js';

export default function setupCamera(scene) {
  scene.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
  scene.cameras.main.startFollow(scene.localPlayer.sprite, true, 0.1, 0.1);
  scene.cameras.main.setDeadzone(200, 100);
  scene.cameras.main.setZoom(1.0);
}
