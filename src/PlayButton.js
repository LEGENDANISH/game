export default class PlayButton extends Phaser.Scene {
    constructor() {
        super('PlayButton');
    }

    create() {
        // Add background (optional)
        this.add.rectangle(400, 300, 800, 600, 0x000000);
        
        // Add game title text (optional)
        this.add.text(400, 200, 'My Awesome Game', {
            fontSize: '48px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Create play button
        const playButton = this.add.text(400, 400, 'PLAY', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#4CAF50',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive();
        
        // Button hover effects
        playButton.on('pointerover', () => {
            playButton.setBackgroundColor('#45a049');
        });
        
        playButton.on('pointerout', () => {
            playButton.setBackgroundColor('#4CAF50');
        });
        
        // Start game when clicked
        playButton.on('pointerdown', () => {
            this.scene.start('MainGame'); // Replace 'MainGame' with your actual game scene key
        });
    }
}