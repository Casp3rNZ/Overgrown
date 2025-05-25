import { Mesh, Scene, FreeCamera, Vector3, MeshBuilder, Tools } from "@babylonjs/core";
import { PlayerInput } from "../../shared/movement";
import { NetworkClient } from "../network/clientNetwork";

export class PlayerController {
    public mesh: Mesh;
    public camera: FreeCamera;
    private input: PlayerInput = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        rotationY: 0,
    };

    private network: NetworkClient;
    private playerId: string;

    constructor(scene: Scene, network: NetworkClient, playerId: string) {
        this.playerId = playerId;
        this.network = network;
        this.createPlayerMesh(scene);
        this.createCamera(scene);
        this.camera.fov = Tools.ToRadians(90);
        this.camera.minZ = 0.1;
        this.setupMouseInput(scene);
    }

    private createPlayerMesh(scene: Scene): void {
        this.mesh = MeshBuilder.CreateSphere("player", { diameter: 1.8 }, scene);
        this.mesh.position.y = 1.8;
        this.mesh.checkCollisions = true;
    }

    private createCamera(scene: Scene): void {
        this.camera = new FreeCamera("fpsCamera", new Vector3(0, 1.8, 0), scene);
        this.camera.parent = this.mesh;
        this.camera.rotation.x = 0;
        this.camera.rotation.y = 0;
        this.camera.rotation.z = 0;
        this.camera.checkCollisions = true;
        this.camera.applyGravity = false; // We handle gravity in movement system
        this.camera.ellipsoid = new Vector3(0.5, 1, 0.5);
        this.camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
    }

    public handleKeyboardInput(event: KeyboardEvent, isDown: boolean): void {
        console.log(`Key ${event.code} is ${isDown ? "down" : "up"}`);
        switch (event.code) {
            case "keyW":
                this.input.forward = isDown;
                break;
            case "keyS":
                this.input.backward = isDown;
                break;
            case "keyA":
                this.input.left = isDown;
                break;
            case "keyD":
                this.input.right = isDown;
                break;
            case "Space":
                this.input.jump = isDown;
                break;
        }
    }

    private setupMouseInput(scene: Scene): void {
        window.addEventListener("mousemove", (event) => {
            if (document.pointerLockElement === scene.getEngine().getRenderingCanvas()) {
                const sensitivity = 0.002;
                // yaw left/right
                this.mesh.rotation.y += event.movementX * sensitivity;
                // pitch up/down
                this.camera.rotation.x += event.movementY * sensitivity;
                // Clamp pitcch to avoid flipping
                this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
            }
        });
    }

    // Called every frame
    public tick(): void {
        const out = JSON.stringify({
            type: "input",
            playerId: this.playerId,
            input: this.input
        });
        this.network.sendInput(out);
    }

    // Called when server sends new state
    public updateFromServer(state: any): void {
        if (!state.players) {
            console.warn("No players in state:", state);
            return;
        }
        const me = state.players[this.playerId];
        if (me) {
            console.log("Updating player position from server", me);
            this.mesh.position.set(me.position.x, me.position.y, me.position.z);
            this.mesh.rotation.y = me.rotationY;
        }
    }
}