import { Scene, AbstractMesh, ImportMeshAsync, TransformNode, AnimationGroup } from "@babylonjs/core";
import { EQUIPPABLES } from "../../shared/EQUIPPABLES_DEFINITION";

type MeshCacheEntry = {
    mesh: AbstractMesh;
    animationGroups: AnimationGroup[];
};

export class MeshCache {
    private static cache: Map<string, MeshCacheEntry> = new Map();

    static async preloadAllMeshes(scene: Scene): Promise<void> {
        // equippables meshes
        for (const [id, item] of Object.entries(EQUIPPABLES)) {
            await this.preloadMesh(id, item.modelPath, scene);
        }
        // player mesh
        await this.preloadMesh("player", "/assets/playerModels/testPlayer.glb", scene);
    }

    static async preloadMesh(key: string, path: string, scene: Scene): Promise<void> {
        if(this.cache.has(key)) return;
        const result = await ImportMeshAsync(path, scene);

        const root = result.meshes[0];
        root.setEnabled(false);
        root.isVisible = false;
        root.getChildMeshes().forEach(child => {
            child.setEnabled(false);
            child.isVisible = false;
        });
        this.cache.set(key, {
            mesh: root,
            animationGroups: result.animationGroups,
        });
    }
    // Clone operation is okay because each mesh is disposed on unequip
    static getMeshCacheEntry(key: string): MeshCacheEntry {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        const clone = entry.mesh.clone(`${key}_clone`, null, false);
        clone.setEnabled(true);
        clone.isVisible = true;
        clone.getChildMeshes(false).forEach(mesh => {
            mesh.isVisible = true;
            mesh.setEnabled(true);
        });
        return {
            mesh: clone,
            animationGroups: entry.animationGroups,
        };
    }
}