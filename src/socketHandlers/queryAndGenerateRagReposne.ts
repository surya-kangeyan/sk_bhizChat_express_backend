

import { pc, pcIndex } from '../index.js'; // Pinecone client import

import {openai} from '../index.js';
// Function to query Pinecone and generate GPT response
export async function queryAndGenerateResponse(
  userQuery: string
) {
  try {
    // Step 1: Generate embedding for the user query
    const queryEmbeddingResponse =
      await openai.embeddings.create({
        input: userQuery,
        model: 'text-embedding-ada-002',
      });

    const queryEmbedding =
      queryEmbeddingResponse.data[0].embedding;

    console.log(
      'Generated embedding for user query.'
    );

    // Step 2: Query Pinecone index for relevant products
    const queryResponse = await pcIndex.query({
      vector: queryEmbedding,
      topK: 5, // Fetch top 5 matching products
      includeMetadata: true,
    });

    const matches = queryResponse.matches || [];

    if (matches.length === 0) {
      return 'No relevant products found.';
    }

    // Step 3: Prepare context from the product matches
    const productContext = matches
      .map(
        (match) =>
          `Product: ${match.metadata?.title}\nDescription: ${match.metadata?.description}\nScore: ${match.score}`
      )
      .join('\n\n');

    console.log(
      'Product Context for GPT:\n',
      productContext
    );

    // Step 4: Send the user query and product context to GPT for generation
    const gptResponse =
      await openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4 or your fine-tuned model
        messages: [
          {
            role: 'system',
            content:
              process.env.OPENAI_AGENT_PROMPT ||
              'You are a helpful assistant recommending fitness products.',
          },
          {
            role: 'user',
            content: `Based on the following products, help me find the best option:\n\n${productContext}\n\nUser Query: ${userQuery}`,
          },
        ],
        max_tokens: 500,
      });

    const gptMessage =
      gptResponse.choices[0]?.message?.content;

    console.log('GPT Response:', gptMessage);

    return (
      gptMessage ||
      'Sorry, I could not generate a response.'
    );
  } catch (error) {
    console.error(
      'Error querying Pinecone or GPT:',
      error
    );
    return 'There was an error processing your request.';
  }
}
