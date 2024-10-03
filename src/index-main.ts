import { shopifyApp } from '@shopify/shopify-app-express';
import { SQLiteSessionStorage } from '@shopify/shopify-app-session-storage-sqlite';
import { Session } from '@shopify/shopify-api'; 
import { ShopifySession } from './SessionObject.ts';

import express, {
  Request,
  Response,
  NextFunction,
} from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const PORT = parseInt(
  process.env.PORT || '3000',
  10
);
const app = express();

// initializing the session storage

const sessionStorage = new SQLiteSessionStorage(
  './shopify_sessions.db'
);


// Logging middleware
app.use((req, res, next) => {
  console.log(
    'Request received:',
    req.method,
    req.url,
    req.query
  );
  next();
});

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

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
    hostName: `localhost:${PORT}`,
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
  },

});
let id:string;
let shop:string;
let shopifySession: ShopifySession;
// Authentication routes
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
    console.log(
      'Authentication callback reached'
    );
    try {
      const session = res.locals.shopify.session;
      console.log(
        'Authenticated session:',
        session
      );
      id = session.id;
      shop = session.shop;
       shopifySession = new ShopifySession(
         res.locals.shopify.session
       );
      console.log(
        `index.ts callback called after fetching sessions ${shopifySession}`
      );
      const host = req.query.host as string;
      console.log(
        `Authentication successful for shop ${shopifySession.shop}, session id ${id},host: ${host}`
      );

      await sessionStorage.storeSession(session); // This should work correctly now

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


const addSessionShopToReqParams =async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ======================================== >  the res value used here is different  fromt he res values used to set the locales
  console.log(
    'Adding session shop to request params'
  );
  const session = await sessionStorage.loadSession(id);
  console.log(
    `index.ts fetching session value from the database ${session?.id}, session shop ${shopifySession?.shop}`
  );
  // const shop = res.locals?.shopify?.session
  //   ?.shop as string | undefined;
  if (shop && !req.query.shop) {
    req.query.shop = shopifySession?.shop;
  }
  console.log(
    'Shop:',
    shop,
    'Request shop:',
    req.query.shop
  );
  return next();
};

// Middleware chain
// app.use(
//   '/api/*',
//   shopify.validateAuthenticatedSession()
// );
app.use(addSessionShopToReqParams);
// app.use(shopify.ensureInstalledOnShop());
// Retrieve session from storage
// const getSessionFromStorage = async (sessionId: string): Promise<Session | undefined> => {
//   try {
//     const sessionData = await sessionStorage.loadSession(sessionId);
//     if (sessionData) {
//       return new Session(sessionData); // Convert back to a Session object
//     }
//     return undefined;
//   } catch (error) {
//     console.error('Error retrieving session from storage:', error);
//     return undefined;
//   }
// };

// API routes
app.get(
  '/api/collects',
  async (req: Request, res: Response) => {
    console.log(
      'Fetching collections via GraphQL'
    );
    try {
      const shop = shopifySession?.shop;
      if (!shop) {
        return res
          .status(400)
          .send('No shop provided');
      }

      // const session = res.locals.shopify.session;
      const session = shopifySession;
      const accessToken = session?.accessToken;

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
      }
    `;

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

// Catch-all route
app.get('*', (req: Request, res: Response) => {
  console.log('Catch-all route reached');
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

app.listen(PORT, () =>
  console.log(
    `Server running on http://localhost:${PORT}`
  )
);
