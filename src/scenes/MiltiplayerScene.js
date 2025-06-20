import Phaser from 'phaser';
import createBackground from './createBackground.js';
import NetworkManager from './network.js';
import Player from '../entities/Player.js';
import { GAME_CONFIG } from '../utils/constants.js';
import Platform from '../entities/Platform.js';

// Modular setup helpers
import setupWorld from './helpers/setupWorld.js';
import createPlatforms from './helpers/createPlatforms.js';
import setupCamera from './helpers/setupCamera.js';
import setupInput from './helpers/setupInput.js';

export default class MultiplayerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MultiplayerScene' });
    this.remotePlayers = new Map();
    this.localPlayer = null;
    this.localPlayerId = null;
    this.otherPlayersGroup = null;
    this.network = null;
    this.uiScene = null;
    this.lastUpdateTime = 0;
  }

  preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('bullet', 'assets/bullet.png');
  }

  create() {
    createBackground(this);

    this.debugGraphics = this.add.graphics();
    this.debugText = this.add.text(10, 10, '', {
      font: '16px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000'
    }).setScrollFactor(0);

    // 🧩 Modular setup
    setupWorld(this);
    createPlatforms(this);
    this.createLocalPlayer();
    setupCamera(this);
    this.setupCollisions();
    setupInput(this);

    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene');

    this.network = new NetworkManager(this);
    this.network.connect();
    this.setupNetworkEvents();
  }

  
  
  createLocalPlayer() {
    this.localPlayer = new Player(this, 100, 600, 'local');
    this.otherPlayersGroup = this.physics.add.group();
    this.localPlayer.sprite.setCollideWorldBounds(true);
  }

  
  setupCollisions() {
    this.physics.add.collider(this.localPlayer.sprite, this.ground);
    this.physics.add.collider(this.localPlayer.sprite, this.platforms);
    this.physics.add.collider(this.otherPlayersGroup, this.ground);
    this.physics.add.collider(this.otherPlayersGroup, this.platforms);
    this.physics.add.collider(this.localPlayer.sprite, this.otherPlayersGroup, null, null, this);
  }

  
  update(time, delta) {
    if (!this.localPlayer || !this.localPlayer.sprite.active) return;

    this.localPlayer.update(this.wasd);

    // Send updates at a controlled rate (20 updates per second)
    const now = Date.now();
    if (now - this.lastUpdateTime > 50 && this.network?.isConnected) {
      this.lastUpdateTime = now;
      this.sendPlayerUpdate();
    }

    // Update debug info
    this.updateDebugInfo();
    this.updateUI();
    
    // Smooth interpolation for remote players
    this.updateRemotePlayersInterpolation();
  }

  updateDebugInfo() {
    const remotePlayersInfo = Array.from(this.remotePlayers.entries())
      .map(([id, player]) => `${id.slice(-4)}: ${player.sprite.x.toFixed(0)},${player.sprite.y.toFixed(0)}`)
      .join('\n');
    
    this.debugText.setText([
      `Local: ${this.localPlayerId?.slice(-4) || 'none'}`,
      `Position: ${this.localPlayer.sprite.x.toFixed(0)},${this.localPlayer.sprite.y.toFixed(0)}`,
      `Remote Players (${this.remotePlayers.size}):`,
      remotePlayersInfo
    ].join('\n'));
  }

  updateUI() {
    if (this.uiScene && this.localPlayer) {
      this.uiScene.updateGameData({
        health: this.localPlayer.health,
        maxHealth: this.localPlayer.maxHealth,
        killCount: 0,
        gameTime: Math.floor(this.time.now / 1000),
        enemiesAlive: this.remotePlayers.size
      });
    }
  }

  sendPlayerUpdate() {
    const sprite = this.localPlayer.sprite;
    const velocity = sprite.body.velocity;

    // Send as MOVE action that backend expects
    this.network.sendPlayerAction({
      type: 'MOVE',
      data: {
        position: {
          x: Math.round(sprite.x),
          y: Math.round(sprite.y)
        },
        velocity: {
          x: Math.round(velocity.x),
          y: Math.round(velocity.y)
        },
        rotation: sprite.flipX ? Math.PI : 0, // Simple rotation based on flip
        flipX: sprite.flipX,
        health: this.localPlayer.health, // Add health data
      maxHealth: this.localPlayer.maxHealth // Add max health if needed
      }
    });
  }
  // MultiplayerScene.js

