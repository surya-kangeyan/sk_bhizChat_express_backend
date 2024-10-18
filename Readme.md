# Shopify App with Socket.IO Server

## Key Functionalities:
### Contextual Product Recommendation System:
-  Utilizes natural language processing to interpret user queries and generate relevant product suggestions. For instance, a query about weightlifting equipment triggers    recommendations for related fitness apparatus, nutritional supplements, and associated fitness regimens.
### Multi-modal Information Synthesis:
  -  Aggregates data from various sources including product descriptions, user reviews, and inventory systems to provide comprehensive responses to user inquiries.
### Real-time Inventory and Logistics Integration:
  - Interfaces with Shopify's backend systems to provide up-to-date information on product availability and estimated delivery timeframes.
### Sentiment Analysis of User Reviews:
 -  Employs natural language processing techniques to analyze and summarize user reviews, extracting key insights and prevalent opinions.
### Dynamic Product Comparison:
  - Implements a feature extraction and comparison algorithm to juxtapose multiple products based on user-specified criteria.
### Predictive Trend Analysis:
  - Utilizes machine learning models to analyze historical data and predict upcoming trends in product categories.
###  Multilingual Natural Language Understanding:
  - Incorporates multilingual models to process and respond to queries in various languages, enhancing global accessibility.
### Voice-based User Interface:
  - Integrates speech recognition and text-to-speech technologies to enable voice-based interactions.
### The system leverages advanced machine learning techniques, including:
  - Embedding-based similarity search for product retrieval
  - Transformer-based language models for natural language understanding and generation
  - Vector databases for efficient similarity computations

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

# Technical Summary: Shopify App with Socket.IO Server

## Architecture Overview

This project is a Node.js-based Shopify app that integrates various technologies to provide a robust e-commerce solution with AI-powered product recommendations.

### Key Components:

1. **Backend Framework**: Express.js
2. **Real-time Communication**: Socket.IO
3. **Database**: MongoDB (for session storage)
4. **AI Integration**: OpenAI API
5. **Vector Database**: Pinecone
6. **E-commerce Platform**: Shopify (via GraphQL API)
7. **Authentication**: Shopify OAuth
8. **Language**: TypeScript

## Core Functionalities

1. **Shopify Integration**:
   - OAuth authentication flow
   - Product and collection fetching via GraphQL API
   - Webhook handling for product updates

2. **Real-time Communication**:
   - WebSocket-based client-server interaction using Socket.IO
   - Events for authentication, product fetching, and AI queries

3. **AI-Powered Recommendations**:
   - Integration with OpenAI for natural language processing
   - Use of Pinecone for efficient vector similarity search
   - Product embedding and retrieval system

4. **Session Management**:
   - Custom session storage solution using MongoDB
   - Handling of both online and offline access tokens

5. **Data Models**:
   - Mongoose schemas for products, collections, user details, and chat threads

## Technical Highlights

- **TypeScript Implementation**: Enhances code quality and developer experience with static typing.
- **Modular Architecture**: Separation of concerns with distinct modules for routes, models, and services.
- **Asynchronous Programming**: Extensive use of async/await for handling asynchronous operations.
- **Environment Configuration**: Utilization of dotenv for managing environment variables.
- **API Security**: Implementation of HMAC validation for Shopify webhooks.
- **Error Handling**: Comprehensive error catching and logging throughout the application.

## Development and Deployment

- **Development Mode**: Custom script using ts-node for running TypeScript directly.
- **Build Process**: TypeScript compilation to JavaScript for production deployment.
- **Testing**: Jest framework set up for unit and integration testing.
- **Linting**: ESLint configuration for maintaining code quality.

## Scalability and Performance Considerations

- Socket.IO enables efficient real-time communication, reducing server load.
- MongoDB provides a scalable solution for session storage.
- Pinecone vector database allows for fast and efficient similarity searches on large product datasets.
- Modular design facilitates easy expansion and maintenance of the codebase.

This Shopify app demonstrates a sophisticated integration of e-commerce, real-time communication, and AI technologies, providing a solid foundation for building advanced e-commerce solutions with personalized product recommendations.
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

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_AGENT_PROMPT=your_custom_prompt_for_openai_agent

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/your_database_name
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

- Shopify OAuth Start: `GET /api/auth?shop=YOUR_SHOP_NAME`
- Shopify OAuth Callback: `GET /api/auth/callback`
- Fetch Collections (HTTP): `GET /api/collects`

## WebSocket Events

- `startShopifyAuth`: Initiates the Shopify OAuth process
- `storeSession`: Stores the Shopify session
- `fetchAndStoreAllProducts`: Fetches all products from Shopify and stores them in Pinecone
- `queryProducts`: Queries products using OpenAI and Pinecone
- `fetchCollections`: Fetches Shopify collections
- `openaiPrompt`: Sends a prompt to OpenAI for processing

For detailed usage of these events, refer to the `src/index.ts` file:


## Troubleshooting

- If you encounter CORS issues, ensure that your `FRONTEND_URL` in the `.env` file matches your frontend application's URL.
- For MongoDB connection issues, verify that your MongoDB server is running and the `MONGODB_URI` in the `.env` file is correct.
- If Shopify authentication fails, double-check your `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` in the `.env` file.

For any other issues, please check the console logs for error messages and ensure all environment variables are correctly set.
