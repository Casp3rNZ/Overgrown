import { Scene, AbstractMesh, ImportMeshAsync, Vector3, MeshBuilder, Color3, StandardMaterial, PointLight } from "@babylonjs/core";
import { EQUIPPABLES } from "../../../shared/EQUIPPABLES_DEFINITION.js";
import { PlayerInventoryItem } from "../../../shared/playerInventoryItem.js";
import { MeshCache } from "../../scenes/meshCache.js";
export class ViewModel {
    public gunMesh: AbstractMesh | null = null;
    private bobTime: number = 0;
    private equippedItem:  PlayerInventoryItem | null = null;
    private muzzleEnd: any = null;
    private recoilOffset = 0;
    private recoilVelocity = 0;
    private maxRecoilOffset = 0.04;
    private smoothedWeaponPosition: Vector3 = new Vector3(0, 0, 0);
    private smoothedWeaponRotation: Vector3 = new Vector3(0, Math.PI / -2, 0);
    private isReloading: boolean = false;
    private reloadTimeout: any = null;

    // IK LEGEND FOR GUN MODELS:
    // Left hand grip = "IK_Grip_L"
    // Right hand grip = "IK_Grip_R"
    // Muzzle end = "Muzzle_Origin"
    // Muzzle end + 1 unit forward (aim direction) = "Aim_Reference"

    // client-side gun model handled by viewmodel
    // remote player gun models, and upper body animations handled by IK system (not built yet)

    constructor(private camera: any) {}

