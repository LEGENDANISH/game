    export default class NetworkManager {
   constructor(scene) {
    this.scene = scene;
    this.socket = null;
    this.isConnected = false;
    this.playerId = null;
    this.serverTimeOffset = 0;
    this.lastPingTime = 0;
    this.ping = 0;

    // Client prediction state
    this.inputQueue = [];
    this.pendingInputs = [];
    this.lastProcessedInput = 0;
    this.clientTick = 0;

    // Rate limiting
    this.lastInputSent = 0;
    this.inputSendRate = 16; // ~60fps
    this.lastStateSent = 0;
    this.stateSendRate = 50; // 20fps for position updates

    // Networked game state
    this.gameState = {
        players: new Map(),
        bullets: new Map(),
        lastUpdateTime: 0
    };
    
    this.inputValidation = {
        pendingValidation: new Map(),
        validationTimeout: 1000,
        maxPendingInputs: 60
    };
    
    // Cleanup timer
    setInterval(() => {
        this.cleanupPendingValidation();
    }, 5000);
    
    this.events = new Phaser.Events.EventEmitter();
}

    connect() {
        console.log('[Network] Connecting to WebSocket server...');
        this.socket = new WebSocket("ws://localhost:8080");

        this.socket.addEventListener('open', () => {
        console.log('[Network] Connected to server');
        this.isConnected = true;
        this.startPingLoop();
        this.events.emit('connected');
        });

        this.socket.addEventListener('message', (event) => {
        try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        } catch (error) {
            console.error('[Network] Error parsing message:', error);
        }
        });

        this.socket.addEventListener('close', () => {
        console.log('[Network] Disconnected from server');
        this.isConnected = false;
        this.events.emit('disconnected');
        });

        this.socket.addEventListener('error', (error) => {
        console.error('[Network] WebSocket error:', error);
        this.isConnected = false;
        this.events.emit('error', error);
        });
        
    }

    startPingLoop() {
        setInterval(() => {
        if (this.isConnected) {
            this.lastPingTime = Date.now();
            this.sendMessage('PING', { clientTime: this.lastPingTime });
        }
        }, 1000);
    }
    handleInputValidation(data) {
    const { sequenceNumber, valid, reason, correctedState } = data;
    
    if (!valid) {
        console.warn(`Input ${sequenceNumber} rejected: ${reason}`);
        
        if (correctedState) {
        // Force reconciliation with corrected state
        this.scene.serverStateBuffer.push({
            position: correctedState.position,
            velocity: correctedState.velocity,
            lastProcessedInput: sequenceNumber,
            timestamp: Date.now()
        });
        }
        this.events.emit('inputValidation', data);
    }
    
    // Remove from pending validation
    this.inputValidation.pendingValidation.delete(sequenceNumber);
    }
    cleanupPendingValidation() {
    const now = Date.now();
    for (const [sequenceNumber, timestamp] of this.inputValidation.pendingValidation) {
        if (now - timestamp > this.inputValidation.validationTimeout) {
        this.inputValidation.pendingValidation.delete(sequenceNumber);
        }
    }
    }
    handlePlayerInput(client, data) {
    if (!client.playerId || !client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    const player = room.players.get(client.playerId);
    if (!player) return;

    // Extract input data
    const { left, right, up, shoot, sequenceNumber, timestamp } = data;

    // Input validation
    const validation = this.validateInput({ left, right, up, shoot }, player, sequenceNumber);

    if (!validation.valid) {
        this.sendToClient(client, 'INPUT_VALIDATION', {
            sequenceNumber,
            valid: false,
            reason: validation.reason,
            correctedState: validation.correctedState
        });
        return;
    }

    // Store input for processing
    const inputData = {
        sequenceNumber,
        input: { left, right, up, shoot },
        timestamp,
        serverTick: this.currentTick
    };

    player.inputBuffer.push(inputData);

    // Process input immediately for responsiveness
    this.processPlayerInput(player, inputData);

    // Send validation confirmation
    this.sendToClient(client, 'INPUT_VALIDATION', {
        sequenceNumber,
        valid: true,
        timestamp: Date.now()
    });

    // Optional: Send reconciliation state
    this.sendToClient(client, 'SERVER_RECONCILE', {
        position: { x: player.x, y: player.y },
        velocity: { x: player.velocityX, y: player.velocityY },
        onGround: player.onGround,
        lastProcessedInput: sequenceNumber,
        serverTick: this.currentTick
    });
}
 handleMessage(message) {
    
     console.log('[Network] Raw received message:', message);
    
    // Add more debugging to see what's actually in the message
    console.log('[Network] Message.type:', message.type);
    console.log('[Network] Message.data:', message.data);
    console.log("network", message)
    const type = message.type;
    const data = message.data;
    
    // console.log('[Network] Processing message type:', type, 'with data:', data);

   switch (type) {
        case 'JOINED_ROOM':
            this.handleJoinedRoom(data);
            break;
            
        case 'PLAYER_INPUT':
            // Don't handle our own input echoes
            break;
            case 'SERVER_POSITION':
    // Update debug display with server position
    this.serverPosition = data.position;
    this.serverVelocity = data.velocity;
    break;

case 'SERVER_RECONCILE':
    // Handle reconciliation (existing code)
    if (data.lastProcessedInput) {
        this.reconcilePosition(data);
    }
    break;
        case 'GAME_UPDATE':
        case 'GAME_STATE':
            this.handleGameUpdate(data);
            break;
            
        case 'PLAYER_MOVED':
        case 'PLAYER_POSITION_UPDATE':
            this.handleRemotePlayerMove(data);
            break;
            
        case 'PLAYER_JOINED':
            this.handlePlayerJoined(data);
            break;

        case 'PLAYER_LEFT':
            this.handlePlayerLeft(data);
            break;

        case 'PLAYER_SHOT':
            this.handlePlayerShot(data);
            break;

        case 'HEALTH_UPDATE':
            this.handleHealthUpdate(data);
            break;

        case 'PONG':
            this.handlePong(data);
            break;

        case 'INPUT_VALIDATION':
            this.handleInputValidation(data);
            break;

        case 'PLAYER_STATE':
            this.handlePlayerStateUpdate(data);
            break;

        case 'SERVER_RECONCILE':
            this.handleServerReconcile(data);
            break;

        case 'ERROR':
            this.handleError(data);
            break;

        default:
            console.warn('[Network] Unknown message type:', type);
    }

}

    // --- Message Handlers ---
    sendSyncVars(playerName, color, weaponType) {
    if (!this.isConnected) return;
    
    this.sendMessage('SYNC_VARS', {
        playerId: this.playerId,
        variables: {
        playerName: { value: playerName, reliable: true },
        color: { value: color, reliable: true },
        weaponType: { value: weaponType, reliable: true }
        },
        timestamp: this.getServerTime()
    });
    }
    handlePlayerStateUpdate(data) {
    if (data.playerId === this.playerId) {
        // This is our player - use for reconciliation
        this.scene.serverStateBuffer.push({
        position: data.position,
        velocity: data.velocity,
        onGround: data.onGround,
        lastProcessedInput: data.lastProcessedInput,
        timestamp: data.timestamp
        });
    } else {
        // Remote player - emit for interpolation
        this.events.emit('stateUpdate', data);
    }
    }
    handleJoinedRoom(data) {
    this.playerId = data.playerId;
    this.serverTimeOffset = Date.now() - data.serverTime;
    console.log(`[Network] Joined room as ${this.playerId}`);
    this.events.emit('joinedRoom', data);
  if (data.players && data.players.length > 0) {
        data.players.forEach(playerData => {
            if (playerData.id !== this.playerId) {
                this.gameState.players.set(playerData.id, {
                    id: playerData.id,
                    position: playerData.position,
                    velocity: playerData.velocity,
                    health: playerData.health,
                    onGround: playerData.onGround,
                    lastUpdate: Date.now()
                });
            }
        });
        console.log('[Network] Created existing players:', 
            Array.from(this.gameState.players.keys()));
    }
    // ✅ Send SYNC_VARS after joining
    this.sendSyncVars('Ashis', 'red', 'laser');
    }





handleRemotePlayerMove(data) {
    // Improved logging to ensure nested objects are fully expanded
    // console.log('[Network] Remote player moved:', JSON.stringify(data, null, 2));

    const { playerId, position, velocity, onGround } = data;

    // Don't update our own player from broadcasts
    if (playerId === this.playerId) return;

    // Update the game state
    let player = this.gameState.players.get(playerId);
    if (!player) {
        // Create remote player if doesn't exist
        player = {
            id: playerId,
            position: { x: position.x, y: position.y },
            velocity: { x: velocity.x, y: velocity.y },
            onGround: onGround,
            health: 100,
            lastUpdate: Date.now()
        };
        this.gameState.players.set(playerId, player);
    } else {
        // Update existing remote player
        player.position.x = position.x;
        player.position.y = position.y;
        player.velocity.x = velocity.x;
        player.velocity.y = velocity.y;
        player.onGround = onGround;
        player.lastUpdate = Date.now();
    }

    // Emit event for your scene to handle
    this.events.emit('remotePlayerMove', {
        playerId: playerId,
        position: position,
        velocity: velocity,
        onGround: onGround
    });
    player.targetPosition = { ...data.position };
  player.targetVelocity = { ...data.velocity };
  player.moveUpdateTime = Date.now();
}   

// Add this method for bullet updates
handleBulletUpdate(data) {
    console.log('[Network] Bullet update:', data);
    
    // Clear existing bullets and add new ones
    this.gameState.bullets.clear();
    data.bullets.forEach(bullet => {
        this.gameState.bullets.set(bullet.id, bullet);
    });
    
    this.events.emit('bulletUpdate', data);
}



handleGameStateUpdate(data) {
    console.log('[Network] Game state update:', data);
    
    // Update all players
    if (data.players) {
        Object.entries(data.players).forEach(([playerId, playerData]) => {
            if (playerId !== this.playerId) {
                this.events.emit('stateUpdate', {
                    playerId: playerId,
                    position: playerData.position,
                    velocity: playerData.velocity,
                    health: playerData.health,
                    flipX: playerData.flipX
                });
            }
        });
    }
}
    handleGameUpdate(data) {
        // Update server time offset
        this.serverTimeOffset = Date.now() - data.timestamp;

        // Update players
        data.players.forEach(playerState => {
        if (!this.gameState.players.has(playerState.id)) {
            this.gameState.players.set(playerState.id, playerState);
        } else {
            const player = this.gameState.players.get(playerState.id);
            Object.assign(player, playerState);
        }
        });


        // Update bullets
        this.gameState.bullets.clear();
        data.bullets.forEach(bullet => {
        this.gameState.bullets.set(bullet.id, bullet);
        });

        // console.log('[Network] Game Update - Server Tick:', data.timestamp, 
//             'Players:', data.players.map(p => p.id));
    this.events.emit('fullGameUpdate', data); // 👈 ADD THIS LINE

        // this.events.emit('gameUpdate', data);
    }

    handlePlayerJoined(data) {
        this.gameState.players.set(data.playerId, {
        id: data.playerId,
        position: data.position,
        velocity: { x: 0, y: 0 },
        health: 100,
        lastUpdate: this.getServerTime()
        });
        this.events.emit('playerJoined', data);
    }

    handlePlayerLeft(data) {
        this.gameState.players.delete(data.playerId);
        this.events.emit('playerLeft', data.playerId);
    }

    handlePlayerShot(data) {
        this.events.emit('playerShot', data);
    }

    handleHealthUpdate(data) {
        const player = this.gameState.players.get(data.playerId);
        if (player) {
        player.health = data.health;
        player.lastUpdate = this.getServerTime();
        }
        this.events.emit('healthUpdate', data);
    }

    handlePong(data) {
        this.ping = Date.now() - this.lastPingTime;
        this.serverTimeOffset = Date.now() - data.serverTime;
    }

   

    handleError(data) {
        console.error('[Network] Server error:', data.message);
        this.events.emit('error', data);
    }

    // --- Client Prediction Methods ---

 collectInput() {
  const input = {
    sequenceNumber: +this.clientTick, // Pre-increment to match server
    left: this.scene.keys.left.isDown,
    right: this.scene.keys.right.isDown,
    up: this.scene.keys.up.isDown,
    shoot: this.scene.keys.space.isDown,
    timestamp: this.getServerTime()
  };
  console.log('[Input] Collected:', input.sequenceNumber);
  return input;
}
    sendInput(input) {
    this.inputQueue.push(input);
    this.pendingInputs.push(input);

    this.sendMessage('PLAYER_INPUT', {
        left: input.left,
        right: input.right,
        up: input.up,
        shoot: input.shoot,
        sequenceNumber: input.sequenceNumber,
        clientTick: input.sequenceNumber, // Sync these
        timestamp: input.timestamp
    });

    this.clientTick++; // Only increment once per input
}

    replayInputs() {
        const player = this.gameState.players.get(this.playerId);
        if (!player) return;

        const savedPosition = { x: player.x, y: player.y };
        const savedVelocity = { x: player.velocity.x, y: player.velocity.y };

        // Reapply all unprocessed inputs
        this.inputQueue.forEach(input => {
        this.applyInput(input, 16); // Assume 60fps delta
        });

        // Restore physics state
        player.x = savedPosition.x;
        player.y = savedPosition.y;
        player.velocity.x = savedVelocity.x;
        player.velocity.y = savedVelocity.y;
    }

    applyInput(input, delta) {
        const player = this.gameState.players.get(this.playerId);
        if (!player) return;

        const speed = 300;
        const jumpForce = -600;

        // Horizontal movement
        if (input.left) {
        player.velocity.x = -speed;
        } else if (input.right) {
        player.velocity.x = speed;
        } else {
        player.velocity.x = 0;
        }

        // Jumping
        if (input.up && player.body && player.body.onFloor()) {
        player.velocity.y = jumpForce;
        }

        // Update position
        player.x += player.velocity.x * (delta / 1000);
        player.y += player.velocity.y * (delta / 1000);
    }

    // --- Network Methods ---

    sendPlayerAction(actionData) {
    if (!this.isConnected) return;
    
    const { type, data } = actionData;
    
    if (type === 'INPUT') {
        // Use the dedicated input method
        this.sendPlayerInput(data);
    } else {
        // Handle other actions (shooting, etc.)
        const message = {
        type,
        data: {
            ...data,
            clientTick: this.clientTick++,
            timestamp: this.getServerTime()
        }
        };
        
        this.sendMessage(type, message.data);
    }
    }
    // Add this method for handling server corrections
   handleServerReconcile(data) {
  // Find corresponding input in pending inputs
  const inputIndex = this.pendingInputs.findIndex(
    input => input.sequenceNumber === data.lastProcessedInput
  );
  
  if (inputIndex !== -1) {
    // Remove processed inputs
    this.pendingInputs.splice(0, inputIndex + 1);
    
    // Emit reconciliation event to scene
    this.events.emit('serverReconcile', {
      position: data.position,
      velocity: data.velocity,
      onGround: data.onGround,
      lastProcessedInput: data.lastProcessedInput,
      pendingInputs: this.pendingInputs
    });
  }
}
    // Add this method to NetworkManager class
    sendPlayerInput(input) {
    if (!this.isConnected) return;
    
    const message = {
        type: 'PLAYER_INPUT',
        data: {
        input: { // Nest input properties as server expects
            left: input.left,
            right: input.right,
            up: input.up,
            shoot: input.shoot
        },
        clientTick: input.sequenceNumber, // Map sequenceNumber to clientTick
        clientTime: this.getServerTime()
        }
    };
    
    // Store for validation and reconciliation
    this.pendingInputs.push({
        sequenceNumber: input.sequenceNumber,
        input: input,
        timestamp: Date.now()
    });
    
    this.inputValidation.pendingValidation.set(
        input.sequenceNumber, 
        Date.now()
    );
    
    this.sendMessage('PLAYER_INPUT', message.data);
    console.log('[Network] Sending Input - Seq:', input.sequenceNumber, 
            'Tick:', message.data.clientTick);
    }
    sendShoot(position, direction) {
        this.sendPlayerAction('PLAYER_SHOOT', {
        position,
        direction,
        clientTick: this.clientTick
        });
    }

    sendHealthUpdate(health) {
        this.sendPlayerAction('HEALTH_UPDATE', {
        health,
        clientTick: this.clientTick
        });
    }

    sendMessage(type, data) {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type, data }));
        }
    }

    // --- Utility Methods ---

    getServerTime() {
        return Date.now() - this.serverTimeOffset;
    }

    disconnect() {
        if (this.socket) {
        this.socket.close();
        this.isConnected = false;
        }
    }

    on(event, callback) {
        this.events.on(event, callback);
    }

    off(event, callback) {
        this.events.off(event, callback);
    }
    }