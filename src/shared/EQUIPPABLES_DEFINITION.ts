import { EquipableItem } from "./equipablesITF";

export const EQUIPPABLES: Record<number, EquipableItem> = {
    0: {
        type: "gun",
        name: "Colt",
        description: "A classic pistol",
        viewmodel: {
            offset_x: 0.2,
            offset_y: -0.12,
            offset_z: 0.2,
            bob_cycle: 5,
            bob_amt_lat: 0.01,
            bob_amt_vert: 0.001,
            bob_lower_amt: 0.01
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
    },
    1: {
        type: "gun",
        name: "AK-47",
        description: "Cheeki Breeki",
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
    }

};