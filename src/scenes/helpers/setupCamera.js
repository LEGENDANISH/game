export default function setupCamera(scene) {
  if (!scene.localPlayer) return;
  
  const gameWidth = scene.game.config.width;
  const gameHeight = scene.game.config.height;
  
  scene.cameras.main.startFollow(scene.localPlayer.sprite, true, 0.1, 0.1);
  scene.cameras.main.setFollowOffset(0, -50);
  scene.cameras.main.setDeadzone(100, 100);
  scene.cameras.main.setBounds(0, 0, gameWidth, gameHeight);
}