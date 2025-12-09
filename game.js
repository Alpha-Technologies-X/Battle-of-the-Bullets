// server/game.js
// Simple room manager and authoritative stub (for future server-side sync)

const { v4: uuidv4 } = require('uuid');

class GameServer {
  constructor(){
    this.rooms = new Map(); // roomId -> room object
  }

  createRoom(mode, players){
    const id = uuidv4();
    const room = {
      id,
      mode,
      players: players.map(p => ({ id:p.id, name:p.name, color:p.color, ws: p.ws })),
      createdAt: Date.now(),
      started: false
    };
    this.rooms.set(id, room);
    return room;
  }

  startRoom(roomId){
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.started = true;
    // send optional match_start event to players
    const payload = JSON.stringify({ type:'match_start', roomId: room.id, tick: Date.now() });
    room.players.forEach(p => {
      try { if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(payload); } catch(e){}
    });

    // Basic room tick: could broadcast minimal game_state every second (not implemented heavy)
    room.interval = setInterval(()=> this.broadcastGameState(roomId), 1000);
  }

  broadcastGameState(roomId){
    const room = this.rooms.get(roomId);
    if (!room) return;
    // placeholder: in a real game we'd include positions, health, etc.
    const state = { type:'game_state', roomId, time: Date.now() };
    room.players.forEach(p => {
      try { if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(JSON.stringify(state)); } catch(e){}
    });
  }

  handleClientMessage(ws, msg){
    // authoritatively handle in-room messages in the future
    // currently a stub
  }

  endRoom(roomId){
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.interval) clearInterval(room.interval);
    this.rooms.delete(roomId);
  }
}

module.exports = new GameServer();
