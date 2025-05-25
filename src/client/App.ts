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
    private lastTickTime: number = 0;
    private readonly TICK_INTERVAL = 1000 / 20;

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.network = new NetworkClient("ws://localhost:8080");
        this.init();
    }

    private async init(): Promise<void> {
        createGameScene(this.scene);

        this.network.onReady = (playerId: string) => {
            this.player = new PlayerController(this.scene, this.network, playerId);
            this.scene.activeCamera = this.player.camera;
            this.lastTickTime = performance.now();

            // Start the network update loop
            this.startNetworkLoop();

            // Start the render loop
            this.engine.runRenderLoop(() => {
                if (this.player) {
                    this.player.updateVisuals();
                }
                this.scene.render();
            });
        };

        this.network.onState = (players: any) => {
            if (players) {
                players = { players: players };
            }
            if (this.player) this.player.updateFromServer(players);
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
                if (this.player) {
                    this.player.tick();
                }
                this.lastTickTime = now;
            }

            requestAnimationFrame(updateNetwork);
        };

        requestAnimationFrame(updateNetwork);
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