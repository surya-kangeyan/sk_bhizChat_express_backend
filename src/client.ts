import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

// Handle connection to the Socket.IO server
socket.on('connect', () => {
  console.log(
    'Client connected with socket ID:',
    socket.id
  );

  // Start Shopify OAuth process by emitting 'startShopifyAuth'
  console.log('Emitting startShopifyAuth...');
  socket.emit('startShopifyAuth');

  // Listen for the redirect URL to Shopify
  socket.on('redirectToShopify', (data) => {
    console.log(
      'Redirect to Shopify Auth URL:',
      data.url
    );
    // Normally, this would trigger a redirect in the browser, but for testing, we log the URL.
  });

  // Test fetching collections from Shopify
  console.log('Fetching Shopify collections...');
  socket.emit('fetchCollections');

  // Listen for the response containing the collections data
  socket.on('collectionsData', (data) => {
    console.log(
      'Collections Data:',
      JSON.stringify(data, null, 2)
    );
  });

  // Listen for errors in fetching collections
  socket.on('collectionsDataError', (error) => {
    console.error(
      'Error fetching collections:',
      error
    );
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
socket.on('disconnect', () => {
  console.log(
    'Client disconnected from the server.'
  );
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('Connection Error:', error);
});
