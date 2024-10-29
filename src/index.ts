import { shopifyApp } from '@shopify/shopify-app-express';
import {
  fetchAllProducts,
  ShopifyProduct,
} from './requests/productFetchReq';

import { SQLiteSessionStorage } from '@shopify/shopify-app-session-storage-sqlite';
import express, {
  Request,
  Response,
  NextFunction,
} from 'express';
// import pinecone from 'pinecone-client';
import  {queryAndGenerateResponse}  from './socketHandlers/queryAndGenerateRagReposne.js';

import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import mongoose from 'mongoose';
import Session from './models/session.js';
import crypto from 'crypto';
import OpenAI from 'openai';
import ChatThread from './models/userChatThread'; // Ensure this import is correct
import { Chat } from 'openai/resources';
import { saveChatThread } from './socketHandlers/saveChatThread';
import { ObjectId } from 'mongodb';

// import { createProductWebhook } from './services/productMutations';

dotenv.config();


const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}


const app = express();
const server = createServer(app);


const url = process.env.MONGODB_URI;
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
if (!url) {
  throw new Error(
    'MONGODB_URI is not defined in the environment variables.'
  );
}
export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// Update the index initialization:
const initializePineconeIndex = async () => {
  await pc.createIndex({
    name: 'bhizchat-rag',
    dimension: 1536,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
  });
};

// initializePineconeIndex().catch(console.error);
export const pcIndex = pc.Index('bhizchat-rag');



mongoose.set('strictQuery', false);

// Initialize Socket.IO

