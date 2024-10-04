"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_client_1 = require("socket.io-client");
var socket = (0, socket_io_client_1.io)('http://localhost:4000');
// Handle connection to the Socket.IO server
socket.on('connect', function () {
    console.log('Client connected with socket ID:', socket.id);
    // Start Shopify OAuth process by emitting 'startShopifyAuth'
    console.log('Emitting startShopifyAuth...');
    socket.emit('startShopifyAuth');
    // Listen for the redirect URL to Shopify
    socket.on('redirectToShopify', function (data) {
        console.log('Redirect to Shopify Auth URL:', data.url);
        // Normally, this would trigger a redirect in the browser, but for testing, we log the URL.
    });
    // Test fetching collections from Shopify
    console.log('Fetching Shopify collections...');
    socket.emit('fetchCollections');
    // Listen for the response containing the collections data
    socket.on('collectionsData', function (data) {
        console.log('Collections Data:', JSON.stringify(data, null, 2));
    });
    // Listen for errors in fetching collections
    socket.on('collectionsDataError', function (error) {
        console.error('Error fetching collections:', error);
    });
    // Optionally disconnect after a certain time
    // setTimeout(() => {
    //   socket.disconnect();
    //   console.log(
    //     'Client disconnected from the server.'
    //   );
    // }, 10000); // Adjust time as needed for testing
});
// Handle disconnection
socket.on('disconnect', function () {
    console.log('Client disconnected from the server.');
});
// Handle connection errors
socket.on('connect_error', function (error) {
    console.error('Connection Error:', error);
});
