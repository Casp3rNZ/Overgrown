import { UserAuthForm } from "./UIX/userAuthForm";
import { UIRoot } from "./UIX/UIMain";
import { Game } from "./game";
import { render, createRoot } from "preact";


const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const uiRoot = document.getElementById("ui-root") as HTMLDivElement | null;

window.addEventListener("DOMContentLoaded", () => {
    if (uiRoot) {
        render(<UserAuthForm loadGameScene={loadGameScene} />, uiRoot);
    } else {
        console.error("Error loading UI");
    }
});

function loadGameScene ( authToken: any ) {
    if (canvas && uiRoot && authToken) {
        const game = new Game(canvas, authToken);
        render(<UIRoot game={game} />, uiRoot);
    } else {
        console.error("Error loading UI");
    }
}