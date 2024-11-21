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
import { v4 as uuidv4 } from 'uuid';

import SocketIOFileUpload from 'socket.io-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getRecommendationCompletion } from './socketHandlers/recommendationRag.js';

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
import {
  saveChatThread,
  saveStringChatThread,
} from './socketHandlers/saveChatThread.js';
import { fetchMetrics } from './socketHandlers/metrics.js';

import { ObjectId } from 'mongodb';
import Metrics from './models/metrics.js';

// import { createProductWebhook } from './services/productMutations';
import User from './models/userDetails.js';
import { pdfToText } from 'pdf-ts';
import { getSupportCompletion } from './socketHandlers/supportRag.js';
dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI is not defined in the environment variables.'
  );
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
  await pc.createIndex({
    name: 'bhizchat-support',
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
export const pcProductRagIndex = pc.Index(
  'bhizchat-rag'
);

export const pcSupportDocIndex = pc.Index(
  'bhizchat-support'
);

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
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) =>
    console.error(
      'Error connecting to MongoDB:',
      err
    )
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

let shopifySession: any;
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

interface TextEmbedding {
  values: number[];
  metadata: {
    chunk: number;
    textPreview: string;
  };
  text: string;
}
async function getPDFDocumentEmbeddings(
  pdfBuffer: Buffer,
  chunkSize: number = 4000
): Promise<number[][]> {
  const text = await pdfToText(pdfBuffer);

  // Step 1: Break the text into chunks
  const textChunks: string[] = [];
  for (
    let start = 0;
    start < text.length;
    start += chunkSize
  ) {
    const chunk = text.slice(
      start,
      start + chunkSize
    );
    textChunks.push(chunk);
  }

  // Step 2: Create embeddings for each chunk
  const embeddings = await Promise.all(
    textChunks.map(async (chunk, index) => {
      console.log(
        `Processing chunk ${index + 1}/${
          textChunks.length
        }:`,
        chunk
      ); // Log the text chunk
      const embeddingResponse =
        await openai.embeddings.create({
          input: chunk,
          model: 'text-embedding-ada-002',
        });
      const embedding =
        embeddingResponse.data[0].embedding;
      console.log(
        `Embedding for chunk ${index + 1}:`,
        embedding
      ); // Log the embedding
      return embedding;
    })
  );

  return embeddings;

  // You can now use the embeddings as needed
  console.log('Embeddings created:', embeddings);
}


const isJSON = (gptResponse: string) => {
  try {
    JSON.parse(gptResponse);
    return true;
  } catch (e) {
    return false;
  }
};

// Handling Shopify OAuth initiation from Socket.IO
io.on(
  'connection',
  (socket: AuthenticatedSocket) => {
    console.log(
      'A client  connected: ',
      socket.id
    );

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

    // // Listen for event to start Shopify OAuth
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
          console.log(
            'Session stored successfully'
          );

          // Send success message to the client
          socket.emit('sessionStored', {
            message:
              'Session stored successfully',
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

        const metrics = await Metrics.findOne();

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
          console.log(
            'SAVED A NEW METRIC!!!: ',
            newMetrics
          );
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

    socket.on(
      'authenticate',
      async (userData) => {
        try {
          // Verify user data (you might want to add more validation)
          if (!userData || !userData.id) {
            throw new Error('Invalid user data');
          }
          console.log(
            `index.ts authenticate route called with user data ${userData}`
          );

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
      }
    );

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

      // identify intent of the user query for support, product recommendation, natural chat 
//  TODO :  implement method for the above functionality 

      let gptSupportRespone = await getSupportCompletion(data.prompt);
      console.log(`index.ts the supprot rag completion for the query  - ${data.prompt} is ${gptSupportRespone} `)
      // Get the stream response
      let gptResponse =
        await getRecommendationCompletion(
          data.prompt
        );
      console.log(
        `index.ts the gpt response is ${gptResponse}`
      );
      if (typeof gptResponse !== 'string') {
        for await (const chunk of gptResponse) {
          const content =
            chunk.choices[0]?.delta?.content;
          const functionCallArgs =
            chunk.choices[0]?.delta?.function_call
              ?.arguments;

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
        let finalRecommendationCount = 0;
        if (isJSON(fullGptResponse)) {
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
            finalRecommendationCount =
              recommendationCount;
            // You may also want to store the entire parsed response for further use
            // console.log(
            //   'Full Parsed Response:',
            //   parsedResponse
            // );
          } catch (error) {
            console.error(
              'Error parsing GPT response:',
              error
            );
          }
        }

        console.log(
          `index.ts storing parsed response for user id ${socket.userId}`
        );
        //console.log('what is socket:', socket)
        try {
          if (!socket.userId) {
            console.log('WHYYYYYY');
          }
          const userIdAsObjectId =
            generateObjectIdFromString(
              socket.userId!
            );
          //test
          // console.log("BEFORE PARSIN:",fullGptResponse)
          // console.log("FULL RESPOMSE: ", parsedResponse)
          console.log(
            'NEW ID',
            new ObjectId(userIdAsObjectId)
          );
          console.log('DATA.prompt', data.prompt);
          if (isJSON(fullGptResponse)) {
            await saveChatThread(
              new ObjectId(userIdAsObjectId),
              'Shopify shop ID',
              data.prompt,
              fullGptResponse
            );
          } else {
            await saveStringChatThread(
              new ObjectId(userIdAsObjectId),
              'Shopify shop ID',
              data.prompt,
              fullGptResponse
            );
          }
        } catch (error) {
          console.log('ERROR SAVING:', error);
        }
        const metrics = await Metrics.findOne();

        if (metrics) {
          metrics.totalConversations += 1;
          metrics.totalRecommendations +=
            finalRecommendationCount;
          await metrics.save();

          // console.log("WE UPDATED THE METRICS!!!!!!", metrics)
        } else {
          const newMetrics = new Metrics({
            totalUsers: 1,
            totalConversations: 1,
            totalRecommendations:
              finalRecommendationCount,
          });
          await newMetrics.save();
          console.log(
            'SAVED A NEW METRIC!!!: ',
            newMetrics
          );
        }

        // await Metrics.updateOne({}, { $inc: { totalConversations: 1, totalRecommendations: finalRecommendationCount } });

        console.log(
          `Sending response to client: ${gptResponse}`
        );
        socket.emit('openaiResponseEnd', {
          success: true,
          result: '\n',
        });
      }
    });
   
    socket.on(
      'fetchConversations',
      async (userId) => {
        ///TESTING
        // userId = new ObjectId('672b0012befa3bf47324ddb8')
        // console.log(
        //   `Fetching conversations for userId: ${userId}`
        // );
        try {
          if (
            !socket.userId ||
            typeof socket.userId !== 'string'
          ) {
            socket.emit('userIdError', {
              message: 'No user ID found',
            });
            console.log('NO USER ID GIVEN');
            return;
          }

          const userIdAsObjectId =
            generateObjectIdFromString(
              socket.userId!
            );

          // Validate userId
          if (!userIdAsObjectId) {
            socket.emit('error', {
              message:
                'No valid user ID provided',
            });
            console.log('INVALID USER ID');
            return;
          }
          const conversations =
            await ChatThread.find({
              userId: userIdAsObjectId,
            });
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
                      messageId:
                        message.messageId,
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
          socket.emit('error', {
            message:
              'Failed to fetch conversations',
          });
        }
      }
    );
    socket.on('fetchMetrics', async () => {
      try {
        const metrics = await fetchMetrics();
        socket.emit('metrics', {
          success: true,
          metrics: metrics,
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
              'X-Shopify-Access-Token':
                accessToken,
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
      const { shopName, fileName, fileData } =
        data;

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
        const documentId = uuidv4();
        const documentBuffer  = Buffer.from(fileData)
        // Create a new file document with the file data
        const newFile = new File({
          shopName,
          documentId,
          fileName,
          fileData: documentBuffer, // Convert file data to Buffer for MongoDB storage
        });

        // Save the file document to MongoDB
        await newFile.save();

        console.log(
          `File uploaded for shop ${shopName} and stored in MongoDB`
        );


        const documentText =
          documentBuffer.toString('utf-8'); 

          
        console.log(
          `Generating embeddings for support document: ${fileName}`
        );
       const embeddings = await getPDFDocumentEmbeddings(documentBuffer)

        console.log(
          `Upserting embeddings for document: ${fileName} into Pinecone`
        );
      
           const pineconeRecords = embeddings.map((embedding, index) => {
              console.log(`index.ts Embedding for chunk ${index}:`, embedding); // Print each embedding
              return {
                id: `${documentId}-chunk-${index}`, 
                values: embedding, 
                metadata: {
                  shopName,
                  fileName,
                  chunk: index,
                  textPreview: '', 
                },
              };
           });
           await pcSupportDocIndex.upsert(pineconeRecords);


        socket.emit('uploadSuccess', {
          success: true,
          message: `Document uploaded successfully for shop ${shopName} and stored in MongoDB!`,
          fileName,
          documentId,
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

    socket.on(
      'fetchDocumentIdsForStore',
      async (shopName: string) => {
        console.log(
          ` fetchDocumentsForStore called for shop name ${shopName}`
        );
        if (!shopName) {
          socket.emit('fetchError', {
            success: false,
            message:
              'Shop name is required to fetch documents.',
          });
          return;
        }

        console.log(
          `Fetching documents for shop: ${shopName}`
        );

        try {
          // Find all documents for the specified shop and retrieve only documentId
          const documents = await File.find(
            { shopName },
            'documentId'
          );

          if (documents.length === 0) {
            socket.emit('fetchSuccess', {
              success: false,
              message: `No documents found for shop ${shopName}.`,
            });
            return;
          }

          // Extract document IDs from the result
          const documentIds = documents.map(
            (doc) => doc.documentId
          );

          socket.emit('fetchSuccess', {
            success: true,
            message: `Documents for shop ${shopName} fetched successfully!`,
            documentIds, // Array of document IDs
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
      }
    );

    socket.on('fetchDocument', async (data) => {
      const { shopName, documentId } = data;

      if (!shopName || !documentId) {
        socket.emit('fetchError', {
          success: false,
          message:
            'Both shop name and document ID are required to fetch a document.',
        });
        return;
      }

      console.log(
        `Fetching document with ID ${documentId} for shop: ${shopName}`
      );

      try {
        // Find the specific document matching both shopName and documentId
        const document = await File.findOne({
          shopName,
          documentId,
        });

        if (!document) {
          socket.emit('fetchSuccess', {
            success: false,
            message: `No document found for shop ${shopName} with ID ${documentId}.`,
          });
          return;
        }

        // Convert document data to base64 for transmission
        const documentDetail = {
          fileName: document.fileName,
          fileData:
            document.fileData.toString('base64'),
          uploadDate: document.uploadDate,
        };

        socket.emit('fetchDocumentSuccess', {
          success: true,
          message: `Document with ID ${documentId} fetched successfully for shop ${shopName}.`,
          document: documentDetail,
        });
      } catch (err) {
        console.error(
          'Error fetching document:',
          err
        );
        socket.emit('fetchError', {
          success: false,
          message:
            'An error occurred while fetching the document.',
        });
      }
    });

    socket.on(
      'deleteDocument',
      async (data: {
        shopName: string;
        documentId: string;
      }) => {
        const { shopName, documentId } = data;

        if (!shopName || !documentId) {
          socket.emit('deleteError', {
            success: false,
            message:
              'Shop name and document ID are required to delete a document.',
          });
          return;
        }

        console.log(
          `Attempting to delete document with ID ${documentId} for shop: ${shopName}`
        );

        try {
          // Attempt to delete the document matching both shopName and documentId
          const result = await File.deleteOne({
            shopName,
            documentId,
          });

          if (result.deletedCount === 0) {
            socket.emit('deleteSuccess', {
              success: false,
              message: `No document found for shop ${shopName} with ID ${documentId}.`,
            });
            return;
          }
          // await pcSupportDocIndex.de
        
          socket.emit('deleteSuccess', {
            success: true,
            message: `Document with ID ${documentId} deleted successfully for shop ${shopName}.`,
          });
        } catch (err) {
          console.error(
            'Error deleting document:',
            err
          );
          socket.emit('deleteError', {
            success: false,
            message:
              'An error occurred while deleting the document.',
          });
        }
      }
    );
    // Middleware to check session expiration before processing any event
    socket.use((packet, next) => {
      if (socket.userId && socket.lastActivity) {
        const currentTime = Date.now();
        const inactivityTime =
          currentTime - socket.lastActivity;

        if (
          inactivityTime >
          12 * 60 * 60 * 1000
        ) {
          // 5 minutes in milliseconds

          console.log(
            'Session expired and loggging out '
          );
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
  }
);

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
