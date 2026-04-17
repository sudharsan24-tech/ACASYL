import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Generate a simple procedural map tile (Grass)
    const bgGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    bgGraphics.fillStyle(0x3e8948); // Green grass
    bgGraphics.fillRect(0, 0, 32, 32);
    bgGraphics.lineStyle(1, 0x367a3f);
    bgGraphics.strokeRect(0, 0, 32, 32);
    bgGraphics.generateTexture('grass_tile', 32, 32);

    // Generate a building wall tile
    const wallGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    wallGraphics.fillStyle(0x8b8b8b);
    wallGraphics.fillRect(0, 0, 32, 32);
    wallGraphics.lineStyle(2, 0x666666);
    wallGraphics.strokeRect(0, 0, 32, 32);
    wallGraphics.generateTexture('wall_tile', 32, 32);

    // Generate procedural character sprite sheet frames
    // We will draw a blue box with a line (eyes) to represent the player
    // Frame 0: idle down, Frame 1: walk down 1, Frame 2: walk down 2, etc. (Simple 1 frame per direction for this basic prototype)
    const charGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    charGraphics.fillStyle(0x1e3a8a); // Blue jacket (engineering student look!)
    charGraphics.fillRect(0, 0, 32, 32);
    charGraphics.fillStyle(0xffdcb1); // face
    charGraphics.fillRect(8, 4, 16, 12);
    charGraphics.fillStyle(0x000000); // eyes
    charGraphics.fillRect(10, 8, 4, 4);
    charGraphics.fillRect(18, 8, 4, 4);
    charGraphics.generateTexture('player_sprite', 32, 32);
    
    // Generate an interactive "mission" object
    const missionGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    missionGraphics.fillStyle(0xffd700); // gold
    missionGraphics.fillCircle(16, 16, 16);
    missionGraphics.fillStyle(0x000000); // exclamation point
    missionGraphics.fillRect(14, 6, 4, 12);
    missionGraphics.fillRect(14, 22, 4, 4);
    missionGraphics.generateTexture('mission_obj', 32, 32);
  }

  create() {
    this.scene.start('GameScene');
  }
}
