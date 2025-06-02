import { NetworkClient } from "./clientNetwork";

export class ChatManager {
    // Handles loading chat elements and adding messages recieved from the server to the UI.
    // All other input and networking is handled by main App.ts and NetworkClient.
    private chatMessages: HTMLDivElement;
    private chatContainer: HTMLElement | null;

    constructor(private network: NetworkClient) {
        this.chatContainer = document.getElementById("chat-container") as HTMLElement | null;
        this.chatMessages = document.getElementById("chat-messages") as HTMLDivElement;

        if (!this.chatContainer || !this.chatMessages) {
            console.error("Chat UI elements not found. Ensure they are present in the HTML.");
            return;
        }
        this.chatContainer.style.display = "flex";
    }

    public handleNewChatMessage(data: any) {
        // Not server authoritive at the moment, soon this will only handle single string containing the HTML tags, formatted already by the server.
        if (data.playerId === "SERVER") {
            this.chatMessages.innerHTML += `<div class="chat-message-server">${data.message}</div>`;
        }else {
            this.chatMessages.innerHTML += `<div class="chat-message"><strong>${data.playerId}:</strong> ${data.message}</div>`;
        }
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight; // Auto-scroll to bottom
    }
}