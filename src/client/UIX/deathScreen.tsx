export function DeathScreen() {
    return (
        <div className="death-screen"
            onClick={() => {
            // Request pointer lock
            const canvas = document.getElementById("renderCanvas");
            if (canvas && document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
            }
            }}
        >
            <p>Oof 💀</p>
            <h1>You fuckn died</h1>
            <p>Press <strong>Space</strong> to respawn</p>
        </div>
    );
}