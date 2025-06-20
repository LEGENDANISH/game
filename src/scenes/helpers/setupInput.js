export default function setupInput(scene) {
  scene.cursors = scene.input.keyboard.createCursorKeys();
  scene.wasd = scene.input.keyboard.addKeys('W,S,A,D,SPACE');

  scene.input.on('pointerdown', (pointer) => {
    if (scene.localPlayer && scene.network?.isConnected) {
      scene.handleShooting(pointer);
    }
  });
}
