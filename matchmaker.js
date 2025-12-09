let clients = new Set();

let queue1v1 = [];
let queueTeam = [];

function addClient(ws) {
    clients.add(ws);
}

function removeClient(ws) {
    clients.delete(ws);
    queue1v1 = queue1v1.filter(c => c !== ws);
    queueTeam = queueTeam.filter(c => c !== ws);
}

function handle(ws, data) {
    if (data.action === "queue_1v1") {
        queue1v1.push(ws);
        if (queue1v1.length >= 2) {
            let p1 = queue1v1.shift();
            let p2 = queue1v1.shift();
            startMatch([p1, p2]);
        }
    }

    if (data.action === "queue_team") {
        queueTeam.push(ws);
        if (queueTeam.length >= 4) {
            let players = queueTeam.splice(0, 4);
            startMatch(players);
        }
    }
}

function startMatch(players) {
    let room = Math.random().toString(36).substring(2, 10);

    players.forEach(ws => {
        ws.send(JSON.stringify({
            type: "match_start",
            room
        }));
    });
}

module.exports = { addClient, removeClient, handle };
