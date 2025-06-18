import Phaser from 'phaser';

export default class CreateJoinScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CreateJoinScene' });
    }

    create() {
        // Background gradient (purple to blue)
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x6A0DAD, 0x6A0DAD, 0x00008B, 0x00008B, 1); // Deep purple to dark blue
        gradient.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        gradient.setDepth(0);

        // Character silhouette in the background
        this.createCharacterSilhouette();

        // Create Game Panel
        this.createGamePanel();

        // Join Game Panel
        this.createJoinPanel();

        // Close Button
        this.createCloseButton();

        // Menu Icon (top right)
        this.createMenuIcon();
    }

    createCharacterSilhouette() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Character body (more defined, darker orange/brown, slightly to the left)
        const body = this.add.ellipse(centerX - 150, centerY + 50, 100, 150, 0xA0522D); // SaddleBrown
        body.setDepth(1);

        // Character head (darker orange/brown, more round)
        const head = this.add.circle(centerX - 150, centerY - 30, 50, 0x8B4513); // Sienna
        head.setDepth(1);

        // Tool/weapon (more prominent, sword-like, angled)
        const tool = this.add.rectangle(centerX - 70, centerY - 20, 20, 180, 0x4A3B2F); // Darker brown for the blade
        tool.setDepth(1);
        tool.setRotation(-0.5); // Angle the sword

        // Tool handle (more distinct, darker)
        const handle = this.add.rectangle(centerX - 100, centerY - 80, 15, 60, 0x362C22); // Even darker brown/black for the handle
        handle.setDepth(1);
        handle.setRotation(-0.5);
    }

            createGamePanel() {
                const panelX = this.cameras.main.centerX - 200;
                const panelY = this.cameras.main.centerY - 40;
                const panelWidth = 300;
                const panelHeight = 320;
const panelShadow = this.add.rectangle(panelX +25, panelY + 10, panelWidth, panelHeight, 0x000000);
panelShadow.setAlpha(0.4); // Adjust for desired shadow intensity
panelShadow.setDepth(4);   // Below panel but above background
const border2 = this.add.rectangle(panelX, panelY, panelWidth + 28  , panelHeight + 28, 0x000000); // Hot Pink
        border2.setDepth(5);
                // Pink border (thicker and more vibrant)
                const border = this.add.rectangle(panelX, panelY, panelWidth + 24, panelHeight + 24, 0xFD0071); // Hot Pink
                border.setDepth(5);

                // Dark panel background (slightly transparent dark gray/black)
                const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1C2C3D); // Darker gray
                panel.setAlpha(1); // Slightly transparent
                panel.setDepth(6);

                // Title background (darker and wider)
                const titleBg = this.add.rectangle(panelX, panelY - 120, panelWidth-50, 50, 0x000000);
                titleBg.setAlpha(0.7);
                titleBg.setDepth(7);

                // Title text (larger, slightly different font or bolding)
                this.add.text(panelX, panelY - 120, 'CREATE GAME', {
                    fontSize: '28px',
                    color: '#ffffff',
                    fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif', // More impactful font
                    fontWeight: 'bold'
                }).setOrigin(0.5).setDepth(8);

                // Max Players section
                this.add.text(panelX -20, panelY - 70, 'Max Players', {
    fontSize: '18px',
    color: '#ffffff',
fontFamily: 'Arial',
    fontWeight: 'bold'
    
})
.setOrigin(1, 0.5)
.setDepth(8)


                // Max players input box (Phaser graphic for background/border)
                const maxPlayersBox = this.add.rectangle(panelX + 75, panelY - 70, 70, 40, 0x081018); // Darker input box
                maxPlayersBox.setDepth(7);

                // Create the DOM input element
                this.maxPlayersInput = this.add.dom(panelX + 80, panelY - 70, 'input', {
                    width: '70px',
                    height: '40px',
                    backgroundColor: 'transparent', // Make background transparent to show Phaser graphic
                    color: '#ffffff',
                    border: 'none',
                    textAlign: 'center',
                    fontSize: '20px',
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    padding: '0', // Remove default padding
                    boxSizing: 'border-box' // Ensure padding doesn't affect width/height
                }).setOrigin(0.5).setDepth(8);

                // Directly set properties after creation
                this.maxPlayersInput.node.type = 'number';
                this.maxPlayersInput.node.value = '6'; // Default value
                this.maxPlayersInput.node.min = '2';
                this.maxPlayersInput.node.max = '8';
                // Add an input event listener to log changes, optional
                this.maxPlayersInput.node.addEventListener('input', (event) => {
                    console.log('Max Players:', event.target.value);
                });


                // Private Match section
                this.add.text(panelX -12, panelY - 10, 'Private Match', {
                    fontSize: '18px',
                    color: '#ffffff',
                    fontFamily: 'Arial',
                    fontWeight: 'bold'
                }).setOrigin(1, 0.5).setDepth(8);

                // Checkbox (checked and more prominent)
                 const checkboxSize = 30;
