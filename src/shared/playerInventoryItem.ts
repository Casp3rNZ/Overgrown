import { EQUIPPABLES } from "./EQUIPPABLES_DEFINITION.js";

export class PlayerInventoryItem {
    public equipableId: number | null = null;
    public instanceId: string;
    public ammo: number | null = null;
    public maxAmmo: number | null = null;
    public durability: number | null = null;

    constructor(equipableId: number, instanceId: string) {
        this.instanceId = instanceId;
        this.equipableId = equipableId;
        const equipable = EQUIPPABLES[equipableId];
        switch (equipable?.type) {
            case "gun":
                this.initGun();
                break;
            default:
                console.warn(`PII:Init - Equipable type ${equipable?.type} not handled.`);
                break;
        }
    }

    public initGun(): void {
        //console.log(`PII:InitGun - Initializing gun with ID ${this.equipableId}`);
        const equipable = EQUIPPABLES[this.equipableId];
        if (equipable) {
            this.ammo = equipable.gunStats.magazineSize || null;
            this.maxAmmo = equipable.gunStats.magazineSize || null;
            this.durability = equipable.gunStats.durability || null;
        } else {
            console.warn(`PII:InitGun - Gun with ID ${this.equipableId} does not exist.`);
        }
    }
}