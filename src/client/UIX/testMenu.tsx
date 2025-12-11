import { useRef, useEffect } from "preact/hooks";
import { Engine } from "@babylonjs/core";
import { LoadSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/core/Loading/Plugins/babylonFileLoader";

export function TestMenu() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        if (!canvasRef.current) return undefined;
        console.log("Loading menu scene...");

        let engine: Engine | null = null;
        let scene = null;

        async function sceneLoader() {
            try {
                engine = new Engine(canvasRef.current, true, {
                    stencil: true,
                    antialias: true,
                    adaptToDeviceRatio: true,
                    powerPreference: "high-performance",
                });
                
                // Fetch the scene file as text to inspect/fix it
                const response = await fetch("/scenes/scene.babylon");
                const sceneText = await response.text();
                const sceneData = JSON.parse(sceneText);
                
                // Remove physics references (we don't need CANNON.js)
                if (sceneData.physicsEngine) {
                    delete sceneData.physicsEngine;
                }
                
                // Clean up problematic material references
                if (sceneData.materials) {
                    sceneData.materials.forEach((mat: any) => {
                        if (mat.customType === "BABYLON.SkyMaterial") {
                            delete mat.customType;
                        }
                    });
                }
                
                // Load scene from the modified data
                scene = await LoadSceneAsync("data:" + JSON.stringify(sceneData), engine);
                
                console.log("Scene loaded successfully");

                // Setup camera controls
                if (scene.activeCamera) {
                    // Attach controls to existing camera from scene file
                    scene.activeCamera.attachControl(canvasRef.current, true);
                }

                // Start render loop
                engine.runRenderLoop(() => {
                    scene?.render();
                });

            } catch (error) {
                console.error("Failed to load scene:", error);
            }
        }

        sceneLoader();

        // Handle resize
        const resizeListener = () => engine?.resize();
        window.addEventListener("resize", resizeListener);

        // Cleanup
        return () => {
            window.removeEventListener("resize", resizeListener);
            scene?.dispose();
            engine?.dispose();
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            id="renderCanvas" 
            style={{ width: '100%', height: '100vh', display: 'block' }} 
        />
    );
}