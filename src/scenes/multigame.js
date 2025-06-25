import Phaser from 'phaser';
import createBackground from './createBackground.js';
import NetworkManager from './NETWok.js';
import Player from '../entities/px.js';
import { GAME_CONFIG } from '../utils/constants.js';
import Platform from '../entities/Platform.js';
import Bullet from '../entities/Bullet.js';

// Add these imports after line 6:
import setupWorld from './helpers/setupWorld.js';
import createPlatforms from './helpers/createPlatforms.js';
import setupCamera from './helpers/setupCamera.js';
import setupInput from './helpers/setupInput.js';
const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const gameHeight = GAME_CONFIG.WORLD.HEIGHT;
export default class MultiplayerScenee extends Phaser.Scene {
  constructor() {
    super({ key: 'MultiplayerScenee' });
   this.remotePlayers = new Map();
    this.localPlayer = null;
    this.localPlayerId = null;
    this.bullets = null;
    this.network = null;
    this.uiScene = null;

    // Client prediction
    this.inputSequence = 0;
    this.pendingInputs = [];
    this.serverStateBuffer = [];
    this.lastInput = { left: false, right: false, up: false, shoot: false };

    // Physics state
    this.physicsState = {
      position: { x: 100, y: 600 },
      velocity: { x: 0, y: 0 },
      onGround: true,
    };

    // Networked variables
    this.networkedVars = {
      health: { value: 100, dirty: true, reliable: true },
      score: { value: 0, dirty: true, reliable: true },
      ammo: { value: 30, dirty: true, reliable: false },
      position: { value: { x: 100, y: 550 }, dirty: true, reliable: false },
    };

    // Timing
    this.lastNetVarSync = 0;
    this.lastShotTime = 0;
    this.serverTimeOffset = 0;


    
  }




  preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('bullet', 'assets/bullet.png');
    
    // Create a simple colored rectangle for ground if image doesn't exist
    this.load.image('ground', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }

  create() {
    createBackground(this);
  setupWorld(this);
  createPlatforms(this);
    setupCamera(this);


    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const gameHeight = GAME_CONFIG.WORLD.HEIGHT;

    // Setup physics with proper world bounds
    this.physics.world.setBounds(0, 0, gameWidth, gameHeight);
    this.physics.world.setFPS(60);

    // Create groups
    this.otherPlayersGroup = this.physics.add.group();
    this.bullets = this.physics.add.group();

    // Create ground with proper rendering
    this.createGround(gameWidth, gameHeight);

    // Local player setup
    this.createLocalPlayer(gameWidth, gameHeight);

    // Collisions
    this.setupCollisions();

    // Input handling
    this.setupInput();

    // Network
    this.network = new NetworkManager(this);
    this.network.connect();

    // UI & debug
    this.setupDebugTools();
    this.setupNetworkEvents();

this.physics.world.drawDebug = false; // Disable debug
if (this.localPlayer.sprite) {
  this.localPlayer.sprite.setDebug(false); // Hide body
}
  }
   

createGround(gameWidth, gameHeight) {
  const groundHeight = 100;
  
  // Create visible ground rectangle
  this.add.rectangle(
    gameWidth/2, gameHeight - groundHeight/2, 
    gameWidth, groundHeight, 
    0x8B4513
  );
  
  // Create single physics body
  this.ground = this.physics.add.staticGroup();
  const groundBody = this.ground.create(gameWidth/2, gameHeight - groundHeight/2, null);
  groundBody.setSize(gameWidth, groundHeight);
  groundBody.setVisible(false);
  groundBody.refreshBody();
  this.groundLevel=100
  
  this.groundLevel = gameHeight - groundHeight;
}

  createLocalPlayer(gameWidth, gameHeight) {
    const startX = Math.min(100, gameWidth - 50); // Ensure player starts within bounds
    const startY = this.groundLevel - 50; // Position above ground
    
    this.localPlayer = new Player(this, startX, startY, 'local');
this.localPlayer.sprite.setDepth(10); // Ensure player is above ground


      this.add.existing(this.localPlayer.sprite);

   this.localPlayer.sprite.setCollideWorldBounds(true)
    .setActive(true)
    .setVisible(true)
    .setDepth(10);
    this.localPlayer.sprite.setActive(true).setVisible(true);




    
    // Set initial physics state
    this.physicsState.position = {
      x: this.localPlayer.sprite.x,
      y: this.localPlayer.sprite.y,
    };




    
    // Add name label
    this.localPlayer.nameLabel = this.add.text(
      this.localPlayer.sprite.x,
      this.localPlayer.sprite.y - 40,
      `Player_${this.localPlayerId || 'Local'}`,
     ).setOrigin(0.5);
// 
// 
// Debug: Log remote players count

    // Prediction tracking
    this.localPlayer.sprite.clientPredictedX = this.physicsState.position.x;
    this.localPlayer.sprite.clientPredictedY = this.physicsState.position.y;
    this.localPlayer.sprite.lastServerX = this.physicsState.position.x;
    this.localPlayer.sprite.lastServerY = this.physicsState.position.y;

    this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.1, 0.1);
this.cameras.main.setFollowOffset(0, -50);
this.cameras.main.setDeadzone(100, 100);
this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.HEIGHT, GAME_CONFIG.WORLD.WIDTH);
  this.setupCameraFollow();


