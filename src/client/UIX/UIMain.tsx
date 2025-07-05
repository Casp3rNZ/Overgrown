import { useEffect, useRef, useState } from "preact/hooks";
import { ChatBox } from "./chatBox";
import { Crosshair } from "./crosshair";
import Game from "../App";
import { render } from "preact";
import { HUD } from "./HUD";
import { DeathScreen } from "./deathScreen";

export function UIRoot({ game }) {
    const [chatVisible, setChatVisible] = useState(true);
    const [messages, setMessages] = useState([]);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDead, setIsDead] = useState(false);

    // Attach canvas ref after mount
    useEffect(() => {
        canvasRef.current = document.getElementById("renderCanvas") as HTMLCanvasElement;
        chatInputRef.current = document.getElementById("chat-input") as HTMLInputElement;
    }, []);

    // Pointer lock and keyboard/game controls
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        // Pointer lock change
        const handleCanvasClick = () => {
            if (document.pointerLockElement === canvas) {
                return; // Already locked
            }
            canvas.requestPointerLock();
        };
        canvas.addEventListener("click", handleCanvasClick);
        
        const handlePointerLockChange = () => {
            if (document.pointerLockElement === canvas) {
                console.log("Pointer locked");
            } else {
                console.log("Pointer unlocked");
            }
        };
        document.addEventListener("pointerlockchange", handlePointerLockChange);

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                document.exitPointerLock();
                // if game is not focused, refocus canvas
                if (document.pointerLockElement !== canvas) {
                    canvas.focus();
                    canvas.requestPointerLock();
                }
            }
        };
        document.addEventListener("keydown", handleEscape);

        // Keyboard/game controls and chat toggle
        const handleKeyDown = (event: KeyboardEvent) => {
        if (document.activeElement === chatInputRef.current) return;
        const localPlayer = game.playerManager.getLocalPlayer();
        if (!localPlayer) return;

        if (event.key !== "Enter" && document.pointerLockElement === canvas) {
            // Game controls
            localPlayer.handleKeyboardInput(event, true);
            } else if (event.key === "Enter" && document.pointerLockElement === canvas) {
                // Open chat
                setTimeout(() => {
                    chatInputRef.current?.focus();
                }, 0);
                document.exitPointerLock();
            }
        };
        canvas.addEventListener("keydown", handleKeyDown);

        // Handle key up for game controls
        const handleKeyUp = (event: KeyboardEvent) => {
            const localPlayer = game.playerManager.getLocalPlayer();
            if (!localPlayer) return;
            localPlayer.handleKeyboardInput(event, false);
        };
        document.addEventListener("keyup", handleKeyUp);

        // Handle chat input
        game.network.onChatMessage = (data: any) => {
            console.log("Received chat message:", data);
            setMessages(msgs => [...msgs, data]);
        };

        // Handle death event
        game.network.onPlayerDeath = (playerId: string) => {
            const localPlayer = game.playerManager.getLocalPlayer();
            if (localPlayer && localPlayer.playerId === playerId) {
                setIsDead(true);
            }
        };

        // Handle respawn event
        game.network.onRespawnConfirmed = (data: any) => {
            const localPlayer = game.playerManager.getLocalPlayer();
            if (localPlayer && localPlayer.playerId === data.playerId) {
                setIsDead(false);
            }
        };

    }, [game]);

    // Chat input submission handler
    const handleChatSend = (message: string) => {
        if (message.trim().length > 0) {
            console.log("Sending chat message:", message);
            game.network.sendChatMessage(message);
        }
        // Refocus canvas and re-lock pointer
        canvasRef.current?.focus();
        canvasRef.current?.requestPointerLock();
    };

    return (
    <div>
        <Crosshair />
        <ChatBox
            messages={messages}
            onSend={handleChatSend}
            visible={chatVisible}
        />
        <HUD playerManager={game.playerManager} />
        {isDead && <DeathScreen/>}
        
        {/* Other UI components */}
    </div>
    );
}

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const uiRoot = document.getElementById("ui-root") as HTMLDivElement | null;
    if (canvas && uiRoot) {
        const game = new Game(canvas);
        render(<UIRoot game={game} />, uiRoot);
    } else {
        console.error("Error loading Preact UI");
    }
});