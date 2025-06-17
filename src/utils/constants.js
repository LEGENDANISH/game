export const GAME_CONFIG = {
  PLAYER: {
    SPEED: 200,
    JUMP_VELOCITY: -500,
    MAX_HEALTH: 100,
    SIZE: { width: 20, height: 40 }
  },
  BULLET: {
    SPEED: 600,
    SIZE: { width: 8, height: 3 }
  },
  ENEMY: {
    SPEED: 50,
    HEALTH: 30,
    SIZE: { width: 18, height: 35 }
  },
  PLATFORM: {
    SMALL: { width: 120, height: 20 },
    MEDIUM: { width: 200, height: 20 },
    LARGE: { width: 300, height: 20 }
  },
  WORLD: {
    WIDTH: 3000,
    HEIGHT: 800,
    GROUND_HEIGHT: 100
  },
  DAMAGE:{

  }
}

export const CONTROLS = {
  LEFT: 'A',
  RIGHT: 'D', 
  JUMP: 'W',
  SHOOT: 'SPACE'
};

export const COLORS = {
  PLAYER: 0x2563eb,     // Blue
  ENEMY: 0xdc2626,     // Red
  BULLET: 0xfbbf24,     // Yellow
  PLATFORM: 0x374151,   // Dark Gray
  GROUND: 0x16a34a,     // Green
  UI_BG: 0x1f2937,      // Dark Background
  HEALTH_GOOD: 0x22c55e,   // Green
  HEALTH_MEDIUM: 0xeab308, // Yellow
  HEALTH_LOW: 0xef4444     // Red
}