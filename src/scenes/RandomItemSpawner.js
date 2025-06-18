// src/game/RandomItemSpawner.js
import Phaser from 'phaser';
import HealthOrb from '../entities/HealthPickup.js'; // Import the HealthOrb

// You'll likely want to define item configurations in constants later
const ITEM_TYPES = {
    HEALTH_ORB: 'healthOrb'
};

const SPAWN_INTERVAL_MIN = 5000; // Minimum time between spawns (ms)
const SPAWN_INTERVAL_MAX = 15000; // Maximum time between spawns (ms)
const ITEM_LIFESPAN = 10000; // How long an item stays on screen if not picked up (ms)
const MAX_ACTIVE_ITEMS = 3; // Maximum number of items visible at once

export default class RandomItemSpawner {
    constructor(scene, player, platforms, ground) {
        this.scene = scene;
        this.player = player;
        this.platforms = platforms;
        this.ground = ground;

        this.activeItems = this.scene.physics.add.group();
        this.spawnTimer = 0;
        this.nextSpawnTime = this.getRandomSpawnInterval();

        this.setupCollisions();
    }

    getRandomSpawnInterval() {
        return Phaser.Math.Between(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
    }

    spawnItem() {
        if (this.activeItems.getChildren().length >= MAX_ACTIVE_ITEMS) {
            return; // Don't spawn if max items reached
        }

        const worldWidth = this.scene.physics.world.bounds.width;
        const worldHeight = this.scene.physics.world.bounds.height;
        const groundHeight = GAME_CONFIG.WORLD.GROUND_HEIGHT;

        // Random X position within world bounds
        const spawnX = Phaser.Math.Between(100, worldWidth - 100);
        // Spawn slightly above the ground/platforms to allow gravity to work
        const spawnY = worldHeight - groundHeight - 100 - Phaser.Math.Between(0, 200);

        // For now, only spawn HealthOrbs
        const itemType = ITEM_TYPES.HEALTH_ORB;

        let newItem = null;
        switch (itemType) {
            case ITEM_TYPES.HEALTH_ORB:
                newItem = new HealthOrb(this.scene, spawnX, spawnY);
                break;
            // Add more item types here later
        }

        if (newItem) {
            this.activeItems.add(newItem.sprite);
            // Add a timed event to destroy the item if not picked up
            this.scene.time.delayedCall(ITEM_LIFESPAN, this.despawnItem, [newItem.sprite], this);
        }
    }

    despawnItem(itemSprite) {
        if (itemSprite.active) { // Only destroy if it hasn't been picked up already
            itemSprite.healthOrbInstance?.destroy(); // Call the custom entity's destroy
        }
    }

    setupCollisions() {
        // Player collects Health Orb
        this.scene.physics.add.overlap(this.player.sprite, this.activeItems, this.playerCollectItem, null, this);

        // Items should collide with ground and platforms
        this.scene.physics.add.collider(this.activeItems, this.ground);
        this.scene.physics.add.collider(this.activeItems, this.platforms);
    }

    playerCollectItem(playerSprite, itemSprite) {
        const healthOrb = itemSprite.healthOrbInstance;
        if (healthOrb && playerSprite.playerInstance) {
            playerSprite.playerInstance.increaseHealth(healthOrb.value);
            healthOrb.destroy(); // Destroy the orb after collection
        }
    }

    update(time, delta) {
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.nextSpawnTime) {
            this.spawnItem();
            this.spawnTimer = 0;
            this.nextSpawnTime = this.getRandomSpawnInterval();
        }
    }
}