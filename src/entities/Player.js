import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // We are using our generated 'player_sprite' texture from BootScene
    super(scene, x, y, 'player_sprite');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics properties
    this.setCollideWorldBounds(true);
    this.setDamping(true);
    this.setDrag(0.001); // smooth deceleration
    
    // Setup inputs
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    this.speed = 250;
  }

  update() {
    let velocityX = 0;
    let velocityY = 0;

    // Handle Movement
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocityX = -this.speed;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocityX = this.speed;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocityY = -this.speed;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocityY = this.speed;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.7071;
      velocityY *= 0.7071;
    }

    // Apply smooth acceleration/velocity
    this.setVelocity(velocityX, velocityY);

    // Simple realistic rotation based on movement direction
    if (velocityX !== 0 || velocityY !== 0) {
       this.rotation = Phaser.Math.Angle.Between(0, 0, velocityX, velocityY) - Math.PI/2;
    }
  }
}