sendHealthUpdate() {
  if (this.network && this.localPlayer) {
    this.network.sendPlayerAction({
      type: 'HEALTH_UPDATE',
      data: { health: this.localPlayer.health }
    });
  }
}

  handleShooting(pointer) {
    const sprite = this.localPlayer.sprite;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // Calculate rotation from player to mouse cursor
    const rotation = Phaser.Math.Angle.Between(
      sprite.x, sprite.y,
      worldPoint.x, worldPoint.y
    );

    // Send shooting action to backend
    this.network.sendPlayerAction({
      type: 'SHOOT',
      data: {
        position: {
          x: Math.round(sprite.x),
          y: Math.round(sprite.y)
        },
        rotation: rotation
      }
    });
    this.sendHealthUpdate();
  }

  setupNetworkEvents() {
    const safeEmit = (event, handler) => {
      this.network.on(event, (data) => {
        try {
          if (!data) {
            console.error(`[${event}] Received undefined data`);
            return;
          }
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    };

    safeEmit('connected', () => {
      console.log('[NETWORK] Connected to server');
      this.network.joinRoom('LOBBY');
    });

    safeEmit('joinedRoom', (data) => {
      console.log('[NETWORK] Joined room:', data);
      if (!data.playerId) {
        console.error('Missing playerId in joinedRoom event');
        return;
      }
      
      this.localPlayerId = data.playerId;
      this.localPlayer.sprite.setPosition(data.spawnPosition.x, data.spawnPosition.y);
      
      // Add existing players
      if (data.players) {
        data.players.forEach(player => {
          if (player.id !== this.localPlayerId) {
            this.addRemotePlayer(player.id, player.position.x, player.position.y);
          }
        });
      }
    });

    safeEmit('playerJoined', (data) => {
      console.log('[NETWORK] Player joined:', data);
      if (!data.playerId) {
        console.error('Missing playerId in playerJoined event');
        return;
      }
      if (data.playerId === this.localPlayerId) return;
      
      this.addRemotePlayer(
        data.playerId, 
        data.position?.x || 100, 
        data.position?.y || 100
      );
    });

    safeEmit('playerLeft', (playerId) => {
      console.log('[NETWORK] Player left:', playerId);
      if (!playerId) {
        console.error('Missing playerId in playerLeft event');
        return;
      }
      this.removeRemotePlayer(playerId);
    });

    safeEmit('playerMoved', (data) => {
      console.log('[NETWORK] Player moved:', data);
      if (!data?.playerId || data.playerId === this.localPlayerId) return;
      
      this.updateRemotePlayer(
        data.playerId,
        data.position.x,
        data.position.y,
        data.velocity || { x: 0, y: 0 },
        data.flipX || false
      );
    });

    safeEmit('playerShot', (data) => {
      console.log('[NETWORK] Player shot:', data);
      if (!data?.playerId) {
        console.error('Invalid playerShot data:', data);
        return;
      }
      if (data.playerId === this.localPlayerId) return;
      
      this.spawnBulletFromOtherPlayer(
        data.playerId,
        data.position.x,
        data.position.y,
        data.rotation || 0
      );
    });
safeEmit('damageTaken', (data) => {
  const { playerId, health } = data;
  if (!playerId || playerId === this.localPlayerId) return;

  const remotePlayer = this.remotePlayers.get(playerId);
  if (remotePlayer?.sprite?.playerInstance) {
    remotePlayer.sprite.playerInstance.updateHealth(health);
  }
});
safeEmit('healthUpdate', (data) => {
  if (data.playerId === this.localPlayerId) {
    this.localPlayer.health = data.health;
  } else {
    const remotePlayer = this.remotePlayers.get(data.playerId);
    if (remotePlayer?.sprite?.playerInstance) {
      remotePlayer.sprite.playerInstance.health = data.health;
      // Update visual health bar
      const healthPercent = data.health / remotePlayer.sprite.playerInstance.maxHealth;
      if (remotePlayer.healthBarFill) {
        remotePlayer.healthBarFill.scaleX = healthPercent;
        remotePlayer.healthBarFill.setFillStyle(healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000);
      }
    }
  }
  this.updateUI();
});
    safeEmit('gameUpdate', (data) => {
      // Handle periodic game state updates from server
      if (data.state && data.state.players) {
        Object.values(data.state.players).forEach(playerData => {
          if (playerData.id !== this.localPlayerId) {
            this.updateRemotePlayer(
              playerData.id,
              playerData.position.x,
              playerData.position.y,
              playerData.velocity || { x: 0, y: 0 },
              false
            );
          }
        });
      }
    });
  }

  addRemotePlayer(id, x, y) {
     if (this.remotePlayers.has(id)) {
    console.warn(`Player ${id} already exists, updating position instead`);
    this.updateRemotePlayer(id, x, y, { x: 0, y: 0 }, false);
    return;
  }
    console.log(`Adding remote player ${id} at ${x},${y}`);
    const remotePlayer = new Player(this, x, y, 'remote');
     if (remotePlayer.sprite.body) {
    remotePlayer.sprite.body.setCollideWorldBounds(true);
    remotePlayer.sprite.body.setGravityY(800); // Add gravity like local player
    remotePlayer.sprite.body.setSize(32, 48); // Set proper collision box
    remotePlayer.sprite.body.setOffset(0, 0);
  }
  
  remotePlayer.sprite.setTint(0xff0000); // Red tint for remote players
     
    // Add debug name tag
    const nameText = this.add.text(x, y - 40, `Player ${id.slice(-4)}`, {
      font: '16px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000'
    })
    const healthBarBg = this.add.rectangle(x, y - 55, 50, 6, 0x000000);
const healthBarFill = this.add.rectangle(x, y - 55, 50, 6, 0x00ff00);
;

    this.otherPlayersGroup.add(remotePlayer.sprite);
    this.remotePlayers.set(id, {
      sprite: remotePlayer.sprite,
      text: nameText,
      healthBarBg: healthBarBg,
  healthBarFill: healthBarFill,
      lastUpdate: Date.now(),
      targetX: x,
      targetY: y,
      velocityX: 0,
      velocityY: 0
    });
        console.log(`Created remote player ${id}`, remotePlayer.sprite);

  }

  updateRemotePlayer(id, x, y, velocity, flipX) {
    const player = this.remotePlayers.get(id);
    if (!player) {
      // Player doesn't exist, create them
      this.addRemotePlayer(id, x, y);
      return;
    }

    // Store target for smooth interpolation
    player.targetX = x;
    player.targetY = y;
   player.velocityX = velocity.x;
player.velocityY = velocity.y;
player.lastUpdate = Date.now();

    // Update visual properties immediately
    player.sprite.setFlipX(flipX);
    if (player.text) {
      player.text.setPosition(x, y - 40);
    }
    // Force immediate visual sync for better responsiveness
if (player.sprite.playerInstance) {
  player.sprite.playerInstance.updatePosition(x, y, flipX);
}
     console.log(`Updated player ${id} position`, x, y);
  }

  updateRemotePlayersInterpolation() {
    this.remotePlayers.forEach((player, id) => {
      const timeSinceUpdate = Date.now() - player.lastUpdate;
      
      // Only interpolate if update is recent (within 200ms)
      if (timeSinceUpdate < 200) {
        const lerpFactor = 0.2; // Smooth interpolation
        
        const currentX = player.sprite.x;
        const currentY = player.sprite.y;
        
        const newX = Phaser.Math.Linear(currentX, player.targetX, lerpFactor);
        const newY = Phaser.Math.Linear(currentY, player.targetY, lerpFactor);
        
        player.sprite.setPosition(newX, newY);
        
        if (player.text) {
          player.text.setPosition(newX, newY );
        }
        if (player.healthBarBg) {
  player.healthBarBg.setPosition(newX, newY - 55);
}
if (player.healthBarFill) {
  player.healthBarFill.setPosition(newX, newY - 55);
}
      } 
    });
  }

 removeRemotePlayer(id) {
  const player = this.remotePlayers.get(id);
  if (player) {
    // Remove from physics group first
    if (this.otherPlayersGroup.contains(player.sprite)) {
      this.otherPlayersGroup.remove(player.sprite);
    }
    
    // Destroy player components
    if (player.sprite?.playerInstance) {
      player.sprite.playerInstance.destroy();
    } else {
      if (player.sprite) player.sprite.destroy();
    }
    
    if (player.text) player.text.destroy();
    if (player.healthBarFill) player.healthBarFill.destroy();

    this.remotePlayers.delete(id);
    console.log(`[SCENE] Removed remote player ${id}`);
  }
}

  spawnBulletFromOtherPlayer(id, x, y, rotation) {
    const bullet = this.physics.add.sprite(x, y, 'bullet');
    const speed = 500;
    bullet.setVelocity(
      Math.cos(rotation) * speed,
      Math.sin(rotation) * speed
    );
    bullet.setCollideWorldBounds(true);

    // Auto-destroy after 2 seconds
    this.time.delayedCall(2000, () => {
      if (bullet.active) bullet.destroy();
    });

    // Collision handlers
    this.physics.add.collider(bullet, this.platforms, () => bullet.destroy());
    this.physics.add.collider(bullet, this.ground, () => bullet.destroy());
    this.physics.add.overlap(bullet, this.localPlayer.sprite, () => {
      this.localPlayer.takeDamage(10);
        this.sendHealthUpdate(); // ADD THIS LINE

      bullet.destroy();
    });
  }
}