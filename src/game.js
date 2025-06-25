const WebSocket = require('ws');
const http = require('http');

const TICK_RATE = 20; // 20 ticks per second
const TICK_INTERVAL = 1000 / TICK_RATE;
const INPUT_BUFFER_SIZE = 10;

let players = {};
let lastTickTime = Date.now();

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (socket) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    console.log(`Player connected: ${playerId}`);

    players[playerId] = {
        id: playerId,
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        inputs: [], // { seq, keys }
        lastProcessedSeq: -1,
        ping: 0
    };

    socket.playerId = playerId;

    // Send initial player data
    socket.send(JSON.stringify({
        type: 'init',
        id: playerId,
        players: Object.values(players)
    }));

    // Broadcast full state every tick
    setInterval(() => {
        tick();
        broadcastGameState();
    }, TICK_INTERVAL);

    // Handle incoming messages
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'input') {
                const p = players[playerId];
                p.inputs.push(data.input);
                if (p.inputs.length > INPUT_BUFFER_SIZE) p.inputs.shift();
            }

            if (data.type === 'ping') {
                socket.send(JSON.stringify({
                    type: 'pong',
                    timestamp: data.timestamp
                }));
            }
        } catch (e) {
            console.error("Error parsing message", e);
        }
    });

    socket.on('close', () => {
        delete players[playerId];
        console.log(`Player disconnected: ${playerId}`);
    });
});

function tick() {
    const now = Date.now();
    const dt = TICK_INTERVAL / 1000;

    Object.values(players).forEach(p => {
        let ax = 0;
        let ay = 800; // gravity

        // Apply latest valid input
        const latestInput = p.inputs.find(i => i.seq > p.lastProcessedSeq);
        if (latestInput) {
            if (latestInput.keys.left) ax = -400;
            if (latestInput.keys.right) ax = 400;
            if (latestInput.keys.jump && p.y >= 400) p.vy = -500;
            p.lastProcessedSeq = latestInput.seq;
        }

        p.vx += ax * dt;
        p.vx *= 0.8;

        if (Math.abs(p.vx) > 300) p.vx = Math.sign(p.vx) * 300;

        p.vy += ay * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Ground collision
        if (p.y > 400) {
            p.y = 400;
            p.vy = 0;
        }
    });
}

function broadcastGameState() {
    const snapshot = {};
    Object.values(players).forEach(p => {
        snapshot[p.id] = {
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            seq: p.lastProcessedSeq
        };
    });

    broadcast(JSON.stringify({
        type: 'state',
        time: Date.now(),
        snapshot
    }));
}

function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

server.listen(8080, () => {
    console.log(`Server running on ws://localhost:8080`);
});