// network.js
// WebSocket client for lobby & matchmaking
// Exposes: net.connect(), net.joinLobby(name), net.joinQueue(mode), net.leaveQueue(), net.addFake()

const net = (function(){
  let ws = null;
  let playerId = null;
  let callbacks = {};
  let isSimulated = false;

  // try to auto-connect when served from http(s), otherwise use simulated mode
  function connect(){
    if (location.protocol === 'http:' || location.protocol === 'https:'){
      const scheme = (location.protocol === 'https:') ? 'wss:' : 'ws:';
      const url = scheme + '//' + location.host;
      try {
        ws = new WebSocket(url);
        ws.onopen = ()=> { trigger('open'); };
        ws.onmessage = (ev)=> {
          let msg = null;
          try{ msg = JSON.parse(ev.data); } catch(e){ console.warn('invalid msg', e); return; }
          handleMessage(msg);
        };
        ws.onclose = ()=> trigger('close');
        ws.onerror = (e)=> { console.error('ws error', e); trigger('error', e); };
      } catch(err){
        console.warn('ws connect failed, switching to simulated mode', err);
        isSimulated = true;
        trigger('simulated');
      }
    } else {
      // file:// -> simulate
      isSimulated = true;
      trigger('simulated');
    }
  }

  function on(event, cb){ callbacks[event] = cb; }
  function trigger(event, data){ if (callbacks[event]) callbacks[event](data); }

  function send(obj){
    if (isSimulated) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(obj));
  }

  function handleMessage(msg){
    if (!msg || !msg.type) return;
    if (msg.type === 'joined'){
      playerId = msg.id;
      trigger('joined', msg);
    } else if (msg.type === 'lobby_update'){
      trigger('lobby_update', msg.players || []);
    } else if (msg.type === 'match_found'){
      trigger('match_found', msg);
    } else if (msg.type === 'match_start'){
      trigger('match_start', msg);
    } else if (msg.type === 'game_state'){
      trigger('game_state', msg);
    } else {
      trigger('message', msg);
    }
  }

  // Simulated helpers (if backend not available)
  const sim = {
    players: [],
    addBot(name){
      const id = 'bot_' + Math.random().toString(36).slice(2,8);
      sim.players.push({ id, name, color: pickColor(name), inQueue:false });
      trigger('lobby_update', sim.players);
    },
    joinSimulated(name){
      playerId = 'you_local';
      sim.players.unshift({ id: playerId, name, color: pickColor(name), inQueue:false });
      trigger('joined', { id: playerId, name, color: pickColor(name) });
      trigger('lobby_update', sim.players);
    },
    joinQueue(mode){
      // mark local in queue and attempt match
      const needed = (mode === '1v1') ? 2 : 4;
      sim.players.forEach(p => { if (p.id === playerId) p.inQueue = true; });
      const ready = sim.players.filter(p=>p.inQueue);
      if (ready.length >= needed){
        const players = ready.slice(0,needed);
        const assignments = {};
        if (mode === '1v1'){ assignments[players[0].id] = 0; assignments[players[1].id] = 1; }
        else { players.forEach((p,i)=> assignments[p.id] = i); }
        setTimeout(()=> {
          trigger('match_found', { roomId: 'sim-'+Date.now(), mode, players: players.map(p=>({ id:p.id, name:p.name, color:p.color, assignedPad: assignments[p.id] })) });
        }, 700);
      } else {
        trigger('waiting', { needed: needed - ready.length });
      }
    }
  };

  function pickColor(seed){
    const colors = ["#06b6d4","#f472b6","#60a5fa","#34d399","#fbbf24","#fb7185","#a78bfa","#f97316"];
    if (!seed) return colors[Math.floor(Math.random()*colors.length)];
    let h=0; for(let i=0;i<seed.length;i++){ h = ((h<<5)-h)+seed.charCodeAt(i); h |= 0; }
    return colors[Math.abs(h) % colors.length];
  }

  // public API
  return {
    connect,
    on,
    send,
    joinLobby(name){
      if (isSimulated) { sim.joinSimulated(name); return; }
      send({ type:'join_lobby', name });
    },
    leaveLobby(){ if (isSimulated) { /* noop */ } else send({ type:'leave_lobby' }); },
    joinQueue(mode){ if (isSimulated) { sim.joinQueue(mode); return; } send({ type:'join_queue', mode }); },
    leaveQueue(){ if (isSimulated) { /*noop*/ } else send({ type:'leave_queue' }); },
    addFake(name){ if (isSimulated) sim.addBot(name); else alert('In server mode: open another window to simulate'); },
    isSimulated: ()=> isSimulated
  };
})();

window.net = net;
