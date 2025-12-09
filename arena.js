// arena.js
// Build a Rivals-style arena: floating platforms, ramps, cover, spawn pads
// Exports: createLobbyScene(container), createArenaScene(), SPAWN_POSITIONS

const Arena = (function(){
  const SPAWN_POSITIONS = [
    { x:-4, z:-2 },
    { x: 4, z:-2 },
    { x:-4, z: 2 },
    { x: 4, z: 2 }
  ];

  function createLobby(scene){
    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x081027, roughness: 0.95 }));
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    scene.add(floor);

    // decorative back wall
    const back = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 1), new THREE.MeshStandardMaterial({ color: 0x071324 }));
    back.position.set(0, 4, -18);
    scene.add(back);

    // spawn pads
    const padGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.2, 32);
    SPAWN_POSITIONS.forEach((p,i)=>{
      const mat = new THREE.MeshStandardMaterial({ color: 0x0fb7a8, emissive:0x063f36, emissiveIntensity: 0.08, roughness:0.6 });
      const pad = new THREE.Mesh(padGeo, mat);
      pad.rotation.x = -Math.PI/2;
      pad.position.set(p.x, 0.12, p.z);
      pad.userData.padIndex = i;
      scene.add(pad);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'label';
      labelDiv.innerText = `Pad ${i+1}`;
      labelDiv.style.padding = '6px 8px';
      labelDiv.style.borderRadius = '8px';
      labelDiv.style.background = 'rgba(2,6,23,0.6)';
      labelDiv.style.color = '#e6eef8';
      const label = new THREE.CSS2DObject(labelDiv);
      label.position.set(p.x, 0.8, p.z);
      scene.add(label);
    });

    // ambient decoration: floating platforms
    function addPlatform(x,z,y,w,d,h,color){
      const g = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.MeshStandardMaterial({ color: color || 0x0d1724, roughness:0.9 });
      const mesh = new THREE.Mesh(g,m);
      mesh.position.set(x, y, z);
      scene.add(mesh);
    }
    addPlatform(0, -6, 1.0, 18, 6, 0.6, 0x0f2130);
    addPlatform(-10, 4, 1.4, 6, 6, 0.6, 0x0f1f2b);
    addPlatform(10, 4, 1.4, 6, 6, 0.6, 0x0f1f2b);

    // lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 5);
    scene.add(dir);
  }

  function createArena(scene){
    // floor and boundaries
    const floor = new THREE.Mesh(new THREE.BoxGeometry(36, 1, 36), new THREE.MeshStandardMaterial({ color: 0x0b1220 }));
    floor.position.y = -0.5;
    scene.add(floor);

    // central high platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 10), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    platform.position.set(0, 2.5, 0);
    scene.add(platform);

    // side platforms
    const left = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 8), new THREE.MeshStandardMaterial({ color: 0x0f1724 }));
    left.position.set(-10, 1.8, 0);
    scene.add(left);

    const right = left.clone();
    right.position.set(10, 1.8, 0);
    scene.add(right);

    // ramps to center
    const rampL = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 4), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    rampL.position.set(-6, 1.1, 0);
    rampL.rotation.z = -0.35;
    scene.add(rampL);

    const rampR = rampL.clone();
    rampR.position.set(6, 1.1, 0);
    rampR.rotation.z = 0.35;
    scene.add(rampR);

    // barriers + cover
    const cover = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 0.6), new THREE.MeshStandardMaterial({ color: 0x0b1220 }));
    cover.position.set(0, 1.3, -5);
    scene.add(cover);

    // spawn pads (match server pads)
    const padGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.2, 32);
    const SPAWN_POSITIONS_ARENA = [
      { x:-8, z:-10 },
      { x: 8, z:-10 },
      { x:-8, z: 10 },
      { x: 8, z: 10 }
    ];
    SPAWN_POSITIONS_ARENA.forEach((p,i)=>{
      const mat = new THREE.MeshStandardMaterial({ color: 0x08b6a0, emissive:0x044f43, emissiveIntensity:0.06, roughness:0.6 });
      const pad = new THREE.Mesh(padGeo, mat);
      pad.rotation.x = -Math.PI/2;
      pad.position.set(p.x, 0.12, p.z);
      pad.userData.padIndex = i;
      scene.add(pad);
    });

    // lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(8, 18, 8);
    scene.add(dir);
  }

  return { SPAWN_POSITIONS, createLobbyScene: createLobby, createArenaScene: createArena };
})();
window.Arena = Arena;
