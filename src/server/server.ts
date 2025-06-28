import { WebSocketServer } from "ws";
import { simulatePlayerMovement, PlayerState, PlayerInput } from "../shared/movement.js";
import { handleCollisions } from "../shared/collision.js";
import { Vector3, Ray } from "@babylonjs/core";
import { EQUIPPABLES } from "../shared/EQUIPPABLES_DEFINITION.js";
console.log("Overgrown - WSS listening on ws://localhost:8080");

// Currently all connected players state is stored in memory, and updated every call from the client.

// All movement and collision logic is handled with vector math and raycasting. (not really using a physics engine).
// The movement system has a custom physics simulation that aims to replicate Quake / CS:GO style movement.
// All other props will be handled with Cannon.js or a similar physics engine (to be implemented).
// Colyseus or similar will be used for authoritative server state and player management (to be implemented).

const wss = new WebSocketServer({ 
    port: 8080 
});
var players: Record<string, PlayerState> = {};

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

wss.on("connection", (ws) => {
    console.log("New player connected");
    const id = generateId();

    // broadcast to all clients that a new player has joined
    wss.clients.forEach(client => {
        if (client.readyState == 1) {
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
        input: {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            rotationY: 0,
            equippedItemID: 0
        },
        health: 100
    };

    ws.on("message", (msg) => {
        try {
            let data = JSON.parse(msg.toString());
            if (data.type == "input") {
                players[id].input = data.input;
            }
            if (data.type == "chat") {
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
            if (data.type == "shoot") {
                handlePlayerHitDetection(id, data);
            }
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    });

    ws.on("close", () => {
        delete players[id];
        console.log(`Player ${id} disconnected`);
        // Broadcast to all clients that a player has left
        wss.clients.forEach(client => {
            if (client.readyState == 1) {
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
            // Simulate movement
            simulatePlayerMovement(players[id], dt);
            
            // Handle collisions
            const collisionCorrection = handleCollisions(players[id], players);
            if (collisionCorrection) {
                // Update player position with correction
                players[id].position = collisionCorrection.position;
                
                // Add correction to state for client
                players[id].correction = collisionCorrection;
            }
        }

        // Broadcast state
        wss.clients.forEach(client => {
            if (client.readyState == 1) {
                client.send(JSON.stringify({ 
                    type: "state", 
                    players: players 
                }));
            }
        });

        // Calculate drift and schedule next tick
        const drift = Date.now() - now;
        setTimeout(tick, Math.max(0, tickDelay - drift));
    }

    setTimeout(tick, tickDelay);
}

function handlePlayerHitDetection(
    playerId: string, 
    data: any
) {
    const shooter = players[playerId];
    if (!shooter) return;

    const rayLength = 100; // 100 unit bullet range

    console.log(`handeplayerhitdetection - recieving pos: ${JSON.stringify(data.position)}, dir: ${JSON.stringify(data.direction)}`);

    const ray = new Ray(
        new Vector3(data.position.x, data.position.y, data.position.z), 
        new Vector3(data.direction.x, data.direction.y, data.direction.z).normalize(), 
        rayLength
    )

    console.log(`handeplayerhitdetection - Ray created with: origin=${JSON.stringify(ray.origin)}, direction=${JSON.stringify(ray.direction)}, length=${rayLength}`);

    let closestHit = null;
    let closestDistance = Infinity;

    for (const [id, target] of Object.entries(players)) {
        if (id === playerId) continue; // Don't hit self

        // hard-coded capsule values for collision mesh to match player.ts, will replace with detailed mesh eventually.
        // Check if ray intersects with player bounding box.
        // player capsule is roughly 0.5 wide, 1.8 tall, and 0.5 deep (not accounting for edges because Babylon doesnt have builtin capsule hit detection).
        const minBound = new Vector3(target.position.x - 0.5, target.position.y - 0.9, target.position.z - 0.5);
        const maxBound = new Vector3(target.position.x + 0.5, target.position.y + 0.9, target.position.z + 0.5);
        const intersection = ray.intersectsBoxMinMax(minBound, maxBound);
        console.log(`Hit check for player ${id}: min=${JSON.stringify(minBound)}, max=${JSON.stringify(maxBound)}, intersection=${intersection}`);
        if (intersection) {
                console.log(`Player ${playerId} hit player ${id} at position ${JSON.stringify(target.position)}`);
                const distance = Math.sqrt(
                Math.pow(target.position.x - data.position.x, 2) +
                Math.pow(target.position.y - data.position.y, 2) +
                Math.pow(target.position.z - data.position.z, 2)
            );
            if (distance < closestDistance) {
                closestHit = id;
                closestDistance = distance;
            }
        }

    }
    if (closestHit) {
        const hitPlayer = players[closestHit];
        let hitDamage = 0;
        const item = EQUIPPABLES[data.equipID];
        console.log(data);
        if (!item) {
            console.error(`Item with ID ${data.equipID} not found for player ${closestHit}`);
            return; // Item not found, no damage to deal
        }
        if (item.type === "gun" || item.type === "melee" || item.type === "grenade") {
            hitDamage = item.stats.damage;
        }
        if (hitDamage <= 0) {
            console.log(`Player ${playerId} hit player ${closestHit} with item ID ${data.equipID} but no damage was dealt.`);
            return; // No damage to deal
        }
        // Apply damage to the hit player
        hitPlayer.health -= hitDamage;
        
        console.log(`Player ${playerId} hit player ${closestHit} with item ID ${data.equipID} for ${hitDamage} damage`);
        // send hit back to clients
        // No particle or sounds yet, so sending hit back to only hit client.
        wss.clients.forEach(client => {
            if (client[playerId] == closestHit) {
                client.send(JSON.stringify({
                    type: "hit",
                    playerId: closestHit,
                    damage: hitDamage
                }));
            }
        });
    }
}
startTPSLoop(20);