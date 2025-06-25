import Phaser from 'phaser';
import Player from '../entities/px.js';
import NetworkManager from './NetworkManager.js';

export default class MultiplayerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MultiplayerScene' });
        this.localPlayer = null;
        this.remotePlayers = new Map(); // playerId => Player instance
        this.bullets = new Map();       // bulletId => Bullet instance
        this.network = null;
        this.keys = {};
    }

    init() {
        // Initialize network manager
        this.network = new NetworkManager(this);
    }

    preload() {
        // No assets needed since we're using graphics
    }

    create() {
        // Set up keyboard controls
        this.setupControls();

        // Set world bounds (same as backend)
        this.physics.world.setBounds(0, 0, 3000, 800);

        // Create background
        this.createBackground();

        // Connect to server
        this.network.connect();

        // Listen for events
        this.setupEventListeners();

        // Spawn local player
        const spawnPoint = this.getSpawnPoint();
        this.spawnLocalPlayer(spawnPoint.x, spawnPoint.y);
    }

    setupControls() {
        this.keys = {
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            shoot: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        };
    }

    getSpawnPoint() {
        return { x: 100, y: 400 }; // Match backend ground level
    }

    spawnLocalPlayer(x, y) {
        this.localPlayer = new Player(this, x, y, 'local');
    }

    setupEventListeners() {
        // When connected to room
        this.network.on('joined', (data) => {
            console.log('Joined room with players:', data.players);
        });

        // When remote player joins
        this.network.on('remoteJoin', (id, data) => {
            if (!this.remotePlayers.has(id)) {
                const remotePlayer = new Player(this, data.x, data.y, 'remote');
                remotePlayer.sprite.setVisible(true);
                this.remotePlayers.set(id, remotePlayer);
            }
        });

        // When remote player moves
        this.network.on('remoteMove', (id, data) => {
            const player = this.remotePlayers.get(id);
            if (player && player.sprite.active) {
                player.setPosition(data.x, data.y);
            }
        });

        // When server reconciles position
        this.network.on('reconcile', (serverState) => {
            if (this.localPlayer) {
                this.localPlayer.reconcile({
                    position: serverState.position,
                    velocity: serverState.velocity,
                    seq: serverState.seq,
                    pendingInputs: this.localPlayer.inputHistory.slice(serverState.seq + 1)
                });
            }
        });

        // When bullets are updated by server
        this.network.on('bulletUpdate', (bulletData) => {
            Object.entries(bulletData).forEach(([id, data]) => {
                if (!this.bullets.has(id)) {
                    const bullet = new Bullet(
                        this,
                        data.x,
                        data.y,
                        data.direction,
                        data.damage
                    );
                    this.bullets.set(id, bullet);
                } else {
                    const bullet = this.bullets.get(id);
                    bullet.setPosition(data.x, data.y);
                }
            });
        });

        // Ping updates
        this.network.on('ping', (rtt) => {
            this.pingText?.setText(`Ping: ${rtt}ms`);
        });

        // Handle disconnect
        this.network.on('disconnected', () => {
            this.scene.start('MainMenuScene'); // or show reconnect UI
        });
    }

    update(time, delta) {
        if (!this.localPlayer || this.localPlayer.isDead) return;

        // Update local player input
        this.localPlayer.update(this.keys);

        // Send inputs periodically (~60fps)
        if (time - this.lastInputSent > 16) {
            const input = this.localPlayer.inputHistory[this.localPlayer.inputHistory.length - 1];
            if (input) {
                this.network.sendInput(input);
                this.lastInputSent = time;
            }
        }

        // Update bullets
        this.updateBullets();
    }

    updateBullets() {
        this.localPlayer.bullets.getChildren().forEach((bulletSprite) => {
            const bullet = bulletSprite.bulletInstance;
            if (bullet && bullet.active) {
                bullet.update();
            }
        });
    }

    createBackground() {
        // Sky gradient
        const sky = this.add.graphics();
        sky.fillStyle(0x87CEEB); // Light blue
        sky.fillRect(0, 0, 3000, 600);

        // Ground
        const ground = this.add.rectangle(1500, 750, 3000, 100, 0x228B22); // Forest green
        ground.setScrollFactor(0);
        ground.body = this.physics.add.existing(ground, true);
        ground.body.setSize(3000, 100, true);

        // Buildings
        for (let i = 0; i < 15; i++) {
            const x = i * 200 + 100;
            const height = Phaser.Math.Between(200, 400);
            const building = this.add.rectangle(x, 700 - height / 2, 150, height, 0x2d3748);
            building.setScrollFactor(0.3);

            // Windows
            for (let j = 0; j < Math.floor(height / 40); j++) {
                for (let k = 0; k < 3; k++) {
                    if (Math.random() > 0.3) {
                        const window = this.add.rectangle(
                            x - 40 + k * 40,
                            700 - height + 20 + j * 40,
                            15,
                            15,
                            0xfbbf24
                        );
                        window.setScrollFactor(0.3);
                    }
                }
            }
        }

        // Clouds
        for (let i = 0; i < 8; i++) {
            const cloud = this.add.graphics();
            cloud.fillStyle(0xffffff, 0.8);
            const x = i * 400 + 200;
            const y = 100 + Math.random() * 200;

            cloud.fillCircle(x, y, 30);
            cloud.fillCircle(x + 25, y, 25);
            cloud.fillCircle(x + 50, y, 30);
            cloud.fillCircle(x + 25, y - 15, 20);
            cloud.setScrollFactor(0.2);
        }
    }

    destroy() {
        if (this.localPlayer) {
            this.localPlayer.destroy();
            this.localPlayer = null;
        }
        this.remotePlayers.forEach(player => player.destroy());
        this.remotePlayers.clear();
        this.bullets.forEach(bullet => bullet.destroy());
        this.bullets.clear();
        this.network.disconnect();
    }
}