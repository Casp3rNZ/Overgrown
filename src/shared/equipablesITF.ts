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
        offset_rotation_x: number;
        offset_rotation_y: number;
        offset_rotation_z: number;
        bob_cycle: number;
        bob_amt_lat: number;
        bob_amt_vert: number;
        bob_lower_amt: number;
        kickback_speed: number;
    }
}

interface fireModes {
    single: boolean;
    auto: boolean;
}

export interface Gun extends Equipable {
    // in development currently
    type: "gun";
    gunStats: {
        damage: number;
        range: number;
        fireRate: number;
        fireModes?: fireModes;
        magazineSize: number;
        reloadTime: number;
        durability: number;
    };
    fireSound: string;
}

export type EquipableItem = Gun;