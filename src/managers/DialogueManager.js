export default class DialogueManager {
  constructor(scene) {
    this.scene = scene;
    this.queue = [];
    this.isDisplaying = false;
    this.dialogueData = null;

    this.style = {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 },
      wordWrap: { width: 600 }
    };

    this.dialogueData = this.scene.cache.json.get('dialogue');

    // UI Container fixed to camera
    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.bg = this.scene.add.rectangle(400, 550, 640, 60, 0x000000, 0.8).setOrigin(0.5);
    this.textObj = this.scene.add.text(400, 550, "", this.style).setOrigin(0.5);

    this.container.add([this.bg, this.textObj]);
    this.container.setVisible(false);
  }

  trigger(category, key = null) {
    let text = "";
    if (key) {
      if (this.dialogueData && this.dialogueData[category] && this.dialogueData[category][key]) {
         const lines = this.dialogueData[category][key];
         if (Array.isArray(lines)) {
           lines.forEach(line => this.queue.push(line));
         } else {
           this.queue.push(lines);
         }
      }
    } else {
      if (this.dialogueData && this.dialogueData.system && this.dialogueData.system[category]) {
        const lines = this.dialogueData.system[category];
        text = lines[Math.floor(Math.random() * lines.length)];
        this.queue.push(text);
      }
    }

    if (!this.isDisplaying) this.processQueue();
  }

  processQueue() {
    if (this.queue.length === 0) {
      this.container.setVisible(false);
      this.isDisplaying = false;
      return;
    }

    this.isDisplaying = true;
    this.container.setVisible(true);
    const nextLine = this.queue.shift();
    this.textObj.setText(`> P.I.P: ${nextLine}`);

    // Play sound if synth exists
    if(this.scene.synth) this.scene.synth.playBleep();

    const duration = Math.max(2000, Math.min(nextLine.length * 50, 5000));
    this.scene.time.delayedCall(duration, () => this.processQueue());
  }
}
