import { useEffect, useRef, useState } from "preact/hooks";
import { ChatBox } from "./chatBox";
import { Crosshair } from "./crosshair";
import Game from "../App";
import { render } from "preact";
import { HUD } from "./HUD";
import { DeathScreen } from "./deathScreen";
import { initAudioEngine } from "../sound/audioEngine";
import { UserAuthForm } from "./userAuthForm";
import '../CSS/gameUI.css';

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        // Pointer lock change
        const handleCanvasClick = () => {
            if (document.pointerLockElement === canvas) {
                return; // Already locked
            }
            initAudioEngine(game.scene);
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
        canvas.addEventListener("pointerlockchange", handlePointerLockChange);

        // Keyboard/game controls and chat toggle
        const handleKeyDown = (event: KeyboardEvent) => {
            if (document.activeElement === chatInputRef.current) return;
            const localPlayer = game.playerManager.getLocalPlayer();
            if (!localPlayer) return;
            if (event.key === "Enter" && document.pointerLockElement === canvas) {
                chatInputRef.current?.focus();
                document.exitPointerLock();
            }else if(event.key === "Escape"){
                if (document.pointerLockElement == chatInputRef.current) {
                    canvas.focus();
                    canvas.requestPointerLock();
                }else {
                    document.exitPointerLock();
                }
            }else {
                localPlayer.handleKeyboardInput(event, true);
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

        // expose the setIsDead function to main loop
        game.setIsDead = setIsDead;

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
    const uiRoot = document.getElementById("ui-root") as HTMLDivElement | null;
    if (uiRoot) {
        render(<UserAuthForm />, uiRoot);
    } else {
        console.error("Error loading UI");
    }
});

function loadGameScene () {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const uiRoot = document.getElementById("ui-root") as HTMLDivElement | null;
    if (canvas && uiRoot) {
        const game = new Game(canvas);
        render(<UIRoot game={game} />, uiRoot);
    } else {
        console.error("Error loading UI");
    }
}