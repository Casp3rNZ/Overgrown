import { EquipableItem } from "./equipablesITF";

const DEFAULT_BOB_CYCLE = 6;
const DEFAULT_BOB_AMT_LAT = 0.004;
const DEFAULT_BOB_AMT_VERT = 0.001;
const DEFAULT_BOB_LOWER_AMT = 0.01;

    // BabylonJS uses a right-handed coordinate system
    // x: + Right - Left
    // y: + Down - Up
    // z: + Forward - Backward

export const EQUIPPABLES: Record<number, EquipableItem> = {
    0: { // Pistol - Colt
        type: "gun",
        name: "Colt",
        description: "A classic pistol",
        viewmodel: {
            offset_x: 0.2,
            offset_y: -0.12,
            offset_z: 0.2,
            offset_rotation_x: 0,
            offset_rotation_y: Math.PI / -2,
            offset_rotation_z: 0,
            bob_cycle: DEFAULT_BOB_CYCLE,
            bob_amt_lat: DEFAULT_BOB_AMT_LAT,
            bob_amt_vert: DEFAULT_BOB_AMT_VERT,
            bob_lower_amt: DEFAULT_BOB_LOWER_AMT,
            kickback_speed: 0.02
        },
        gunStats: {
            damage: 12,
            range: 65,
            fireRate: 7,
            magazineSize: 7,
            reloadTime: 1.5,
            durability: 100,
            fireModes: {
                single: true,
                auto: false
            }
        },
        modelPath: "/assets/weapons/colt.glb",
        fireSound: "coltShot",
    },
    1: { // Rifle - AK-47
        type: "gun",
        name: "AK-47",
        description: "Cheeki Breeki",
        viewmodel: {
            offset_x: 0.10,
            offset_y: -0.08,
            offset_z: 0.08,
            offset_rotation_x: 0,
            offset_rotation_y: Math.PI / -2,
            offset_rotation_z: 0,
            bob_cycle: DEFAULT_BOB_CYCLE,
            bob_amt_lat: DEFAULT_BOB_AMT_LAT,
            bob_amt_vert: DEFAULT_BOB_AMT_VERT,
            bob_lower_amt: DEFAULT_BOB_LOWER_AMT,
            kickback_speed: 0.01
        },
        gunStats: {
            damage: 30,
            range: 150,
            fireRate: 10,
            magazineSize: 30,
            reloadTime: 2.5,
            durability: 150,
            fireModes: {
                single: true,
                auto: true
            },
        },
        modelPath: "/assets/weapons/AK47.glb",
        fireSound: "AKShot"
    }

};