if (this.localPlayer.sprite.body) {
    this.localPlayer.sprite.body.debugShowBody = false;
    this.localPlayer.sprite.body.debugShowVelocity = false;
    this.localPlayer.sprite.setDebug(false, false, false);
}
  }
// Add this new method to properly setup camera following:
setupCameraFollow() {
  const gameWidth = GAME_CONFIG.WORLD.WIDTH;
  const gameHeight = GAME_CONFIG.WORLD.HEIGHT;
  
  // Set camera bounds to match world bounds
  this.cameras.main.setBounds(0, 0, gameWidth, gameHeight);
  
  // Start following the player with smooth interpolation
  this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.05, 0.05);
  
  // Set a small deadzone so camera doesn't move with every tiny movement
  this.cameras.main.setDeadzone(50, 50);
  
  // Center the camera on the player vertically with a slight offset
  this.cameras.main.setFollowOffset(0, -100);
  
  // Zoom slightly for better view (optional)
  this.cameras.main.setZoom(1.0);
  
  console.log('Camera setup complete - following player');
}

// Also add this method to handle camera updates in your update loop:
updateCamera() {
  // Ensure camera is always following the active player
  if (this.localPlayer && this.localPlayer.sprite && this.localPlayer.sprite.active) {
    // Force camera to follow if it somehow stopped
    if (!this.cameras.main.followTarget) {
      console.log('Camera lost target, re-establishing follow');
      this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.05, 0.05);
    }
    
    // Keep camera within world bounds
    const cam = this.cameras.main;
    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const gameHeight = GAME_CONFIG.WORLD.HEIGHT;
    
    // Ensure camera doesn't go outside world bounds
    if (cam.scrollX < 0) cam.scrollX = 0;
    if (cam.scrollX > gameWidth - cam.width) cam.scrollX = gameWidth - cam.width;
    if (cam.scrollY < 0) cam.scrollY = 0;
    if (cam.scrollY > gameHeight - cam.height) cam.scrollY = gameHeight - cam.height;
  }
}
  setupCollisions() {
    this.physics.add.collider(this.localPlayer.sprite, this.ground);
    this.physics.add.collider(this.otherPlayersGroup, this.ground);

    // Bullet collisions
    this.physics.add.collider(this.bullets, this.ground, (bullet) => bullet.destroy());
    this.physics.add.overlap(this.bullets, this.otherPlayersGroup, (bullet, enemy) => this.handleBulletHit(bullet, enemy));
  }

  setupInput() {
    this.keys = {
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
  }

  update(time, delta) {
    if (!this.localPlayer || !this.localPlayer.sprite.active) return;

    this.processLocalInput(delta);
    this.reconcileServerState();
    this.updateNetworkedVars();
    this.updateRemotePlayers(time, delta);
  this.updateCamera();

    // Update local player label
    if (this.localPlayer.nameLabel) {
      this.localPlayer.nameLabel.setPosition(this.localPlayer.sprite.x, this.localPlayer.sprite.y - 40);
    }


  if (this.localPlayer.nameLabel) {
    this.localPlayer.nameLabel.setPosition(this.localPlayer.sprite.x, this.localPlayer.sprite.y - 40);
  }


    // Add debug markers to verify positions
  
    if (time > this.lastNetVarSync + 100) {
      this.syncNetworkedVars();
      this.lastNetVarSync = time;
    }

    this.cleanupOldInputs();
    this.validateNetworkState();
    this.updateUI();



    
  }


processLocalInput(delta) {
    const input = this.collectInput();
    const now = Date.now();

    const INPUT_SEND_RATE = 50; // Send input max every 100ms instead of 16ms
    const shouldSendInput = this.hasInputChanged(input) || (now - (this.lastInputSent || 0) > INPUT_SEND_RATE);

    if (shouldSendInput) {
        this.inputSequence++;
        this.network.lastInputSent = now;
        
        this.network.sendPlayerAction({
            type: 'PLAYER_INPUT',
            data: {
                left: input.left,
                right: input.right,
                up: input.up,
                shoot: input.shoot,
                sequenceNumber: this.inputSequence,
                timestamp: now,
            },
        });

        this.pendingInputs.push({
            sequenceNumber: this.inputSequence,
            input,
            timestamp: now,
            actualDelta: delta,
        });
console.log("pending", JSON.stringify(this.pendingInputs, null, 2));
    }

    // Always apply input locally for responsiveness
    this.applyLocalInput(input, delta);

    if (input.shoot && this.time.now > this.lastShotTime + 250) {
        this.handleShooting();
        this.lastShotTime = this.time.now;
    }

    this.lastInput = input;
}
  collectInput() {
    const input = {
      left: this.keys.left.isDown,
      right: this.keys.right.isDown,
      up: this.keys.up.isDown,
      shoot: this.keys.space.isDown,
    };
        console.log('Current Input:', input); // 👈 ADD THIS
return input;
  }

  hasInputChanged(input) {
    return (
      input.left !== this.lastInput.left ||
      input.right !== this.lastInput.right ||
      input.up !== this.lastInput.up ||
      input.shoot !== this.lastInput.shoot
    );
  }

  applyLocalInput(input, delta) {
    const speed = 200;
    const jumpForce = -500;
    const gravity = 800;


    
 const wasOnGround = this.physicsState.onGround;
  this.physicsState.onGround = this.physicsState.position.y >= this.groundLevel - 5; // Add 
    // Apply horizontal movement
    this.physicsState.velocity.x = input.left ? -speed : input.right ? speed : 0;

    // Apply jump
    if (input.up && this.physicsState.onGround) {
      this.physicsState.velocity.y = jumpForce;
      this.physicsState.onGround = false;
    }

    // Apply gravity
    this.physicsState.velocity.y += gravity * (delta / 1000);
    
    // Update position
    this.physicsState.position.x += this.physicsState.velocity.x * (delta / 1000);
    this.physicsState.position.y += this.physicsState.velocity.y * (delta / 1000);

    // Constrain horizontal movement to world bounds
    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const playerWidth = this.localPlayer.sprite.width || 32; // Default width if not set
    
    this.physicsState.position.x = Phaser.Math.Clamp(
      this.physicsState.position.x, 
      playerWidth / 2, 
      gameWidth - playerWidth / 2
    );

    // Ground collision
    if (this.physicsState.position.y >= this.groundLevel) {
      this.physicsState.position.y = this.groundLevel;
      this.physicsState.velocity.y = 0;
      this.physicsState.onGround = true;
    }

    // Update sprite position
    this.localPlayer.sprite.setPosition(this.physicsState.position.x, this.physicsState.position.y);
    this.localPlayer.updateVisuals(input.left || input.right);
    this.localPlayer.sprite.clientPredictedX = this.physicsState.position.x;
    this.localPlayer.sprite.clientPredictedY = this.physicsState.position.y;
  }

// reconcileServerState() {
//     while (this.serverStateBuffer.length > 0) {
//         const serverState = this.serverStateBuffer.shift();
//         const index = this.pendingInputs.findIndex(i => i.sequenceNumber === serverState.lastProcessedInput);

//         if (index !== -1) {
//             this.pendingInputs.splice(0, index + 1);

//             // Use much smoother correction with smaller lerp factor
//             const lerpFactor = 0.1; // Reduced from 0.5 to 0.2 for smoother correction
//             this.physicsState.position.x = Phaser.Math.Linear(
//                 this.physicsState.position.x, 
//                 serverState.position.x, 
//                 lerpFactor
//             );
//             this.physicsState.position.y = Phaser.Math.Linear(
//                 this.physicsState.position.y, 
//                 serverState.position.y, 
//                 lerpFactor
//             );
            
//             // Keep velocity updates but dampen them
//             this.physicsState.velocity.x = Phaser.Math.Linear(
//                 this.physicsState.velocity.x,
//                 serverState.velocity.x,
//                 0.3
//             );
//             this.physicsState.velocity.y = Phaser.Math.Linear(
//                 this.physicsState.velocity.y,
//                 serverState.velocity.y,
//                 0.3
//             );
            
//             this.localPlayer.sprite.setPosition(
//                 this.physicsState.position.x, 
//                 this.physicsState.position.y
//             );
//         }
//     }
// }
reconcileServerState() {
    while (this.serverStateBuffer.length > 0) {
        const serverState = this.serverStateBuffer.shift();
        const index = this.pendingInputs.findIndex(i => i.sequenceNumber === serverState.lastProcessedInput);

        if (index !== -1) {
            this.pendingInputs.splice(0, index + 1);

            // Smoother correction with velocity matching
            const positionLerp = 0.2;
            const velocityLerp = 0.3;
            
            this.physicsState.position.x = Phaser.Math.Linear(
                this.physicsState.position.x, 
                serverState.position.x, 
                positionLerp
            );
            
            this.physicsState.position.y = Phaser.Math.Linear(
                this.physicsState.position.y, 
                serverState.position.y, 
                positionLerp
            );
            
            this.physicsState.velocity.x = serverState.velocity.x;
            this.physicsState.velocity.y = serverState.velocity.y;
            
            this.localPlayer.sprite.setPosition(
                this.physicsState.position.x, 
                this.physicsState.position.y
            );
        }
    }
}


  resimulateFromServerState() {
    for (const input of this.pendingInputs) {
      this.applyLocalInput(input.input, input.actualDelta || 16); // 60fps fallback
    }
  }

  setNetworkedVar(name, value, force = false) {
    if (!this.networkedVars[name]) return;

    const currentValue = this.networkedVars[name].value;
    const hasChanged = typeof value === 'object'
      ? JSON.stringify(currentValue) !== JSON.stringify(value)
      : currentValue !== value;

    if (hasChanged || force) {
      this.networkedVars[name].value = typeof value === 'object' ? { ...value } : value;
      this.networkedVars[name].dirty = true;
    }
  }

  syncNetworkedVars() {
    const dirtyVars = {};
    let hasDirty = false;

    for (const [name, netVar] of Object.entries(this.networkedVars)) {
      if (netVar.dirty) {
        dirtyVars[name] = { value: netVar.value, reliable: netVar.reliable };
        netVar.dirty = false;
        hasDirty = true;
      }
    }

    if (hasDirty) {
      this.network.sendMessage('SYNC_VARS', {
        playerId: this.localPlayerId,
        variables: dirtyVars,
        timestamp: Date.now(),
      });
    }
  }




updateNetworkedVars() {
    const now = Date.now();
    
    // Rate limit position updates
    if (now - this.network.lastStateSent < this.network.stateSendRate) {
        return;
    }
    
    const newPos = {
        x: Math.round(this.physicsState.position.x),
        y: Math.round(this.physicsState.position.y),
    };
    
    // Only update if position changed significantly
    const oldPos = this.networkedVars.position.value;
    const diffX = Math.abs(newPos.x - oldPos.x);
    const diffY = Math.abs(newPos.y - oldPos.y);
    
    if (diffX > 2 || diffY > 2) {
        this.setNetworkedVar('position', newPos);
        this.network.lastStateSent = now;
    }

    if (this.localPlayer.health !== this.networkedVars.health.value) {
        this.setNetworkedVar('health', this.localPlayer.health);
    }
}
  handleShooting() {
    if (!this.localPlayer || this.localPlayer.isDead) return;

    this.localPlayer.shoot();
    this.network.sendPlayerAction({
      type: 'SHOOT',
      data: {
        position: { x: this.localPlayer.sprite.x, y: this.localPlayer.sprite.y },
        direction: this.localPlayer.direction,
        timestamp: Date.now(),
      },
    });
  }

  spawnBulletFromOtherPlayer(data) {
    const bullet = new Bullet(this, data.position.x, data.position.y, data.direction);
    this.bullets.add(bullet.sprite);
    bullet.sprite.body.velocity.x = data.direction * 500;

    this.time.delayedCall(1000, () => {
      if (bullet.sprite?.active) bullet.sprite.destroy();
    });
  }

  cleanupOldInputs() {
    const now = Date.now();
    this.pendingInputs = this.pendingInputs.filter((input) => now - input.timestamp < 2000);
  }

  showPlayerJoinedNotification(playerId) {
    const notification = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      `Player ${playerId} joined!`,
      {
        font: '24px Arial',
        fill: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 10, y: 5 },
      }
    ).setOrigin(0.5);

    this.time.delayedCall(3000, () => notification.destroy());
  }


