import { WebSocketServer, WebSocket } from "ws";
import { createClient } from '@supabase/supabase-js';
import { Vector3, Ray } from "@babylonjs/core";
import { simulatePlayerMovement, PlayerState } from "../shared/movement.js";
import { handleCollisions } from "../shared/collision.js";
import { PlayerInventory } from "../shared/playerInventory.js";
import { EQUIPPABLES } from "../shared/EQUIPPABLES_DEFINITION.js";
import { PlayerInventoryItem } from "../shared/playerInventoryItem.js";
console.log("Overgrown - WSS listening on ws://localhost:8080");

// Currently all connected players state is stored in memory, and updated every call from the client.

// All movement and collision logic is handled with vector math and raycasting. (not really using a physics engine).
// The movement system has a custom physics simulation that aims to replicate Quake / CS:GO style movement.
// All other props will be handled with Cannon.js or a similar physics engine (to be implemented).
// Colyseus or similar will be used for authoritative server state and player management (to be implemented).
const SUPABASE_URL = 'https://ggadibwftkzimypfrstb.supabase.co';
// This key is safe to use in a browser if you have enabled Row Level Security (RLS) for your tables and configured policies.
const SUPABASE_ANON_KEY = 'sb_publishable_sDxu_1fzPsMtB7I2QFfb6w_7uydIEpb';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const wss = new WebSocketServer({ 
    port: 8080 
});
interface PlayerWebSocket extends WebSocket {
    playerId: string;
    playerName: string;
}
var players: Record<string, PlayerState> = {};

(wss as WebSocketServer).on("connection", (ws: PlayerWebSocket) => {
    console.log("New player connected");
    ws.on("message", (msg) => {
        try {
            let data = JSON.parse(msg.toString());
            switch (data.type) {
                case "auth":
                    if (!data.token.user || !data.token.user.user_metadata) {
                        console.error("Invalid auth data:", data);
                        return;
                    }
                    // TODO: setup auth token validation and error return to client to counter call spoofing.

                    ws.playerId = data.token.user.id;
                    ws.playerName = data.token.user.user_metadata.username;
                    // Initialize player state
                    players[ws.playerId] = {
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
                        },
                        health: 100,
                        dead: false
                    };
                    // Initialize player inventory
                    let inventory = new PlayerInventory();
                    inventory.addItem("secondary", new PlayerInventoryItem(0, "colt-12345"));
                    // Send the player's ID
                    ws.send(JSON.stringify({ 
                        type: "init", 
                        playerId: ws.playerId,
                        username: ws.playerName,
                        inventory: inventory
                    }));
                    // Broadcast new player
                    wss.clients.forEach(client => {
                        if (client.readyState == 1) {
                            client.send(JSON.stringify({ 
                            type: "chat", 
                            playerId: "SERVER",
                            message: `${ws.playerName} has joined the game.`
                            }));
                        }
                    });
                    console.log(`Player ${ws.playerName} ${ws.playerId} connected`);
                    break;
                case "input":
                    players[ws.playerId].input = data.input;
                    break;
                case "chat":
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
                    break;
                case "shoot":
                    handlePlayerHitDetection(ws.playerId, data);
                    // broadcast sound to all clients
                    (wss as WebSocketServer).clients.forEach((client: PlayerWebSocket) => {
                        if (client.readyState == 1 && client.playerId !== ws.playerId) {
                            client.send(JSON.stringify({
                                type: "soundFromServer",
                                equipID: data.equipID,
                                soundType: "gunshot",
                                playerID: data.playerId,
                            }))
                        }
                    });
                    break;
                case "respawnRequest":
                    if (players[ws.playerId].dead) {
                        handlePlayerRespawn(ws.playerId);
                    }
                    break;
            }
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    });

    ws.on("close", () => {
        delete players[ws.playerId];
        console.log(`Player ${ws.playerName} disconnected`);
        // Broadcast to all clients that a player has left
        wss.clients.forEach(client => {
            if (client.readyState == 1) {
                client.send(JSON.stringify({ 
                    type: "chat", 
                    playerId: "SERVER",
                    message: `${ws.playerName} has left the game.`
                }));
            }
        });
    });
});

