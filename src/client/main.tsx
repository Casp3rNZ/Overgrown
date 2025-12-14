import { UserAuthForm } from "./UIX/userAuthForm";
import { UIRoot } from "./UIX/UIMain";
import { Game } from "./game";
import { render } from "preact";
import { MainMenu } from "./UIX/mainMenu";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const uiRoot = document.getElementById("ui-root") as HTMLDivElement | null;
var aT: any = null;

window.addEventListener("DOMContentLoaded", () => {
    if (uiRoot) {
        render(<UserAuthForm loadMenuScene={loadMenuScene} />, uiRoot);
    } else {
        console.error("Error loading UI");
    }
});

function loadDevTestGameScene ( ) {
    if (canvas && uiRoot && aT) {
        const game = new Game(canvas, aT);
        render(<UIRoot game={game} />, uiRoot);
    } else {
        console.error("Error loading UI");
    }
}

function loadMenuScene (authToken: any) {
    if (canvas && uiRoot) {
        aT = authToken;
        render(<MainMenu loadDevTestGameScene={loadDevTestGameScene} />, uiRoot);
    }
}