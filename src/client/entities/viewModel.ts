import { Scene, AbstractMesh, ImportMeshAsync, Vector3, MeshBuilder, Color3, StandardMaterial, PointLight } from "@babylonjs/core";
import { EQUIPPABLES } from "../../shared/EQUIPPABLES_DEFINITION.js";
export class ViewModel {
    public gunMesh: AbstractMesh | null = null;
    private bobTime: number = 0;
    private equippedGunID:  number = 0;
    private muzzleEnd: any = null;
    private RECOIL_KICKBACK_SPEED = 0.2;
    private recoilOffset = 0;
    private recoilVelocity = 0;
    private maxRecoilOffset = 0.04;
    private smoothedWeaponPosition: Vector3 = new Vector3(0, 0, 0);
    private smoothedWeaponRotation: Vector3 = new Vector3(0, Math.PI / -2, 0);

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
            if (!EQUIPPABLES[id]) {
                throw new Error(`Gun with ID ${id} does not exist in EQUIPPABLES.`);
            }
            const equppedItem = EQUIPPABLES[id];
            // Load the gun model
            const result = await ImportMeshAsync(equppedItem.modelPath, this.scene);
            if (!result.meshes || result.meshes.length === 0) {
                throw new Error(`No meshes found in model for key: ${id}`);
            }
            if (this.gunMesh) {
                this.recoilVelocity = 0;
                this.recoilOffset = 0;
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
                equppedItem.viewmodel.offset_x,
                equppedItem.viewmodel.offset_y,
                equppedItem.viewmodel.offset_z
            );

            // load mount points for IK
            this.muzzleEnd = this.gunMesh.getChildTransformNodes().find(node => node.name == "Muzzle_Origin");
            this.muzzleEnd.scaling = new Vector3(0.01, 0.01, 0.01);
            //console.log(`Loaded gun model: ${equppedItem.name} with ID: ${id}`);
        } catch (error) {
            console.error("Error loading gun model:", error);
        }
    }
    
    // Called every client side frame
    public update(isMoving: boolean, deltaTime: number) {
        // This bob and recoil system is quite basic, and static, but it works for now.
        // TODO: Mouse look/aim feedback.
        if (!this.gunMesh) return;
        const lerpSmooth = 0.2;

        //#region Movement Bob
        // Update gun bobbing effect based on movement
        var equppedItem = EQUIPPABLES[this.equippedGunID];
        if (isMoving) {
            this.bobTime += deltaTime * equppedItem.viewmodel.bob_cycle;
        }else {
            // Reset bob time when not moving
            this.bobTime = 0;
            // Need to find a solution to smooth this, because bobtime -= 1 doesnt work.
        }
        const bobZ = Math.sin(this.bobTime) * equppedItem.viewmodel.bob_cycle * equppedItem.viewmodel.bob_amt_lat;
        const bobY = Math.abs(Math.cos(this.bobTime)) * equppedItem.viewmodel.bob_cycle * equppedItem.viewmodel.bob_amt_vert;
        const lower = isMoving ? equppedItem.viewmodel.bob_lower_amt * 0.01 : 0;

        const newWeaponPosition = new Vector3(
            equppedItem.viewmodel.offset_x,
            equppedItem.viewmodel.offset_y - lower + bobY,
            equppedItem.viewmodel.offset_z + bobZ
        );
        const newWeaponRotation = new Vector3(
            equppedItem.viewmodel.offset_rotation_x,
            equppedItem.viewmodel.offset_rotation_y,
            equppedItem.viewmodel.offset_rotation_z
        );
        //#endregion

        //#region Shooting Recoil
        if (this.recoilVelocity > 0) {
            // Calculate initial recoil offset
            this.recoilOffset += this.recoilVelocity;
            this.recoilVelocity -= deltaTime * this.RECOIL_KICKBACK_SPEED;
            // Clamp recoil offset
            if (this.recoilOffset < 0 || this.recoilOffset > this.maxRecoilOffset) {
                this.recoilOffset = 0;
                this.recoilVelocity = 0;
            }

            // Apply recoil and rotation on z axis
            newWeaponPosition.z -= this.recoilOffset;
            newWeaponRotation.z += this.recoilOffset * 5;
            // random side roll
            newWeaponRotation.x += (Math.random() - 0.5) * this.recoilOffset * 10;
        }
        // Lerp initial position values
        this.smoothedWeaponPosition.x = this.lerp(this.smoothedWeaponPosition.x, newWeaponPosition.x, lerpSmooth);
        this.smoothedWeaponPosition.y = this.lerp(this.smoothedWeaponPosition.y, newWeaponPosition.y, lerpSmooth);
        this.smoothedWeaponPosition.z = this.lerp(this.smoothedWeaponPosition.z, newWeaponPosition.z, lerpSmooth);
        
        // Lerp initial rotation values
        this.smoothedWeaponRotation.x = this.lerp(this.smoothedWeaponRotation.x, newWeaponRotation.x, lerpSmooth);
        //this.smoothedWeaponRotation.y = this.lerp(this.smoothedWeaponRotation.y, newWeaponRotation.y, lerpSmooth);
        this.smoothedWeaponRotation.z = this.lerp(this.smoothedWeaponRotation.z, newWeaponRotation.z, lerpSmooth);
        
        //#endregion 
        this.gunMesh.position = this.smoothedWeaponPosition;
        this.gunMesh.rotation = this.smoothedWeaponRotation;
    }

    public shoot(scene: Scene): any {
        // Muzzle Flash
        this.playMuzzleFlash(scene, this.muzzleEnd);

        // Recoil effect
        this.recoil(0.01);
        // Barrel Smoke

        // Bullet Cartridge Eject

    }

    public async recoil(strength) {
        if (!this.gunMesh || !this.muzzleEnd) {
            console.warn("No gun mesh loaded to apply recoil.");
            return;
        }
        this.recoilVelocity += strength;
    }

    public isReadyToShoot(): boolean {
        if (!this.gunMesh || !this.muzzleEnd) 
        {
            console.warn(`No gun mesh loaded to check readiness. mesh: ${this.gunMesh}, muzzleEnd: ${this.muzzleEnd}, equippedGunID: ${this.equippedGunID}`);
            return false;
        } else {
            return true;
        }
    }

    public playMuzzleFlash(scene: Scene, muzzleEnd: any) {
        if (!muzzleEnd) return;

        // math.random min max = math.ran

        // Create a small plane for the flash
        // there is currently a bug where the mesh is somehow bigger when equipping different guns.
        const minSize = 0.2;
        const maxSize = 0.4;
        const flashSize = Math.random() * (maxSize - minSize) + minSize;
        const flashMesh = MeshBuilder.CreatePlane("muzzleFlash", { size: flashSize }, scene);
        flashMesh.parent = muzzleEnd;
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
        const flashLight = new PointLight("muzzleFlashLight", muzzleEnd.getAbsolutePosition(), scene);
        flashLight.diffuse = new Color3(1, 0.8, 0.6);
        flashLight.intensity = 0.5;
        flashLight.range = 10;

        // Remove flash after a short time
        setTimeout(() => {
            flashMesh.dispose();
            flashLight.dispose();
        }, 50);
}

    private lerp = (a: number, b: number, t: number): number => {
        return a + (b - a) * t;
    }

}