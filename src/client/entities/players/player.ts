import "@babylonjs/loaders/glTF";
import { TransformNode, ShadowGenerator, Mesh, Scene, FreeCamera, Vector3, MeshBuilder, Tools, AnimationGroup, ImportMeshAsync, AbstractMesh, Color3, StandardMaterial, PointLight } from "@babylonjs/core";
import { PlayerInput } from "../../../shared/movement";
import { NetworkClient } from "../../network/clientNetwork";
import { StateInterpolator } from "../players/stateInterpolator";
import { ViewModel } from "../players/viewModel";
import { playSpacialSound, playSound } from "../../sound/audioEngine";
import { EQUIPPABLES } from "../../../shared/EQUIPPABLES_DEFINITION";
import { PlayerInventory, InventorySlot } from "../../../shared/playerInventory";
import { MeshCache } from "../../scenes/meshCache";

export class Player {
    public playerModel: AbstractMesh;
    public collisionMesh: Mesh;
    private playerAnimations: { [name: string]: AnimationGroup } = {};
    private currentAnimation: string = "";
    public camera: FreeCamera;
    private scene: Scene;
    private stateInterpolator: StateInterpolator;
    private viewModel: ViewModel | null = null;
    private inventory: PlayerInventory;
    private input: PlayerInput = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        rotationY: 0,
        equippedItemID: -1
    };
    public dead: boolean = false;
    public isGrounded: boolean = true;
    private network: NetworkClient;
    public playerId: string;
    public health: number = 100;
    public isRemote: boolean;
    private lastInput: PlayerInput | null = null;
    public gunMesh: AbstractMesh | null = null;
    public muzzleEnd: TransformNode | null = null;
    private shadowGenerator?: ShadowGenerator;

    constructor(scene: Scene, network: NetworkClient, playerId: string, isRemote: boolean = false, shadowGenerator?: ShadowGenerator) {
        this.playerId = playerId;
        this.network = network;
        this.isRemote = isRemote;
        this.shadowGenerator = shadowGenerator;
        this.stateInterpolator = new StateInterpolator();
        this.createPlayerCollisionMesh(scene);
        if (!isRemote) {
            this.scene = scene;
            this.createCamera(scene);
            this.setupMouseInput(scene);
            this.inventory = new PlayerInventory();
            this.viewModel = new ViewModel(scene, this.camera);
        } else {
            this.createplayerModel();
        }
    }

    private async createplayerModel(): Promise<void> {
        if (!this.isRemote) {
            console.error("createplayerModel should not be called for local player.");
            return;
        }
        // Load GLB model and parent to collision mesh
        const model = MeshCache.getMeshCacheEntry("player");
        if (!model) {
            console.error("Failed to load player mesh");
            return;
        }
        this.playerModel = model.mesh;
        this.playerModel.parent = this.collisionMesh;
        this.playerModel.position = new Vector3(0, -1, 0);
        this.playerModel.receiveShadows = true;
        if (this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(this.playerModel);
        }

        // Set up animations
        model.animationGroups?.forEach(animGroup => {
            this.playerAnimations[animGroup.name] = animGroup;
        });
        this.playAnimation("idle");

        // PRE-IK remote player weapon handling
        this.loadRemotePlayerGunModel(this.input.equippedItemID); 
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
        this.collisionMesh.visibility = 0.5;
        this.collisionMesh.isVisible = false;
    }

    private playAnimation(name: string): void {
        if (this.currentAnimation == name) return; // Already playing this animation
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
        this.camera.fov = Tools.ToRadians(90);
        this.camera.minZ = 0.01;
        scene.activeCamera = this.camera;
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

        // set keytype
        let keyType = null;
        if (event.type === "keydown") {
            keyType = true;
        } else if (event.type === "keyup") {
            keyType = false;
        } else {
            return; // Not a key event we handle
        }

        const key = event.key.toLowerCase();

        // Handle death state
        if (this.dead == true && keyType == true) {
            if (key == " "){
                this.network.sendRespawnRequest();
            }
            return; // Ignore input if dead
        }

        // Movement keys
        switch (key) {
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
            case "r":
                this.viewModel?.reloadGun();
                break;
            case "1":
                if (keyType && this.input.equippedItemID !== 1) {
                    this.equipItem("primary");
                }
                break;
            case "2":
                if (keyType && this.input.equippedItemID !== 0) {
                    this.equipItem("secondary");
                }
                break;
            case "3":
                if (keyType && this.input.equippedItemID !== 2) {
                    this.unequipItems(); 
                }
        }
    }

    public equipItem(slot: InventorySlot): void {
        const item = this.inventory.getItemInSlot(slot);
        if (item) {
            this.input.equippedItemID = item.equipableId;
            this.viewModel.loadModel(item);
        }
    }

    private unequipItems(): void {
        if (this.input.equippedItemID !== -1) {
            this.input.equippedItemID = -1;
            this.viewModel.loadModel(null);
        }
    }

    private setupMouseInput(scene: Scene): void {
        if (this.isRemote) return; // Remote players don't handle mouse input
        
        window.addEventListener("mousemove", (event) => {
            event.preventDefault(); // prevent mousemove and mouseclick functions from stopping eachother.
            if (document.pointerLockElement == scene.getEngine().getRenderingCanvas()) {
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
                this.input.rotationY = this.collisionMesh.rotation.y;
            }
        });

        // Deprecated: Use pointerdown instead for better compatibility
        //window.addEventListener("mousedown", (event) => {
        //    this.handleMouseButtonEvent(event, scene);
        //});

        window.addEventListener("pointerdown", (event) => {
            event.preventDefault(); 
            this.handleMouseButtonEvent(event, scene);
        });
        
    }

    public tick(): void {
        if (this.isRemote) return; // Remote players send input on their own client
        if (this.dead) return; // Ignore input if dead
        if (JSON.stringify(this.input) != JSON.stringify(this.lastInput) && this.lastInput !== null) {
            this.network.sendInput(this.input);
        }
        this.lastInput = { ...this.input };
    }

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
                // Update equipped item
                //console.log(`input: ${this.input.equippedItemID}, me: ${me.input.equippedItemID}`);
                if (this.input.equippedItemID != me.input.equippedItemID) {
                    this.input.equippedItemID = me.input.equippedItemID;
                    this.loadRemotePlayerGunModel(this.input.equippedItemID);
                }

                // for remote player animation handling
                this.input = { ...me.input };
                this.collisionMesh.rotation.y = me.input.rotationY;
                this.isGrounded = me.isGrounded;
            }
        }
    }

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

    private handleMouseButtonEvent(event: any, scene: Scene): void {
        if (this.dead) return; // Ignore input if dead
        if (this.isRemote) return;
        if (document.pointerLockElement == scene.getEngine().getRenderingCanvas()) {
            if(event.button == 0 && this.viewModel) { // Left mouse button
                // request client side shot to check animation/fire state, if returned true, send request to server. 
                if (this.viewModel.isReadyToShoot()) {
                    // Network
                    let directionVector = this.getDirectionFromRotation(this.collisionMesh.rotation.y, this.camera.rotation.x);
                    let originPos = this.collisionMesh.position.add(new Vector3(0, .6, 0)); // Position at head height
                    this.network.sendShootRequest(originPos, directionVector);

                    // Trigger local sound
                    let gunSound = EQUIPPABLES[this.input.equippedItemID].fireSound;
                    playSound(gunSound);

                    // Trigger local animations
                    this.viewModel.shoot(scene);
                    
                    // Debug
                    //const endPos = originPos.add(directionVector.scale(100)); // 100 units forward
                    //const DEBUG_shootLine = MeshBuilder.CreateLines("DEBUG_shootLine", {
                    //    points: [originPos, endPos],
                    //    updatable: true,
                    //}, scene);
                    //DEBUG_shootLine.color = new Color3(1, 0, 0); // Red color for debug
                    //setTimeout(() => {
                    //    DEBUG_shootLine.dispose(); // Remove after 2 second
                    //}, 2000);
                }
            }
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

    private async loadRemotePlayerGunModel(equippedItemID: number): Promise<void> {
        if (equippedItemID == -1 || equippedItemID == null) {
            return; // No gun equipped
        }
        console.log(`Loading remote player gun model for equippedItemID: ${equippedItemID}`);
        let model = MeshCache.getMeshCacheEntry(equippedItemID.toString());
        if (!model.mesh) {
            throw new Error(`Remote Player Guns - No meshes found in EQUIPPABLES for key: ${equippedItemID}`);
        }
        if (this.gunMesh) {
            this.gunMesh.dispose();
        }
        this.gunMesh = model.mesh;
        this.gunMesh.parent = this.playerModel;
        this.gunMesh.isPickable = false; // not prone to physics or raycasting
        this.gunMesh.position = new Vector3(-0.1, 1.4, 0.4)
        this.gunMesh.rotation = new Vector3(0, Math.PI / -2, 0); // Fix blender import rotation (rotation is 90 degrees off)
        this.muzzleEnd = this.gunMesh.getChildTransformNodes().find(node => node.name == "Muzzle_Origin");
    }

    public remotePlayerMuzzleFlash(scene): void {

        // Copy of viewmodel muzzle flash function - dunno how to optimise this yet
        const flashMesh = MeshBuilder.CreatePlane("muzzleFlash", { size: Math.random() * (0.5 - 0.8) + 0.5}, scene);
        flashMesh.parent = this.muzzleEnd;
        flashMesh.rotation = new Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Playing with emissive matt planes
        const flashMat = new StandardMaterial("muzzleFlashMat", scene);
        flashMat.emissiveColor = new Color3(1, 0.9 + Math.random() * 0.1, 0.6 + Math.random() * 0.2);
        flashMat.disableLighting = false;
        flashMesh.material = flashMat;

        // Basic light flash
        const flashLight = new PointLight("muzzleFlashLight", this.muzzleEnd.getAbsolutePosition(), scene);
        flashLight.diffuse = new Color3(1, 0.8, 0.6);
        flashLight.intensity = 0.5;
        flashLight.range = 10;

        // Remove flash after a short time
        setTimeout(() => {
            flashMesh.dispose();
            flashLight.dispose();
        }, 50);
    }

    public playSoundOnPlayer(soundType: string, volume: number = 1): void {
        switch (soundType) {
            case "gunshot":
                if (this.gunMesh) {
                    playSpacialSound(EQUIPPABLES[this.input.equippedItemID].fireSound, this.gunMesh, volume);
                    // Trigger matching VFX
                    this.remotePlayerMuzzleFlash(this.scene);
                } else {
                    console.warn(`Gun mesh not found for player ${this.playerId}.`);
                }
                break;
            case "footstep":
                // Handle footstep sound
                break;
            case "reload":
                // Handle reload sound
                break;
            case "remotePlayerHit":
                playSpacialSound(soundType, this.collisionMesh, volume);
                break;
            default:
                console.warn(`Unknown sound type: ${soundType}`);
                break;
        }
    }

    public updateInventory(inventory: any): void {
        // Rebuild PlayerInventory obj 
        if (inventory.slots) {
            const newInv = new PlayerInventory();
            for (const slot in inventory.slots) {
                if (inventory.slots.hasOwnProperty(slot)) {
                    const item = inventory.slots[slot];
                    newInv.addItem(slot as InventorySlot, item);
                }
            }
            this.inventory = newInv;
        }
    }
}