import { CreateSoundAsync, CreateSoundBufferAsync, Mesh, CreateAudioEngineAsync } from "@babylonjs/core/"

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
    // Spacial sound is currently kind of fucked.
    // The default audio listener position is working and updating corretcly however, the sound position is not updating correctly.
    // sound.spatial.position is 0 0 0, while player mesh's are being passed correctly, mesh.getAbsolutePosition returns the correct Vector.
    // sound.spatial.isattached also returns true before the sound is played, as it should. 
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
        spatialMaxDistance: 100,
        spatialDistanceModel: "linear",
        spatialRolloffFactor: 1
    }, audioEngine);
    sound.spatial.attach(mesh);
    console.log("sound position:", sound.spatial.position);
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