const io = new Server(server, {
  transports: ['websocket', 'polling'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));


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


let shopifySession: any

// Handling Shopify OAuth initiation from Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  // Listen for event to start Shopify OAuth
  socket.on('startShopifyAuth', () => {
    console.log('Starting Shopify OAuth process');

    // Emit an event to the client with the Shopify auth URL
    socket.emit('redirectToShopify', {
      url: `http://localhost:3000${shopify.config.auth.path}?shop=${process.env.SHOP_NAME}`, // This will be '/api/auth'
    });
  });

  socket.on('pingServer', () => {
    console.log('Ping received from client');
    socket.emit('pongServer', { message: 'Server is alive' });
  });

  socket.on(
    'storeSession',
    async (sessionData) => {
      try {
        console.log(
          'Received session data:',
          sessionData
        );
        // Validate session data
        if (
          !sessionData ||
          !sessionData.id ||
          !sessionData.shop
        ) {
          socket.emit(
            'error',
            'Invalid session data'
          );
          return;
        }

        // Check if session already exists
        const existingSession =
          await Session.findOne({
            id: sessionData.id,
          });
        if (existingSession) {
          // If session exists, delete it first
          await Session.deleteOne({
            id: sessionData.id,
          });
          console.log(
            'Existing session deleted from MongoDB'
          );
        }

        // Create a new session document
        const newSession = new Session({
          id: sessionData.id,
          shop: sessionData.shop,
          state: sessionData.state,
          isOnline: sessionData.isOnline,
          scope: sessionData.scope,
          expires: sessionData.expires,
          accessToken: sessionData.accessToken,
          onlineAccessInfo:
            sessionData.onlineAccessInfo,
        });

        // Save the session to MongoDB
        await newSession.save();
        shopifySession = newSession;
        console.log(
          'Session stored successfully'
        );
        socket.emit('sessionStored', {
          message: 'Session stored successfully',
        });
      } catch (error) {
        console.error(
          'Error storing session:',
          error
        );
        socket.emit(
          'error',
          'Failed to store session'
        );
      }
    }
  );

// socket.on(
//   'fetchAndStoreAllProducts',
//   async () => {
//     console.log(
//       'Fetching all products from Shopify...'
//     );

//     try {
//       if (
//         !shopifySession ||
//         !shopifySession.shop
//       ) {
//         socket.emit(
//           'error',
//           'Shopify session is not available.'
//         );
//         return;
//       }

//       const shop = shopifySession.shop;
//       const accessToken =
//         shopifySession.accessToken;

//       // Fetch all products using the imported function
//       const allProducts: ShopifyProduct[] =
//         await fetchAllProducts(shop, accessToken);
//        for (const product of allProducts) {
//          console.log(`Product ID: ${product.id}`);
//          console.log(
//            `Product Title: ${product.title}`
//          );
//          console.log(
//            `Product Description: ${product.description}`
//          );
//           console.log(
//             `Product Image URL: ${product.images}`
//           );
//          console.log(
//            '----------------------------------'
//          );
//        }


//       // Iterate over products and generate embeddings
//       for (const product of allProducts) {
//         const embeddingResponse =
//           await openai.embeddings.create({
//             input: product.description,
//             model: 'text-embedding-ada-002',
//           });

//         const embedding =
//           embeddingResponse.data[0].embedding;
//         console.log(
//           `Embedding for product: ${product.title}`,
//           embedding
//         );
    

//         // Store the embedding in Pinecone
//   await pcIndex.upsert([
//     {
//       id: product.id,
//       values: embedding,
//       metadata: Object.fromEntries(
//         Object.entries(product)
//           .filter(
//             ([key, value]) =>
//               key !== 'Symbol.iterator' &&
//               value != null
//           )
//           .map(([key, value]) => [
//             key,
//             Array.isArray(value)
//               ? value.join(', ')
//               : String(value),
//           ])
//       ) as Record<string, string>,
//     },
//   ]);

//         console.log(
//           `Stored embedding for product: ${product.title}`
//         );
      
//       }
//       // Emit success message to the client
//       socket.emit('productsStored', {
//         success: true,
//         message:
//           'All products have been successfully embedded and stored in Pinecone.',
//       });
//     } catch (error) {
//       console.error(
//         'Error fetching or storing products:',
//         error
//       );
//       socket.emit(
//         'error',
//         'Failed to fetch and store products.'
//       );
//     }
//   }
// );

  socket.on('openaiPrompt', async (data) => {
    console.log(`Received prompt from client: ${data.prompt}`);
    const { userQuery } = data.prompt;     
    try{
      const gptResponse = await queryAndGenerateResponse(data.prompt);
      // const chatThread = new ChatThread({
      //   userId: new mongoose.Types.ObjectId(), // do we create a new user id? or do we get from shopify
      //   shopId: shopifySession.shop,
      //   chatThreadId: new mongoose.Types.ObjectId(), 
      //   messages: [
      //     {
      //       messageId: new mongoose.Types.ObjectId(), 
      //       userInput: {
      //         content: userQuery,
      //         timestamp: new Date(),
      //       },
      //       llmOutput: {
      //         content: gptResponse,
      //         timestamp: new Date(),
      //         recommendations: [], 
      //       },
      //     },
      //   ],
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // });
      await saveChatThread(new ObjectId('671db06569ef6ff3df658240'), "Shopify shop ID", data.prompt, gptResponse);
      console.log(`Sending response to client: ${gptResponse}`);
      socket.emit('openaiResponse', {
        success: true,
        result: gptResponse, 
      });
    } 
    catch (error) {
      console.error('Error generating response:', error);
      socket.emit('error', 'Failed to generate response');
    }
  });
  socket.on('fetchConversations', async (userId) => {
    userId = '671db06569ef6ff3df658240'
    console.log(`Fetching conversations for userId: ${userId}`);
    try {
      // Validate userId
      if (!userId) {
        socket.emit('error', 'Invalid userId');
        return;
      }
      const conversations = await ChatThread.find({ userId: userId });
      // console.log("AFTER FIND ONE: ",conversations)
      // Sort messages by timestamp for each conversation
      const sortedConversations = conversations.map(conversation => {
        // console.log("MESSAGES: ", conversation.messages)
        const sortedMessages = conversation.messages.sort((a, b) => 
          new Date(a.userInput.timestamp).getTime() - new Date(b.userInput.timestamp).getTime()
        ).map(message => {
          return {
            messageId: message.messageId,
            userMessage: message.userInput.content,
            aiResponse: message.llmOutput.content,
            // recommendations: message.llmOutput.content 
          }
        })
        console.log("SORTED MESSAGES", sortedMessages)
        return {
          // conversationId: conversation._id,
          messages: sortedMessages
          
        };
      });
      socket.emit('conversationsData', {
        success: true,
        conversations: sortedConversations,
      });
      

    } catch (error) {
      console.error('Error fetching conversations:', error);
      socket.emit('error', 'Failed to fetch conversations');
    }
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


  let conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    {
      role: 'system',
      content:
        process.env.OPENAI_AGENT_PROMPT || '',
    },
  ];

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

      // await createProductWebhook(session);
      console.log(
        'Product webhook created and registered'
      );
      const existingSession =
        await Session.findOne({ id: session.id });

      if (existingSession) {
        await Session.deleteOne({
          id: session.id,
        });
        console.log(
          'Existing session deleted from MongoDB'
        );
      }
      shopifySession = session; // Save the session globally for use in Socket.IO requests

      const host = req.query.host as string;

      // Store the session

      const sessionData = new Session({
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope,
        expires: session.expires,
        accessToken: session.accessToken,
        onlineAccessInfo:
          session.onlineAccessInfo,
      });

      await sessionData.save();
      console.log('Session stored successfully');
      console.log(
        `Index.ts storing the session fetched from the callback ${session}`
      );
      // Redirect back to the client
      // res.redirect(
      //   `/?shop=${session.shop}&host=${host}`
      // );
    } catch (error) {
      console.error(
        'Error in the authentication callback:',
        error
      );
      next(error);
    }
  }
);

// // Express route to fetch collections (use if needed directly via HTTP)
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
      res.status(500).json({
        error:
          'Failed to fetch collections via GraphQL',
      });
    }
  }
);

// // Webhook handler for product creation
app.post(
  '/webhook/products/create',
  async (req: Request, res: Response) => {
    try {
      const hmac = req.headers[
        'x-shopify-hmac-sha256'
      ] as string;
      const secret =
        process.env.SHOPIFY_API_SECRET || '';
      const body = JSON.stringify(req.body);

      // Verify the HMAC signature
      const generatedHmac = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');
      if (generatedHmac !== hmac) {
        return res
          .status(403)
          .send('Webhook verification failed');
      }

      // Handle the webhook data
      console.log(
        'Webhook received for product creation:',
        req.body
      );

      // Respond to Shopify with a success status
      res.status(200).send('Webhook received');
    } catch (error) {
      console.error(
        'Error handling webhook:',
        error
      );
      res
        .status(500)
        .send('Error handling webhook');
    }
  }
);

// // Catch-all route for the app
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


app.get(
  '/test',
  (req: Request, res: Response) => {
    res.json({
      message: 'Server is running correctly',
      timestamp: new Date().toISOString(),
      port: PORT,
    });
  }
);

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
server.listen(PORT, () => {
  console.log(
    `Socket.IO server running on http://localhost:${PORT}`
  );

});



