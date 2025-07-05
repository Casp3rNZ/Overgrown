import { Scene } from "@babylonjs/core";
import { NetworkClient } from "../network/clientNetwork";
import { Player } from "./player";

export class PlayerManager {
    private players: Map<string, Player>;
    private scene: Scene;
    private network: NetworkClient;
    // not sure if this localPlayerID will be useful, or if it should be a boolean, but it works for now.
    private localPlayerId: string | null;

    constructor(scene: Scene, network: NetworkClient) {
        this.players = new Map();
        this.scene = scene;
        this.network = network;
        this.localPlayerId = null;
    }

    public createLocalPlayer(playerId: string): Player {
        this.localPlayerId = playerId;
        const player = new Player(this.scene, this.network, playerId, false);
        this.players.set(playerId, player);
        console.log("Created local player:", playerId);
        return player;
    }

    public createRemotePlayer(playerId: string): Player {
        const player = new Player(this.scene, this.network, playerId, true);
        this.players.set(playerId, player);
        console.log("Created remote player:", playerId);
        return player;
    }

    public getLocalPlayer(): Player | null {
        return this.localPlayerId ? this.players.get(this.localPlayerId) || null : null;
    }

    public updateFromServer(state: any): void {
        // Check if state is the players object directly
        const players = state.players || state;
        
        if (!players || typeof players !== 'object') {
            console.warn("Invalid state update:", state);
            return;
        }

        //console.log("Updating from server state:", players);

        // Update or create players based on server state
        for (const [playerId, playerState] of Object.entries(players)) {
            let player = this.players.get(playerId);
            // Create new player (either local or remote)
            if (!player) {
                if (playerId === this.localPlayerId) {
                    player = this.createLocalPlayer(playerId);
                } else {
                    player = this.createRemotePlayer(playerId);
                }
            }
            
            // Update player state
            player.updateFromServer({ player: { [playerId]: playerState } });
        }

        // Remove players that are no longer in the server state
        for (const [playerId, player] of this.players.entries()) {
            if (playerId !== this.localPlayerId && !players[playerId]) {
                if (player.collisionMesh) {
                    player.collisionMesh.dispose();
                }
                if (player.playerModel) {
                    player.playerModel.dispose();
                }
                if (player.camera) {
                    player.camera.dispose();
                }
                this.players.delete(playerId);
            }
        }
    }

    public updateVisuals(): void {
        for (const player of this.players.values()) {
            player.updateVisuals();
        }
    }

    public tick(): void {
        const localPlayer = this.getLocalPlayer();
        if (localPlayer) {
            localPlayer.tick();
        }
    }

    public dispose(): void {
        for (const player of this.players.values()) {
            if (player.camera) {
                player.camera.dispose();
            }
            if (player.collisionMesh) {
                player.collisionMesh.dispose();
            }
            if (player.playerModel) {
                player.playerModel.dispose();
            }
        }
        this.players.clear();
    }

    public damagePlayer(playerId: string, damage: number): void {
        console.log(`Applying ${damage} damage to player ${playerId}`);
        const player = this.players.get(playerId);
        if (player) {
            player.health -= damage;
            console.log(`Player ${playerId} took ${damage} damage. Remaining health: ${player.health}`);
        } else {
            console.warn(`Player ${playerId} not found for damage application.`);
        }
    }

    public handlePlayerDeath(playerId: string): void {
        const player = this.players.get(playerId);
        player.dead = true;
        player.health = 0;

        if (player) {
            console.log(`Player ${playerId} has died.`);
        } else {
            console.warn(`Player ${playerId} not found for death handling.`);
        }
    }   
} 