// Game loop
function startTPSLoop(TPS: number) {
    const tickDelay = 1000 / TPS;
    let lastTick = Date.now();
    let lastPlayerStatesSent = new Map<string, Record<string, PlayerState>>();

    function tick() {
        const now = Date.now();
        const dt = (now - lastTick) / 1000; // seconds since last tick
        lastTick = now;

        if (Object.keys(players).length == 0) {
            setTimeout(tick, tickDelay);
            return; // No players to simulate
        }

        // Simulate all players
        for (const id in players) {
            // Simulate movement
            simulatePlayerMovement(players[id], dt);
            
            // Handle collisions
            const collisionCorrection = handleCollisions(players[id], players);
            if (collisionCorrection) {
                players[id].position = collisionCorrection.position;
                players[id].correction = collisionCorrection;
            }
        }

        // Broadcast state
        (wss as WebSocketServer).clients.forEach((client: PlayerWebSocket) => {
            let newPlayersToSend: Record<string, PlayerState> = {};
            for (const [id, player] of Object.entries(players)) {
                if (JSON.stringify(lastPlayerStatesSent.get(id)) != JSON.stringify(player)) {
                    newPlayersToSend[id] = player;
                }
            }
            if (client.readyState == 1 && Object.keys(newPlayersToSend).length > 0) {
                client.send(JSON.stringify({ 
                    type: "state", 
                    players: newPlayersToSend 
                }));
                lastPlayerStatesSent.set(client.playerId, players);
                console.log(`Sent state to ${client.playerName} (${client.playerId})`);
            }
        });

        // Calculate drift and schedule next tick
        const drift = Date.now() - now;
        setTimeout(tick, Math.max(0, tickDelay - drift));
    }

    setTimeout(tick, tickDelay);
}

function handlePlayerRespawn(playerId: string) {
    const player = players[playerId];
    if (!player) return;

    // Reset player states
    //player.position = { x: 0, y: 1.8, z: 0 };
    player.velocity = { x: 0, y: 0, z: 0};
    player.isGrounded = false;
    player.health = 100;
    player.dead = false;
    player.input = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        rotationY: 0,
        equippedItemID: 0
    };
    player.consecutiveJumps = 0;
    player.lastJumpTime = 0;
    player.friction = 0.5;
    player.strafeAngle = 0;
    player.wishDirection = { x: 0, y: 0, z: 0 };
    player.moveDirection = { x: 0, y: 0, z: 0 };
    player.jumpQueued = false;
    player.correction = null;
    console.log(`Player ${playerId} respawned`);

    // Notify all clients about the respawn
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({
                type: "respawnConfirmed",
                playerId: playerId,
                position: player.position
        }));
    }});
}

function handlePlayerHitDetection(
    playerId: string, 
    data: any // fuck this, just pass the whole thing until boilerplate is finished.
) {
    const shooter = players[playerId];
    if (!shooter) return;

    const rayLength = 100; // 100 unit bullet range
    const ray = new Ray(
        new Vector3(data.position.x, data.position.y, data.position.z), 
        new Vector3(data.direction.x, data.direction.y, data.direction.z).normalize(), 
        rayLength
    )

    let closestHit = null;
    let closestDistance = Infinity;

    for (const [id, target] of Object.entries(players)) {
        if (id === playerId) continue; // Don't hit self
        if (target.dead) continue; // or dead players

        // hard-coded capsule values for collision mesh to match player.ts, will replace with detailed mesh eventually.
        // Check if ray intersects with player bounding box.
        // player capsule is roughly 0.5 wide, 1.8 tall, and 0.5 deep (not accounting for edges because Babylon doesnt have builtin capsule hit detection).
        const minBound = new Vector3(target.position.x - 0.2, target.position.y - 0.6, target.position.z - 0.2);
        const maxBound = new Vector3(target.position.x + 0.2, target.position.y + 0.6, target.position.z + 0.2);
        const intersection = ray.intersectsBoxMinMax(minBound, maxBound);
        if (intersection) {
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
        if (!item) {
            console.error(`Item with ID ${data.equipID} not found for player ${closestHit}`);
            return; // Item not found, no damage to deal
        }
        if (item.type === "gun") {
            hitDamage = item.gunStats.damage || 0;
        }
        // Apply damage to the hit player
        hitPlayer.health -= hitDamage;
        //console.log(`Player ${playerId} hit player ${closestHit} with item ID ${data.equipID} for ${hitDamage} damage`);

        if (hitPlayer.health <= 0) {
            console.log(`Player ${closestHit} has died.`);
            hitPlayer.health = 0;
            hitPlayer.dead = true;

            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: "death",
                        playerId: closestHit,
                    }));
                }
            });
            return; // Player is dead
        }
        
        // send hit back to clients
        wss.clients.forEach(client => {
            client.send(JSON.stringify({
                type: "hit",
                playerId: closestHit,
                attacker: playerId,
                damage: hitDamage
            }));
        });
    }
}
startTPSLoop(20);