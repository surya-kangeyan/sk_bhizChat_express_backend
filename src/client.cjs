"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_client_1 = require("socket.io-client");
var socket = (0, socket_io_client_1.io)('http://localhost:4000');
socket.on('connect', function () {
    console.log('Client connected with socket ID:', socket.id);
    // Emit a message to the server
    socket.emit('clientMessage', 'Hello from the client!');
    // Listen for server messages
    socket.on('message', function (data) {
        console.log('Message from server:', data);
    });
    // Disconnect the client after 5 seconds (for testing purposes)
    setTimeout(function () {
        socket.disconnect();
        console.log('Client disconnected.');
    }, 5000);
});
socket.on('disconnect', function () {
    console.log('Client disconnected from the server.');
});
