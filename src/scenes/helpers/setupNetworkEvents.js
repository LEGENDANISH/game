import Player from '../../entities/Player.js';

export default function setupNetworkEvents(scene) {
  const network = scene.network;
  
  // Connection established
  network.on('connected', (data) => {
    console.log('Connected to server:', data);
    scene.localPlayerId = data.playerId;
    
    // Update local player name with actual ID
    if (scene.localPlayer && scene.localPlayer.nameLabel) {
      scene.localPlayer.nameLabel.setText(`Player_${data.playerId}`);
    }
  });
  
  // Connection lost
  network.on('disconnected', () => {
    console.log('Disconnected from server');
    // Handle reconnection or show disconnect UI
    if (scene.uiScene) {
      scene.uiScene.showDisconnectMessage();
    }
  });
  
  // Player joined the game
  network.on('player_joined', (data) => {
    console.log('Player joined:', data.playerId);
    
    // Don't create a sprite for ourselves
    if (data.playerId === scene.localPlayerId) return;
    
    // Create remote player
    const remotePlayer = new Player(scene, data.position.x, data.position.y, 'remote');
    remotePlayer.sprite.setTint(0xff9999); // Different color for remote players
    
    // Add name label
    remotePlayer.nameLabel = scene.add.text(
      data.position.x,
      data.position.y - 40,
      `Player_${data.playerId}`,
      {
        font: '16px Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setDepth(100);
    
    // Initialize network state
    remotePlayer.networkState = {
      position: data.position,
      velocity: { x: 0, y: 0 },
      flipX: false,
      lastUpdate: Date.now()
    };
    
    // Add to groups
    scene.otherPlayersGroup.add(remotePlayer.sprite);
    scene.remotePlayers.set(data.playerId, remotePlayer);
  });
  
  // Player left the game
  network.on('player_left', (data) => {
    console.log('Player left:', data.playerId);
    
    const remotePlayer = scene.remotePlayers.get(data.playerId);
    if (remotePlayer) {
      // Cleanup sprite and label
      if (remotePlayer.sprite) remotePlayer.sprite.destroy();
      if (remotePlayer.nameLabel) remotePlayer.nameLabel.destroy();
      
      // Remove from collections
      scene.remotePlayers.delete(data.playerId);
    }
  });
  
  // Player movement update
  network.on('player_moved', (data) => {
    // Don't update our own position from network
    if (data.playerId === scene.localPlayerId) return;
    
    const remotePlayer = scene.remotePlayers.get(data.playerId);
    if (remotePlayer && remotePlayer.sprite.active) {
      // Update network state for smooth interpolation
      remotePlayer.networkState = {
        position: data.position,
        velocity: data.velocity,
        flipX: data.flipX,
        lastUpdate: Date.now()
      };
      
      // Update health if provided
      if (data.health !== undefined) {
        remotePlayer.health = data.health;
        remotePlayer.maxHealth = data.maxHealth || remotePlayer.maxHealth;
      }
    }
  });
  
  // Player shot a bullet
  network.on('player_shot', (data) => {
    // Don't spawn bullets for our own shots (we handle those locally)
    if (data.playerId === scene.localPlayerId) return;
    
    console.log('Remote player shot:', data);
    scene.spawnBulletFromOtherPlayer({
      position: data.position,
      direction: data.direction,
      owner: data.playerId
    });
  });
  
  // Server state reconciliation
  network.on('server_state', (data) => {
    if (data.playerId === scene.localPlayerId) {
      // Add to buffer for client prediction reconciliation
      scene.serverStateBuffer.push({
        position: data.position,
        velocity: data.velocity,
        lastProcessedInput: data.lastProcessedInput,
        timestamp: data.timestamp
      });
      
      // Keep buffer size manageable
      if (scene.serverStateBuffer.length > 10) {
        scene.serverStateBuffer.shift();
      }
    }
  });
  
  // Player took damage
  network.on('player_damaged', (data) => {
    if (data.playerId === scene.localPlayerId) {
      // Update local player health
      scene.localPlayer.health = Math.max(0, data.newHealth);
      
      // Visual feedback for taking damage
      scene.localPlayer.sprite.setTint(0xff0000);
      scene.time.delayedCall(200, () => {
        if (scene.localPlayer.sprite.active) {
          scene.localPlayer.sprite.clearTint();
        }
      });
      
      // Check if player died
      if (data.newHealth <= 0) {
        scene.handlePlayerDeath();
      }
    } else {
      // Update remote player health
      const remotePlayer = scene.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.health = Math.max(0, data.newHealth);
        
        // Visual feedback
        remotePlayer.sprite.setTint(0xff0000);
        scene.time.delayedCall(200, () => {
          if (remotePlayer.sprite.active) {
            remotePlayer.sprite.clearTint();
          }
        });
      }
    }
  });
  
  // Player respawned
  network.on('player_respawned', (data) => {
    if (data.playerId === scene.localPlayerId) {
      // Respawn local player
      scene.localPlayer.health = data.health;
      scene.localPlayer.maxHealth = data.maxHealth;
      scene.localPlayer.isDead = false;
      scene.localPlayer.sprite.setPosition(data.position.x, data.position.y);
      scene.localPlayer.sprite.setActive(true).setVisible(true);
      scene.localPlayer.sprite.clearTint();
    } else {
      // Respawn remote player
      const remotePlayer = scene.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.health = data.health;
        remotePlayer.maxHealth = data.maxHealth;
        remotePlayer.sprite.setPosition(data.position.x, data.position.y);
        remotePlayer.sprite.setActive(true).setVisible(true);
        remotePlayer.sprite.clearTint();
      }
    }
  });
  
  // Server time synchronization
  network.on('server_time', (data) => {
    const now = Date.now();
    scene.serverTimeOffset = now - data.serverTime;
  });
  
  // Game state updates (scores, rounds, etc.)
  network.on('game_state', (data) => {
    console.log('Game state update:', data);
    
    // Update UI with game state
    if (scene.uiScene) {
      scene.uiScene.updateGameState(data);
    }
  });
  
  // Error handling
  network.on('error', (error) => {
    console.error('Network error:', error);
    
    // Show error message to user
    if (scene.uiScene) {
      scene.uiScene.showError(`Network error: ${error.message}`);
    }
  });
  
  // Ping response
  network.on('pong', (data) => {
    network.updatePing(Date.now() - data.timestamp);
  });
}

// Add helper method to scene for handling player death
export function handlePlayerDeath() {
  if (!this.localPlayer) return;
  
  this.localPlayer.isDead = true;
  this.localPlayer.sprite.setTint(0x666666);
  this.localPlayer.sprite.setVelocity(0, 0);
  
  // Show death UI
  if (this.uiScene) {
    this.uiScene.showDeathScreen();
  }
  
  // Request respawn after delay
  this.time.delayedCall(3000, () => {
    this.network.sendPlayerAction({
      type: 'RESPAWN_REQUEST',
      data: {
        timestamp: Date.now()
      }
    });
  });
}