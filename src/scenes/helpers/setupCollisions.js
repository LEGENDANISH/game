export default function setupCollisions(scene) {
  // Player collision with ground
  scene.physics.add.collider(scene.localPlayer.sprite, scene.ground);
  
  // Player collision with platforms
  scene.physics.add.collider(scene.localPlayer.sprite, scene.platforms);
  
  // Remote players collision with ground
  scene.physics.add.collider(scene.otherPlayersGroup, scene.ground);
  
  // Remote players collision with platforms
  scene.physics.add.collider(scene.otherPlayersGroup, scene.platforms);
  
  // Bullet collision with ground (destroy bullet)
  scene.physics.add.collider(scene.bullets, scene.ground, (bullet, ground) => {
    if (bullet.active) {
      bullet.destroy();
    }
  });
  
  // Bullet collision with platforms (destroy bullet)
  scene.physics.add.collider(scene.bullets, scene.platforms, (bullet, platform) => {
    if (bullet.active) {
      bullet.destroy();
    }
  });
  
  // Bullet collision with local player (damage)
  scene.physics.add.overlap(scene.bullets, scene.localPlayer.sprite, (bullet, player) => {
    if (bullet.active && !scene.localPlayer.isDead) {
      // Only take damage from bullets that aren't from the local player
      if (bullet.owner !== scene.localPlayerId) {
        scene.localPlayer.takeDamage(10);
        bullet.destroy();
        
        // Send damage event to server
        scene.network.sendPlayerAction({
          type: 'DAMAGE_TAKEN',
          data: {
            damage: 10,
            from: bullet.owner,
            timestamp: Date.now()
          }
        });
      }
    }
  });
  
  // Bullet collision with remote players (handled by server)
  scene.physics.add.overlap(scene.bullets, scene.otherPlayersGroup, (bullet, remotePlayer) => {
    if (bullet.active) {
      // Let server handle remote player damage
      // Just destroy the bullet visually
      bullet.destroy();
    }
  });
  
  // Player collision with other players (optional physics interaction)
  scene.physics.add.collider(scene.localPlayer.sprite, scene.otherPlayersGroup, (localPlayer, remotePlayer) => {
    // Optional: Add bounce or push effect when players collide
    // This is mainly for physics interaction, not damage
  });
}