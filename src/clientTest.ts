import { io } from 'socket.io-client';

const socket = io("http://localhost:4000");

socket.on("connect", () => {
    console.log("Client connected with socket ID:", socket.id);

    // Emit a message to the server
    socket.emit("clientMessage", "Hello from the client!");

    // Listen for server messages
    socket.on("message", (data) => {
        console.log("Message from server:", data);
    });

    // Disconnect the client after 5 seconds (for testing purposes)
    setTimeout(() => {
        socket.disconnect();
        console.log("Client disconnected.");
    }, 5000);
});

socket.on("disconnect", () => {
    console.log("Client disconnected from the server.");
});
