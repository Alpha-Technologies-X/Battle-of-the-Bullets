// main.js
// App glue: initialize scene, lobby, UI, and handle match start -> arena + fps

let scene, camera, renderer, labelRenderer;
let localPlayer = null;
let playersById = {};
let fpsController = null;
let lastTime = performance.now();

function initThree(){
  const container = document.getElementById('canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07111b, 0.03);

  camera = new THREE.PerspectiveCamera(70, container.clientWidth/container.clientHeight, 0.1, 1000);
  camera.position.set(0, 6, 16);

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  labelRenderer = new THREE.CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  container.appendChild(labelRenderer.domElement);

  window.addEventListener('resize', onResize);
}

function onResize(){
  const container = document.getElementById('canvas');
  camera.aspect = container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now;

  if (fpsController) fpsController.update(dt, 0);

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

function buildLobby(){
  clearScene();
  Arena.createLobbyScene(scene);
  // create some demo avatars or from network
}

function createOrUpdatePlayer(playerInfo){
  let p = playersById[playerInfo.id];
  if (!p){
    p = new Player(playerInfo.id, playerInfo.name, playerInfo.color, playerInfo.isLocal);
    playersById[playerInfo.id] = p;
    scene.add(p.group);
    // initial placement near center
    p.setPosition((Math.random()-0.5)*6, 0, 6 - Math.random()*3);
  } else {
    p.name = playerInfo.name;
    // update color if changed
    p.mesh.material.color = new THREE.Color(playerInfo.color || p.color);
  }
  return p;
}

function removePlayer(id){
  const p = playersById[id];
  if (!p) return;
  scene.remove(p.group);
  delete playersById[id];
}

function clearScene(){
  // dispose children except camera / renderers
  while(scene.children.length) scene.remove(scene.children[0]);
}

function startArenaMatch(match){
  // rebuild scene for arena
  clearScene();
  Arena.createArenaScene(scene);

  // create players and place them at assigned pads
  playersById = {};
  match.players.forEach(pInfo => {
    const isLocal = (pInfo.isLocal === true);
    const p = createOrUpdatePlayer({ id:pInfo.id, name:pInfo.name, color:pInfo.color, isLocal });
    // arena spawn positions
    const padPositions = [
      { x:-8, z:-10 },
      { x: 8, z:-10 },
      { x:-8, z: 10 },
      { x: 8, z: 10 }
    ];
    const pad = padPositions[pInfo.assignedPad % padPositions.length];
    p.setPosition(pad.x, 1.2, pad.z);
  });

  // create FPS controller for local player
  const local = match.players.find(p=>p.isLocal);
  if (local){
    fpsController = new FPSController(camera, document.body);
    // set initial pos to local player's pos
    const own = playersById[local.id];
    if (own) {
      fpsController.pos.copy(own.position);
      // hide the local mesh (optional, first-person)
      own.mesh.visible = false;
    }
  }

  // HUD update
  document.getElementById('queueState').innerText = 'In Match';
}

function handleLobbyUpdate(playerList){
  // reconstruct player entries & avatars
  const listEl = document.getElementById('playersList');
  listEl.innerHTML = '';
  // ensure local player is marked
  playerList.forEach(p => {
    createOrUpdatePlayer({ id:p.id, name:p.name, color:p.color, isLocal: (p.isLocal||false) });
  });
  // remove any extra avatars
  Object.keys(playersById).forEach(id => {
    if (!playerList.find(pp => pp.id === id)) removePlayer(id);
  });

  playerList.forEach(p => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `<div class="avatar-mini" style="background:${p.color}"></div>
      <div class="player-info"><div class="player-name">${p.name}${p.isLocal? ' (you)':''}</div>
      <div class="player-meta">${p.inQueue? 'In Queue' : 'Waiting'}</div></div>`;
    listEl.appendChild(row);
  });

  document.getElementById('lobbyStatus').innerText = `${playerList.length} players in lobby`;
}

/////////////////////////////////////////////
// Wire UI + network
/////////////////////////////////////////////

function wireUI(){
  const btnJoin = document.getElementById('btnJoin');
  const btnLeave = document.getElementById('btnLeave');
  const btnQueue = document.getElementById('btnQueue');
  const btnAddFake = document.getElementById('btnAddFake');
  const modeSelect = document.getElementById('modeSelect');
  const displayNameEl = document.getElementById('displayName');

  btnJoin.onclick = ()=> {
    const name = (displayNameEl.value || 'Player').trim();
    if (!name) return alert('Enter a name');
    net.joinLobby(name);
  };

  btnLeave.onclick = ()=> net.leaveLobby();

  btnQueue.onclick = ()=> {
    const mode = modeSelect.value;
    document.getElementById('currentMode').innerText = 'Mode: ' + mode;
    net.joinQueue(mode);
    document.getElementById('queueState').innerText = 'Queue: joined';
  };

  btnAddFake.onclick = ()=> {
    net.addFake('Bot_' + Math.floor(Math.random()*900+100));
  };

  document.getElementById('btnDebug').onclick = ()=> {
    console.log('playersById', playersById);
  };
}

//////////////////////////////////////////////
// net event handlers
//////////////////////////////////////////////

net.on('simulated', ()=> {
  document.getElementById('lobbyStatus').innerText = 'Simulated mode (no backend)';
});

net.on('joined', (info) => {
  // create local player sentinel in UI list
  // server will send lobby update afterwards
});

net.on('lobby_update', (players) => {
  // annotate local flag if simulated
  players.forEach(p=> { if (p.id === 'you_local') p.isLocal = true; });
  handleLobbyUpdate(players);
  // sync avatars in scene
  players.forEach(p => {
    createOrUpdatePlayer({ id:p.id, name:p.name, color:p.color, isLocal: p.isLocal });
  });
});

net.on('match_found', (msg) => {
  // msg.players: id,name,color,assignedPad
  // mark which is local by checking displayName or server flag
  // For simulated mode the network may not provide isLocal; match by id
  const localId = (net.isSimulated && 'you_local') || null;
  const enriched = msg.players.map(pl => {
    return { id:pl.id, name:pl.name, color:pl.color, assignedPad:pl.assignedPad, isLocal: (pl.id === localId) || false };
  });
  startArenaMatch({ roomId: msg.roomId, players: enriched });
});

net.on('match_start', (msg) => {
  // optional extra start event - not required
});

//////////////////////////////////////////////
// initialization
//////////////////////////////////////////////

initThree();
buildLobby();
wireUI();
net.connect();
    
