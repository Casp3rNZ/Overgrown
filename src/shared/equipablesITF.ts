interface Equipable {
    name: string;
    type: "gun" | "melee" | "grenade" | "tool" | "armor";
    modelPath: string;
    iconPath?: string;
    description?: string;
    physics?: {
        mass?: number;
        friction?: number; // Friction coefficient for the equipable item.
        restitution?: number; // Bounciness of the equipable item.
        collisionGroup?: number; // for babylon
        collisionMask?: number; // also for babylon, but might become obsolete (idk yet)
    };
    viewmodel: {
        offset_x: number;
        offset_y: number;
        offset_z: number;
        bob_cycle: number;
        bob_amt_lat: number;
        bob_amt_vert: number;
        bob_lower_amt: number;
    }
    fireSound: string;
}

export interface Gun extends Equipable {
    // in development currently
    type: "gun";
    stats: {
        damage: number;
        range: number;
        fireRate: number;
        magazineSize: number;
        reloadTime: number;
        durability: number;
        ammoType?: string;
    };
}

export interface Melee extends Equipable {
    // not implemented yet
    type: "melee";
    stats: {
        damage: number;
        range: number;
        durability: number;
    };
}

export interface Grenade extends Equipable {
    // not implemented yet
    type: "grenade";
    stats: {
        damage: number;
        blastRadius: number;
        throwRange: number;
        durability: number;
    };
}

export interface Tool extends Equipable {
    // not implemented yet
    type: "tool";
    stats: {
        durability: number;
    };
}

export interface Armor extends Equipable {
    // not implemented yet
    type: "armor";
    stats: {
        durability: number;
        protection: number;
    };
}

export type EquipableItem = Gun | Melee | Grenade | Tool | Armor;