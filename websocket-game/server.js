const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = {};
let connections = new Set();
let bullets = [];

wss.on('connection', (ws) => {
  const id = uuidv4();
  players[id] = { id, name: '', position: { x: 0, y: 0 } };
  connections.add(ws);

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'register') {
      players[id].name = data.name;
    } else if (data.type === 'move') {
      players[id].position = data.position;
    } else if (data.type === 'bullet') {
      const bullet = {
        ...data.bullet,
        id: uuidv4(), // Ensure each bullet has a unique ID
      };
      bullets.push(bullet);

      // Broadcast the bullet to all clients
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'bullet', bullet }));
        }
      });
    }

    // Send updated players data to all clients
    const playerData = Object.values(players).map(player => ({ id: player.id, name: player.name, position: player.position }));
    connections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'players', players: playerData }));
      }
    });
  });

  ws.on('close', () => {
    delete players[id];
    connections.delete(ws);

    // Send updated players data to all clients
    const playerData = Object.values(players).map(player => ({ id: player.id, name: player.name, position: player.position }));
    connections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'players', players: playerData }));
      }
    });
  });
});

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});
