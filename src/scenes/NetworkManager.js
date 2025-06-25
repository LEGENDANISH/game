import Phaser from 'phaser';

export default class NetworkManager {
    constructor(scene) {
        this.scene = scene;
        this.socket = null;
        this.isConnected = false;
        this.playerId = null;

        // Input management
        this.inputHistory = [];         // All recorded inputs
        this.pendingInputs = [];        // Unacknowledged inputs
        this.lastProcessedSeq = -1;     // Last confirmed input by server

        // Game state
        this.players = new Map();       // Remote players
        this.bullets = new Map();       // Bullets from server
        this.gameState = {};            // Snapshot of game state

        // Timing
        this.ping = 0;
        this.serverTimeOffset = 0;
        this.lastPingSent = 0;

        // State history for interpolation/rollback
        this.stateHistory = [];

        // Events
        this.events = new Phaser.Events.EventEmitter();
    }

    connect() {
        console.log('[Network] Connecting to ws://localhost:8080');
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
            } catch (e) {
                console.error('[Network] Failed to parse message:', e);
            }
        });

        this.socket.addEventListener('close', () => {
            console.log('[Network] Disconnected from server');
            this.isConnected = false;
            this.events.emit('disconnected');
        });

        this.socket.addEventListener('error', (err) => {
            console.error('[Network] WebSocket error:', err);
        });
    }

    startPingLoop() {
        setInterval(() => {
            if (this.isConnected) {
                this.lastPingSent = Date.now();
                this.sendMessage('ping', { timestamp: this.lastPingSent });
            }
        }, 1000);
    }

    sendMessage(type, payload = {}) {
        if (!this.isConnected || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify({
            type,
            ...payload
        }));
    }

    sendInput(input) {
        this.inputHistory.push(input);

        // Send input to server
        this.sendMessage('input', {
            input: {
                keys: {
                    left: input.moveLeft,
                    right: input.moveRight,
                    jump: input.jump
                },
                shoot: input.shoot,
                seq: input.sequenceNumber
            }
        });
    }

    sendShoot(direction) {
        this.sendMessage('shoot', {
            direction
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'init':
                this.handleInit(message);
                break;

            case 'state':
                this.handleGameState(message.snapshot);
                break;

            case 'pong':
                this.handlePong(message);
                break;

            case 'bulletUpdate':
                this.handleBulletUpdate(message.bullets);
                break;

            case 'reconcile':
                this.handleReconcile(message);
                break;

            default:
                console.warn('[Network] Unknown message type:', message.type);
        }
    }

    handleInit(message) {
        this.playerId = message.id;
        this.gameState = message.snapshot;

        console.log(`[Network] Joined server as ${this.playerId}`);
        this.events.emit('joined', message);
    }

    handleGameState(snapshot) {
        // Save state history for interpolation
        this.stateHistory.push({
            time: Date.now(),
            snapshot
        });

        if (this.stateHistory.length > 60) {
            this.stateHistory.shift();
        }

        // Update all players
        Object.entries(snapshot).forEach(([id, data]) => {
            if (id === this.playerId) {
                // Local player reconciliation
                this.events.emit('reconcile', {
                    position: { x: data.x, y: data.y },
                    velocity: { x: data.vx, y: data.vy },
                    seq: data.seq,
                    pendingInputs: this.pendingInputs
                });
            } else {
                // Remote player
                if (!this.players.has(id)) {
                    this.players.set(id, data);
                    this.events.emit('remoteJoin', id, data);
                } else {
                    this.players.set(id, data);
                    this.events.emit('remoteMove', id, data);
                }
            }
        });
    }

    handleReconcile(data) {
        // Remove acknowledged inputs
        this.pendingInputs = this.pendingInputs.filter(input =>
            input.sequenceNumber > data.seq
        );

        // Rewind and reapply remaining inputs
        if (this.pendingInputs.length > 0) {
            this.replayPendingInputs(data.position);
        }
    }

    replayPendingInputs(basePosition) {
        let x = basePosition.x;
        let y = basePosition.y;

        this.pendingInputs.forEach(input => {
            // Simulate physics locally
            if (input.moveLeft) x -= GAME_CONFIG.PLAYER.SPEED * (TICK_INTERVAL / 1000);
            if (input.moveRight) x += GAME_CONFIG.PLAYER.SPEED * (TICK_INTERVAL / 1000);
            if (input.jump && y >= 400) y = 400;
        });

        // Emit corrected position
        this.events.emit('positionCorrection', { x, y });
    }

    handleBulletUpdate(bullets) {
        Object.entries(bullets).forEach(([id, data]) => {
            if (!this.bullets.has(id)) {
                this.bullets.set(id, data);
                this.events.emit('bulletSpawn', id, data);
            } else {
                this.bullets.set(id, data);
                this.events.emit('bulletMove', id, data);
            }
        });
    }

    handlePong(data) {
        const rtt = Date.now() - data.timestamp;
        this.ping = rtt;
        this.serverTimeOffset = rtt / 2;
        this.events.emit('ping', rtt);
    }

    getPlayer(id) {
        return this.players.get(id);
    }

    getBullet(id) {
        return this.bullets.get(id);
    }

    getStateAt(time) {
        // Find closest historical state
        for (let i = this.stateHistory.length - 1; i >= 0; i--) {
            if (this.stateHistory[i].time <= time) {
                return this.stateHistory[i];
            }
        }
        return null;
    }

    on(event, callback) {
        this.events.on(event, callback);
    }

    off(event, callback) {
        this.events.off(event, callback);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}