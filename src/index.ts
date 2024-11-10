import { shopifyApp } from '@shopify/shopify-app-express';
// import {
//   fetchAllProducts,
//   ShopifyProduct,
// } from './requests/productFetchReq';
import express, {
  Request,
  Response,
  NextFunction,
} from 'express';

import SocketIOFileUpload from 'socket.io-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import  {queryAndGenerateResponse}  from './socketHandlers/queryAndGenerateRagReposne.js';

import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import mongoose from 'mongoose';
import Session from './models/session.js';
import File from './models/fileUpload.js';
import crypto from 'crypto';
import OpenAI from 'openai';
import ChatThread from './models/userChatThread.js'; // Ensure this import is correct

import { Chat } from 'openai/resources';
import { saveChatThread } from './socketHandlers/saveChatThread.js';
import { fetchMetrics } from './socketHandlers/metrics.js'

import { ObjectId } from 'mongodb';
import Metrics from './models/metrics.js';

// import { createProductWebhook } from './services/productMutations';
import User from './models/userDetails.js';
dotenv.config();


const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}


const app = express();
const server = createServer(app);
const url = process.env.MONGODB_URI;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the upload directory path
const uploadDir = path.join(__dirname, 'uploads'); // Adjust if 'uploads' is directly in the project root

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
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
// });


let shopifySession: any
interface AuthenticatedSocket extends Socket {
  userId?: string;
  lastActivity?: number;
}

const generateObjectIdFromString = (
  str: string
): mongoose.Types.ObjectId => {
  // Hash the string and use the first 24 characters
  const hexString = crypto
    .createHash('md5')
    .update(str)
    .digest('hex')
    .slice(0, 24);
  return new mongoose.Types.ObjectId(hexString);
};

