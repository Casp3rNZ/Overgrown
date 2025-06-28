import { useEffect, useRef, useState } from "preact/hooks";
import { PlayerManager } from '../entities/playerManager';

interface HUDProps {
    playerManager: PlayerManager;
}

export function HUD ({ playerManager }: HUDProps) {
    const [health, setHealth] = useState(100);
    const [ammo, setAmmo] = useState(0);
    const [magSize, setMagSize] = useState(0);
    const [equippedItem, setEquippedItem] = useState(-1);

    useEffect(() => {
        const hudPollingInterval = setInterval(() => {
            const localPlayer = playerManager.getLocalPlayer();
            if (!localPlayer) return;
            setHealth(localPlayer.health);
        }, 100); // Poll every 100ms
    });

    return (
        <div class="HUD">
            <div class="HP">HP: {health}</div>
        </div>
    )

}