export class NetworkClient {
    public socket: WebSocket | null = null;
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
    public onPlayerDeath: (playerId: string) => void = () => {};
    public onPlayerHit: (playerId: string, damage: number) => void = () => {};
    public onRespawnConfirmed: (data: any) => void = () => {};
    private lastInput: any = null;

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
                if (data.type != 'state') {
                    console.log("Received message:", data);
                }
                switch (data.type) {
                    case "init":
                        if (data.id) {
                            this.playerId = data.id;
                            this.onReady(data.id);
                        }
                        break;
                    case "state":
                        if (data.players) {
                            this.onState(data.players);
                        }
                        break;
                    case "chat":
                        if (data.message) {
                            this.onChatMessage(data);
                        }
                        break;
                    case "death":
                        console.log("Player death event received:", data);
                        this.onPlayerDeath(data);
                        break;
                    case "hit":
                        this.onPlayerHit(data.playerId, data.damage);
                        break;
                    case "respawnConfirmed":
                        this.onRespawnConfirmed(data);
                        break;
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
        if (JSON.stringify(input) == this.lastInput) {
            return; // Ignore duplicate inputs
        }
        this.lastInput = JSON.stringify(input);
        this.socket.send(JSON.stringify({
            type: "input",
            playerId: this.playerId,
            input: input
        }));
        //console.log("Input sent:", input);
    }

    public sendRespawnRequest() {
        if (!this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify({
            type: "respawnRequest",
            playerId: this.playerId
        }));
        console.log("Respawn request sent for player:", this.playerId);
    }

    public sendShootRequest(position: any, direction: any) {
        if (!this.playerId || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        if (!position || !direction) {
            console.error("Invalid position or direction for shoot request.");
            return;
        }

        let x = JSON.parse(this.lastInput);
        if (!x) {
            console.warn("ClientNetwork ShootReq - No equipped item ID found.", x);
            return;
        }

        // ensure "isdirty" and other props from babylonJS vectors are not sent.
        position = {
            x: position.x,
            y: position.y,
            z: position.z
        };
        direction = {
            x: direction.x,
            y: direction.y,
            z: direction.z
        };
        this.socket.send(JSON.stringify({
            type: "shoot",
            playerId: this.playerId,
            position: position,
            direction: direction,
            equipID: x.equippedItemID
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