setupNetworkEvents() {
  this.network.on('connected', () => this.network.joinRoom('LOBBY'));

  this.network.on('joinedRoom', (data) => {
    this.localPlayerId = data.playerId;
    this.serverTimeOffset = Date.now() - data.serverTime;

    if (this.localPlayer.nameLabel) {
      this.localPlayer.nameLabel.setText(`Player_${this.localPlayerId}`);
    }

    // Set local player spawn position with bounds checking
    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const safeX = Phaser.Math.Clamp(data.spawnPosition.x, 50, gameWidth - 50);
    const safeY = Math.min(data.spawnPosition.y, this.groundLevel);
    
    this.localPlayer.sprite.setPosition(safeX, safeY);
    this.physicsState.position = { x: safeX, y: safeY };

    // Add all existing players
    console.log('Adding existing players:', data.players);
    data.players.forEach((playerData) => {
      if (playerData.id !== this.localPlayerId) {
        this.addRemotePlayer(playerData.id, playerData);
      }
    });

    console.log(`Joined room with ${data.players.length} total players`);
  });

  // MAIN POSITION UPDATE HANDLER - Use this one for all position updates
  this.network.on('stateUpdate', (data) => {
    console.log('📍 Position update received:', data);
    this.updateUI()
    if (data.playerId === this.localPlayerId) {
      // Handle server reconciliation for local player
      this.serverStateBuffer.push({
        position: data.position,
        velocity: data.velocity,
        lastProcessedInput: data.lastProcessedInput,
        timestamp: data.timestamp,
      });
    } else {
      // Update remote player position
      if (this.remotePlayers.has(data.playerId)) {
        this.setupNetworkEvents(data.playerId, data);
      } else {
        console.log(`Creating missing remote player ${data.playerId}`);
        this.addRemotePlayer(data.playerId, data);
      }
    }
    
    this.network.on('PLAYER_MOVED', (data) => {
    if (data.playerId === this.localPlayerId) return;
    
    if (this.remotePlayers.has(data.playerId)) {
        const player = this.remotePlayers.get(data.playerId);
        
        // Store the raw server state
        player.networkState = {
            position: { 
                x: data.position.x, 
                y: data.position.y 
            },
            velocity: { 
                x: data.velocity.x, 
                y: data.velocity.y 
            },
            flipX: data.velocity.x < 0,
            lastUpdate: this.getServerTime(),
            serverTick: data.serverTick
        };
    } else {
        // Add new player with initial state
        this.addRemotePlayer(data.playerId, {
            position: data.position,
            velocity: data.velocity,
            flipX: data.velocity.x < 0
        });
    }
});
  });

  // INITIAL GAME STATE - Only for joining
  this.network.on('GAME_STATE', (data) => {
    console.log('🎮 Initial game state received:', data);
    if (data.players) {
      Object.entries(data.players).forEach(([playerId, playerData]) => {
        if (playerId !== this.localPlayerId && !this.remotePlayers.has(playerId)) {
          this.addRemotePlayer(playerId, playerData);
        }
      });
    }
  });

  // PLAYER LIFECYCLE EVENTS
  this.network.on('playerJoined', (data) => {
    if (data.playerId !== this.localPlayerId) {
      this.addRemotePlayer(data.playerId, data);
      this.showPlayerJoinedNotification(data.playerId);
      this.updateUI();
    }
  });

  this.network.on('playerLeft', (id) => {
    this.removeRemotePlayer(id);
    this.updateUI();
  });

  // INPUT VALIDATION
  this.network.on('inputValidation', (data) => {
    const { valid, correctedState } = data;
    if (!valid && correctedState) {
      this.serverStateBuffer.push({
        position: correctedState.position,
        velocity: correctedState.velocity,
        lastProcessedInput: data.sequenceNumber,
        timestamp: Date.now(),
      });
    }
  });

  // COMBAT EVENTS
  this.network.on('playerShot', (data) => {
    if (data.playerId !== this.localPlayerId) {
      this.spawnBulletFromOtherPlayer(data);
    }
  });

  this.network.on('healthUpdate', (data) => {
    if (data.playerId === this.localPlayerId) {
      this.localPlayer.health = data.health;
      this.localPlayer.updateHealthBar();
    } else {
      const player = this.remotePlayers.get(data.playerId);
      if (player) {
        player.health = data.health;
        player.updateHealthBar();
      }
    }
  });

  // FULL GAME SYNC (for major updates)
  this.network.on('fullGameUpdate', (data) => {
    console.log("🔄 Full game sync received");
    
    data.players.forEach(playerData => {
      if (playerData.id === this.localPlayerId) return;

      if (this.remotePlayers.has(playerData.id)) {
        // Force update existing player
        const player = this.remotePlayers.get(playerData.id);
        if (player.sprite) {
          player.sprite.setPosition(playerData.position.x, playerData.position.y);
          player.sprite.setFlipX(!!playerData.flipX);
          
          // Update network state
          player.networkState = {
            position: playerData.position,
            velocity: playerData.velocity || { x: 0, y: 0 },
            flipX: playerData.flipX,
            lastUpdate: Date.now()
          };
        }
      } else {
        // Add missing player
        this.addRemotePlayer(playerData.id, playerData);
      }
    });
  });

  this.updateUI();
}
updateRemotePlayerSmooth(id, state) {
    const player = this.remotePlayers.get(id);
    if (!player || !state.position) {
        console.warn(`Invalid update for player ${id}:`, state);
        return;
    }

    if (!player.sprite.active) {
        console.warn(`Player ${id} sprite is inactive, reactivating`);
        player.sprite.setActive(true).setVisible(true);
    }

    // Constrain remote player position to bounds
    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const safeX = Phaser.Math.Clamp(state.position.x, 0, gameWidth);
    const safeY = Math.min(state.position.y, this.groundLevel);

    // Update network state with interpolation targets
    player.networkState.targetPosition = { x: safeX, y: safeY };
    player.networkState.velocity = { x: state.velocity?.x || 0, y: state.velocity?.y || 0 };
    player.networkState.lastUpdate = this.getServerTime();
    player.networkState.flipX = state.flipX || (state.velocity?.x < 0);

    // Don't immediately snap position - let updateRemotePlayers handle smooth movement
    console.log(`Queued smooth update for player ${id}: Target(${safeX}, ${safeY})`);
}
  validateNetworkState() {
    // Just log stale connections, don't remove
    this.remotePlayers.forEach((player, playerId) => {
        const timeSinceUpdate = this.getServerTime() - player.networkState.lastUpdate;
        if (timeSinceUpdate > 2000) {
            console.log(`Player ${playerId} has stale connection (${timeSinceUpdate}ms)`);
            // Don't remove - let server handle it
        }
    });
}

