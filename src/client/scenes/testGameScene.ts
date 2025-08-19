import {Scene, HemisphericLight, ShadowGenerator, MeshBuilder, StandardMaterial, Color3, Vector3, DirectionalLight, Color4 } from "@babylonjs/core";
import { MeshCache } from "./meshCache";

export function createGameScene(scene: Scene) {
    MeshCache.preloadAllMeshes(scene);
    
    // Set the background color of the scene
    scene.clearColor = new Color4(0.5, 0.7, 1, 1);

    // Create grounds/landscape
    const ground = MeshBuilder.CreateGround("ground", { 
        width: 100, 
        height: 100
    }, scene);
    ground.position.y = -1;
    ground.checkCollisions = true;

    // Create a directional light
    const light = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
    light.position = new Vector3(20, 40, 20);
    light.intensity = 0.7;
    // Create a material for the ground
    const groundMaterial = new StandardMaterial("groundMaterial", scene);
    // Add a hemispheric light for ambient lighting
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.1;
    //light blue color
    groundMaterial.diffuseColor = new Color3(0.5, 0.7, 1);
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;

    // Add a simple box
    const box = MeshBuilder.CreateBox("box", { 
        width: 10,
        height: 3,
        depth: 1,
    }, scene);
    box.position = new Vector3(5, 0, -5);
    box.checkCollisions = true;

    // Enable Shadows
    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.addShadowCaster(box);
    ground.receiveShadows = true;
    (scene as any).shadowGenerator = shadowGenerator;
    return { ground, box }
}