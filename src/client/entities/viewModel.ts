import { Scene, AbstractMesh, ImportMeshAsync, Vector3 } from "@babylonjs/core";
import { EQUIPPABLES } from "../../shared/EQUIPPABLES_DEFINITION.js";
export class ViewModel {
    public gunMesh: AbstractMesh | null = null;
    private bobTime: number = 0;
    private equippedGunID:  number = 0;

    // IK LEGEND FOR GUN MODELS:
    // Left hand grip = "IK_Grip_L"
    // Right hand grip = "IK_Grip_R"
    // Muzzle end = "Muzzle_Origin"
    // Muzzle end + 1 unit forward (aim direction) = "Aim_Reference"

    // client-side gun model handled by viewmodel
    // remote player gun models, and upper body animations handled by IK system (not built yet)

    constructor(private scene: Scene, private camera: any) {}

    public async loadGunModel(id: number): Promise<void> {
        try {
            // Invalid model check (NO passing raw path)
            if (!EQUIPPABLES[id].modelPath) {
                throw new Error(`Gun model path not found for key: ${id}`);
            }
            if (EQUIPPABLES[id].type !== "gun") {
                throw new Error(`Loaded model is not a gun for key: ${id}`);
            }
            // Load the gun model
            const result = await ImportMeshAsync(EQUIPPABLES[id].modelPath, this.scene);
            if (!result.meshes || result.meshes.length === 0) {
                throw new Error(`No meshes found in model for key: ${id}`);
            }
            if (this.gunMesh) {
                this.gunMesh.dispose();
            }
            this.equippedGunID = id;
            this.gunMesh = result.meshes[0];
            this.gunMesh.parent = this.camera;
            // Make client-side gun model invisible to physics and raycasting
            this.gunMesh.isPickable = false;
            // Fix blender import rotation (rotation is 90 degrees off)
            this.gunMesh.rotation = new Vector3(0, Math.PI / -2, 0);

            this.gunMesh.position = new Vector3(
                EQUIPPABLES[id].viewmodel.offset_x,
                EQUIPPABLES[id].viewmodel.offset_y,
                EQUIPPABLES[id].viewmodel.offset_z
            );
            console.log("Gun model loaded successfully:", this.gunMesh.name);
        } catch (error) {
            console.error("Error loading gun model:", error);
        }
    }
    
    // Called every client side frame
    public update(isMoving: boolean, deltaTime: number) {
        if (!this.gunMesh) return;
        // Update gun bobbing effect based on movement
        if (isMoving) {
            this.bobTime += deltaTime * EQUIPPABLES[this.equippedGunID].viewmodel.bob_cycle;
        }else {
            // Reset bob time when not moving
            this.bobTime = 0;
            // Need to find a solution to smooth this, because bobtime -= 1 doesnt work.
        }
        const bobZ = Math.sin(this.bobTime) * EQUIPPABLES[this.equippedGunID].viewmodel.bob_cycle * EQUIPPABLES[this.equippedGunID].viewmodel.bob_amt_lat;
        const bobY = Math.abs(Math.cos(this.bobTime)) * EQUIPPABLES[this.equippedGunID].viewmodel.bob_cycle * EQUIPPABLES[this.equippedGunID].viewmodel.bob_amt_vert;
        const lower = isMoving ? EQUIPPABLES[this.equippedGunID].viewmodel.bob_lower_amt * 0.01 : 0;

        this.gunMesh.position = new Vector3(
            EQUIPPABLES[this.equippedGunID].viewmodel.offset_x,
            EQUIPPABLES[this.equippedGunID].viewmodel.offset_y - lower + bobY,
            EQUIPPABLES[this.equippedGunID].viewmodel.offset_z + bobZ
        );
    }

    public shoot(): any {
        if (!this.gunMesh) {
            console.warn("No gun mesh loaded to shoot.");
            return false
        }

        // perform client side animation for shooting
        
        return true;
    }

    dispose(): void {
        this.gunMesh.dispose();
        this.gunMesh = null;
        console.log("ViewModel disposed.");
    }

}