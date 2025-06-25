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

    // Networked game state
    this.gameState = {
      players: new Map(),
      bullets: new Map(),
      lastUpdateTime: 0
    };

    this.events = new Phaser.Events.EventEmitter();
  }

  connect() {
    console.log('[Network] Connecting to WebSocket server...');
    this.socket = new WebSocket("ws://localhost:3000");

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

  handleMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'JOINED_ROOM':
        this.handleJoinedRoom(data);
        break;

      case 'GAME_UPDATE':
        this.handleGameUpdate(data);
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

  handleJoinedRoom(data) {
    this.playerId = data.playerId;
    this.serverTimeOffset = Date.now() - data.serverTime;
    console.log(`[Network] Joined room as ${this.playerId}`);
    this.events.emit('joinedRoom', data);
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

    this.events.emit('gameUpdate', data);
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

  handleServerReconcile(data) {
    // Find the corresponding input in our queue
    const inputIndex = this.inputQueue.findIndex(
      input => input.tick === data.clientTick
    );

    if (inputIndex !== -1) {
      // Remove all inputs up to this one (they've been processed by server)
      this.inputQueue.splice(0, inputIndex + 1);

      // If server position differs from our prediction, correct it
      const player = this.gameState.players.get(this.playerId);
      if (player) {
        const diffX = Math.abs(data.position.x - player.x);
        const diffY = Math.abs(data.position.y - player.y);

        if (diffX > 10 || diffY > 10) {
          // Significant difference - snap to server position
          player.x = data.position.x;
          player.y = data.position.y;
          player.velocity.x = data.velocity.x;
          player.velocity.y = data.velocity.y;

          // Replay remaining inputs from corrected position
          this.replayInputs();
        }
      }
    }
  }

  handleError(data) {
    console.error('[Network] Server error:', data.message);
    this.events.emit('error', data);
  }

  // --- Client Prediction Methods ---

  collectInput() {
    return {
      left: this.scene.keys.left.isDown,
      right: this.scene.keys.right.isDown,
      up: this.scene.keys.up.isDown,
      shoot: this.scene.keys.space.isDown,
      tick: this.clientTick,
      timestamp: this.getServerTime()
    };
  }

  sendInput(input) {
    this.inputQueue.push(input);
    this.pendingInputs.push(input);

    this.sendMessage('PLAYER_INPUT', {
      input: input,
      clientTick: this.clientTick,
      clientTime: input.timestamp
    });

    this.clientTick++;
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

  sendPlayerAction(type, data) {
    if (!this.isConnected) return;

    const message = {
      type,
      data: {
        ...data,
        clientTick: this.clientTick,
        timestamp: this.getServerTime()
      }
    };

    this.sendMessage(type, message.data);
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