const checkboxX = panelX + 90;
const checkboxY = panelY - 10;

// Create the checkbox background (unchecked state)
this.privateMatchCheckbox = this.add.rectangle(
    checkboxX,
    checkboxY,
    checkboxSize,
    checkboxSize,
    0x081018 // Dark gray background
).setStrokeStyle(2, 0x081018    ) // Gray border
 .setInteractive()
 .setDepth(7);

// Create the green checkmark (hidden initially)
this.checkmark = this.add.text(
    checkboxX,
    checkboxY,
    '✓',
    {
        fontSize: '24px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#58FD00',
        align: 'center'
    }
).setOrigin(0.5)
 .setDepth(8)
 .setVisible(false);

// Checkbox toggle behavior
this.privateMatchCheckbox.on('pointerdown', () => {
    const isChecked = this.checkmark.visible;

    if (isChecked) {
        // Uncheck
        this.privateMatchCheckbox.setFillStyle(0x111111);
        this.checkmark.setVisible(false);
    } else {
        // Check
        this.privateMatchCheckbox.setFillStyle(0x081018); // Green background
        this.checkmark.setVisible(true);
    }
});
                // Subtitle text (smaller, lighter gray)
                this.add.text(panelX +40, panelY + 12, 'only invited people can join', {
                    fontSize: '14px',
                    color: '#BBBBBB', // Lighter gray
                    fontFamily: 'Arial',
                    fontWeight:"bold"
                }).setOrigin(1, 0.5).setDepth(8);

                // Region section
                this.add.text(panelX - 100, panelY + 80, 'Region', {
                    fontSize: '20px',
                    color: '#ffffff',
                    fontFamily: 'Arial',
                    fontWeight: 'bold'
                }).setOrigin(0, 0.5).setDepth(8);

                // Region dropdown (Phaser graphic for background/border)
                const regionBox = this.add.rectangle(panelX +50, panelY + 80, 120, 30, 0x081018);
                regionBox.setStrokeStyle(3, 0x555555);
                regionBox.setDepth(7);

                // Create the DOM select element
                this.regionDropdown = this.add.dom(panelX + 50, panelY + 80, 'select', {
                    width: '120px',
                    height: '40px',
                    backgroundColor: 'transparent', // Make background transparent
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    appearance: 'none', // Remove default dropdown arrow
                    paddingRight: '25px', // Space for custom arrow
                    paddingLeft: '10px', // Add left padding to prevent text from hitting the left edge
                    boxSizing: 'border-box'
                }).setOrigin(0.5).setDepth(8);

                // Populate dropdown options
                ['Best Region', 'Region A', 'Region B'].forEach((optionText) => {
                    const option = document.createElement('option');
                    option.value = optionText;
                    option.textContent = optionText;
                    this.regionDropdown.node.appendChild(option); // Use .node for direct DOM manipulation
                });


                // Dropdown arrow (custom, more prominent)
                this.add.text(panelX + 110, panelY + 80, '▼', {
                    fontSize: '18px',
                    color: '#ffffff',
                    fontFamily: 'Arial'
                }).setOrigin(0.5).setDepth(9); // Increased depth to be above dropdown

                // Create button
                this.createButton(panelX, panelY + 160, 'Create', 0xFDD400, 0xFFA500); // Gold button
            }

    createJoinPanel() {
        const panelX = this.cameras.main.centerX + 200;
        const panelY = this.cameras.main.centerY - 60;
        const panelWidth = 300;
        const panelHeight = 180;
const panelShadow = this.add.rectangle(panelX +20, panelY , panelWidth, panelHeight, 0x000000);
panelShadow.setAlpha(0.2); // Adjust for desired shadow intensity
panelShadow.setDepth(1); 
const border2 = this.add.rectangle(panelX, panelY, panelWidth + 28  , panelHeight + 28, 0x000000); // Hot Pink
        border2.setDepth(5);
        // Pink border (thicker and more vibrant)
        const border = this.add.rectangle(panelX, panelY, panelWidth + 24, panelHeight + 24, 0xFD0071); // Hot Pink
        border.setDepth(5);


        // Dark panel background (slightly transparent dark gray/black)
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1C2C3D); // Darker gray
        panel.setAlpha(1); // Slightly transparent
        panel.setDepth(6);

        // Title background (darker and wider)
        const titleBg = this.add.rectangle(panelX, panelY - 50, panelWidth-75, 50, 0x000000);
        titleBg.setAlpha(0.7);
        titleBg.setDepth(7);

        // Title text (larger, slightly different font or bolding)
        this.add.text(panelX, panelY -50, 'JOIN GAME', {
            fontSize: '28px',
            color: '#ffffff',
            fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif', // More impactful font
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(8);

        // Game code input box (Phaser graphic for background/border)
        // No separate background graphic needed if the DOM element's background is solid.
        // If you still want the separate graphic, ensure its background is transparent.

        // Create the DOM input element
        this.gameCodeInput = this.add.dom(panelX, panelY - 2, 'input', {
            width: '180px', // Wider input box
            height: '40px', // Taller input box
            backgroundColor: '#000000', // Solid background for input
            color: '#ffffff',
            
            textAlign: 'center',
            fontSize: '24px', // Larger font for input
            fontFamily: 'Arial',
            fontWeight: 'bold',
            padding: '0', // Remove default padding
            boxSizing: 'border-box' // Ensure padding doesn't affect width/height
        }).setOrigin(0.5).setDepth(8);

        // Directly set properties after creation
        this.gameCodeInput.node.placeholder = '_ _ _ _';
        this.gameCodeInput.node.maxLength = 4; // Limit to 4 digits
        this.gameCodeInput.node.type = 'text'; // Or 'number' if you only want numbers
        
        // Add an input event listener to log changes, optional
        this.gameCodeInput.node.addEventListener('input', (event) => {
            console.log('Game Code:', event.target.value);
        });


        // Join button
        this.createButton(panelX, panelY + 80, 'Join', 0xFDD400, 0xFFA500); // Gold button
    }

    createCloseButton() {
        // Close button dimensions
        const closeButtonSize = 40; // Larger button
        const closeButtonX = 35; // Left margin
        const closeButtonY = 35; // Top margin

        // Close button background (white circle)
        const closeButton = this.add.circle(closeButtonX, closeButtonY, closeButtonSize / 2, 0xFFFFFF); // Circle
        closeButton.setInteractive().setDepth(10);
        closeButton.setStrokeStyle(2, 0xAAAAAA); // Slight gray border

        // Close button text (X - larger and bolder)
        this.add.text(closeButtonX, closeButtonY, 'X', {
            fontSize: '28px', // Larger X
            color: '#000000',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(11);

        // Close button interaction
        closeButton.on('pointerdown', () => {
            console.log('Closing pop-up');
            this.scene.stop(); // Stop the current scene
        });

        // Hover effect
        closeButton.on('pointerover', () => {
            closeButton.setFillStyle(0xDDDDDD); // Light gray on hover
        });

        closeButton.on('pointerout', () => {
            closeButton.setFillStyle(0xFFFFFF); // Reset to white
        });
    }

    createMenuIcon() {
        const iconSize = 40;
        const iconX = this.cameras.main.width - 35; // Right margin
        const iconY = 35; // Top margin

        // Background for the icon (optional, based on image if it has one)
        const iconBg = this.add.circle(iconX, iconY, iconSize / 2, 0xFFFFFF); // White circle background
        iconBg.setInteractive().setDepth(10);
        iconBg.setStrokeStyle(2, 0xAAAAAA);

        // Three horizontal lines for the menu icon
        const lineThickness = 4;
        const lineLength = 20;
        const lineSpacing = 8;

        this.add.rectangle(iconX, iconY - lineSpacing, lineLength, lineThickness, 0x000000).setOrigin(0.5).setDepth(11);
        this.add.rectangle(iconX, iconY, lineLength, lineThickness, 0x000000).setOrigin(0.5).setDepth(11);
        this.add.rectangle(iconX, iconY + lineSpacing, lineLength, lineThickness, 0x000000).setOrigin(0.5).setDepth(11);

        iconBg.on('pointerdown', () => {
            console.log('Menu icon clicked');
            // Add your menu open logic here
        });

        iconBg.on('pointerover', () => {
            iconBg.setFillStyle(0xDDDDDD);
        });

        iconBg.on('pointerout', () => {
            iconBg.setFillStyle(0xFFFFFF);
        });
    }

   createButton(x, y, text, color, hoverColor) {
    // Define parallelogram points (slanted sides)
    const width = 160;
    const height = 60;
    const slant = 20;

    // Calculate points relative to the button's *center* (x, y)
    const shadowOffsetX = 5;
    const shadowOffsetY = 5;

    // Button shadow/3D effect (parallelogram)
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

    // Main button (parallelogram)
    const button = this.add.graphics();
    button.fillStyle(color, 1);
    button.lineStyle(3, 0x8B4513);
    const buttonBorderOffsetX = -3;
    const buttonPoints = [
        new Phaser.Geom.Point(-width / 2 + slant + buttonBorderOffsetX, -height / 2),
        new Phaser.Geom.Point(width / 2 + slant + buttonBorderOffsetX, -height / 2),
        new Phaser.Geom.Point(width / 2 - slant + buttonBorderOffsetX, height / 2),
        new Phaser.Geom.Point(-width / 2 - slant + buttonBorderOffsetX, height / 2)
    ];
    button.fillPoints(buttonPoints, true);
    button.strokePoints(buttonPoints, true);

    button.setInteractive(
        new Phaser.Geom.Polygon(buttonPoints),
        Phaser.Geom.Polygon.Contains
    );
    button.setDepth(8);
    button.x = x;
    button.y = y;

    // Shine effect
    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.4); // Slightly less opaque for subtlety
    shine.fillRect(0, -height / 2, 40, height); // Narrower shine for focused effect
    shine.setDepth(8.5);
    shine.x = x - width / 2 - 40 - slant; // Start left of the button
    shine.y = y;

    // Mask to keep shine within the button bounds
    const maskGraphic = this.make.graphics().fillStyle(0xffffff);
    maskGraphic.fillPoints(buttonPoints, true);
    maskGraphic.x = x;
    maskGraphic.y = y;
    shine.setMask(maskGraphic.createGeometryMask());

    // Shine animation
    this.tweens.add({
        targets: shine,
        x: x + width / 2 + slant + 40, // Move to right edge of button
        duration: 1500,
        repeat: -1,
        repeatDelay: 1000,
        ease: 'Sine.easeInOut'
    });

    // Button text
    const buttonText = this.add.text(x, y, text, {
        fontSize: '26px',
        color: '#000000',
        fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
        fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(9);

    // Store original scale for reference
    const originalScale = { scaleX: 1, scaleY: 1 };
    const hoverScale = { scaleX: 1.08, scaleY: 1.08 };
    const squeezeScale = { scaleX: 1.05, scaleY: 0.8 };

    // Group elements that should scale together (EXCLUDING shine)
    const animatableElements = [button, shadow, buttonText];

    // Button interactions
    button.on('pointerover', () => {
        button.clear();
        button.fillStyle(hoverColor, 1);
        button.lineStyle(3, 0x8B4513);
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
                    ease: 'Back.easeOut',
                });
            }
        });
    });

    button.on('pointerout', () => {
        button.clear();
        button.fillStyle(color, 1);
        button.lineStyle(3, 0x8B4513);
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

    button.on('pointerdown', () => {
        if (text === 'Create') {
            console.log('Creating game...');
        } else {
            console.log('Joining game...');
        }
        this.scene.stop();
    });

    return button;
}
}