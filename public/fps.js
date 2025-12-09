// fps.js
// First-person controller + simple shooting visuals.
// Exposes Player object to be created for local player and remote players.

class Player {
  constructor(id, name, color, isLocal=false){
    this.id = id;
    this.name = name;
    this.color = color || '#06b6d4';
    this.isLocal = isLocal;
    this.group = new THREE.Group();

    // visual body (capsule-like)
    const bodyGeo = new THREE.CapsuleGeometry(0.6, 1.0, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.color), roughness:0.6, metalness:0.05 });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.position.y = 1.0;
    this.group.add(this.mesh);

    // label
    const div = document.createElement('div');
    div.className = 'label';
    div.innerText = this.name;
    div.style.padding = '4px 8px'; div.style.borderRadius = '8px';
    div.style.background = 'rgba(2,6,23,0.7)'; div.style.color = '#e6eef8'; div.style.fontWeight = '700';
    const label = new THREE.CSS2DObject(div);
    label.position.set(0, 2.2, 0);
    this.group.add(label);

    // position and physics state
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.health = 100;

    // add to scene externally
  }

  setPosition(x,y,z){
    this.position.set(x,y,z);
    this.group.position.copy(this.position);
  }

  rotate(yaw, pitch){
    this.yaw = yaw;
    this.pitch = pitch;
    this.group.rotation.y = this.yaw;
  }
}

// FPS controller for local player
class FPSController {
  constructor(camera, domElement){
    this.camera = camera;
    this.domElement = domElement || document.body;
    this.enabled = false;
    this.moveSpeed = 6;
    this.sprintMultiplier = 1.5;
    this.jumpSpeed = 6.5;
    this.gravity = -18;
    this.grounded = false;

    this.pos = new THREE.Vector3(0,1.2,6);
    this.vel = new THREE.Vector3();
    this.pitch = 0; this.yaw = 0;

    this.keys = { forward:false, back:false, left:false, right:false, sprint:false, jump:false };
    this._bind();
  }

  _bind(){
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyW') this.keys.forward = true;
      if (e.code === 'KeyS') this.keys.back = true;
      if (e.code === 'KeyA') this.keys.left = true;
      if (e.code === 'KeyD') this.keys.right = true;
      if (e.code === 'ShiftLeft') this.keys.sprint = true;
      if (e.code === 'Space') this.keys.jump = true;
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'KeyW') this.keys.forward = false;
      if (e.code === 'KeyS') this.keys.back = false;
      if (e.code === 'KeyA') this.keys.left = false;
      if (e.code === 'KeyD') this.keys.right = false;
      if (e.code === 'ShiftLeft') this.keys.sprint = false;
      if (e.code === 'Space') this.keys.jump = false;
    });

    // pointer lock
    this.domElement.addEventListener('click', ()=> {
      if (document.pointerLockElement !== this.domElement) this.domElement.requestPointerLock?.();
    });

    document.addEventListener('pointerlockchange', () => {
      this.enabled = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', e => {
      if (!this.enabled) return;
      const sensitivity = 0.002;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      this.pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, this.pitch));
    });
  }

  update(dt, sceneFloorY=0){
    // movement
    let dir = new THREE.Vector3();
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    if (this.keys.forward) dir.add(forward);
    if (this.keys.back) dir.add(forward.clone().negate());
    if (this.keys.left) dir.add(right.clone().negate());
    if (this.keys.right) dir.add(right);
    if (dir.lengthSq() > 0) dir.normalize();

    let speed = this.moveSpeed * (this.keys.sprint ? this.sprintMultiplier : 1);
    this.vel.x = dir.x * speed;
    this.vel.z = dir.z * speed;

    // gravity & jump
    this.vel.y += this.gravity * dt;
    if (this.keys.jump && this.grounded){
      this.vel.y = this.jumpSpeed;
      this.grounded = false;
    }

    // integrate
    this.pos.addScaledVector(this.vel, dt);

    // simple floor collision
    if (this.pos.y <= sceneFloorY + 1.2){
      this.pos.y = sceneFloorY + 1.2;
      this.vel.y = 0;
      this.grounded = true;
    }

    // update camera
    this.camera.position.copy(this.pos);
    // set camera orientation
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}

window.Player = Player;
window.FPSController = FPSController;
