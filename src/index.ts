// import { shopifyApp } from '@shopify/shopify-app-express';
// import express, {
//   Request,
//   Response,
//   NextFunction,
// } from 'express';
// import axios from 'axios'; // Import axios to make API requests

// import { Server } from 'socket.io';
// import { createServer } from 'http';

// import dotenv from 'dotenv';
// import cors from 'cors';
// dotenv.config();

// const app = express();

// const server = createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: 'http://localhost:4000',
//     credentials: true,
//     methods: ['GET', 'POST'],
//   },
// });

// io.on('connection', (socket) => {
//   console.log('A user connected: ', socket.id);

//   // Example of emitting data to the client
//   socket.emit('message', 'Hello from server!');

//   // Listening to messages from the client
//   socket.on('clientMessage', (data) => {
//     console.log('Message from client: ', data);
//   });

//   // When the client disconnects
//   // socket.on('disconnect', () => {
//   //   console.log('User disconnected');
//   // });
// });

// app.use(
//   cors({
//     origin: 'http://localhost:3000', // Replace with your frontend URL
//     methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
//     credentials: true, // Enable cookies and credentials if needed
//   })
// );

// // Initialize the Shopify app
// const shopify = shopifyApp({
//   api: {
//     apiKey: process.env.SHOPIFY_API_KEY,
//     apiSecretKey: process.env.SHOPIFY_API_SECRET,
//     scopes: process.env.SHOPIFY_SCOPES
//       ? process.env.SHOPIFY_SCOPES.split(',')
//       : undefined,
//     hostScheme: 'http',
//     hostName: `localhost:${process.env.PORT}`,
//   },
//   auth: {
//     path: '/api/auth',
//     callbackPath: '/api/auth/callback',
//   },
//   webhooks: {
//     path: '/api/webhooks',
//   },
// });

// // Start the Shopify authentication process (OAuth initiation)
// app.get(
//   shopify.config.auth.path,
//   shopify.auth.begin()
// );

// // Handle the Shopify OAuth callback
// app.get(
//   shopify.config.auth.callbackPath,
//   shopify.auth.callback(),
//   async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     console.log(
//       'index.ts fetching initial auth token from Shopify'
//     );
//     try {
//       const session = res.locals.shopify.session;
//       console.log(
//         'Authenticated session:',
//         session
//       );

//       // Optionally, store the access token and shop details in your database

//       const host = req.query.host as string;
//       console.log(
//         `index.js the session shop id ${session.shop}, host string ${host}`
//       );
//       res.redirect(
//         `/?shop=${session.shop}&host=${host}`
//       );
//     } catch (error) {
//       console.error(
//         'Error in the authentication callback:',
//         error
//       );
//       next(error);
//     }
//   },
//   shopify.redirectToShopifyOrAppRoot()
// );

// // API endpoint to fetch products
// app.get(
//   '/api/products',
//   shopify.ensureInstalledOnShop(),
//   async (req: Request, res: Response) => {
//     try {
//       const session = res.locals.shopify.session;
//       const accessToken = session.accessToken;
//       const shop = session.shop;

//       const response = await axios.get(
//         `https://${shop}/admin/api/2024-09/products.json`,
//         {
//           headers: {
//             'X-Shopify-Access-Token': accessToken,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       res.json(response.data);
//     } catch (error) {
//       console.error(
//         'Error fetching products:',
//         error
//       );
//       res
//         .status(500)
//         .json({
//           error: 'Failed to fetch products',
//         });
//     }
//   }
// );

// // A simple testing endpoint
// app.get(
//   '/api/testing',
//   (req: Request, res: Response) => {
//     res.send('HELLO WORLD');
//   }
// );

// // Start the server
// server.listen(process.env.SOCKET_PORT, () => {
//   console.log(
//     `Server running on http://localhost:${process.env.PORT}`
//   );
//   console.log(
//     'Shopify object initialized and socket server started'
//   );
// });


import express, {
  Request,
  Response,
  NextFunction,
} from 'express';
import { shopifyApp } from '@shopify/shopify-app-express';
import axios from 'axios';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

// Initialize Express and HTTP server
const app = express();
const server = createServer(app);

// Initialize Socket.IO on the same server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// In-memory session store for simplicity
const sessionStore: Record<string, any> = {};

// CORS setup for Express
app.use(
  cors({
    origin: 'http://localhost:3000', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// Initialize Shopify App
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES
      ? process.env.SHOPIFY_SCOPES.split(',')
      : undefined,
    hostScheme: 'http',
    hostName: `localhost:${process.env.PORT}`,
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
  },
});

// Route to begin Shopify authentication
app.get(
  shopify.config.auth.path,
  shopify.auth.begin()
);

// Handle Shopify OAuth callback and store the session
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  (req: Request, res: Response) => {
    const session = res.locals.shopify.session;
    console.log(
      'Authenticated session:',
      session
    );

    // Store the session data using the shop domain as the key
    sessionStore[session.shop] = session;

    // Notify all connected clients about the successful authentication
    io.emit('authSuccess', {
      shop: session.shop,
      accessToken: session.accessToken,
    });

    res.redirect('/');
  }
);

// Integrate Socket.IO with Shopify app
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handling authentication initiation from the client
  socket.on('startShopifyAuth', () => {
    console.log(
      'Starting Shopify authentication'
    );
    socket.emit(
      'redirect',
      shopify.config.auth.path
    );
  });

  // Fetch Shopify products
  socket.on(
    'fetchProducts',
    async (shop: string) => {
      try {
        // Retrieve the session data from our in-memory store
        const session = sessionStore[shop];
        if (!session) {
          socket.emit(
            'error',
            'Shopify session not found. Please authenticate first.'
          );
          return;
        }

        const accessToken = session.accessToken;

        // Fetch products from Shopify API
        const response = await axios.get(
          `https://${shop}/admin/api/2024-09/products.json`,
          {
            headers: {
              'X-Shopify-Access-Token':
                accessToken,
              'Content-Type': 'application/json',
            },
          }
        );

        socket.emit(
          'productsFetched',
          response.data
        );
      } catch (error) {
        console.error(
          'Error fetching products:',
          error
        );
        socket.emit(
          'error',
          'Failed to fetch products'
        );
      }
    }
  );

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(
      'Client disconnected:',
      socket.id
    );
  });
});

// Endpoint to check if the server is alive
app.get(
  '/api/health',
  (req: Request, res: Response) => {
    res.send('Server and Socket.IO are running.');
  }
);

// Start the server on a single port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${PORT}`
  );
  console.log(
    'Socket.IO server and Shopify integration are active.'
  );
});
