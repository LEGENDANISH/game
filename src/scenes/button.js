export function createButton(x, y, text, color, hoverColor, icon = null, ribbonText = null) {
    const width = 160;
    const height = 60;
    const slant = 20;

    const shadowOffsetX = 5;
    const shadowOffsetY = 5;

    // Button shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    const shadowPoints = [
        new Phaser.Geom.Point(-width / 2 + slant + shadowOffsetX, -height / 2 + shadowOffsetY),
        new Phaser.Geom.Point(width / 2 + slant + shadowOffsetX, -height / 2 + shadowOffsetY),
        new Phaser.Geom.Point(width / 2 - slant + shadowOffsetX, height / 2 + shadowOffsetY),
        new Phaser.Geom.Point(-width / 2 - slant + shadowOffsetX, height / 2 + shadowOffsetY)
    ];
    shadow.fillPoints(shadowPoints, true);
    shadow.setDepth(7);
    shadow.x = x;
    shadow.y = y;

    // Main button
    const button = this.add.graphics();
    button.fillStyle(color, 1);
    button.lineStyle(3, 0x000000);
    const buttonPoints = [
        new Phaser.Geom.Point(-width / 2 + slant, -height / 2),
        new Phaser.Geom.Point(width / 2 + slant, -height / 2),
        new Phaser.Geom.Point(width / 2 - slant, height / 2),
        new Phaser.Geom.Point(-width / 2 - slant, height / 2)
    ];
    button.fillPoints(buttonPoints, true);
    button.strokePoints(buttonPoints, true);
    button.setInteractive(new Phaser.Geom.Polygon(buttonPoints), Phaser.Geom.Polygon.Contains);
    button.setDepth(8);
    button.x = x;
    button.y = y;

    // Shine effect
    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.5);
    shine.fillRect(-width / 2 - 40, -height / 2, 40, height);
    shine.setDepth(8.5);
    shine.x = x - slant;
    shine.y = y;

    const maskGraphic = this.make.graphics();
    maskGraphic.fillStyle(0xffffff);
    maskGraphic.fillPoints(buttonPoints, true);
    maskGraphic.x = x;
    maskGraphic.y = y;
    shine.setMask(maskGraphic.createGeometryMask());

    this.tweens.add({
        targets: shine,
        x: x + width + slant,
        duration: 1500,
        repeat: -1,
        repeatDelay: 10000,
        ease: 'Sine.easeInOut'
    });

    // Icon
    let iconDisplay = null;
    if (icon) {
        if (typeof icon === 'string' && icon.includes(':')) {
            iconDisplay = this.add.image(0, -10, icon);
            iconDisplay.setOrigin(0.5, 0);
            iconDisplay.setScale(0.5);
        } else {
            iconDisplay = this.add.text(0, -10, icon, {
                fontSize: '24px',
                color: '#000000',
                fontFamily: 'Arial'
            }).setOrigin(0.5, 0);
        }
        iconDisplay.setDepth(9.5);
    }

    // Button text
    const textY = y + (iconDisplay ? 10 : 0);
    const buttonText = this.add.text(x, textY, text, {
        fontSize: '26px',
        color: '#ffffff', // White text to match image
        fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
        fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(9);

    // Ribbon for "coming soon"
    let ribbon = null;
    if (ribbonText) {
        ribbon = this.add.graphics();
        ribbon.fillStyle(0xff69b4, 1); // Pink ribbon
        const ribbonWidth = 80;
        const ribbonHeight = 20;
        const ribbonPoints = [
            new Phaser.Geom.Point(-ribbonWidth / 2, -height / 2 - ribbonHeight),
            new Phaser.Geom.Point(ribbonWidth / 2, -height / 2 - ribbonHeight),
            new Phaser.Geom.Point(ribbonWidth / 2 + 10, -height / 2),
            new Phaser.Geom.Point(-ribbonWidth / 2 - 10, -height / 2)
        ];
        ribbon.fillPoints(ribbonPoints, true);
        ribbon.setDepth(9);
        ribbon.x = x;
        ribbon.y = y;

        const ribbonTextObj = this.add.text(x, y - height / 2 - ribbonHeight / 2, ribbonText, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(10);
    }

    const originalScale = { scaleX: 1, scaleY: 1 };
    const hoverScale = { scaleX: 1.08, scaleY: 1.08 };
    const squeezeScale = { scaleX: 1.05, scaleY: 0.8 };

    const animatableElements = [button, shadow, buttonText];
    if (iconDisplay) animatableElements.push(iconDisplay);
    if (ribbon) animatableElements.push(ribbon);

    button.on('pointerover', () => {
        button.clear();
        button.fillStyle(hoverColor, 1);
        button.lineStyle(3, 0x000000);
        button.fillPoints(buttonPoints);
        button.strokePoints(buttonPoints, true);

        this.tweens.killTweensOf(animatableElements);
        this.tweens.add({
            targets: animatableElements,
            scaleX: squeezeScale.scaleX,
            scaleY: squeezeScale.scaleY,
            duration: 100,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: animatableElements,
                    scaleX: hoverScale.scaleX,
                    scaleY: hoverScale.scaleY,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
            }
        });
    });

    button.on('pointerout', () => {
        button.clear();
        button.fillStyle(color, 1);
        button.lineStyle(3, 0x000000);
        button.fillPoints(buttonPoints);
        button.strokePoints(buttonPoints, true);

        this.tweens.killTweensOf(animatableElements);
        this.tweens.add({
            targets: animatableElements,
            scaleX: originalScale.scaleX,
            scaleY: originalScale.scaleY,
            duration: 200,
            ease: 'Power1'
        });
    });

    return button;
} 