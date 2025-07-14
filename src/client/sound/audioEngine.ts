import { Scene, AudioEngineV2, CreateSoundAsync, CreateSoundBufferAsync, Mesh, CreateAudioEngineAsync, SpatialAudioAttachmentType, AbstractMesh } from "@babylonjs/core/"

let soundBuffers: Record<string, any> = {};
let audioEngine: AudioEngineV2;

export async function initAudioEngine(scene: Scene) {
    if (audioEngine) return;
    const SOUND_DIR = "/assets/sounds/"
    audioEngine = await CreateAudioEngineAsync({
    });
    await audioEngine.unlockAsync();

    // preload all sounds for now
    const baseSounds = ["coltShot", "emptyMag"]
    for (const sound of baseSounds) {
        const soundfile = `${SOUND_DIR}guns/${sound}.mp3`;
        soundBuffers[sound] = await CreateSoundBufferAsync(soundfile);
        console.log(`Preloaded sound: ${sound}`);
    }
    // Need to manually set the audio listener to the active camera.
    // Usually BabylonJS does this automatically, but i suspect this is a bug because scene.activeCamera is parented to a mesh that has its position "hard-coded" by our custom movement physics updates.
    // Possibly will be fixed in future.
    audioEngine.listener.attach(scene.activeCamera);
}

export async function playSpacialSound(type: string, mesh: Mesh | AbstractMesh, volume: number = 1) {
    // Spacial sound is currently kind of fucked.
    if (!audioEngine) return;
    const buffer = soundBuffers[type];
    if (!buffer) {
        console.error(`Sound buffer '${type}' not found`);
        return;
    }
    const sound = await CreateSoundAsync(type, buffer, {
        spatialEnabled: true,
        volume: volume,
        loop: false,
        spatialMaxDistance: 50,
        spatialDistanceModel: "linear",
        spatialRolloffFactor: 1,
    }, audioEngine);
    sound.spatial.attach(mesh, false, SpatialAudioAttachmentType.Position);
    sound.play();
}

export async function playSound(type: string, volume: number = 1) {
    // This function plays a non-spatial sound - working!
    if (!audioEngine) return;
    const buffer = soundBuffers[type];
    if (!buffer) {
        console.warn(`Sound buffer '${type}' not found`);
        return;
    }
    const sound = await CreateSoundAsync(type, buffer, {
        spatialEnabled: false,
        volume: volume,
        loop: false
    }, audioEngine);
    sound.play();
}