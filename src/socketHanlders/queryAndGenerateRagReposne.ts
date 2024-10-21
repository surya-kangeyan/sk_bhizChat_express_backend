import { pc, pcIndex } from '../index'; // Pinecone client import

import { openai } from '../index';
// Function to query Pinecone and generate GPT response

function getProductImageUrl(
  images: unknown
): string {
  if (
    typeof images === 'object' &&
    images !== null &&
    'edges' in images &&
    Array.isArray((images as any).edges)
  ) {
    return (
      (
        images as {
          edges: { node: { src: string } }[];
        }
      ).edges[0]?.node?.src || 'N/A'
    );
  } else if (typeof images === 'string') {
    return images; // In case the image is provided as a string URL
  }
  return 'N/A'; // Fallback if no valid image is found
}
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
          `Product: ${
            match.metadata?.title || 'N/A'
          }
          Description: ${
            match.metadata?.description || 'N/A'
          }
          Score: ${match.score}
    Product Image URL: ${getProductImageUrl(
      match.metadata?.images
    )}`
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
            content: `When responding, return the response in the following structured JSON format:

                  {
                    "intro_message": "An introductory message explaining the context and product selection process.",
                    "message": "A summary message recommending the chosen product(s).",
                    "recommendations": [
                      {
                        "id": "Product ID",
                        "title": "Product Title",
                        "description": "Product Description",
                        "category": "Product Category (e.g., Cardio Equipment, Strength Equipment)",
                        "use_case": "How the product fits into the user's fitness routine, with actionable tips for use.",
                        "maintenance": "Care or maintenance tips to keep the product in good condition.",
                        "image_url": "Image URL for the product."
                      }
                    ],
                    "fitness_benefits": "A detailed explanation of how these product(s) support the user's fitness journey, including specific fitness outcomes (e.g., endurance, weight loss).",
                    "next_steps": "Suggested follow-up actions, such as incorporating the product(s) into a workout routine or tracking progress.",
                    "follow_up_message": "A closing message encouraging the user to return and share their progress for further assistance."
                  }

                  Use the following product data to make your recommendation. You can recommend **any number of products**, but normally try to limit the recommendations to 2 for clarity and focus:

                  ${productContext}

                  User Query: ${userQuery}

                  Ensure that each section in the JSON response contains relevant and meaningful content. Follow the structure strictly to ensure the response is easy to parse. If no suitable product can be recommended, explain why within the 'message' field.`,
            },
        ],
        max_tokens: 5000,
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
