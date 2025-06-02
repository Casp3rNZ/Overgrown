import { Mesh, Scene, FreeCamera, Vector3, MeshBuilder, Tools, StandardMaterial, Color3 } from "@babylonjs/core";
import { PlayerInput, PlayerState } from "../../shared/movement";
import { NetworkClient } from "../network/clientNetwork";
import { StateInterpolator } from "./stateInterpolator";

export class Player {
    public mesh: Mesh;
    public camera: FreeCamera;
    private stateInterpolator: StateInterpolator;
    private input: PlayerInput = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        rotationY: 0,
    };
    private playerHealth: number;
    private network: NetworkClient;
    private playerId: string;
    private isRemote: boolean;

    constructor(scene: Scene, network: NetworkClient, playerId: string, isRemote: boolean = false) {
        this.playerId = playerId;
        this.network = network;
        this.isRemote = isRemote;
        this.stateInterpolator = new StateInterpolator();
        this.createPlayerMesh(scene);
        this.createCamera(scene);
        this.playerHealth = 100; // Default health
        
        if (!isRemote) {
            this.camera.fov = Tools.ToRadians(90);
            this.camera.minZ = 0.1;
            this.setupMouseInput(scene);
        } else {
            // For remote players, we don't need the camera to be functional
            this.camera.dispose();
            this.camera = null;
        }
    }

    private createPlayerMesh(scene: Scene): void {
        this.mesh = MeshBuilder.CreateSphere("player_" + this.playerId, { diameter: 1.8 }, scene);
        this.mesh.position.y = 1.8;
        this.mesh.checkCollisions = true;
        
        if (this.isRemote) {
            // Make remote players visually distinct
            const material = new StandardMaterial("remotePlayerMaterial", scene);
            material.diffuseColor = new Color3(1, 0, 0); // Red color for remote players
            this.mesh.material = material;
        }
    }

    private createCamera(scene: Scene): void {
        this.camera = new FreeCamera("fpsCamera_" + this.playerId, new Vector3(0, 1.8, 0), scene);
        this.camera.parent = this.mesh;
        this.camera.rotation.x = 0;
        this.camera.rotation.y = 0;
        this.camera.rotation.z = 0;
        this.camera.checkCollisions = true;
        this.camera.applyGravity = false; // We handle gravity in movement system
        this.camera.ellipsoid = new Vector3(0.5, 1, 0.5);
    }

    public handleKeyboardInput(event: KeyboardEvent, isDown: boolean): void {
        if (this.isRemote) return; // Remote players don't handle input

        //console.log(`Key ${event.keyCode} is ${isDown ? "down" : "up"}`);
        /* Temporary switch to keyCode because for some reason .code wasn't working :shrug: */
        switch (event.keyCode) {
            case 87:
                this.input.forward = isDown;
                break;
            case 83:
                this.input.backward = isDown;
                break;
            case 65:
                this.input.left = isDown;
                break;
            case 68:
                this.input.right = isDown;
                break;
            case 32:
                this.input.jump = isDown;
                break;
            default: break;
        }
    }

    private setupMouseInput(scene: Scene): void {
        if (this.isRemote) return; // Remote players don't handle mouse input
        
        window.addEventListener("mousemove", (event) => {
            if (document.pointerLockElement === scene.getEngine().getRenderingCanvas()) {
                const sensitivity = 0.002;
                // yaw left/right
                this.mesh.rotation.y += event.movementX * sensitivity;
                // pitch up/down
                this.camera.rotation.x += event.movementY * sensitivity;
                // Clamp pitch to avoid flipping
                this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
            }
        });
    }

    // Called every frame
    public tick(): void {
        if (this.isRemote) return; // Remote players don't send input
        
        const Input = {
            forward: this.input.forward,
            backward: this.input.backward,
            left: this.input.left,
            right: this.input.right,
            jump: this.input.jump,
            rotationY: this.mesh.rotation.y
        }
        // console.log("Sending input:", Input);
        const out = JSON.stringify({
            type: "input",
            playerId: this.playerId,
            input: Input
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
            //console.log("Received state update:", me);
            this.stateInterpolator.addState({
                position: me.position,
                velocity: me.velocity,
                rotationY: me.rotationY
            });
        }
    }

    // Called every frame to update visual position
    public updateVisuals(): void {
        const interpolatedState = this.stateInterpolator.getInterpolatedState();
        if (interpolatedState) {
            //console.log("Updating visuals with interpolated state:", interpolatedState);
            // Update position
            this.mesh.position.set(
                interpolatedState.position.x,
                interpolatedState.position.y,
                interpolatedState.position.z
            );
        }
    }
}