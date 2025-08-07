import { PlayerInventoryItem } from "./playerInventoryItem";

// CS-GO / Battlefield inspired inventory system.
// Designed for basic arena shooter gamemodes, no grid system for extraction shooter gamemode yet.
// - Not implemented yet.
export type InventorySlot = "primary" | "secondary" | "melee" | "grenade" | "utility";
export class PlayerInventory {
    private slots: Record<InventorySlot, PlayerInventoryItem | null> = {
        primary: null,
        secondary: null,
        melee: null,
        grenade: null,
        utility: null
    };
    
    public addItem(slot: InventorySlot, item: PlayerInventoryItem): void {
        this.slots[slot] = item;
    }

    public removeItem(slot: InventorySlot): void {
        this.slots[slot] = null;
    }

    public getItemInSlot(slot: InventorySlot): PlayerInventoryItem | null {
        return this.slots[slot];
    }

    public getAllItems(): Record<InventorySlot, PlayerInventoryItem | null> {
        return this.slots;
    }
    
    public clearInventory(): void {
        for (const slot in this.slots) {
            this.slots[slot as InventorySlot] = null;
        }
    }

    public hasItemInSlot(slot: InventorySlot): boolean {
        return this.slots[slot] !== null;
    }
}