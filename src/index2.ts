// import { shopifyApp } from '@shopify/shopify-app-express';
// import { SQLiteSessionStorage } from '@shopify/shopify-app-session-storage-sqlite';
// import { Session } from '@shopify/shopify-api';
// import express, {
//   Request,
//   Response,
//   NextFunction,
// } from 'express';
// import axios from 'axios';
// import dotenv from 'dotenv';
// import cors from 'cors';

// dotenv.config();

// const PORT = parseInt(
//   process.env.PORT || '3000',
//   10
// );
// const app = express();

// // Initializing the session storage
// const sessionStorage = new SQLiteSessionStorage(
//   './shopify_sessions.db'
// );

// // Logging middleware
// app.use((req, res, next) => {
//   console.log(
//     'Request received:',
//     req.method,
//     req.url,
//     req.query
//   );
//   next();
// });

// app.use(
//   cors({
//     origin:
//       process.env.FRONTEND_URL ||
//       'http://localhost:3000',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     credentials: true,
//   })
// );

// const shopify = shopifyApp({
//   useOnlineTokens: true,
//   api: {
//     apiKey: process.env.SHOPIFY_API_KEY || '',
//     apiSecretKey:
//       process.env.SHOPIFY_API_SECRET || '',
//     scopes: process.env.SHOPIFY_SCOPES
//       ? process.env.SHOPIFY_SCOPES.split(',')
//       : [],
//     hostScheme: 'http',
//     hostName: `localhost:${PORT}`,
//   },
//   auth: {
//     path: '/api/auth',
//     callbackPath: '/api/auth/callback',
//   },
//   webhooks: {
//     path: '/api/webhooks',
//   },
//   sessionStorage, // Use SQLiteSessionStorage instance
// });

// // Authentication routes
// app.get(
//   shopify.config.auth.path,
//   shopify.auth.begin()
// );
// app.get(
//   shopify.config.auth.callbackPath,
//   shopify.auth.callback(),
//   async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     console.log(
//       'Authentication callback reached'
//     );
//     try {
//       const session = res.locals.shopify.session;
//       console.log(
//         'Authenticated session:',
//         session
//       );

//       const host = req.query.host as string;
//       console.log(
//         `Authentication successful for shop ${session.shop}, host: ${host}`
//       );

//       await sessionStorage.storeSession(session); // Store the session in SQLite

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
//   }
// );

// // Middleware to explicitly fetch session if not present in res.locals
// const ensureSessionMiddleware = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     if (!res.locals.shopify?.session) {
//       const sessionId =
//         await shopify.session.getCurrentId({
//           isOnline: true,
//           rawRequest: req,
//           rawResponse: res,
//         });
//       if (sessionId) {
//         const sessionData =
//           await sessionStorage.loadSession(
//             sessionId
//           );
//         if (sessionData) {
//           res.locals.shopify =
//             res.locals.shopify || {};
//           res.locals.shopify.session =
//             new Session(sessionData);
//           console.log(
//             'Session loaded from storage:',
//             res.locals.shopify.session
//           );
//         } else {
//           console.log(
//             'No session data found in storage'
//           );
//         }
//       } else {
//         console.log('No session ID available');
//       }
//     }
//     next();
//   } catch (error) {
//     console.error(
//       'Error ensuring session:',
//       error
//     );
//     next(error);
//   }
// };

// // Middleware chain
// app.use(
//   '/api/*',
//   shopify.validateAuthenticatedSession()
// );
// app.use(ensureSessionMiddleware); // Add our custom middleware to ensure session
// app.use(shopify.ensureInstalledOnShop());
// app.use(addSessionShopToReqParams);

// // Function to add session shop to request parameters
// const addSessionShopToReqParams = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   console.log(
//     'Adding session shop to request params'
//   );
//   const shop = res.locals?.shopify?.session
//     ?.shop as string | undefined;
//   if (shop && !req.query.shop) {
//     req.query.shop = shop;
//   }
//   console.log(
//     'Shop:',
//     shop,
//     'Request shop:',
//     req.query.shop
//   );
//   return next();
// };

// // API routes
// app.get(
//   '/api/collects',
//   async (req: Request, res: Response) => {
//     console.log(
//       'Fetching collections via GraphQL'
//     );
//     try {
//       const shop = req.query.shop as string;
//       if (!shop) {
//         return res
//           .status(400)
//           .send('No shop provided');
//       }

//       const session = res.locals.shopify.session;
//       if (!session) {
//         return res
//           .status(401)
//           .json({ error: 'Session not found' });
//       }

//       const accessToken = session.accessToken;

//       const graphqlQuery = `
//       {
//         collections(first: 10) {
//           edges {
//             node {
//               id
//               title
//               handle
//               updatedAt
//               products(first: 5) {
//                 edges {
//                   node {
//                     id
//                     title
//                     description
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     `;

//       const graphqlResponse = await axios.post(
//         `https://${shop}/admin/api/2024-07/graphql.json`,
//         { query: graphqlQuery },
//         {
//           headers: {
//             'X-Shopify-Access-Token': accessToken,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       res.json(graphqlResponse.data);
//     } catch (error) {
//       console.error(
//         'Error fetching collections via GraphQL:',
//         error
//       );
//       res
//         .status(500)
//         .json({
//           error:
//             'Failed to fetch collections via GraphQL',
//         });
//     }
//   }
// );

// // Catch-all route
// app.get('*', (req: Request, res: Response) => {
//   console.log('Catch-all route reached');
//   const shop = req.query.shop;
//   if (shop) {
//     res
//       .status(200)
//       .send(`App is installed for shop: ${shop}`);
//   } else {
//     res
//       .status(400)
//       .send('Missing shop parameter');
//   }
// });

// // Error handling middleware
// app.use(
//   (
//     err: any,
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     console.error('Unhandled error:', err);
//     res
//       .status(500)
//       .send('An unexpected error occurred');
//   }
// );

// // Start the server
// app.listen(PORT, () =>
//   console.log(
//     `Server running on http://localhost:${PORT}`
//   )
// );
