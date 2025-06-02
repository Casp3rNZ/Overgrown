import { WebSocketServer } from "ws";
import { simulatePlayerMovement, PlayerState, PlayerInput } from "../shared/movement.js";
console.log("Overgrown - WSS listening on ws://localhost:8080");

const wss = new WebSocketServer({ 
    port: 8080 
});
var players: Record<string, PlayerState> = {};
var inputs: Record<string, PlayerInput> = {};

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

wss.on("connection", (ws) => {
    console.log("New player connected");
    const id = generateId();

    // broadcast to all clients that a new player has joined
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
                client.send(JSON.stringify({ 
                type: "chat", 
                playerId: "SERVER",
                message: `${id} has joined the game.`
            }));
        }
    });

    // Initialize player state
    players[id] = {
        position: { x: 0, y: 1.8, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        moveDirection: { x: 0, y: 0, z: 0 },
        wishDirection: { x: 0, y: 0, z: 0 },
        isGrounded: false,
        lastJumpTime: 0,
        jumpQueued: false,
        friction: 0,
        strafeAngle: 0,
        consecutiveJumps: 0,
        rotationY: 0
    };

    // Initialize player input
    inputs[id] = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        rotationY: 0
    };

    ws.on("message", (msg) => {
        try {
            let data = JSON.parse(msg.toString());
            if (data.type === "input") {
                const out = JSON.parse(data.input);
                //console.log(data.input)
                inputs[id] = out.input;
            }
            if (data.type === "chat") {
                console.log(`Chat from ${id}: ${data.message}`);
                // Broadcast chat message to all clients
                wss.clients.forEach(client => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({ 
                            type: "chat", 
                            playerId: data.playerId,
                            message: data.message
                        }));
                    }
                });
            }
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    });

    ws.on("close", () => {
        delete players[id];
        delete inputs[id];
        console.log(`Player ${id} disconnected`);

        // Broadcast to all clients that a player has left
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ 
                    type: "chat", 
                    playerId: "SERVER",
                    message: `${id} has left the game.`
                }));
            }
        });
    });

    // Send the player's ID
    ws.send(JSON.stringify({ type: "init", id }));
});

// Game loop
function startTPSLoop(TPS: number) {
    const tickDelay = 1000 / TPS;
    let lastTick = Date.now();

    function tick() {
        const now = Date.now();
        const dt = (now - lastTick) / 1000; // seconds since last tick
        lastTick = now;

        // Simulate all players
        for (const id in players) {
            simulatePlayerMovement(players[id], inputs[id], dt);
        }

        // Broadcast state
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                //console.log(players)
                
                client.send(JSON.stringify({ 
                    type: "state", 
                    players: players }));
            }
        });

        // Calculate drift and schedule next tick
        const drift = Date.now() - now;
        setTimeout(tick, Math.max(0, tickDelay - drift));
    }

    setTimeout(tick, tickDelay);
}

startTPSLoop(20);