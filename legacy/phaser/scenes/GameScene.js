import Phaser from 'phaser';
import Player from '../entities/Player.js';
import MissionManager from '../systems/MissionManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // 1. Create a vastly scaled world (e.g., 3200x3200 pixels)
    const mapWidth = 3200;
    const mapHeight = 3200;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // Create background using our generated grass tile
    this.add.tileSprite(0, 0, mapWidth, mapHeight, 'grass_tile').setOrigin(0, 0);

    // 2. Add some "Buildings" (walls) around the vast college campus
    this.walls = this.physics.add.staticGroup();
    this.createBuilding(200, 200, 400, 300, "Engineering Library");
    this.createBuilding(800, 150, 300, 250, "Robotics Lab");
    this.createBuilding(500, 800, 500, 200, "Student Union");
    this.createBuilding(1200, 800, 400, 400, "Thermodynamics Building");

    // 3. Add Player Entity in the center
    this.player = new Player(this, 600, 600);

    // 4. Setup Camera to follow player
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
    this.cameras.main.setZoom(1.5); // Closer perspective for immersion

    // Collision between player and buildings
    this.physics.add.collider(this.player, this.walls);

    // 5. Initialize Mission Manager
    this.missionManager = new MissionManager(this);

    // Add interactive mission points around the campus
    this.createMissionPoint(250, 520, 'EE_Mission', 'Fix the Logic Gate Control Board');
    this.createMissionPoint(1100, 300, 'Mech_Mission', 'Calculate the Truss Tension');

    // Simple UI text overlay for instructions
    this.uiText = this.add.text(10, 10, 'Explore the campus using WASD/Arrows\nFind yellow mission markers!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 10 }
    });
    this.uiText.setScrollFactor(0); // Fix to screen
  }

  createBuilding(x, y, w, h, name) {
    const ww = Math.floor(w / 32) * 32;
    const hh = Math.floor(h / 32) * 32;
    const bldg = this.add.tileSprite(x + ww/2, y + hh/2, ww, hh, 'wall_tile');
    this.physics.add.existing(bldg, true);
    this.walls.add(bldg);

    // Label for the building
    this.add.text(x + 10, y + 10, name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000aa',
        padding: { x: 5, y: 5 }
    });
  }

  createMissionPoint(x, y, id, description) {
    const point = this.physics.add.image(x, y, 'mission_obj');
    point.setImmovable(true);

    // Bounce animation
    this.tweens.add({
      targets: point,
      y: y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Overlap triggers mission prompt
    this.physics.add.overlap(this.player, point, () => {
      this.missionManager.triggerMission(id, description);
      point.destroy(); // Remove marker once triggered
    });
  }

  update() {
    if (this.player) {
      this.player.update();
    }
  }
}

