// server/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const matchmaker = require('./matchmaker');
const game = require('./game');

const app = express();
const server = http.createServer(app);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  // register client
  matchmaker.registerClient(ws);

  ws.on('message', (message) => {
    let msg = null;
    try { msg = JSON.parse(message.toString()); } catch(e){ return; }

    if (msg.type === 'join_lobby') {
      matchmaker.onJoinLobby(ws, msg);
    } else if (msg.type === 'leave_lobby') {
      matchmaker.onLeaveLobby(ws, msg);
    } else if (msg.type === 'join_queue') {
      matchmaker.onJoinQueue(ws, msg);
    } else if (msg.type === 'leave_queue') {
      matchmaker.onLeaveQueue(ws, msg);
    } else {
      // pass to game if needed
      game.handleClientMessage(ws, msg);
    }
  });

  ws.on('close', () => {
    matchmaker.onDisconnect(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
