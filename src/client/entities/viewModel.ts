import { Scene, AbstractMesh, ImportMeshAsync, Vector3 } from "@babylonjs/core";

export class ViewModel {
    public gunMesh: AbstractMesh | null = null;

    // Viewmodel vars
    viewmodel_offset_x: number = 0.2; // X offset for gun model
    viewmodel_offset_y: number = -0.1; // Y offset for gun model
    viewmodel_offset_z: number = 0.2; // Z offset for gun model

    // Bobbing vars
    cl_bob_lower_amt: number = 0.1; // Lower amount for bobbing
    cl_bobamt_lat: number = 0.1; // Lateral bobbing amount
    cl_bobamt_vert: number = 0.1; // Vertical bobbing amount
    cl_bobcycle: number = 0.5; // Cycle time for bobbing
    private bobTime: number = 0; // Time accumulator for bobbing

    // TODO: create bobbing/FOV presets for different weapons and user settings

    private gunModelPaths: { [key: string]: string } = {
        "colt": "/assets/weapons/colt.glb",
    };
    // IK LEGEND FOR GUN MODELS:
    // Left hand grip = "IK_Grip_L"
    // Right hand grip = "IK_Grip_R"
    // Muzzle end = "Muzzle_Origin"
    // Muzzle end + 1 unit forward (aim direction) = "Aim_Reference"


    // CURRENT STATE:
    // basic ViewModel class to handle gun models

    // planned weapon aiming system logic:
    // client-side gun model handled by viewmodel
    // remote player gun models, and upper body animations handled by IK system (not built yet)

    // todo: split player model into lower and upper body


    constructor(private scene: Scene, private camera: any) {}

    public async loadGunModel(name: string): Promise<void> {
        try {
            // Dispose of existing mesh if it exists
            if (this.gunMesh) {
                this.gunMesh.dispose();
            }
            // Invalid model check (NO passing raw path)
            if (!this.gunModelPaths[name]) {
                throw new Error(`Gun model path not found for key: ${name}`);
            }
            const result = await ImportMeshAsync(this.gunModelPaths[name], this.scene);
            this.gunMesh = result.meshes[0];
            this.gunMesh.parent = this.camera;
            // Make client-side gun model invisible to physics and raycasting
            this.gunMesh.isPickable = false;
            // Fix blender import rotation (rotation is 90 degrees off)
            this.gunMesh.rotation = new Vector3(0, Math.PI / -2, 0);

            this.gunMesh.position = new Vector3(
                this.viewmodel_offset_x,
                this.viewmodel_offset_y,
                this.viewmodel_offset_z
            );
            console.log("Gun model loaded successfully:", this.gunMesh.name);
        } catch (error) {
            console.error("Error loading gun model:", error);
        }
    }
    
    // Called every client side frame
    public update(isMoving: boolean, deltaTime: number) {
        if (!this.gunMesh) return;
        if (isMoving) {
            this.bobTime += deltaTime * this.cl_bobcycle * Math.PI * 2;
        } else {
            this.bobTime = 0;
        }

        const bobX = Math.sin(this.bobTime) * this.cl_bobamt_lat;
        const bobY = Math.abs(Math.cos(this.bobTime)) * this.cl_bobamt_vert;
        const lower = isMoving ? this.cl_bob_lower_amt * 0.01 : 0;

        this.gunMesh.position = new Vector3(
            this.viewmodel_offset_x + bobX,
            this.viewmodel_offset_y - lower + bobY,
            this.viewmodel_offset_z
        );
    }

    dispose(): void {
        this.gunMesh.dispose();
        this.gunMesh = null;
        console.log("ViewModel disposed.");
    }

}