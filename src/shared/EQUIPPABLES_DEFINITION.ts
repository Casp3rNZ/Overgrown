import { EquipableItem } from "./equipablesITF";
const DEFAULT_BOB_CYCLE = 6;
const DEFAULT_BOB_AMT_LAT = 0.004;
const DEFAULT_BOB_AMT_VERT = 0.001;
const DEFAULT_BOB_LOWER_AMT = 0.01;

export const EQUIPPABLES: Record<number, EquipableItem> = {
    0: {
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
            bob_lower_amt: DEFAULT_BOB_LOWER_AMT
        },
        stats: {
            damage: 12,
            range: 65,
            fireRate: 0.25,
            magazineSize: 7,
            reloadTime: 1.5,
            durability: 100,
            //ammoType: ".45ACP"
        },
        modelPath: "/assets/weapons/colt.glb",
        fireSound: "coltShot"
    },
    1: {
        type: "gun",
        name: "AK-47",
        description: "Cheeki Breeki",
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
            bob_lower_amt: DEFAULT_BOB_LOWER_AMT
        },
        stats: {
            damage: 30,
            range: 150,
            fireRate: 0.1,
            magazineSize: 30,
            reloadTime: 2.5,
            durability: 150,
            //ammoType: "7.62x39mm"
        },
        modelPath: "/assets/weapons/AK47.glb",
        fireSound: "AKShot"
    }

};