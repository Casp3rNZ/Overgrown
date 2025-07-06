import { Vector3, CreateSoundAsync, CreateSoundBufferAsync, Mesh, CreateAudioEngineAsync } from "@babylonjs/core/"

const SOUND_DIR = "/assets/sounds/"
let audioEngineIsActive = false;
let soundBuffers: Record<string, any> = {};
let audioEngine: any = null;

// not being called yet
export async function initAudioEngine() {
    if (audioEngineIsActive) return;
    audioEngineIsActive = true;

    if (!audioEngine) {
        audioEngine = await CreateAudioEngineAsync();
        await audioEngine.unlockAsync();
    }

    // preload all sounds for now
    const baseSounds = ["coltShot", "emptyMag"]
    for (const sound of baseSounds) {
        const soundfile = `${SOUND_DIR}guns/${sound}.mp3`;
        soundBuffers[sound] = await CreateSoundBufferAsync(soundfile);
    }
}

export async function playSpacialSound(type: string, mesh: Mesh, volume: number = 1, scene: any) {
    const soundfile = `${SOUND_DIR}guns/${type}.mp3`;
    const buffer = soundBuffers[soundfile];
    if (!buffer) {
        console.warn(`Sound buffer '${type}' not found`);
        //soundBuffers[type] = await CreateSoundBufferAsync(soundfile);
        return;
    }
    const sound = await CreateSoundAsync(type, buffer, {
        spatialEnabled: true,
        volume: volume,
        loop: false,
        spatialMaxDistance: 100,
        spatialDistanceModel: "exponential",
        spatialRolloffFactor: 1
    }, scene);
    sound.spatial.attach(mesh);
    sound.play();
}