import { shopifyApp } from '@shopify/shopify-app-express';
import express, {
  Request,
  Response,
  NextFunction,
} from 'express';
import axios from 'axios'; // Import axios to make API requests

import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const PORT = 3000;
const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
    credentials: true, // Enable cookies and credentials if needed
  })
);

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

// app.get(
//   shopify.config.auth.path,
//   shopify.auth.begin()
// );
// app.get(
//   shopify.config.auth.callbackPath,
//   shopify.auth.callback(),
//   shopify.redirectToShopifyOrAppRoot()

// Start the Shopify authentication process (OAuth initiation)
app.get(
  shopify.config.auth.path,
  shopify.auth.begin()
);

// Handle the Shopify OAuth callback
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.log(
      'index.ts fetching inital auth token form shopify '
    );
    try {
      // Assuming authentication is complete, you can perform additional logic here
      const session = res.locals.shopify.session;
      console.log(
        'Authenticated session:',
        session
      );

      // Optionally, you might want to store the access token and shop details in your database here

      // Redirect to your app's home page or Shopify admin page
      const host = req.query.host as string; 

      console.log(
        `index.js the session shop id ${session.shop} , host st4ring ${host}`
      );
      res.redirect(
        `/?shop=${session.shop}&host=${host}`
      );
    } catch (error) {
      console.error(
        'Error in the authentication callback:',
        error
      );
      next(error); // Pass the error to Express error handler
    }
  },
  shopify.redirectToShopifyOrAppRoot() // This ensures it redirects correctly to Shopify or your app's root
);
// );
// app.post(
//   shopify.config.webhooks.path,
//   shopify.processWebhooks({ webhookHandlers })
// );`

app.get(
  '/api/products',
  shopify.ensureInstalledOnShop(),
  async (req: Request, res: Response) => {
    try {
      console.log(
        'Received shop parameter:',
        req.query.shop
      ); // Log the shop parameter
      const session = res.locals.shopify.session;
      const accessToken = session.accessToken;
      const shop = session.shop;

      const response = await axios.get(
        `https://${shop}/admin/api/2024-09/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error(
        'Error fetching products:',
        error
      );
      res
        .status(500)
        .json({
          error: 'Failed to fetch products',
        });
    }
  }
);


// ================
// product fetch api 
app.get(
  '/api/products',
  shopify.ensureInstalledOnShop(),
  async (req: Request, res: Response) => {
    console.log(`Index.ts fetching all the values form the shopify Inventory api`)
    try {
      const session = res.locals.shopify.session; // Get the current session from Shopify
      const accessToken = session.accessToken; // Retrieve the access token
      const shop = session.shop; // Retrieve the shop name

      // Fetch products using Shopify Admin API
      const response = await axios.get(
        `https://${shop}/admin/api/2023-07/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      // Send the products data back to the client
      res.json(response.data);
    } catch (error) {
      console.error(
        'Error fetching products:',
        error
      );
      res
        .status(500)
        .json({
          error: 'Failed to fetch products',
        });
    }
  }
);
// ================



app.listen(PORT, () =>
  console.log(
    `Server running on http://localhost:${process.env.PORT}`
  )
);
