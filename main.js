// Connect to backend WebSocket
const ws = new WebSocket(
    (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

ws.onopen = () => console.log("Connected to backend");
ws.onmessage = (msg) => handleServer(JSON.parse(msg.data));

document.getElementById("match1v1").onclick = () =>
    ws.send(JSON.stringify({ action: "queue_1v1" }));

document.getElementById("matchTeams").onclick = () =>
    ws.send(JSON.stringify({ action: "queue_team" }));

function handleServer(data) {
    if (data.type === "match_start") {
        alert("Match found! Room: " + data.room);
        loadArena();
    }
}

/* ------------------------------
   3D LOBBY
---------------------------------*/

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let lobbyFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({color: 0x202020})
);
lobbyFloor.rotation.x = -Math.PI/2;
scene.add(lobbyFloor);

let light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(4,10,4);
scene.add(light);

camera.position.set(0, 2, 6);

// animate lobby
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Load arena when match found
function loadArena() {
    scene = new THREE.Scene();
    camera.position.set(0, 2, 8);

    let floor = new THREE.Mesh(
        new THREE.BoxGeometry(20, 1, 20),
        new THREE.MeshStandardMaterial({color: 0x303030})
    );
    scene.add(floor);

    scene.add(light);
}
