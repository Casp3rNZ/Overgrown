export class NetworkClient {
    private socket: WebSocket;
    public playerId: string | null = null;
    public onState: (players: any) => void = () => {};
    public onReady: (playerId: string) => void = () => {};

    constructor(url: string) {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("Connected to server.");
        };

        this.socket.onmessage = (event) => {
            //console.log("Received message from server:", event.data);
            const data = JSON.parse(event.data);
            if (data.type === "init" && data.id) {
                this.playerId = data.id;
                this.onReady(data.id);
            }
            if (data.type === "state" && data.players) {
                this.onState(data.players);
            }
        };

        this.socket.onclose = () => {
            console.log("Disconnected from server.");
            this.socket.close();
        };

        this.socket.onerror = (err) => {
            console.error("WebSocket error:", err);
        };
    }

    public sendInput(input: any) {
        if (!this.playerId || this.socket.readyState == 0) return;
        this.socket.send(JSON.stringify({
            type: "input",
            playerId: this.playerId,
            input: input
        }));
    }
}