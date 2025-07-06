import {Sound, Vector3} from "@babylonjs/core/"

const SOUND_DIR = "/assets/sounds/"
// not working and i cant figure out why
export async function playSpacialSound(type: string, pos: {x: number, y: number, z: number}, volume: number = 1, scene: any) {
    // Create a new sound instance
    const soundfile = `${SOUND_DIR}guns/${type}.mp3`;
    const response = await fetch(soundfile);
    if (!response.ok) { // this is working
        console.error(`Failed to load sound file: ${soundfile}`);
        return;
    }else{
        console.log(`Sound file loaded successfully: ${response.status} ${response.statusText}`);
    }

    console.log(`Playing sound: ${type} from ${soundfile} at position:`, pos);
    const sound = new Sound(type, soundfile, scene, null, {
        spatialSound: false, // function is triggering but cannot hear sound for some reason
        volume: volume,
        maxDistance: 100, 
        rolloffFactor: 1, 
    });

    sound.setPosition(new Vector3(pos.x, pos.y, pos.z));
    sound.play();
}