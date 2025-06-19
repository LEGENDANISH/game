import io from 'socket.io-client'

export default class NetworkManager {
  constructor(gameScene) {
    this.scene = gameScene
    this.socket = io() // defaults to connecting to the current host
    this.otherPlayers = {}

    this.setupSocketEvents()
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Connected to server')
    })

    this.socket.on('currentPlayers', players => {
      Object.keys(players).forEach(id => {
        if (id === this.socket.id) return
        this.addOtherPlayer(players[id])
      })
    })

    this.socket.on('newPlayer', playerInfo => {
      this.addOtherPlayer(playerInfo)
    })

    this.socket.on('disconnectPlayer', playerId => {
      if (this.otherPlayers[playerId]) {
        this.otherPlayers[playerId].destroy()
        delete this.otherPlayers[playerId]
      }
    })

    this.socket.on('playerMoved', ({ id, x, y, direction }) => {
      const player = this.otherPlayers[id]
      if (player) {
        player.setPosition(x, y)
        player.setFlipX(direction === -1)
      }
    })

    this.socket.on('playerShot', ({ id, x, y, direction }) => {
      this.scene.spawnBulletFromOtherPlayer(id, x, y, direction)
    })
  }

  addOtherPlayer(playerInfo) {
    const otherPlayer = this.scene.add.circle(playerInfo.x, playerInfo.y, 15, 0x8888ff)
    this.scene.physics.add.existing(otherPlayer)
    this.otherPlayers[playerInfo.id] = otherPlayer
  }

  sendPlayerMovement(player) {
    if (!this.socket.connected) return

    this.socket.emit('playerMovement', {
      x: player.sprite.x,
      y: player.sprite.y,
      direction: player.direction
    })
  }

  sendShoot(x, y, direction) {
    this.socket.emit('playerShoot', { x, y, direction })
  }

  disconnect() {
    this.socket.disconnect()
  }
}
