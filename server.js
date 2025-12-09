const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const matchmaker = require("./matchmaker");

const app = express();
const server = http.createServer(app);

app.use(express.static(".")); // serve index.html + main.js

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    matchmaker.addClient(ws);

    ws.on("message", msg => {
        let data;
        try { data = JSON.parse(msg); }
        catch { return; }

        matchmaker.handle(ws, data);
    });

    ws.on("close", () => matchmaker.removeClient(ws));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Server running on port", PORT));