    public async loadModel(item: PlayerInventoryItem): Promise<void> {
        try {
            if (item == null || item.equipableId == -1) {
                if (this.gunMesh) {
                    this.gunMesh.dispose();
                    this.gunMesh = null;
                }
                return;
            }
            if (!EQUIPPABLES[item.equipableId]) {
                throw new Error(`Item with ID ${item.equipableId} does not exist in EQUIPPABLES.`);
            }
            if (this.reloadTimeout) {
                clearTimeout(this.reloadTimeout);
                this.reloadTimeout = null;
                this.isReloading = false;
            }
            if (this.gunMesh) {
                this.recoilVelocity = 0;
                this.recoilOffset = 0;
                this.gunMesh.dispose();
            }
            const newItem = EQUIPPABLES[item.equipableId];
            // Load the gun model
            const model = MeshCache.getMeshCacheEntry(item.equipableId.toString());
            this.equippedItem = item;
            this.gunMesh = model.mesh;
            this.gunMesh.parent = this.camera;
            // Make client-side gun model invisible to physics and raycasting
            this.gunMesh.isPickable = false;
            // Fix blender import rotation (rotation is 90 degrees off)
            this.gunMesh.rotation = new Vector3(0, Math.PI / -2, 0);
            this.gunMesh.position = new Vector3(
                newItem.viewmodel.offset_x,
                newItem.viewmodel.offset_y,
                newItem.viewmodel.offset_z
            );

            // load mount points for IK
            this.muzzleEnd = model.mesh.getChildTransformNodes(false).find(node => node.name.includes("Muzzle_Origin"));
            if (!this.muzzleEnd) {
                console.error("Muzzle_Origin not found in gun mesh!", this.gunMesh);
            }else{
                //this.muzzleEnd.scaling = new Vector3(0.01, 0.01, 0.01);
                this.muzzleEnd.scaling = new Vector3(0.2, 0.2, 0.2);
            }
            //console.log(`Loaded gun model: ${equippedItem.name} with ID: ${id}`);
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
        var equippedItem = EQUIPPABLES[this.equippedItem.equipableId];

        // Movement Bob
        if (isMoving) {
            this.bobTime += deltaTime * equippedItem.viewmodel.bob_cycle;
        }else {
            this.bobTime = 0;
        }
        const bobZ = Math.sin(this.bobTime) * equippedItem.viewmodel.bob_cycle * equippedItem.viewmodel.bob_amt_lat;
        const bobY = Math.abs(Math.cos(this.bobTime)) * equippedItem.viewmodel.bob_cycle * equippedItem.viewmodel.bob_amt_vert;
        const lower = isMoving ? equippedItem.viewmodel.bob_lower_amt * 0.01 : 0;

        const newWeaponPosition = new Vector3(
            equippedItem.viewmodel.offset_x,
            equippedItem.viewmodel.offset_y - lower + bobY,
            equippedItem.viewmodel.offset_z + bobZ
        );
        const newWeaponRotation = new Vector3(
            equippedItem.viewmodel.offset_rotation_x,
            equippedItem.viewmodel.offset_rotation_y,
            equippedItem.viewmodel.offset_rotation_z
        );

        // Shooting Recoil
        if (this.recoilVelocity > 0) {
            // Calculate
            this.recoilOffset += this.recoilVelocity;
            this.recoilVelocity -= deltaTime * equippedItem.viewmodel.kickback_speed;
            // Clamp
            if (this.recoilOffset < 0 || this.recoilOffset > this.maxRecoilOffset) {
                this.recoilOffset = 0;
                this.recoilVelocity = 0;
            }

            newWeaponPosition.z -= this.recoilOffset;
            newWeaponRotation.z += this.recoilOffset * 5;
            newWeaponRotation.x += (Math.random() - 0.5) * this.recoilOffset * 10;
        }

        // Makeshift reload animation
        if (this.isReloading) {
            // Need to add these into weapon class
            newWeaponPosition.y -= 0.05;
            newWeaponPosition.x -= 0.05;
            newWeaponRotation.x += 0.1;
            newWeaponRotation.z -= 0.5;
        }

        // Lerp initial position values
        this.smoothedWeaponPosition.x = this.lerp(this.smoothedWeaponPosition.x, newWeaponPosition.x, lerpSmooth);
        this.smoothedWeaponPosition.y = this.lerp(this.smoothedWeaponPosition.y, newWeaponPosition.y, lerpSmooth);
        this.smoothedWeaponPosition.z = this.lerp(this.smoothedWeaponPosition.z, newWeaponPosition.z, lerpSmooth);
        
        // Lerp initial rotation values
        this.smoothedWeaponRotation.x = this.lerp(this.smoothedWeaponRotation.x, newWeaponRotation.x, lerpSmooth);
        //this.smoothedWeaponRotation.y = this.lerp(this.smoothedWeaponRotation.y, newWeaponRotation.y, lerpSmooth);
        this.smoothedWeaponRotation.z = this.lerp(this.smoothedWeaponRotation.z, newWeaponRotation.z, lerpSmooth);
        
        this.gunMesh.position = this.smoothedWeaponPosition;
        this.gunMesh.rotation = this.smoothedWeaponRotation;
    }

    public shoot(scene: Scene): any {
        if(!this.gunMesh || !this.muzzleEnd) {
            console.warn("No gun mesh loaded to shoot.");
            return;
        }
        this.playMuzzleFlash(scene);
        this.recoil(0.01);
        if(this.equippedItem.ammo < 0) {
            this.equippedItem.ammo = 0;
        }else{
            this.equippedItem.ammo--;
        }
        //TODO:
        // Barrel Smoke
        // Bullet Cartridge Eject
        // Aim Recoil patterns
        // Weapon Model Animations for trigger, firing pin/bolt etc (meshes not configured via blender yet).
    }

    private async recoil(strength) {
        if (!this.gunMesh || !this.muzzleEnd) {
            console.warn("No gun mesh loaded to apply recoil.");
            return;
        }
        this.recoilVelocity += strength;
    }

    public reloadGun() {
        // no serverside validation for reloading yet
        if(!this.gunMesh || !this.muzzleEnd) {
            console.warn("No gun mesh loaded to reload.");
            return;
        }
        const equippedItem = EQUIPPABLES[this.equippedItem.equipableId];
        if (!equippedItem || equippedItem.type !== "gun") {
            console.warn(`Equipped item with ID ${this.equippedItem.equipableId} is not a gun.`);
            return;
        }
        if (this.isReloading || this.equippedItem.ammo >= this.equippedItem.maxAmmo) {
            return;
        }
        this.isReloading = true;
        this.recoilVelocity = 0;
        this.recoilOffset = 0;
        this.reloadTimeout = setTimeout(() => {
            if (EQUIPPABLES[this.equippedItem.equipableId] !== equippedItem) {
                this.isReloading = false;
                this.reloadTimeout = null;
                console.warn(`Equipped gun ID changed during reload, cancelling reload.`);
                return;
            }
            this.equippedItem.ammo = equippedItem.gunStats.magazineSize;
            this.reloadTimeout = null;
            this.isReloading = false;
        }, equippedItem.gunStats.reloadTime * 1000);
    }

    public isReadyToShoot(): boolean {
        if(this.isReloading || this.equippedItem.ammo <= 0) {
            return false;
        }else if(!this.gunMesh || !this.muzzleEnd) {
            console.warn(`No gun mesh loaded to check readiness. mesh: ${this.gunMesh}, muzzleEnd: ${this.muzzleEnd}, equippedGunID: ${this.equippedItem.equipableId}`);
            return false;
        } else {
            return true;
        }
    }

    private playMuzzleFlash(scene: Scene) {
        if (!this.muzzleEnd) return;
        // Create a small plane for the flash
        // there is currently a bug where the mesh is somehow bigger when equipping different guns.
        const minSize = 0.02;
        const maxSize = 0.04;
        const flashSize = Math.random() * (maxSize - minSize) + minSize;
        const flashMat = new StandardMaterial("muzzleFlashMat", scene);
        flashMat.emissiveColor = new Color3(1, 0.9 + Math.random() * 0.1, 0.6 + Math.random() * 0.2);
        flashMat.disableLighting = false;
        const flashMesh = MeshBuilder.CreatePlane("muzzleFlash", { size: flashSize }, scene);
        flashMesh.material = flashMat;
        flashMesh.parent = this.muzzleEnd;
        flashMesh.rotation = new Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        // Basic light flash
        const flashLight = new PointLight("muzzleFlashLight", this.muzzleEnd.getAbsolutePosition(), scene);
        flashLight.diffuse = new Color3(1, 0.8, 0.6);
        flashLight.intensity = 0.5;
        flashLight.range = 10;

        setTimeout(() => {
            flashMesh.dispose();
            flashLight.dispose();
        }, 50);
}

    private lerp = (a: number, b: number, t: number): number => {
        return a + (b - a) * t;
    }

    public getEquippedItem(): PlayerInventoryItem | null {
        return this.equippedItem;
    }

}