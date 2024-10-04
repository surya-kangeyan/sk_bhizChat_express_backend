import { shopifyApp } from '@shopify/shopify-app-express';
import { SQLiteSessionStorage } from '@shopify/shopify-app-session-storage-sqlite';
import express, {
  Request,
  Response,
  NextFunction,
} from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';

dotenv.config();

const SOCKET_PORT = parseInt(
  process.env.SOCKET_PORT || '3000',
  10
);

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  transports: ['websocket'],
  cors: {
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Session storage for Shopify
const sessionStorage = new SQLiteSessionStorage(
  './shopify_sessions.db'
);

// Initialize Shopify app
const shopify = shopifyApp({
  useOnlineTokens: true,
  api: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecretKey:
      process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SHOPIFY_SCOPES
      ? process.env.SHOPIFY_SCOPES.split(',')
      : [],
    hostScheme: 'http',
    hostName: `localhost:${SOCKET_PORT}`,
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
  },
});

let shopifySession: any;

// Handling Shopify OAuth initiation from Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  // Listen for event to start Shopify OAuth
  socket.on('startShopifyAuth', () => {
    console.log('Starting Shopify OAuth process');

    // Emit an event to the client with the Shopify auth URL
    socket.emit('redirectToShopify', {
      url: `http://localhost:3000${shopify.config.auth.path}?shop=suryakang-test-store.myshopify.com`, // This will be '/api/auth'
    });
  });

  // Fetch collections via WebSocket
  socket.on('fetchCollections', async () => {
    console.log(
      'Received request to fetch collections'
    );
    try {
      if (
        !shopifySession ||
        !shopifySession.shop
      ) {
        socket.emit(
          'error',
          'Shopify session is not available.'
        );
        return;
      }

      const shop = shopifySession.shop;
      const accessToken =
        shopifySession.accessToken;

      const graphqlQuery = `
      {
        collections(first: 10) {
          edges {
            node {
              id
              title
              handle
              updatedAt
              products(first: 8) {
                edges {
                  node {
                    id
                    title
                    description
                  }
                }
              }
            }
          }
        }
      }`;

      const graphqlResponse = await axios.post(
        `https://${shop}/admin/api/2024-07/graphql.json`,
        { query: graphqlQuery },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      socket.emit(
        'collectionsData',
        graphqlResponse.data
      );
    } catch (error) {
      console.error(
        'Error fetching collections via GraphQL:',
        error
      );
      socket.emit(
        'collectionsDataError',
        'Failed to fetch collections'
      );
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// CORS Middleware
app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// Shopify OAuth routes
app.get(
  shopify.config.auth.path,
  shopify.auth.begin()
);

app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const session = res.locals.shopify.session;
      console.log(
        'Authenticated session:',
        session
      );

      shopifySession = session; // Save the session globally for use in Socket.IO requests

      const host = req.query.host as string;

      // Store the session

      console.log (`Index.ts storing the session fetched from the callback ${session}`)
      // Redirect back to the client
      res.redirect(
        `/?shop=${session.shop}&host=${host}`
      );
    } catch (error) {
      console.error(
        'Error in the authentication callback:',
        error
      );
      next(error);
    }
  }
);

// Express route to fetch collections (used if needed directly via HTTP)
app.get(
  '/api/collects',
  async (req: Request, res: Response) => {
    try {
      if (
        !shopifySession ||
        !shopifySession.shop
      ) {
        return res
          .status(400)
          .send(
            'Shopify session is not available.'
          );
      }

      const shop = shopifySession.shop;
      const accessToken =
        shopifySession.accessToken;

      const graphqlQuery = `
    {
      collections(first: 10) {
        edges {
          node {
            id
            title
            handle
            updatedAt
            products(first: 8) {
              edges {
                node {
                  id
                  title
                  description
                }
              }
            }
          }
        }
      }
    }`;

      const graphqlResponse = await axios.post(
        `https://${shop}/admin/api/2024-07/graphql.json`,
        { query: graphqlQuery },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      res.json(graphqlResponse.data);
    } catch (error) {
      console.error(
        'Error fetching collections via GraphQL:',
        error
      );
      res
        .status(500)
        .json({
          error:
            'Failed to fetch collections via GraphQL',
        });
    }
  }
);

// Catch-all route for the app
app.get('*', (req: Request, res: Response) => {
  const shop = req.query.shop;
  if (shop) {
    res
      .status(200)
      .send(`App is installed for shop: ${shop}`);
  } else {
    res
      .status(400)
      .send('Missing shop parameter');
  }
});

// Error handling middleware
app.use(
  (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res
      .status(500)
      .send('An unexpected error occurred');
  }
);

// Start the server with Socket.IO and Express
server.listen(SOCKET_PORT, () => {
  console.log(
    `Socket.IO server running on http://localhost:${SOCKET_PORT}`
  );
});


