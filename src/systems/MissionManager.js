import Phaser from 'phaser';

export default class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.activeMission = null;
    this.createUI();
  }

  createUI() {
    // Mission Dialog container
    this.dialogBg = this.scene.add.graphics();
    this.dialogBg.fillStyle(0x000000, 0.8);
    this.dialogBg.fillRoundedRect(0, 0, 600, 250, 16);
    this.dialogBg.lineStyle(4, 0x4a90e2, 1);
    this.dialogBg.strokeRoundedRect(0, 0, 600, 250, 16);
    
    // Fix to camera center
    this.dialogContainer = this.scene.add.container(
      this.scene.cameras.main.width / 2 - 300,
      this.scene.cameras.main.height / 2 - 125,
      [this.dialogBg]
    );
    this.dialogContainer.setScrollFactor(0); // Fix UI to screen
    this.dialogContainer.setDepth(100);
    this.dialogContainer.setVisible(false);

    // Content Text
    this.titleText = this.scene.add.text(30, 20, '', {
      fontFamily: 'Arial', fontSize: '24px', color: '#ffcc00', fontStyle: 'bold'
    });
    this.descText = this.scene.add.text(30, 60, '', {
      fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', wordWrap: { width: 540 }
    });
    this.promptText = this.scene.add.text(30, 200, 'Press [SPACE] to Accept/Close', {
      fontFamily: 'Arial', fontSize: '14px', color: '#aaaaaa'
    });

    this.dialogContainer.add([this.titleText, this.descText, this.promptText]);

    // Input to close dialog
    this.scene.input.keyboard.on('keydown-SPACE', () => {
      if (this.dialogContainer.visible) {
        this.closeDialog();
      }
    });
  }

  triggerMission(id, description) {
    this.activeMission = id;
    
    // Map mission IDs to educational content
    const educationalContent = {
        'EE_Mission': "Electrical Engineering Concept: Logic Gates\n\nThe power board is shorting! To fix it, you need to use an AND gate. Only if both Input A and Input B are HIGH, will the circuit be complete.\n\nTask: Find the missing gate from the lab repository.",
        'Mech_Mission': "Mechanical Engineering Concept: Statics\n\nThe footbridge is unstable. According to the method of joints, the sum of forces at each node must be zero.\n\nTask: Calculate the correct tension for the lower chord member to prevent collapse."
    };

    let fullDesc = description + "\n\n" + (educationalContent[id] || "Complete the task to proceed.");

    this.titleText.setText('NEW MISSION: ' + id.replace('_', ' '));
    this.descText.setText(fullDesc);
    this.dialogContainer.setVisible(true);

    // Pause player while reading
    if(this.scene.player) {
      this.scene.player.setVelocity(0, 0);
      this.scene.player.scene.input.keyboard.enabled = false;
      // Allow SPACE to still work
      this.scene.input.keyboard.enabled = true; 
    }
  }

  closeDialog() {
    this.dialogContainer.setVisible(false);
  }
}