addRemotePlayer(id, state) {
  if (this.remotePlayers.has(id)) return;

    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
  const safeX = Phaser.Math.Clamp(state.position?.x || 100, 50, gameWidth - 50);
  const safeY = Math.min(state.position?.y || this.groundLevel, this.groundLevel);

  const remotePlayer = new Player(this, safeX, safeY, 'remote');
  remotePlayer.sprite.setTint(0xff0000);
  
  // Add to scene and physics in correct order
  this.add.existing(remotePlayer.sprite);
  this.physics.add.existing(remotePlayer.sprite);
  
  // Enable physics body
  if (remotePlayer.sprite.body) {
    remotePlayer.sprite.body.setEnable(true);
  }
  
  remotePlayer.sprite.setActive(true).setVisible(true);
  remotePlayer.sprite.setCollideWorldBounds(true);

  // Add collisions
  this.physics.add.collider(remotePlayer.sprite, this.ground);
  this.otherPlayersGroup.add(remotePlayer.sprite);

  // Add name label
  remotePlayer.nameLabel = this.add.text(safeX, safeY - 40, `Player_${id}`, {
    font: '16px Arial',
    fill: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5);

  // Initialize network state with smooth movement support
  remotePlayer.networkState = {
    position: { x: safeX, y: safeY },
    targetPosition: { x: safeX, y: safeY }, // NEW: For smooth interpolation
    velocity: { x: state.velocity?.x || 0, y: state.velocity?.y || 0 },
    lastUpdate: this.getServerTime(),
    flipX: state.flipX || false,
  };


  this.remotePlayers.set(id, remotePlayer);
  console.log(`Added remote player ${id} at (${safeX}, ${safeY})`);
}

  updateRemotePlayer(id, state) {
    const player = this.remotePlayers.get(id);
    if (!player || !state.position) {
      console.warn(`Invalid update for player ${id}:`, state);
      return;
    }


    if (!player.sprite.active) {
        console.warn(`Player ${id} sprite is inactive, reactivating`);
        player.sprite.setActive(true).setVisible(true);
    }


    // Constrain remote player position to bounds
    const gameWidth = GAME_CONFIG.WORLD.WIDTH;
    const safeX = Phaser.Math.Clamp(state.position.x, 0, gameWidth);
const safeY = Math.min(state.position.y, this.groundLevel);
    // Store previous position for interpolation
    const prevPos = { ...player.networkState.position };

    const velocityLerpFactor = 0.3; // Smoother velocity interpolation
player.networkState.velocity.x = Phaser.Math.Linear(
    player.networkState.velocity.x,
    state.velocity.x,
    velocityLerpFactor
);
player.networkState.velocity.y = Phaser.Math.Linear(
    player.networkState.velocity.y,
    state.velocity.y,
    velocityLerpFactor
);
    // Apply visual updates
    player.sprite.setFlipX(player.networkState.flipX);

    // Update health if provided
    if (state.health !== undefined) {
      player.health = state.health;
      player.updateHealthBar();
    }

    // Update name label position
    if (player.nameLabel) {
      player.nameLabel.setPosition(safeX, safeY - 40);
    }

    console.log(`Updated player ${id}: Pos(${safeX}, ${safeY}), Vel(${state.velocity?.x || 0}, ${state.velocity?.y || 0})`);
  }


//     const now = this.getServerTime();
//     const gameWidth = GAME_CONFIG.WORLD.WIDTH;

//     this.remotePlayers.forEach((player, playerId) => {
//         if (!player.networkState || !player.sprite.active) {
//             return;
//         }


//         const lerpFactor = 0.15; // Consistent value for all remote players


        
//         const timeSinceUpdate = now - player.networkState.lastUpdate;

//         // Remove very stale players
//         if (timeSinceUpdate > 10000) {
//             this.removeRemotePlayer(playerId);
//             return;
//         }

//         // Smooth interpolation

//         if (timeSinceUpdate < 300) { // Only predict for recent updates
//             // Predict position using velocity
//             const predictedX = player.networkState.position.x + 
//                              (player.networkState.velocity.x * timeSinceUpdate / 1000);
//             const predictedY = player.networkState.position.y + 
//                              (player.networkState.velocity.y * timeSinceUpdate / 1000);

//             const safePredictedX = Phaser.Math.Clamp(predictedX, 0, gameWidth);
//             const safePredictedY = Math.min(predictedY, this.groundLevel);

//             // Smooth movement to predicted position
//             const lerpFactor = 0.1; // Adjust between 0.1 - 0.5 for smoother/snapier movement

//             const newX = Phaser.Math.Linear(player.sprite.x, safePredictedX, lerpFactor);
//             const newY = Phaser.Math.Linear(player.sprite.y, safePredictedY, lerpFactor);

//             player.sprite.setPosition(newX, newY);
//         } else {
//             // Snap to last known position for very old updates
//             player.sprite.setPosition(
//                 player.networkState.position.x, 
//                 player.networkState.position.y
//             );
//         }

//         // Update visuals
//         const isMoving = Math.abs(player.networkState.velocity.x) > 10;
//         player.updateVisuals(isMoving);
//         player.sprite.setFlipX(player.networkState.flipX || false);

//         // Update name label
//         if (player.nameLabel) {
//             player.nameLabel.setPosition(player.sprite.x, player.sprite.y - 40);
//         }
//     });
// }
// updateRemotePlayers(time, delta) {
//     const now = this.getServerTime();
//     const gameWidth = GAME_CONFIG.WORLD.WIDTH;

//     this.remotePlayers.forEach((player, playerId) => {
//         if (!player.networkState || !player.sprite.active) return;

//         const timeSinceUpdate = now - player.networkState.lastUpdate;

//         // Remove very stale players
//         if (timeSinceUpdate > 10000) {
//             this.removeRemotePlayer(playerId);
//             return;
//         }

//         // Calculate target position
//         let targetX, targetY;
        
//         if (timeSinceUpdate < 300) { // Recent updates use prediction
//             targetX = player.networkState.position.x + 
//                      (player.networkState.velocity.x * timeSinceUpdate / 1000);
//             targetY = player.networkState.position.y + 
//                      (player.networkState.velocity.y * timeSinceUpdate / 1000);
//         } else { // Older updates use last known position
//             targetX = player.networkState.position.x;
//             targetY = player.networkState.position.y;
//         }

//         // Apply constraints
//         targetX = Phaser.Math.Clamp(targetX, 0, gameWidth);
//         targetY = Math.min(targetY, this.groundLevel);

//         // Smooth interpolation (more aggressive for predicted positions)
//         const lerpFactor = timeSinceUpdate < 300 ? 0.2 : 0.4;
//         const newX = Phaser.Math.Linear(player.sprite.x, targetX, lerpFactor);
//         const newY = Phaser.Math.Linear(player.sprite.y, targetY, lerpFactor);

//         player.sprite.setPosition(newX, newY);

//         // Update visuals only for recent data
//         if (timeSinceUpdate < 300) {
//             const isMoving = Math.abs(player.networkState.velocity.x) > 10;
//             player.updateVisuals(isMoving);
//             player.sprite.setFlipX(player.networkState.flipX || false);
//         }

//         // Update name label
//         if (player.nameLabel) {
//             player.nameLabel.setPosition(newX, newY - 40);
//         }
//     });
// }
// updateRemotePlayers(time, delta) {
//     const now = this.getServerTime();
//     const gameWidth = GAME_CONFIG.WORLD.WIDTH;

//     this.remotePlayers.forEach((player, playerId) => {
//         if (!player.networkState || !player.sprite.active) return;

//         // Calculate time since last update (with server time sync)
//         const timeSinceUpdate = now - player.networkState.lastUpdate;
        
//         // Remove very stale players
//         if (timeSinceUpdate > 10000) {
//             this.removeRemotePlayer(playerId);
//             return;
//         }

//         // Calculate target position with prediction
//         const targetX = player.networkState.position.x + 
//                        (player.networkState.velocity.x * timeSinceUpdate / 1000);
//         const targetY = player.networkState.position.y + 
//                        (player.networkState.velocity.y * timeSinceUpdate / 1000);

//         // Apply world bounds
//         const safeX = Phaser.Math.Clamp(targetX, 0, gameWidth);
//         const safeY = Math.min(targetY, this.groundLevel);

//         // Dynamic interpolation speed based on network conditions
//         const baseLerpFactor = 0.2; // Base interpolation speed
//         const networkDelayFactor = Phaser.Math.Clamp(timeSinceUpdate / 100, 0.1, 1.0);
//         const finalLerpFactor = baseLerpFactor * networkDelayFactor;

//         // Smooth position update
//         const newX = Phaser.Math.Linear(player.sprite.x, safeX, finalLerpFactor);
//         const newY = Phaser.Math.Linear(player.sprite.y, safeY, finalLerpFactor);

//         player.sprite.setPosition(newX, newY);

//         // Only update visuals if we have recent data
//         if (timeSinceUpdate < 300) {
//             const isMoving = Math.abs(player.networkState.velocity.x) > 10;
//             player.updateVisuals(isMoving);
//             player.sprite.setFlipX(player.networkState.flipX || false);
//         }

//         // Update name label smoothly
//         if (player.nameLabel) {
//             player.nameLabel.setPosition(newX, newY - 40);
//         }
//     });
// }

// IMPROVED: Much smoother remote player movement
// updateRemotePlayers(time, delta) {
//     const now = this.getServerTime();
//     const gameWidth = GAME_CONFIG.WORLD.WIDTH;

//     this.remotePlayers.forEach((player, playerId) => {
//         if (!player.networkState || !player.sprite.active) return;

//         const timeSinceUpdate = now - player.networkState.lastUpdate;
        
//         // Remove very stale players
//         if (timeSinceUpdate > 10000) {
//             this.removeRemotePlayer(playerId);
//             return;
//         }

//         // Get target position (either set target or predicted)
//         let targetX, targetY;
        
//         if (player.networkState.targetPosition) {
//             // Use the target position set by network updates
//             targetX = player.networkState.targetPosition.x;
//             targetY = player.networkState.targetPosition.y;
            
//             // Add velocity prediction for very recent updates
//             if (timeSinceUpdate < 200) {
//                 targetX += (player.networkState.velocity.x * timeSinceUpdate / 1000);
//                 targetY += (player.networkState.velocity.y * timeSinceUpdate / 1000);
//             }
//         } else {
//             // Fallback to current network position
//             targetX = player.networkState.position?.x || player.sprite.x;
//             targetY = player.networkState.position?.y || player.sprite.y;
//         }

//         // Apply world bounds to target
//         targetX = Phaser.Math.Clamp(targetX, 0, gameWidth);
//         targetY = Math.min(targetY, this.groundLevel);

//         // MUCH smoother interpolation - key fix!
//         const distance = Phaser.Math.Distance.Between(
//             player.sprite.x, player.sprite.y, 
//             targetX, targetY
//         );
        
//         // Dynamic lerp factor based on distance and time
//         let lerpFactor;
//         if (distance > 100) {
//             // Big jumps - use higher lerp to catch up quickly
//             lerpFactor = 0.3;
//         } else if (distance > 20) {
//             // Medium distance - moderate lerp
//             lerpFactor = 0.15;
//         } else {
//             // Small movements - very smooth lerp
//             lerpFactor = 0.08;
//         }
        
//         // Apply time-based adjustment
//         const timeMultiplier = Math.min(delta / 16.67, 2.0); // Normalize to 60fps
//         lerpFactor *= timeMultiplier;

//         // Smooth position update
//         const newX = Phaser.Math.Linear(player.sprite.x, targetX, lerpFactor);
//         const newY = Phaser.Math.Linear(player.sprite.y, targetY, lerpFactor);

//         player.sprite.setPosition(newX, newY);

//         // Update visuals only for recent data
//         if (timeSinceUpdate < 500) {
//             const isMoving = Math.abs(player.networkState.velocity.x) > 10;
//             player.updateVisuals(isMoving);
//             player.sprite.setFlipX(player.networkState.flipX || false);
//         }

//         // Update name label smoothly
//         if (player.nameLabel) {
//             player.nameLabel.setPosition(newX, newY - 40);
//         }
//     });
// }
updateRemotePlayers(time, delta) {
    const now = this.getServerTime();
    const gameWidth = GAME_CONFIG.WORLD.WIDTH;

    this.remotePlayers.forEach((player, playerId) => {
        if (!player.networkState || !player.sprite.active) return;

        const timeSinceUpdate = now - player.networkState.lastUpdate;
        
        // Remove very stale players
        if (timeSinceUpdate > 10000) {
            this.removeRemotePlayer(playerId);
            return;
        }

       const maxPredictionTime = 200; // Cap prediction time to 200ms
const clampedTimeSinceUpdate = Math.min(timeSinceUpdate, maxPredictionTime);
const targetX = player.networkState.position.x + 
                (player.networkState.velocity.x * clampedTimeSinceUpdate / 1000);
const targetY = player.networkState.position.y + 
                (player.networkState.velocity.y * clampedTimeSinceUpdate / 1000);
        // Apply world bounds
        const safeX = Phaser.Math.Clamp(targetX, 0, gameWidth);
        const safeY = Math.min(targetY, this.groundLevel);

 const lerpFactor = 0.1; // Fixed interpolation factor for smoother movement
const newX = Phaser.Math.Linear(player.sprite.x, safeX, lerpFactor);
const newY = Phaser.Math.Linear(player.sprite.y, safeY, lerpFactor);

        player.sprite.setPosition(newX, newY);

        // Update visuals
        const isMoving = Math.abs(player.networkState.velocity.x) > 10;
        player.updateVisuals(isMoving);
        player.sprite.setFlipX(player.networkState.flipX || false);

        // Update name label
        if (player.nameLabel) {
            player.nameLabel.setPosition(newX, newY - 40);
        }
    });
}
  getServerTime() {
    return Date.now() - (this.serverTimeOffset || 0);
  }

updateUI() {


  if (this.uiScene && this.localPlayer) {
    this.uiScene.updateGameData({
      health: this.localPlayer.health,
      maxHealth: this.localPlayer.maxHealth,
      ping: this.network.getPing(),
      players: this.remotePlayers.size + 1,
    });
  }

}

  setupDebugTools() {
    this.debugText = this.add.text(10, 10, '', {
      font: '16px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000',
    }).setScrollFactor(0);

    this.time.addEvent({
      delay: 100,
      callback: this.updateDebugInfo,
      callbackScope: this,
      loop: true,
    });
  }

  updateDebugInfo() {
    const player = this.localPlayer?.sprite || {};
    const serverState = this.serverStateBuffer[0] || {};

    let debugText = [
      `Local Pos: ${player.x?.toFixed(0) || 'N/A'},${player.y?.toFixed(0) || 'N/A'}`,
      `Predicted: ${player.clientPredictedX?.toFixed(0) || 'N/A'},${player.clientPredictedY?.toFixed(0) || 'N/A'}`,
      `Server: ${serverState.position?.x?.toFixed(0) || 'N/A'},${serverState.position?.y?.toFixed(0) || 'N/A'}`,
      `Pending Inputs: ${this.pendingInputs.length}`,
      `Remote Players: ${this.remotePlayers.size}`,
      `Ground Level: ${this.groundLevel}`,
      `Game Bounds: ${this.game.config.width}x${this.game.config.height}`,
    ];

   
    this.remotePlayers.forEach((p, id) => {
      debugText.push(
        `Player ${id}: Pos(${p.networkState?.position?.x?.toFixed(0) || 'N/A'},${p.networkState?.position?.y?.toFixed(0) || 'N/A'}), Vel(${p.networkState?.velocity?.x?.toFixed(0) || 'N/A'},${p.networkState?.velocity?.y?.toFixed(0) || 'N/A'})`
      );
    });

    this.debugText.setText(debugText.join('\n'));
  }

  removeRemotePlayer(id) {
    const player = this.remotePlayers.get(id);
    if (player) {
      player.sprite.destroy();
      if (player.nameLabel) player.nameLabel.destroy();
      this.remotePlayers.delete(id);
      console.log(`Removed player ${id}`);
    }
  }

  handleBulletHit(bullet, enemy) {
    bullet.destroy();
  }
}