import { PlayerState } from "./movement.js";

// Define collision objects
export interface CollisionObject {
    position: { x: number; y: number; z: number };
    size: { width: number; height: number; depth: number };
}

// Define collision boxes for static objects
export const staticColliders: CollisionObject[] = [
    // Ground
    // {
    //     position: { x: 0, y: -1, z: 0 },
    //     size: { width: 100, height: 0, depth: 100 }
    // },
    // Box
    {
        position: { x: 5, y: -1, z: -5 },
        size: { width: 10, height: 3, depth: 1 }
    }
];

// Player collision box size
export const PLAYER_SIZE = {
    width: 1,
    height: 2,
    depth: 1
};

// Check collision between two boxes
export function checkBoxCollision(
    pos1: { x: number; y: number; z: number },
    size1: { width: number; height: number; depth: number },
    pos2: { x: number; y: number; z: number },
    size2: { width: number; height: number; depth: number }
): boolean {
    return (
        pos1.x - size1.width/2 < pos2.x + size2.width/2 &&
        pos1.x + size1.width/2 > pos2.x - size2.width/2 &&
        pos1.y - size1.height/2 < pos2.y + size2.height/2 &&
        pos1.y + size1.height/2 > pos2.y - size2.height/2 &&
        pos1.z - size1.depth/2 < pos2.z + size2.depth/2 &&
        pos1.z + size1.depth/2 > pos2.z - size2.depth/2
    );
}

// Resolve collision by pushing the player out
export function resolveCollision(
    playerPos: { x: number; y: number; z: number },
    playerSize: { width: number; height: number; depth: number },
    objectPos: { x: number; y: number; z: number },
    objectSize: { width: number; height: number; depth: number }
): { x: number; y: number; z: number } {
    const dx = playerPos.x - objectPos.x;
    const dy = playerPos.y - objectPos.y;
    const dz = playerPos.z - objectPos.z;
    
    const minDistX = (playerSize.width + objectSize.width) / 2;
    const minDistY = (playerSize.height + objectSize.height) / 2;
    const minDistZ = (playerSize.depth + objectSize.depth) / 2;
    
    let newPos = { ...playerPos };
    
    // Push out in the direction of least penetration
    if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY && Math.abs(dz) < minDistZ) {
        const pushX = minDistX - Math.abs(dx);
        const pushY = minDistY - Math.abs(dy);
        const pushZ = minDistZ - Math.abs(dz);
        
        if (pushX < pushY && pushX < pushZ) {
            newPos.x += Math.sign(dx) * pushX;
        } else if (pushY < pushZ) {
            newPos.y += Math.sign(dy) * pushY;
        } else {
            newPos.z += Math.sign(dz) * pushZ;
        }
    }
    
    return newPos;
}

// Check and resolve collisions for a player
export function handleCollisions(
    playerState: PlayerState,
    otherPlayers: { [id: string]: PlayerState }
): { position: { x: number; y: number; z: number } } | null {
    let correctedPosition = { ...playerState.position };
    let collisionOccurred = false;
    
    // Check collisions with static objects
    for (const collider of staticColliders) {
        if (checkBoxCollision(
            correctedPosition,
            PLAYER_SIZE,
            collider.position,
            collider.size
        )) {
            correctedPosition = resolveCollision(
                correctedPosition,
                PLAYER_SIZE,
                collider.position,
                collider.size
            );
            collisionOccurred = true;
        }
    }
    
    // Check collisions with other players
    for (const [id, otherPlayer] of Object.entries(otherPlayers)) {
        if (otherPlayer === playerState) continue; // Skip self
        
        if (checkBoxCollision(
            correctedPosition,
            PLAYER_SIZE,
            otherPlayer.position,
            PLAYER_SIZE
        )) {
            correctedPosition = resolveCollision(
                correctedPosition,
                PLAYER_SIZE,
                otherPlayer.position,
                PLAYER_SIZE
            );
            collisionOccurred = true;
        }
    }
    
    if (collisionOccurred) {
        return { position: correctedPosition };
    }
    
    return null;
} 