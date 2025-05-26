import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { createGameScene } from "./scenes/testGameScene";
import { NetworkClient } from "./network/clientNetwork";
import { PlayerManager } from "./entities/playerManager";

class Game {
    private engine: Engine;
    private scene: Scene;
    public playerManager: PlayerManager;
    private network: NetworkClient;
    private lastTickTime: number = 0;
    private readonly TICK_INTERVAL = 1000 / 20;

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

            // Start the network update loop
            this.startNetworkLoop();

            // Start the render loop
            this.engine.runRenderLoop(() => {
                this.playerManager.updateVisuals();
                this.scene.render();
            });
        };

        this.network.onState = (state: any) => {
            this.playerManager.updateFromServer(state);
        };

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private startNetworkLoop(): void {
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
        const localPlayer = game.playerManager.getLocalPlayer();
        if (document.pointerLockElement === canvas && localPlayer) {
            localPlayer.handleKeyboardInput(event, true);
        }
    });
    document.addEventListener("keyup", (event) => {
        const localPlayer = game.playerManager.getLocalPlayer();
        if (document.pointerLockElement === canvas && localPlayer) {
            localPlayer.handleKeyboardInput(event, false);
        }
    });
});