import "@babylonjs/loaders/glTF";
import { Mesh, Scene, FreeCamera, Vector3, MeshBuilder, Tools, AnimationGroup, ImportMeshAsync, AbstractMesh, Color3 } from "@babylonjs/core";
import { PlayerInput, PlayerState } from "../../shared/movement";
import { NetworkClient } from "../network/clientNetwork";
import { StateInterpolator } from "./stateInterpolator";
import { ViewModel } from "./viewModel";

export class Player {
    public playerModel: AbstractMesh;
    public collisionMesh: Mesh;
    private playerAnimations: { [name: string]: AnimationGroup } = {};
    private currentAnimation: string = "";
    public camera: FreeCamera;
    private scene: Scene;
    private stateInterpolator: StateInterpolator;
    private viewModel: ViewModel | null = null;
    private input: PlayerInput = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        rotationY: 0,
        equippedItemID: 0
    };
    public dead: boolean = false;
    public isGrounded: boolean = true;
    private network: NetworkClient;
    public playerId: string;
    public health: number = 100;
    private isRemote: boolean;
    private lastInput: PlayerInput | null = null;

    constructor(scene: Scene, network: NetworkClient, playerId: string, isRemote: boolean = false) {
        this.playerId = playerId;
        this.scene = scene;
        this.network = network;
        this.isRemote = isRemote;
        this.stateInterpolator = new StateInterpolator();
        this.createPlayerCollisionMesh(scene);
        this.createCamera(scene);
        
        if (!isRemote) {
            this.createCamera(scene);
            this.camera.fov = Tools.ToRadians(90);
            this.camera.minZ = 0.1;
            this.setupMouseInput(scene);
            this.viewModel = new ViewModel(scene, this.camera);
            this.viewModel.loadGunModel(this.input.equippedItemID)
        } else {
            this.createplayerModel(scene)
        }
    }

    private async createplayerModel(scene: Scene): Promise<void> {
        // Load GLB model and parent to collision mesh
        const result = await ImportMeshAsync("/assets/playerModels/testPlayer.glb", scene);
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

    public respawn(): void {
        if (this.dead == false) return;
        this.dead = false;
        this.health = 100;
        this.collisionMesh.position.set(0, 5, 0);
        this.collisionMesh.rotation.set(0, 0, 0);
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            rotationY: 0,
            equippedItemID: 0
        };
        //this.viewModel.loadGunModel(this.input.equippedItemID);
        this.playAnimation("idle");
    }

    public handleKeyboardInput(event: KeyboardEvent): void {
        if (this.isRemote) return; // Remote players don't handle input
        let keyType = null;
        if (event.type === "keydown") {
            keyType = true;
        } else if (event.type === "keyup") {
            keyType = false;
        } else {
            return; // Not a key event we handle
        }
        console.log("Key event:", event.key, "dead", this.dead);
        if (this.dead == true && keyType == true) {
            if (event.key == " "){
                this.network.sendRespawnRequest();
            }
            return; // Ignore input if dead
        }

        // Movement keys
        switch (event.key) {
            case "w":
                this.input.forward = keyType;
                break;
            case "s":
                this.input.backward = keyType;
                break;
            case "a":
                this.input.left = keyType;
                break;
            case "d":
                this.input.right = keyType;
                break;
            case " ":
                this.input.jump = keyType;
                break;
            case "1":
                if (keyType && this.input.equippedItemID !== 1) {
                    this.input.equippedItemID = 1; // Switch to AK
                    if (this.viewModel) {
                        this.viewModel.loadGunModel(this.input.equippedItemID);
                        this.input.equippedItemID = 1;
                    }
                }
                break;
            case "2":
                if (keyType && this.input.equippedItemID !== 0) {
                    this.input.equippedItemID = 0; // Switch to Colt
                    if (this.viewModel) {
                        this.viewModel.loadGunModel(this.input.equippedItemID);
                        this.input.equippedItemID = 0;
                    }
                }
                break;
        }
    }

    private setupMouseInput(scene: Scene): void {
        if (this.isRemote) return; // Remote players don't handle mouse input
        
        window.addEventListener("mousemove", (event) => {
            if (document.pointerLockElement === scene.getEngine().getRenderingCanvas()) {
                const sensitivity = 0.0013;
                // yaw left/right
                if (this.collisionMesh) {
                    this.collisionMesh.rotation.y += event.movementX * sensitivity;
                }

                if (this.camera){
                    // pitch up/down
                    this.camera.rotation.x += event.movementY * sensitivity;
                    // Clamp pitch to avoid flipping
                    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
                }
                // update input rotation
                this.input.rotationY = this.collisionMesh.rotation.y;
            }
        });

        window.addEventListener("mousedown", (event) => {
            if (this.dead) return; // Ignore input if dead
            if (this.isRemote) return;
            if (document.pointerLockElement == scene.getEngine().getRenderingCanvas()) {
                if(event.button == 0 && this.viewModel) { // Left mouse button
                    // request client side shot to check animation/fire state, if returned true, send request to server. 
                    if (this.viewModel.shoot()) {
                        let directionVector = this.getDirectionFromRotation(this.collisionMesh.rotation.y, this.camera.rotation.x);
                        let originPos = this.collisionMesh.position.add(new Vector3(0, .6, 0)); // Position at head height
                        this.network.sendShootRequest(originPos, directionVector);

                        // draw debug line 
                        const endPos = originPos.add(directionVector.scale(100)); // 100 units forward
                        const DEBUG_shootLine = MeshBuilder.CreateLines("DEBUG_shootLine", {
                            points: [originPos, endPos],
                            updatable: true,
                        }, scene);
                        DEBUG_shootLine.color = new Color3(1, 0, 0); // Red color for debug
                        setTimeout(() => {
                            DEBUG_shootLine.dispose(); // Remove after 1 second
                        }, 10000);
                    }
                }
            }
        });

        // not handling mouseup input / full auto for now.
    }

    // Called every frame
    public tick(): void {
        if (this.isRemote) return; // Remote players send input on their own client
        if (this.dead) return; // Ignore input if dead
        if (JSON.stringify(this.input) != JSON.stringify(this.lastInput) && this.lastInput !== null) {
            this.network.sendInput(this.input);
        }
        this.lastInput = { ...this.input };
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
                this.input = { ...me.input }; // for remote player animation handling
                this.collisionMesh.rotation.y = me.input.rotationY;
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
        // Update viewmodel bobbing for local player
        if (!this.isRemote && this.viewModel) {
            const isMoving = this.input.forward || this.input.backward || this.input.left || this.input.right;
            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000; // Convert to seconds
            this.viewModel.update(isMoving, deltaTime);
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

    private getDirectionFromRotation(yaw: number, pitch: number): Vector3 {
        const x = Math.sin(yaw) * Math.cos(pitch);
        const y = -Math.sin(pitch);
        const z = Math.cos(yaw) * Math.cos(pitch);

        const length = Math.sqrt(x * x + y * y + z * z);
        return new Vector3(
            x / length, 
            y / length, 
            z / length
        );
    }
}