export default class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = null;
    this.roomCode = null;
    this.isHost = false;
    this.isConnected = false;

    // Local storage for player data
    this.players = {};

    // Event emitter to communicate with the game scene
    this.events = new Phaser.Events.EventEmitter();
  }

  /**
   * Connects to the WebSocket server
   */
  connect() {
    console.log('[NetworkManager] Connecting to WebSocket server...');
    this.socket = new WebSocket("ws://localhost:3000");

    this.socket.addEventListener('open', () => {
      console.log('[NetworkManager] Connected to server');
      this.isConnected = true;
      this.events.emit('connected');
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[NetworkManager] Received message:', message.type, message.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[NetworkManager] Error parsing message:', error, event.data);
      }
    });

    this.socket.addEventListener('close', () => {
      console.log('[NetworkManager] Disconnected from server');
      this.isConnected = false;
      this.events.emit('disconnected');
    });

    this.socket.addEventListener('error', (error) => {
      console.error('[NetworkManager] WebSocket error:', error);
      this.isConnected = false;
      this.events.emit('error', error);
    });
  }

  /**
   * Handles incoming messages from the server
   */
  handleMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'ROOM_JOINED':
        this.handleRoomJoined(data);
        break;

      case 'JOINED_ROOM': // Handle both message types from server
        this.handleRoomJoined(data);
        break;

      case 'PLAYER_JOINED':
        this.handlePlayerJoined(data);
        break;

      case 'PLAYER_LEFT':
        this.handlePlayerLeft(data);
        break;

      case 'PLAYER_MOVED':
        this.handlePlayerMoved(data);
        break;

      case 'PLAYER_SHOT':
        this.handlePlayerShot(data);
        break;

      case 'GAME_UPDATE':
        this.handleGameUpdate(data);
        break;

      case 'GAME_STARTED':
        this.handleGameStarted(data);
        break;

      case 'GAME_ENDED':
        this.handleGameEnded(data);
        break;

      case 'ROOM_CLOSED':
        this.handleRoomClosed(data);
        break;

      case 'ROOM_FULL':
        this.handleRoomFull(data);
        break;

      case 'GAME_STARTING':
        this.handleGameStarting(data);
        break;

      case 'ERROR':
        this.handleError(data);
        break;

      default:
        console.warn('[NetworkManager] Unknown message type:', type, data);
    }
  }

  // --- Message Handlers ---

  handleRoomJoined(data) {
    this.roomCode = data.roomCode;
    this.isHost = data.isCreator || false;
    const playerId = data.playerId;

    this.players[playerId] = {
      id: playerId,
      name: data.playerName || `Player${playerId}`,
      team: data.team,
      position: data.spawnPosition
    };

    console.log(`[NetworkManager] Joined room ${this.roomCode} as ${playerId}`);
    this.events.emit('joinedRoom', data);
  }

  handlePlayerJoined(data) {
    this.players[data.playerId] = {
      id: data.playerId,
      name: data.playerName,
      team: data.team,
      position: data.position || { x: 100, y: 300 }
    };
    console.log(`[NetworkManager] Player joined: ${data.playerId}`);
    this.events.emit('playerJoined', data);
  }

  handlePlayerLeft(data) {
    delete this.players[data.playerId];
    console.log(`[NetworkManager] Player left: ${data.playerId}`);
    this.events.emit('playerLeft', data.playerId);
  }

  handlePlayerMoved(data) {
    if (this.players[data.playerId]) {
      this.players[data.playerId].position = data.position;
      this.players[data.playerId].rotation = data.rotation;
    }
    this.events.emit('playerMoved', data);
  }

  handlePlayerShot(data) {
    this.events.emit('playerShot', data);
  }

  handleGameUpdate(data) {
    if (data.state && data.state.players) {
      Object.keys(data.state.players).forEach(playerId => {
        if (!this.players[playerId]) return;

        const remotePlayer = data.state.players[playerId];
        this.players[playerId].position = remotePlayer.position;
        this.players[playerId].health = remotePlayer.health;
        this.players[playerId].kills = remotePlayer.kills;
        this.players[playerId].deaths = remotePlayer.deaths;
      });
    }

    this.events.emit('gameUpdate', data);
  }

  handleGameStarted(data) {
    console.log('[NetworkManager] Game started');
    this.events.emit('gameStarted', data);
  }

  handleGameEnded(data) {
    console.log('[NetworkManager] Game ended', data);
    this.events.emit('gameEnded', data);
  }

  handleRoomClosed(data) {
    console.log('[NetworkManager] Room closed', data);
    this.events.emit('roomClosed', data);
  }

  handleRoomFull(data) {
    console.error('[NetworkManager] Room is full', data);
    this.events.emit('roomFull', data);
  }

  handleGameStarting(data) {
    console.log('[NetworkManager] Game is starting soon', data);
    this.events.emit('gameStarting', data);
  }

  handleError(data) {
    console.error('[NetworkManager] Server error:', data);
    this.events.emit('error', data);
  }

  // --- Sending Messages ---

  createRoom() {
    console.log('[NetworkManager] Creating room');
    this.sendMessage('createRoom');
  }

  joinRoom(roomCode) {
    console.log(`[NetworkManager] Joining room: ${roomCode}`);
    this.sendMessage('joinRoom', { roomCode });
  }

  // NEW: Send player actions (replaces sendPlayerUpdate)
  sendPlayerAction(actionData) {
    console.log('[NetworkManager] Sending player action:', actionData);
    this.sendMessage('playerAction', actionData);
  }

  // DEPRECATED: Keep for backward compatibility but use sendPlayerAction instead
  sendPlayerUpdate(playerData) {
    console.log('[NetworkManager] Sending player update (deprecated):', playerData);
    
    // Convert old format to new action format
    this.sendPlayerAction({
      type: 'MOVE',
      data: {
        position: playerData.position,
        velocity: playerData.velocity,
        rotation: playerData.flipX ? Math.PI : 0,
        flipX: playerData.flipX
      }
    });
  }

  sendPlayerShoot(shotData) {
    console.log('[NetworkManager] Sending player shot:', shotData);
    this.sendPlayerAction({
      type: 'SHOOT',
      data: shotData
    });
  }

  sendMessage(type, data = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      console.log('[NetworkManager] Sending message:', message);
      this.socket.send(message);
    } else {
      console.warn('[NetworkManager] Cannot send message - WebSocket not open');
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('[NetworkManager] Disconnecting from server');
      this.isConnected = false;
      this.socket.close();
    }
  }

  on(event, callback) {
    this.events.on(event, callback);
  }

  off(event, callback) {
    this.events.off(event, callback);
  }
}