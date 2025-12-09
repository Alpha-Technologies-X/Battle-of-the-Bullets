// server/matchmaker.js
// Responsible for lobby player registry and queue matching (1v1 & 2v2)

const { v4: uuidv4 } = require('uuid');
const game = require('./game');

class Matchmaker {
  constructor(){
    this.clients = new Map(); // ws -> playerObj
    this.queue1v1 = [];
    this.queue2v2 = [];
  }

  registerClient(ws){
    // create a lightweight player record on connect (updated when join_lobby)
    this.clients.set(ws, { id: null, name: null, color: null, ws, inQueue:false });
  }

  onJoinLobby(ws, msg){
    const id = uuidv4();
    const name = msg.name || ('Player_' + id.slice(0,6));
    const color = msg.color || this.randomColorFromName(name);
    const player = { id, name, color, ws, inQueue:false };
    this.clients.set(ws, player);
    // ack to client
    ws.send(JSON.stringify({ type:'joined', id, name, color }));
    this.broadcastLobby();
  }

  onLeaveLobby(ws){
    this.removeFromQueues(ws);
    this.clients.delete(ws);
    this.broadcastLobby();
  }

  onDisconnect(ws){
    this.removeFromQueues(ws);
    this.clients.delete(ws);
    this.broadcastLobby();
  }

  onJoinQueue(ws, msg){
    const player = this.clients.get(ws);
    if (!player) return;
    const mode = msg.mode || '1v1';
    player.inQueue = true;
    if (mode === '1v1'){
      if (!this.queue1v1.includes(ws)) this.queue1v1.push(ws);
    } else {
      if (!this.queue2v2.includes(ws)) this.queue2v2.push(ws);
    }
    this.tryMatch();
    this.broadcastLobby();
  }

  onLeaveQueue(ws){
    const player = this.clients.get(ws);
    if (!player) return;
    player.inQueue = false;
    this.removeFromQueues(ws);
    this.broadcastLobby();
  }

  removeFromQueues(ws){
    this.queue1v1 = this.queue1v1.filter(x => x !== ws);
    this.queue2v2 = this.queue2v2.filter(x => x !== ws);
  }

  broadcastLobby(){
    const list = Array.from(this.clients.values()).filter(p => p && p.id).map(p => ({
      id: p.id, name: p.name, color: p.color, inQueue: !!p.inQueue
    }));
    const msg = JSON.stringify({ type: 'lobby_update', players: list });
    this.clients.forEach((p, ws) => {
      try { if (ws.readyState === ws.OPEN) ws.send(msg); } catch(e){}
    });
  }

  tryMatch(){
    // attempt 1v1 matches first
    while (this.queue1v1.length >= 2){
      const a = this.queue1v1.shift();
      const b = this.queue1v1.shift();
      this.createMatch([a,b], '1v1');
    }

    // attempt 2v2 matches
    while (this.queue2v2.length >= 4){
      const players = this.queue2v2.splice(0,4);
      this.createMatch(players, '2v2');
    }
  }

  createMatch(wsArray, mode){
    const players = wsArray.map(ws => this.clients.get(ws)).filter(Boolean);
    players.forEach(p => { p.inQueue = false; });
    const room = game.createRoom(mode, players);

    // assign pads
    const assignments = {};
    if (mode === '1v1'){
      assignments[players[0].id] = 0;
      assignments[players[1].id] = 1;
    } else {
      players.forEach((p,i) => assignments[p.id] = i % 4);
    }

    // notify players with match_found payload
    const payload = {
      type: 'match_found',
      roomId: room.id,
      mode,
      players: players.map(p => ({ id:p.id, name:p.name, color:p.color, assignedPad: assignments[p.id] }))
    };

    wsArray.forEach(ws => {
      try { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload)); } catch(e){}
    });

    // start authoritative game (optionally)
    game.startRoom(room.id);
    this.broadcastLobby();
  }

  randomColorFromName(name){
    const colors = ["#06b6d4","#f472b6","#60a5fa","#34d399","#fbbf24","#fb7185","#a78bfa","#f97316"];
    let h=0; for(let i=0;i<name.length;i++){ h=(h<<5)-h + name.charCodeAt(i); h |= 0; }
    return colors[Math.abs(h) % colors.length];
  }
}

module.exports = new Matchmaker();
