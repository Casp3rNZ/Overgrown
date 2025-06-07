import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { createGameScene } from "./scenes/testGameScene";
import { NetworkClient } from "./network/clientNetwork";
import { PlayerManager } from "./entities/playerManager";
import { ChatManager } from "./network/chatManager";

class Game {
    // Handles all client side game loops
    private engine: Engine;
    private scene: Scene;
    public playerManager: PlayerManager;
    public chatManager: ChatManager;
    public network: NetworkClient;
    private lastTickTime: number = 0;
    private readonly TICK_INTERVAL = 1000 / 20;

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.network = new NetworkClient("ws://localhost:8080");
        this.playerManager = new PlayerManager(this.scene, this.network);
        this.chatManager = new ChatManager(this.network);
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

        // handle chat messages from server
        this.network.onChatMessage = (data: any) => {
            this.chatManager.handleNewChatMessage(data);
        };

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

// -- outside game scope --

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const game = new Game(canvas);
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;

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
    // Handle Escape key to exit pointer lock
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            document.exitPointerLock();
        }
    }, false);

    // Handle keyboard input for game controls and chat
    document.addEventListener("keydown", (event) => {
        const localPlayer = game.playerManager.getLocalPlayer();
        const chatInput = document.getElementById("chat-input") as HTMLInputElement;
        if (event.key !== "Enter" && document.pointerLockElement === canvas && localPlayer) {
            // Game controls
            localPlayer.handleKeyboardInput(event, true);
        }else if (event.key === "Enter" && document.pointerLockElement === canvas && localPlayer) {
            // Open chat
            const chatInput = document.getElementById("chat-input") as HTMLInputElement;
            chatInput.focus();
            if (document.exitPointerLock) document.exitPointerLock();
        }
    });

    // Handle chat input submission
    chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const message = chatInput.value.trim();
            if (message.length > 0 && game.chatManager) {
                game.network.sendChatMessage(message);
                chatInput.value = "";
                canvas.focus();
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                }
            }
        }
    });
    document.addEventListener("keyup", (event) => {
        const localPlayer = game.playerManager.getLocalPlayer();
        if (document.pointerLockElement === canvas && localPlayer) {
            localPlayer.handleKeyboardInput(event, false);
        }
    });
});