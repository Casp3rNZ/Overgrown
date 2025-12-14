import { useRef, useEffect, useState } from "preact/hooks";
import { Engine } from "@babylonjs/core";
import { LoadSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import "../CSS/mainMenu.css";

export function MainMenu({ loadDevTestGameScene }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<any>(null);
    const [engineLoaded, setEngineLoaded] = useState(false);
    
    const handleStartGame = () => {
        console.log("Disposing menu scene before starting game...");
        if (sceneRef.current) {
            sceneRef.current.dispose();
            sceneRef.current = null;
        }
        if (engineRef.current) {
            engineRef.current.dispose();
            engineRef.current = null;
        }
        loadDevTestGameScene();
    };

    useEffect(() => {
        canvasRef.current = document.getElementById("renderCanvas") as HTMLCanvasElement;
        if (!canvasRef.current) return undefined;
        console.log("Loading menu scene...");

        async function sceneLoader() {
            try {
                engineRef.current = new Engine(canvasRef.current, true, {
                    stencil: true,
                    antialias: true,
                    adaptToDeviceRatio: true,
                    powerPreference: "high-performance",
                });
                
                const response = await fetch("/scenes/scene.babylon");
                const sceneText = await response.text();
                const sceneData = JSON.parse(sceneText);
                
                // Clean up problematic material references from babylonjs editor exports
                if (sceneData.materials) {
                    sceneData.materials.forEach((mat: any) => {
                        if (mat.customType === "BABYLON.SkyMaterial") {
                            delete mat.customType;
                        }
                    });
                }
                // Load scene from the modified data
                sceneRef.current = await LoadSceneAsync("data:" + JSON.stringify(sceneData), engineRef.current);
                console.log("Scene loaded successfully");
                setEngineLoaded(true);
            } catch (error) {
                console.error("Failed to load scene:", error);
            }
        }
        sceneLoader();

        // Start render loop
        engineRef.current.runRenderLoop(() => {
            sceneRef.current?.render();
        });

        // Handle resize
        const resizeListener = () => engineRef.current?.resize();
        window.addEventListener("resize", resizeListener);

        // Cleanup
        return () => {
            window.removeEventListener("resize", resizeListener);
            sceneRef.current?.dispose();
            engineRef.current?.dispose();
        };
    }, []);

    return (
        engineLoaded ? 
        <div className="main-menu">
            <div className="main-menu-header">
                <h1>Overgrown</h1>
                <p>Browser FPS game</p>
            </div>
            <div className="main-menu-options">
                <ul className="main-menu-options-list">
                    <li><button onClick={handleStartGame}>Start Dev Test Game</button></li>
                    <li><button disabled>Multiplayer (Coming Soon)</button></li>
                    <li><button disabled>Settings (Coming Soon)</button></li>
                    <li><button disabled>Credits (Coming Soon)</button></li>
                </ul>
            </div>
        </div> 
        : 
        <div className="loading-screen">
            <h2>Loading Main Menu...</h2>
        </div>
    );
}