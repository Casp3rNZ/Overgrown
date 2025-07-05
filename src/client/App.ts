import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { createGameScene } from "./scenes/testGameScene";
import { NetworkClient } from "./network/clientNetwork";
import { PlayerManager } from "./entities/playerManager";
import "./UIX/UIMain"; 

class Game {
    // Handles all client side game loops
    private engine: Engine;
    private scene: Scene;
    public playerManager: PlayerManager;
    public network: NetworkClient;
    private lastTickTime: number = 0;
    private readonly TICK_INTERVAL = 1000 / 20;
    public setIsDead: (dead: boolean) => void = () => {};

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.network = new NetworkClient("ws://localhost:8080");
        this.playerManager = new PlayerManager(this.scene, this.network);
        this.init();
    }

    private async init(): Promise<void> {
        createGameScene(this.scene);

        this.network.onReady = (playerId: string) => {
            const localPlayer = this.playerManager.createLocalPlayer(playerId);
            this.scene.activeCamera = localPlayer.camera;
            this.lastTickTime = performance.now();

            this.startNetworkLoop();

            this.engine.runRenderLoop(() => {
                this.playerManager.updateVisuals();
                this.scene.render();
            });
        };

        // handle updated player states from server
        this.network.onState = (state: any) => {
            this.playerManager.updateFromServer(state);
        };

        this.network.onPlayerHit = (playerId: string, damage: number) => {
            this.playerManager.damagePlayer(playerId, damage);
        }

        this.network.onPlayerDeath = (data: any) => {
            this.playerManager.handlePlayerDeath(data);
            if (this.setIsDead && this.playerManager.getLocalPlayer().playerId == data.playerId) this.setIsDead(true); // This will update the UI in UIMain for death screen
        }

        this.network.onRespawnConfirmed = (data: any) => {
            this.playerManager.respawnPlayer(data.playerId);
            if (this.setIsDead && this.playerManager.getLocalPlayer().playerId == data.playerId) this.setIsDead(false); // Reset death state in UI
        }

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private startNetworkLoop(): void {
        // Kind of hacky way to run max fps with 20 server TPS.
        // Unsure how to handle this better, especially with optional V-sync and other video settings.
        const updateNetwork = () => {
            const now = performance.now();
            const delta = now - this.lastTickTime;

            if (delta >= this.TICK_INTERVAL) {
                this.playerManager.tick();
                this.lastTickTime = now;
            }

            requestAnimationFrame(updateNetwork);
        };

        requestAnimationFrame(updateNetwork);
    }
}

export default Game;