import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { createGameScene } from "./scenes/testGameScene";
import { PlayerController } from "./entities/player";
import { NetworkClient } from "./network/clientNetwork"; // Make sure this exists

class Game {
    private engine: Engine;
    private scene: Scene;
    public player: PlayerController | null = null;
    private network: NetworkClient;

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.network = new NetworkClient("ws://localhost:8080"); // Update with your server address
        this.init();
    }

    private async init(): Promise<void> {
        createGameScene(this.scene);

        // Wait for server to assign player ID before creating player
        this.network.onReady = (playerId: string) => {
            this.player = new PlayerController(this.scene, this.network, playerId);
            this.scene.activeCamera = this.player.camera;

            let accumulator = 0;
            const TPS = 1000 / 20;
            let lastUpdate = performance.now();

            this.engine.runRenderLoop(() => {
                const now = performance.now();
                accumulator += now - lastUpdate;
                lastUpdate = now;
                while (accumulator >= TPS) {
                    if (this.player){
                        this.player.tick();
                    }
                    accumulator -= TPS;
                }
                // Render the scene at the current frame no matter the TPS
                if (this.scene.activeCamera){
                    this.scene.render();
                }
            });
        };

        // Update all players' positions from server state
        this.network.onState = (players: any) => {
            if (players) {
                players = { players: players };
            }
            if (this.player) this.player.updateFromServer(players);
        };

        // Handle resize
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }
}

// -- outside game scope --

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const game = new Game(canvas);

    canvas.addEventListener("click", () => {
        canvas.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement === canvas) {
            console.log("Pointer locked");
        } else {
            console.log("Pointer unlocked");
        }
    }, false);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            document.exitPointerLock();
        }
    }, false);
    document.addEventListener("keydown", (event) => {
        if (document.pointerLockElement === canvas && typeof game.player.handleKeyboardInput == "function") {
            game.player.handleKeyboardInput(event, true);
        }
    });
    document.addEventListener("keyup", (event) => {
        if (document.pointerLockElement === canvas && typeof game.player.handleKeyboardInput == "function") {
            game.player.handleKeyboardInput(event, false);
        }
    });
});