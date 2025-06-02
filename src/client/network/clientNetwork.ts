export class NetworkClient {
    private socket: WebSocket | null = null;
    private url: string;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000; // Start with 1 second delay
    private reconnectTimer: NodeJS.Timeout | null = null;
    public playerId: string | null = null;
    public onState: (players: any) => void = () => {};
    public onReady: (playerId: string) => void = () => {};
    public onChatMessage: (message: string) => void = () => {};
    public onDisconnect: () => void = () => {};

    constructor(url: string) {
        this.url = url;
        this.connect();
    }

    private connect() {
        try {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log("Connected to server.");
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000; // Reset delay on successful connection
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "init" && data.id) {
                    this.playerId = data.id;
                    this.onReady(data.id);
                }
                if (data.type === "state" && data.players) {
                    this.onState(data.players);
                }
                if (data.type === "chat" && data.message) {
                    this.onChatMessage(data);
                }
            };

            this.socket.onclose = () => {
                console.log("Disconnected from server.");
                this.handleDisconnect();
            };

            this.socket.onerror = (err) => {
                console.error("WebSocket error:", err);
                this.handleDisconnect();
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            this.handleDisconnect();
        }
    }

    private handleDisconnect() {
        this.onDisconnect();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);
            
            this.reconnectTimer = setTimeout(() => {
                this.connect();
                // Exponential backoff with a maximum delay of 10 seconds
                this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
            }, this.reconnectDelay);
        } else {
            console.error("Max reconnection attempts reached. Please refresh the page.");
        }
    }

    public sendInput(input: any) {
        if (!this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify({
            type: "input",
            playerId: this.playerId,
            input: input
        }));
    }

    public sendChatMessage(message: any) {
        if (!this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify({
            type: "chat",
            playerId: this.playerId,
            message: message
        }));
    }

    public disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}