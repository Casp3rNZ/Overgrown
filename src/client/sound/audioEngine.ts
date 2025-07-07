import { Vector3, CreateSoundAsync, CreateSoundBufferAsync, Mesh, CreateAudioEngineAsync } from "@babylonjs/core/"

// sounds are working, but audiolistener position is not updating correctly for spatial sounds.
let soundBuffers: Record<string, any> = {};
let audioEngine: any = null;

export async function initAudioEngine() {
    if (audioEngine) return;
    const SOUND_DIR = "/assets/sounds/"
    audioEngine = await CreateAudioEngineAsync();
    await audioEngine.unlockAsync();

    // preload all sounds for now
    const baseSounds = ["coltShot", "emptyMag"]
    for (const sound of baseSounds) {
        const soundfile = `${SOUND_DIR}guns/${sound}.mp3`;
        soundBuffers[sound] = await CreateSoundBufferAsync(soundfile);
        console.log(`Preloaded sound: ${sound}`);
    }
}

export async function playSpacialSound(type: string, mesh: Mesh, volume: number = 1) {
    if (!audioEngine) return;
    const buffer = soundBuffers[type];
    if (!buffer) {
        console.warn(`Sound buffer '${type}' not found`);
        return;
    }
    const sound = await CreateSoundAsync(type, buffer, {
        spatialEnabled: true,
        volume: volume,
        loop: false,
        spatialMaxDistance: 100,
        spatialDistanceModel: "exponential",
        spatialRolloffFactor: 1
    }, audioEngine);
    sound.spatial.attach(mesh);
    //sound.spatial.absoluteposition = mesh.getAbsolutePosition();
    console.log(`Playing sound: ${type} at ${mesh.getAbsolutePosition()}`);
    sound.play();
}

export async function playSound(type: string, volume: number = 1) {
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