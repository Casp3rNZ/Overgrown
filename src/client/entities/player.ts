import "@babylonjs/loaders/glTF";
import { Mesh, Scene, FreeCamera, Vector3, MeshBuilder, Tools, AnimationGroup, ImportMeshAsync, AbstractMesh } from "@babylonjs/core";
import { PlayerInput, PlayerState } from "../../shared/movement";
import { NetworkClient } from "../network/clientNetwork";
import { StateInterpolator } from "./stateInterpolator";

export class Player {
    public playerModel: AbstractMesh;
    public collisionMesh: Mesh;
    private playerAnimations: { [name: string]: AnimationGroup } = {};
    private currentAnimation: string = "";
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
    public isGrounded: boolean = true;
    private playerHealth: number;
    private network: NetworkClient;
    private playerId: string;
    private isRemote: boolean;

    constructor(scene: Scene, network: NetworkClient, playerId: string, isRemote: boolean = false) {
        this.playerId = playerId;
        this.network = network;
        this.isRemote = isRemote;
        this.stateInterpolator = new StateInterpolator();
        this.createPlayerCollisionMesh(scene);
        this.createCamera(scene);
        this.playerHealth = 100; // Default health
        
        if (!isRemote) {
            this.camera.fov = Tools.ToRadians(90);
            this.camera.minZ = 0.1;
            this.setupMouseInput(scene);
        } else {
            this.createplayerModel(scene)
            // For remote players, we don't need the camera to be functional
            this.camera.dispose();
            this.camera = null;
        }
    }

    private async createplayerModel(scene: Scene): Promise<void> {
        // Load GLB model and parent to collision mesh
        const result = await ImportMeshAsync("/testPlayer.glb", scene);
        this.playerModel = result.meshes[0];
        this.playerModel.parent = this.collisionMesh;
        this.playerModel.position = new Vector3(0, -1, 0);

        // Set up animations
        result.animationGroups.forEach((animGroup) => {
            this.playerAnimations[animGroup.name] = animGroup;
        });

        this.playAnimation["idle"]
    }

    private createPlayerCollisionMesh(scene: Scene){
        // Original sphere mesh 
        //this.mesh = MeshBuilder.CreateSphere("player_" + this.playerId, { diameter: 1.8 }, scene);

        // Init collision mesh
        this.collisionMesh = MeshBuilder.CreateCapsule("PlayerCollisionCapsule_" + this.playerId, { 
            height: 2,
            radius: 0.5,
        }, scene);
        this.collisionMesh.position.y = 5;
        this.collisionMesh.checkCollisions = true;
        // make it semi transparent for debugging
        this.collisionMesh.visibility = 0.5;
        this.collisionMesh.isVisible = false;
    }

    private playAnimation(name: string): void {
        if (this.currentAnimation === name) return; // Already playing this animation
        Object.values(this.playerAnimations).forEach(anim => anim.stop());
        if (this.playerAnimations[name]) {
            this.playerAnimations[name].play(true);
            this.playerAnimations[name].setWeightForAllAnimatables(1);
            this.currentAnimation = name;
        }
    }

    private createCamera(scene: Scene): void {
        this.camera = new FreeCamera("fpsCamera_" + this.playerId, new Vector3(0, 1.8, 0), scene);
        this.camera.parent = this.collisionMesh;
        this.camera.rotation.x = 0;
        this.camera.rotation.y = 0;
        this.camera.rotation.z = 0;
        this.camera.position = new Vector3(0, 0.6, 0); // Position at head height
        this.camera.applyGravity = false; // We handle gravity in movement system
        //this.camera.ellipsoid = new Vector3(0.5, 0.5, 0.5);
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
                if (this.playerModel){
                    // yaw left/right
                    this.playerModel.rotation.y += event.movementX * sensitivity;
                }
                if (this.camera){
                    // pitch up/down
                    this.camera.rotation.x += event.movementY * sensitivity;
                    // Clamp pitch to avoid flipping
                    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
                }

                // Update collision mesh rotation to follow player model
                if (this.collisionMesh) {
                    this.collisionMesh.rotation.y += event.movementX * sensitivity;
                }

                // update input rotation
                this.input.rotationY = this.collisionMesh.rotation.y;
            }
        });
    }

    // Called every frame
    public tick(): void {
        if (this.isRemote) return; // Remote players send input on their own client
        
        const _input = {
            forward: this.input.forward,
            backward: this.input.backward,
            left: this.input.left,
            right: this.input.right,
            jump: this.input.jump,
            rotationY: this.collisionMesh.rotation.y
        }
        this.network.sendInput(_input);
    }

    // Called when server sends new player state
    public updateFromServer(state: any): void {
        if (!state.player) {
            console.warn("No players in state:", state);
            return;
        }
        const me = state.player[this.playerId];
        if (me) {
            this.stateInterpolator.addState({
                position: me.position,
                velocity: me.velocity,
                rotationY: me.rotationY,
            });

            if (this.isRemote) {
                // Update input for remote players animation handling
                this.input = { ...me.input };
                // update remote player rotation
                this.collisionMesh.rotation.y = me.input.rotationY;

                // Update grounded state
                this.isGrounded = me.isGrounded;
            }
        }
    }

    // Called every frame to update visual position
    public updateVisuals(): void {
        const interpolatedState = this.stateInterpolator.getInterpolatedState();
        if (interpolatedState) {
            //console.log("Updating visuals with interpolated state:", interpolatedState);
            // Update position
            this.collisionMesh.position.set(
                interpolatedState.position.x,
                interpolatedState.position.y,
                interpolatedState.position.z
            );
        }
        // Update animation state
        // not optimal, but works for now
        if (!this.isGrounded) {
            this.playAnimation("jump");
        }else if (this.input.forward) {
            this.playAnimation("walkingF");
        }else if (this.input.backward) {
            this.playAnimation("walkingB");
        }else if (this.input.left) {
            this.playAnimation("strafeL");
        }else if (this.input.right) {
            this.playAnimation("strafeR");
        }else {
            this.playAnimation("idle");
        }
    }
}