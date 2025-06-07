import { useState } from "preact/hooks";

export function ChatBox({ messages, onSend, visible }) {
    const [input, setInput] = useState("");
    if (!visible) return null;

    return (
    <div id="chat-container">
        <div id="chat-messages">
            {messages.map((msg, i) => (
                <div 
                    className={msg.playerId === "SERVER" ? "chat-message-server" : "chat-message"}
                    key={i}
                >
                    <strong>{msg.playerId}:</strong> {msg.message}
                </div>
            ))}
        </div>
        <form
        id="chat-input-container"
        onSubmit={e => {
            e.preventDefault();
            if (input.trim()) {
            onSend(input);
            setInput("");
            }
        }}
        >
            <input
                id="chat-input"
                placeholder={"Press Enter to chat..."}
                value={input}
                onInput={e => setInput((e.target as HTMLInputElement).value)}
            />
            <button id="chat-send" type="submit">{">>"}</button>
        </form>
    </div>
    );
}