import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
// import Session from './models/session';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  transports: ['websocket'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Connect to MongoDB
mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Socket.IO connection logic
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  socket.on('pingServer', () => {
    console.log('Ping received from client');
    socket.emit('pongServer', { message: 'Server is alive' });
  });

  // socket.on('storeSession', async (sessionData) => {
  //   try {
  //     console.log('Received session data:', sessionData);

  //     if (!sessionData || !sessionData.id || !sessionData.shop) {
  //       socket.emit('error', 'Invalid session data');
  //       return;
  //     }

  //     await Session.findOneAndDelete({ id: sessionData.id });
  //     const newSession = new Session(sessionData);
  //     await newSession.save();

  //     console.log('Session stored successfully');
  //     socket.emit('sessionStored', { message: 'Session stored successfully' });
  //   } catch (error) {
  //     console.error('Error storing session:', error);
  //     socket.emit('error', 'Failed to store session');
  //   }
  // });

  socket.on('openaiPrompt', async (data) => {
    const { prompt } = data;
    let conversationHistory: ChatCompletionMessageParam[] = [
      { role: 'system', content: process.env.OPENAI_AGENT_PROMPT || '' },
      { role: 'user', content: prompt }
    ];
  
    console.log('Prompt received from client:', prompt);
  
    try {
      const response = await openai.chat.completions.create({
        model: 'ft:gpt-4o-mini-2024-07-18:bhizchat::AJAXyweI',
        messages: conversationHistory,
        max_tokens: 1000,
      });
  
      const aiResponse = response.choices[0]?.message?.content ?? 'Empty response from OpenAI';
      console.log('OpenAI response:', aiResponse);
  
      conversationHistory.push({ role: 'assistant', content: aiResponse });
  
      socket.emit('openaiResponse', {
        success: true,
        result: aiResponse,
      });
    } catch (error) {
      console.error('Error with OpenAI API:', (error as Error).message);
      socket.emit('openaiResponse', {
        success: false,
        message: 'An error occurred with the OpenAI API',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Test route
app.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'Server is running correctly',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).send('An unexpected error occurred');
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});