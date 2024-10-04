# Shopify App with Socket.IO Server

This project is a Shopify app built with Express, Socket.IO, and SQLite for session storage. It allows for OAuth authentication with Shopify, and includes WebSocket-based communication to fetch Shopify collections using the Shopify GraphQL API.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Shopify OAuth Authentication**: The app integrates with Shopify's OAuth mechanism for authenticating merchants.
- **WebSocket Communication**: Uses Socket.IO to establish WebSocket connections with the frontend.
- **GraphQL API**: Fetch Shopify collections using the GraphQL API.
- **MongoDB-based Session Storage**: Stores Shopify sessions using MongoDB.

## Installation

### Prerequisites

Ensure you have the following tools installed:

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) (package manager)


### Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name

2. **Install dependencies:**

      If you're using npm:

   ```bash
   npm install
   ```
      Or if you're using yarn:

   ```bash
   yarn install
   ```

# Environment Variables #
You need to set up a .env file in the root of the project to configure environment variables.

Create a .env file:

```bash
touch .env
```
Then add the following environment variables to the .env file:

```bash
# Shopify API Credentials
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_SCOPES=write_products,read_products # Modify as per your app requirements

#Socket.IO settings

SOCKET_PORT=3000

# Frontend URL
FRONTEND_URL=http://localhost:3000 # Change this to your frontend URL
Environment Variables Description 

SHOPIFY_API_KEY: Your Shopify app API key, which you can get from the Shopify Partner Dashboard.
SHOPIFY_API_SECRET: Your Shopify app secret key.
SHOPIFY_SCOPES: A comma-separated list of API access scopes for your Shopify app. Examples include write_products, read_products.
SOCKET_PORT: The port on which your Socket.IO server will run.
FRONTEND_URL: The URL of your frontend application (default is http://localhost:3000).
```
# Running the Server
Once you have set up the environment variables and installed the dependencies, you can start the server.

Start the server:

If you're using npm:

```bash
npm run dev
```
Or if you're using yarn:

```bash

yarn dev
```
The server will be running on the port specified in your .env file (default is 3000), and you'll see output like:

```bash

Socket.IO server running on http://localhost:3000
```

# Access the App:

The app can be accessed via the URL http://localhost:3000 (or your configured SOCKET_PORT).

## API Endpoints

- Shopify OAuth Start: GET /api/auth?shop ="YOUR_SHOP_NAME"

   -  This endpoint initiates the OAuth process with Shopify Store.
- Shopify OAuth Callback: GET /api/auth/callback

   - Handles the callback from Shopify after the OAuth process.
- Fetch Collections (HTTP): GET /api/collects

   - This endpoint fetches Shopify collections via the GraphQL API.
# WebSocket Events
- startShopifyAuth

   - Starts the Shopify OAuth process.
   - Emits redirectToShopify event with the Shopify auth URL.
-  fetchCollections

   - Fetches Shopify collections via the GraphQL API.
   - Emits collectionsData with the fetched collections or collectionsDataError on failure.