// Handling Shopify OAuth initiation from Socket.IO
io.on('connection', (socket: AuthenticatedSocket) => {
  console.log('A client  connected: ', socket.id);
  
    const uploader = new SocketIOFileUpload(
      socket as any,
      {
        uploadDir: uploadDir,
        accepts: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ], // Only accept PDF and DOCX
        maxFileSize: 30 * 1024 * 1024, // 10 MB
        chunkSize: 1024 * 1024, // 1 MB
      }
    );

  // Listen for event to start Shopify OAuth
  // socket.on('startShopifyAuth', () => {
  //   console.log('Starting Shopify OAuth process');

  //   // Emit an event to the client with the Shopify auth URL
  //   socket.emit('redirectToShopify', {
  //     url: `http://localhost:3000${shopify.config.auth.path}?shop=${process.env.SHOP_NAME}`, // This will be '/api/auth'
  //   });
  // });

  socket.on('pingServer', () => {
    console.log('Ping received from client');
    socket.emit('pongServer', {
      message: 'Server is alive',
    });
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

       // Synchronous check for an existing session and delete if found
       const existingSession =
         await Session.findOne({
           id: sessionData.id,
         });
       if (existingSession) {
         await Session.deleteOne({
           id: sessionData.id,
         });
         console.log(
           'Existing session deleted from MongoDB'
         );
       }

       // Create a new session document with the sessionData
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

       // Save the new session to MongoDB synchronously
       await newSession.save();
       shopifySession = newSession; // Update the global session variable if needed
       console.log('Session stored successfully');

       // Send success message to the client
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


  socket.on('createUser', async (userData) => {
    try {
      const newUser = new User({
        userId: new mongoose.Types.ObjectId(),
        ...userData,
      });

      await newUser.save();

      // await Metrics.updateOne({}, { $inc: { totalUsers: 1 } }); 

      const metrics = await Metrics.findOne()

      if (metrics) {
        metrics.totalUsers += 1;
        await metrics.save();
      } else {
        const newMetrics = new Metrics({
            totalUsers: 1,
            totalConversations: 0,
            totalRecommendations: 0,
        });
        await newMetrics.save();
        console.log("SAVED A NEW METRIC!!!: ", newMetrics)
      }

      console.log('User created:', newUser);
      socket.emit('userCreated', {
        success: true,
        userId: newUser.userId,
      });
    } catch (error) {
      console.error(
        'Error creating user:',
        error
      );
      socket.emit('userCreated', {
        success: false,
        error: error,
      });
    }
  });

  socket.on('authenticate', async (userData) => {
    try {
      // Verify user data (you might want to add more validation)
      if (!userData || !userData.id) {
        throw new Error('Invalid user data');
      }
      console.log(`index.ts authenticate route called with user data ${userData}`)

      // Store userId in the socket for future use
      socket.userId = userData.id;
      socket.lastActivity = Date.now();
      console.log(
        'User authenticated:',
        socket.userId
      );
      socket.emit('authenticated', {
        success: true,
      });
    } catch (error) {
      console.error(
        'Authentication error:',
        error
      );
      socket.emit('authenticated', {
        success: false,
        error: 'Authentication failed',
      });
    }
  });

  socket.on('getUserByEmail', async (email) => {
    try {
      if (!email) {
        return socket.emit('userDetails', {
          success: false,
          message: 'Email is required',
        });
      }

      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (user) {
        console.log('User found:', user);
        socket.emit('userDetails', {
          success: true,
          user,
        });
      } else {
        socket.emit('userDetails', {
          success: false,
          message: 'User not found',
        });
      }
    } catch (error) {
      console.error(
        'Error fetching user:',
        error
      );
      socket.emit('userDetails', {
        success: false,
        error: 'Internal server error',
      });
    }
  });

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
    socket.lastActivity = Date.now();
    console.log(
      `Received prompt from client: ${data.prompt}`
    );
    const { userQuery } = data.prompt;

    // Initialize a variable to hold the full concatenated response
    let fullGptResponse = '';

    // Get the stream response
    let gptResponse =
      await queryAndGenerateResponse(data.prompt);
    console.log(
      `index.ts the gpt response is ${gptResponse}`
    );
    if (typeof gptResponse !== 'string') {
      for await (const chunk of gptResponse) {
        const content =
          chunk.choices[0]?.delta?.content;
        const functionCallArgs =
          chunk.choices[0]?.delta?.function_call?.arguments;
          
  //  console.log(
  //    `QueryAndGenerateRagResponse the recommendation count is ${functionCallArgs}`
  //  );
        // Concatenate each chunk to form the full response
        const message = content
          ? content
          : functionCallArgs
          ? functionCallArgs
          : '';
        fullGptResponse += message;

        // Emit each chunk to the client in real-time
        socket.emit('openaiResponse', {
          success: true,
          result: message,
        });
    }
    let finalRecommendationCount = 0
    try {
      const parsedResponse = JSON.parse(
        fullGptResponse
      );
      // Extract `recommendation_count`
      const recommendationCount =
        parsedResponse.recommendation_count;
      console.log(
        `Recommendation count!!!!: ${recommendationCount}`
      );
      finalRecommendationCount =  recommendationCount
      // You may also want to store the entire parsed response for further use
      console.log(
        'Full Parsed Response:',
        parsedResponse
      );
    } catch (error) {
      console.error(
        'Error parsing GPT response:',
        error
      );
    }
    console.log(`index.ts storing parsed response for user id ${socket.userId}`)
const userIdAsObjectId =
  generateObjectIdFromString(socket.userId!);

    await saveChatThread(
      new ObjectId(userIdAsObjectId),
      'Shopify shop ID',
      data.prompt,
      fullGptResponse
    );    

    const metrics = await Metrics.findOne()

    if (metrics) {
      metrics.totalConversations += 1;
      metrics.totalRecommendations += finalRecommendationCount;
      await metrics.save();

      console.log("WE UPDATED THE METRICS!!!!!!", metrics)
    } else {
      const newMetrics = new Metrics({
          totalUsers: 1,
          totalConversations: 1,
          totalRecommendations: finalRecommendationCount,
      });
      await newMetrics.save();
      console.log("SAVED A NEW METRIC!!!: ", newMetrics)
    }

    // await Metrics.updateOne({}, { $inc: { totalConversations: 1, totalRecommendations: finalRecommendationCount } });

    console.log(
      `Sending response to client: ${gptResponse}`
    );
    socket.emit('openaiResponseEnd', {
      success: true,
      result: '\n',
    });
  }});
  // =====================================================================================
  //   socket.on('openaiPrompt', async (data) => {
  //     console.log(`Received prompt from client: ${data.prompt}`);
  //     const { userQuery } = data.prompt;
  //     try{
  //       const gptResponse = await queryAndGenerateResponse(data.prompt);
  //       // const chatThread = new ChatThread({
  //       //   userId: new mongoose.Types.ObjectId(), // do we create a new user id? or do we get from shopify
  //       //   shopId: shopifySession.shop,
  //       //   chatThreadId: new mongoose.Types.ObjectId(),
  //       //   messages: [
  //       //     {
  //       //       messageId: new mongoose.Types.ObjectId(),
  //       //       userInput: {
  //       //         content: userQuery,
  //       //         timestamp: new Date(),
  //       //       },
  //       //       llmOutput: {
  //       //         content: gptResponse,
  //       //         timestamp: new Date(),
  //       //         recommendations: [],
  //       //       },
  //       //     },
  //       //   ],
  //       //   createdAt: new Date(),
  //       //   updatedAt: new Date(),
  //       // });
  //       await saveChatThread(new ObjectId('671db06569ef6ff3df658240'), "Shopify shop ID", data.prompt, gptResponse);
  //       console.log(`Sending response to client: ${gptResponse}`);
  //       socket.emit('openaiResponse', {
  //         success: true,
  //         result: gptResponse,
  //       });
  //     }
  //     catch (error) {
  //       console.error('Error generating response:', error);
  //       socket.emit('error', 'Failed to generate response');
  //     }
  //   });
  socket.on(
    'fetchConversations',
    async (userId) => {
    
      userId = generateObjectIdFromString(
        socket.userId!
      );
      console.log(
        `Fetching conversations for userId: ${userId}`
      );
      try {
        // Validate userId
        if (!userId) {
          socket.emit('error', 'Invalid userId');
          return;
        }
        const conversations =
          await ChatThread.find({
            userId: userId,
          });
        // console.log("AFTER FIND ONE: ",conversations)
        // Sort messages by timestamp for each conversation
        const sortedConversations =
          conversations.map((conversation) => {
            // console.log("MESSAGES: ", conversation.messages)
            const sortedMessages =
              conversation.messages
                .sort(
                  (a, b) =>
                    new Date(
                      a.userInput.timestamp
                    ).getTime() -
                    new Date(
                      b.userInput.timestamp
                    ).getTime()
                )
                .map((message) => {
                  return {
                    messageId: message.messageId,
                    userMessage:
                      message.userInput.content,
                    aiResponse:
                      message.llmOutput.content,
                    // recommendations: message.llmOutput.content
                  };
                });
            console.log(
              'SORTED MESSAGES',
              sortedMessages
            );
            return {
              // conversationId: conversation._id,
              messages: sortedMessages,
            };
          });
        socket.emit('conversationsData', {
          success: true,
          conversations: sortedConversations,
        });
      } catch (error) {
        console.error(
          'Error fetching conversations:',
          error
        );
        socket.emit(
          'error',
          'Failed to fetch conversations'
        );
      }
    }
  );
  socket.on(
    'fetchMetrics',
    async () => {
      try {
        const metrics = await fetchMetrics()
        socket.emit('metrics', {
          success: true,
          metrics: metrics
        });
      } catch (error) {
        console.error(
          'Error fetching metrics:',
          error
        );
        socket.emit(
          'error',
          'Failed to fetch number of users'
        );
      }
    }
  );

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




// Listen for a custom event for document upload
socket.on('documentUpload', async (data) => {
  const { shopName, fileName, fileData } = data;

  if (!shopName || !fileName || !fileData) {
    socket.emit('uploadError', {
      success: false,
      message:
        'Shop name, file name, and file data are required.',
    });
    return;
  }

  console.log(
    `Starting document upload for shop: ${shopName}`
  );

  try {
    // Create a new file document with the file data
    const newFile = new File({
      shopName,
      fileName,
      fileData: Buffer.from(fileData), // Convert file data to Buffer for MongoDB storage
    });

    // Save the file document to MongoDB
    await newFile.save();

    console.log(
      `File uploaded for shop ${shopName} and stored in MongoDB`
    );
    socket.emit('uploadSuccess', {
      success: true,
      message: `Document uploaded successfully for shop ${shopName} and stored in MongoDB!`,
      fileName,
    });
  } catch (err) {
    console.error('File upload error:', err);
    socket.emit('uploadError', {
      success: false,
      message:
        'An error occurred while uploading the document to MongoDB.',
    });
  }
});

 socket.on('fetchDocuments', async (shopName) => {
   if (!shopName) {
     socket.emit('fetchError', {
       success: false,
       message:
         'Shop name is required to fetch documents.',
     });
     return;
   }

   try {
     // Find all documents with the specified shop name
     const documents = await File.find({
       shopName,
     });

     if (documents.length === 0) {
       socket.emit('fetchSuccess', {
         success: false,
         message: `No documents found for shop ${shopName}.`,
       });
       return;
     }

     // Send back an array of document details
     const documentDetails = documents.map(
       (doc) => ({
         fileName: doc.fileName,
         fileData:
           doc.fileData.toString('base64'), // Convert to base64 for transmission
         uploadDate: doc.uploadDate,
       })
     );

     socket.emit('fetchSuccess', {
       success: true,
       message: `Documents for shop ${shopName} fetched successfully!`,
       documents: documentDetails,
     });
   } catch (err) {
     console.error(
       'Error fetching documents:',
       err
     );
     socket.emit('fetchError', {
       success: false,
       message:
         'An error occurred while fetching documents.',
     });
   }
 });
  // Middleware to check session expiration before processing any event
  socket.use((packet, next) => {
    if (socket.userId && socket.lastActivity) {
      const currentTime = Date.now();
      const inactivityTime =
        currentTime - socket.lastActivity;

      if (inactivityTime > 12 * 60 * 60 * 1000) {
        // 5 minutes in milliseconds

        console.log("Session expired and loggging out ")
        socket.emit('sessionExpired');
        socket.disconnect(true);
        return;
      }

      // Update lastActivity
      socket.lastActivity = currentTime;
    }
    next();
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
//     try {
//       const session = res.locals.shopify.session;
//       console.log(
//         'Authenticated session:',
//         session
//       );

//       // await createProductWebhook(session);
//       console.log(
//         'Product webhook created and registered'
//       );
//       const existingSession =
//         await Session.findOne({ id: session.id });

//       if (existingSession) {
//         await Session.deleteOne({
//           id: session.id,
//         });
//         console.log(
//           'Existing session deleted from MongoDB'
//         );
//       }
//       shopifySession = session; // Save the session globally for use in Socket.IO requests

//       const host = req.query.host as string;

//       // Store the session

//       const sessionData = new Session({
//         id: session.id,
//         shop: session.shop,
//         state: session.state,
//         isOnline: session.isOnline,
//         scope: session.scope,
//         expires: session.expires,
//         accessToken: session.accessToken,
//         onlineAccessInfo:
//           session.onlineAccessInfo,
//       });

//       await sessionData.save();
//       console.log('Session stored successfully');
//       console.log(
//         `Index.ts storing the session fetched from the callback ${session}`
//       );
//       // Redirect back to the client
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

// Express route to fetch collections (use if needed directly via HTTP)
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



