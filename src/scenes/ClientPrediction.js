
export default class ClientPrediction {
  constructor(scene) {
    this.scene = scene;
    this.player = scene.localPlayer;
    
    // Movement constants
    this.MOVE_SPEED = 300;
    this.JUMP_FORCE = -600;
    this.GRAVITY = 800;
    this.DRAG_X = 800;
    this.MAX_VELOCITY_X = 300;
    this.MAX_VELOCITY_Y = 1000;
    
    // Prediction state
    this.predictedState = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      onGround: false
    };
    
    // Physics constants for consistent simulation
    this.PHYSICS_STEP = 16; // 60fps
    this.GROUND_CHECK_OFFSET = 5;
  }

  /**
   * Apply input with client-side prediction
   * This runs immediately when input is collected
   */
  applyInput(input) {
    if (!this.player || !this.player.sprite.active) return;

    const sprite = this.player.sprite;
    const body = sprite.body;
    
    // Store current state for potential rollback
    this.updatePredictedState(sprite);
    
    // Apply physics step with input
    this.simulatePhysicsStep(input, this.PHYSICS_STEP / 1000);
    
    // Apply the predicted state to the sprite
    this.applyPredictedState(sprite);
  }

  /**
   * Simulate one physics step with given input
   */
  simulatePhysicsStep(input, deltaTime) {
    const state = this.predictedState;
    
    // Horizontal movement
    if (input.left && !input.right) {
      state.velocityX = -this.MOVE_SPEED;
    } else if (input.right && !input.left) {
      state.velocityX = this.MOVE_SPEED;
    } else {
      // Apply drag when no input
      state.velocityX *= Math.pow(0.1, deltaTime); // Exponential decay
    }
    
    // Jumping
    if (input.up && state.onGround) {
      state.velocityY = this.JUMP_FORCE;
      state.onGround = false;
    }
    
    // Apply gravity
    if (!state.onGround) {
      state.velocityY += this.GRAVITY * deltaTime;
    }
    
    // Clamp velocities
    state.velocityX = Phaser.Math.Clamp(state.velocityX, -this.MAX_VELOCITY_X, this.MAX_VELOCITY_X);
    state.velocityY = Phaser.Math.Clamp(state.velocityY, -this.MAX_VELOCITY_Y, this.MAX_VELOCITY_Y);
    
    // Update position
    const newX = state.x + (state.velocityX * deltaTime);
    const newY = state.y + (state.velocityY * deltaTime);
    
    // Apply world bounds
    const worldBounds = this.scene.physics.world.bounds;
    state.x = Phaser.Math.Clamp(newX, 0, worldBounds.width - 32);
    state.y = Phaser.Math.Clamp(newY, 0, worldBounds.height - 48);
    
    // Ground and platform collision detection
    this.checkCollisions(state);
  }

  /**
   * Check collisions for predicted state
   */
  checkCollisions(state) {
    // Simple ground collision
    const groundY = this.scene.physics.world.bounds.height - 64; // Assuming ground height
    
    if (state.y >= groundY - 48) { // Player height
      state.y = groundY - 48;
      state.velocityY = 0;
      state.onGround = true;
    }
    
    // Platform collision detection
    if (this.scene.platforms) {
      this.scene.platforms.children.entries.forEach(platform => {
        if (this.predictedCollisionWithPlatform(state, platform)) {
          // Landing on platform from above
          if (state.velocityY > 0 && state.y < platform.y) {
            state.y = platform.y - 48; // Player height
            state.velocityY = 0;
            state.onGround = true;
          }
        }
      });
    }
  }

  /**
   * Check if predicted state collides with platform
   */
  predictedCollisionWithPlatform(state, platform) {
    const playerBounds = {
      left: state.x,
      right: state.x + 32,
      top: state.y,
      bottom: state.y + 48
    };
    
    const platformBounds = {
      left: platform.x - platform.displayWidth / 2,
      right: platform.x + platform.displayWidth / 2,
      top: platform.y - platform.displayHeight / 2,
      bottom: platform.y + platform.displayHeight / 2
    };
    
    return (
      playerBounds.right > platformBounds.left &&
      playerBounds.left < platformBounds.right &&
      playerBounds.bottom > platformBounds.top &&
      playerBounds.top < platformBounds.bottom
    );
  }

  /**
   * Update predicted state from current sprite state
   */
  updatePredictedState(sprite) {
    this.predictedState.x = sprite.x;
    this.predictedState.y = sprite.y;
    this.predictedState.velocityX = sprite.body.velocity.x;
    this.predictedState.velocityY = sprite.body.velocity.y;
    this.predictedState.onGround = sprite.body.onFloor() || sprite.body.touching.down;
  }

  /**
   * Apply predicted state to sprite
   */
  applyPredictedState(sprite) {
    sprite.setPosition(this.predictedState.x, this.predictedState.y);
    sprite.body.setVelocity(this.predictedState.velocityX, this.predictedState.velocityY);
    
    // Update sprite flip based on movement direction
    if (this.predictedState.velocityX < -10) {
      sprite.setFlipX(true);
    } else if (this.predictedState.velocityX > 10) {
      sprite.setFlipX(false);
    }
  }

  /**
   * Rollback to server state and replay inputs
   */
  rollbackAndReplay(serverState, inputsToReplay) {
    if (!this.player || !this.player.sprite.active) return;

    console.log(`[PREDICTION] Rolling back and replaying ${inputsToReplay.length} inputs`);
    
    // Set to server state
    this.predictedState.x = serverState.position.x;
    this.predictedState.y = serverState.position.y;
    this.predictedState.velocityX = serverState.velocity.x;
    this.predictedState.velocityY = serverState.velocity.y;
    this.predictedState.onGround = serverState.onGround || false;
    
    // Apply server state to sprite
    this.applyPredictedState(this.player.sprite);
    
    // Replay unconfirmed inputs
    inputsToReplay.forEach(input => {
      this.simulatePhysicsStep(input, this.PHYSICS_STEP / 1000);
    });
    
    // Apply final predicted state
    this.applyPredictedState(this.player.sprite);
  }

  /**
   * Smooth interpolation between current and target positions
   * Used for minor corrections that don't require full rollback
   */
  smoothCorrection(targetState, correctionStrength = 0.1) {
    if (!this.player || !this.player.sprite.active) return;
    
    const sprite = this.player.sprite;
    
    // Calculate position difference
    const dx = targetState.x - sprite.x;
    const dy = targetState.y - sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
  }}