import Phaser from 'phaser';
import { v4 as uuidv4 } from 'uuid';
import CharacterImg from './assets/Character.gif';
import GunImg from './assets/gun.png';

class MyGame extends Phaser.Scene {
  constructor() {
    super('game');
    this.players = {};
  }

  preload() {
    this.load.image('character', CharacterImg);
    this.load.image('gun', GunImg);
  }

  create() {
    this.socket = new WebSocket('ws://localhost:8080');
    this.id = uuidv4();
    this.player = this.add.sprite(400, 300, 'character');
    this.gun = this.add.image(400, 300, 'gun');

    this.cursors = this.input.keyboard.createCursorKeys();

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'players') {
        this.players = data.players;
        this.updatePlayers();
      }
    };

    this.input.on('pointermove', (pointer) => {
      const angle = Phaser.Math.Angle.Between(this.gun.x, this.gun.y, pointer.worldX, pointer.worldY);
      this.gun.setRotation(angle);
    });

    this.input.on('pointerdown', () => {
      // Implement shooting logic here
    });

    this.socket.onopen = () => {
      this.socket.send(JSON.stringify({ type: 'register', id: this.id }));
    };
  }

  update() {
    if (this.cursors.left.isDown) {
      this.player.x -= 2;
      this.gun.x -= 2;
    } else if (this.cursors.right.isDown) {
      this.player.x += 2;
      this.gun.x += 2;
    }

    if (this.cursors.up.isDown) {
      this.player.y -= 2;
      this.gun.y -= 2;
    } else if (this.cursors.down.isDown) {
      this.player.y += 2;
      this.gun.y += 2;
    }

    this.socket.send(JSON.stringify({ type: 'move', id: this.id, position: { x: this.player.x, y: this.player.y } }));
  }

  updatePlayers() {
    Object.keys(this.players).forEach((id) => {
      if (id !== this.id) {
        const player = this.players[id];
        if (!player.sprite) {
          player.sprite = this.add.sprite(player.position.x, player.position.y, 'character');
          player.gun = this.add.image(player.position.x, player.position.y, 'gun');
        } else {
          player.sprite.x = player.position.x;
          player.sprite.y = player.position.y;
          player.gun.x = player.position.x;
          player.gun.y = player.position.y;
        }
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: MyGame
};

const game = new Phaser.Game(config);

export default game;
