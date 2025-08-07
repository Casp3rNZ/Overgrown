import { useEffect, useState } from "preact/hooks";
import { PlayerManager } from '../entities/playerManager';
import { EQUIPPABLES } from "../../shared/EQUIPPABLES_DEFINITION";

interface HUDProps {
    playerManager: PlayerManager;
}

export function HUD ({ playerManager }: HUDProps) {
    const [health, setHealth] = useState(100);
    const [ammo, setAmmo] = useState(0);
    const [magSize, setMagSize] = useState(0);
    const [equippedItem, setEquippedItem] = useState(null);

    useEffect(() => {
        const hudPollingInterval = setInterval(() => {
            const localPlayer = playerManager.getLocalPlayer();
            if (!localPlayer) return;
            setHealth(localPlayer.health);
            if (localPlayer.input.equippedItemID <= -1) {
                setAmmo(0);
                setMagSize(0);
                setEquippedItem(null);
                return;
            }
            const newItem = EQUIPPABLES[localPlayer.input.equippedItemID];
            if (!equippedItem || newItem != equippedItem) {
                switch (newItem.type) {
                    case "gun":
                        setAmmo(localPlayer.viewModel.equippedItem.ammo);
                        setMagSize(newItem.gunStats.magazineSize);
                        break;
                    default:
                        setAmmo(0);
                        setMagSize(0);
                        break;
                }
                setEquippedItem(newItem);
            }
        }, 100); // Poll every 100ms
    });

    return (
        <div class="HUD">
            <div class="Ammo"> {ammo}/{magSize} </div>
            <div class="HP"> {health}</div>
        </div>
    )

}