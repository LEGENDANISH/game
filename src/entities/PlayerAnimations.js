import Phaser from 'phaser';

export default class PlayerAnimation {
  constructor(playerInstance) {
    this.player = playerInstance;
    this.scene = this.player.scene;

    // Animation properties
    this.walkTimer = 0;
    this.animationState = 'idle';
  }

  update(moving) {
    if (this.player.isDead) {
      this.hide();
      return;
    }

    this.syncPosition();

    if (this.animationState === 'walking' && moving) {
      this.walkTimer += 0.2;
      const wobble = Math.sin(this.walkTimer) * 2;

      this.player.stickman.leftArm
        .setPosition(-8 + wobble, -5)
        .setRotation(-0.3 + wobble * 0.1);

      this.player.stickman.rightArm
        .setPosition(8 - wobble, -5)
        .setRotation(0.3 - wobble * 0.1);

      this.player.stickman.leftLeg
        .setPosition(-6 + wobble, 15)
        .setRotation(-0.2 + wobble * 0.2);

      this.player.stickman.rightLeg
        .setPosition(6 - wobble, 15)
        .setRotation(0.2 - wobble * 0.2);
    } else {
      this.walkTimer = 0;

      this.player.stickman.leftArm
        .setPosition(-8, -5)
        .setRotation(-0.3);

      this.player.stickman.rightArm
        .setPosition(8, -5)
        .setRotation(0.3);

      this.player.stickman.leftLeg
        .setPosition(-6, 15)
        .setRotation(-0.2);

      this.player.stickman.rightLeg
        .setPosition(6, 15)
        .setRotation(0.2);
    }

    this.player.stickman.group.setScale(this.player.direction === -1 ? -1 : 1, 1);
  }

  syncPosition() {
    this.player.stickman.group.x = this.player.sprite.x;
    this.player.stickman.group.y = this.player.sprite.y;
    this.player.stickman.group.setVisible(true);

    this.player.healthBarBg.setPosition(this.player.sprite.x, this.player.sprite.y - 35);
    this.player.healthBar.setPosition(this.player.sprite.x, this.player.sprite.y - 35);
  }

  hide() {
    this.player.stickman.group.setVisible(false);
  }

  resetVisuals() {
    const color = this.player.type === 'local' ? this.scene.COLORS.PLAYER : 0xff0000;
    this.player.stickman.head.setFillStyle(color);
    this.player.stickman.body.setFillStyle(color);
    this.player.stickman.leftArm.setFillStyle(color);
    this.player.stickman.rightArm.setFillStyle(color);
    this.player.stickman.leftLeg.setFillStyle(color);
    this.player.stickman.rightLeg.setFillStyle(color);
  }

  applyTintToStickman(color) {
    this.player.stickman.head.setFillStyle(color);
    this.player.stickman.body.setFillStyle(color);
    this.player.stickman.leftArm.setFillStyle(color);
    this.player.stickman.rightArm.setFillStyle(color);
    this.player.stickman.leftLeg.setFillStyle(color);
    this.player.stickman.rightLeg.setFillStyle(color);
  }

  setInvulnerable(duration = 500) {
    this.scene.tweens.add({
      targets: [
        this.player.stickman.head,
        this.player.stickman.body,
        this.player.stickman.leftArm,
        this.player.stickman.rightArm,
        this.player.stickman.leftLeg,
        this.player.stickman.rightLeg
      ],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200),
      ease: 'Linear'
    });
  }
}