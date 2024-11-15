import {
  pc,
  pcProductRagIndex,
} from '../index.js'; // Pinecone client import

import { openai } from '../index.js';
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
  console.log(
    `QueryAndGenerateResponse Received user query: ${userQuery}`
  );
  ``;
  try {
    const intentResponse =
      await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant. First, determine if the user query is related to fitness goals or product recommendations.
              Classify the query as 'fitness' if it mentions any of the following topics: workouts, physical exercises, fitness products,
              exercise routines, strength training, flexibility improvement, weight loss, endurance training, cardio activities 
              (e.g., running, cycling, swimming), resistance training, muscle building, body toning, rehabilitation exercises, yoga, pilates, 
              HIIT (High-Intensity Interval Training), cross-training, fitness challenges, warm-ups, cooldowns, stretching, recovery exercises, 
              meditation, sports nutrition, fitness gear, personal fitness goals, gym equipment, fitness trackers, supplements, calorie tracking, home workouts, or fitness program
              Respond with "fitness" if related to fitness, otherwise respond with "general".,

              `,
          },
          { role: 'user', content: userQuery },
        ],
      });
    console.log(
      'Query and Generate Response Intent Response',
      intentResponse.choices[0]?.message?.content
    );
    const intent =
      intentResponse.choices[0]?.message?.content?.trim();
    let completion;
    if (intent === 'fitness') {
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
      const queryResponse =
        await pcProductRagIndex.query({
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
    )}
    Price: ${match.metadata?.price || 'N/A'}`
        )
        .join('\n\n');

      console.log(
        'Product Context for GPT:\n',
        productContext
      );
      completion =
        await openai.chat.completions.create({
          model: 'gpt-4o',
          stream: true,
          messages: [
            {
              role: 'system',
              content: `You are a friendly fitness sales assistant. Engage naturally with the user, even if they start casually. 
              Always lead conversations towards fitness-related topics and goals.
              Your role is to provide fitness tips, workout routines, or product suggestions based on their needs. 
              Provide responses in Markdown format where applicable.`,
            },
            {
              role: 'user',
              content: `Use the following product data to make your recommendation: ${productContext}

    User Query: ${userQuery}

    Provide a response with strict Markdown formatting for all sections except 'recommendations', which should be in JSON format.`,
            },
          ],
          functions: [
            {
              name: 'get_fitness_recommendations',
              description:
                'Get fitness product recommendations based on user query',
              parameters: {
                type: 'object',
                properties: {
                  intro_message: {
                    type: 'string',
                    description:
                      'An introductory message in Strict Markdown format explaining the context and product selection process.',
                  },
                  message: {
                    type: 'string',
                    description:
                      'A summary message in Strict Markdown format recommending the chosen product(s).',
                  },
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        description: {
                          type: 'string',
                        },
                        category: {
                          type: 'string',
                        },
                        use_case: {
                          type: 'string',
                        },
                        maintenance: {
                          type: 'string',
                        },
                        image_url: {
                          type: 'string',
                        },
                        price: { type: 'string' },
                      },
                    },
                    description:
                      'An array of recommended products in JSON format.',
                  },
                  recommendation_count: {
                    type: 'integer',
                    description:
                      'The number of product recommendations provided.',
                  },
                  fitness_benefits: {
                    type: 'string',
                    description:
                      "A detailed explanation in Strict Markdown format of how these product(s) support the user's fitness journey.",
                  },
                  next_steps: {
                    type: 'string',
                    description:
                      'Suggested follow-up actions in Strict Markdown format.',
                  },
                  follow_up_message: {
                    type: 'string',
                    description:
                      'A closing message in Strict Markdown format with two short, easily parsable follow-up questions about the recommended products, formatted as a numbered list.',
                  },
                },
                required: [
                  'intro_message',
                  'message',
                  'recommendations',
                  'recommendation_count',
                  'fitness_benefits',
                  'next_steps',
                  'follow_up_message',
                ],
              },
            },
          ],
          function_call: {
            name: 'get_fitness_recommendations',
          },
        });
    } else {
      // Engage naturally without recommendations
      completion =
        await openai.chat.completions.create({
          model: 'gpt-4o',
          stream: true,
          messages: [
            {
              role: 'system',
              content: `
              You are a friendly fitness sales assistant. Engage naturally with the user, even if they start casually, 
              and ask them about their fitness goals, routines, or progress without jumping into recommendations unless asked.
              If the user query is not related to fitness, steer the conversation back to stric fitness topics.
              Provide responses in Markdown format where applicable.

              `,
            },
            {
              role: 'user',
              content: userQuery,
            },
          ],
        });
      // return completion.choices[0].message.content;
      // console.log(completion.choices[0].message.content);
    }

    return completion;
    if (
      completion &&
      completion.choices &&
      completion.choices.length > 0
    ) {
      const responseMessage =
        completion.choices[0].message;
      const functionCall =
        responseMessage?.function_call;
      let argumentsString =
        'Sorry, I could not generate a response.';

      if (
        functionCall &&
        functionCall.name ===
          'get_fitness_recommendations'
      ) {
        argumentsString = functionCall.arguments;
        console.log(
          'Unparsed Json String:',
          argumentsString
        );
      } else {
        console.log(
          'No function call found or unexpected function name'
        );
      }
      console.log(
        'GPT raw unparsed json Response:',
        argumentsString
      );
      return (
        argumentsString ||
        'Sorry, I could not generate a response.'
      );
    }
  } catch (error) {
    console.error(
      'Error querying Pinecone or GPT:',
      error
    );
    return 'There was an error processing your request.';
  }
}
