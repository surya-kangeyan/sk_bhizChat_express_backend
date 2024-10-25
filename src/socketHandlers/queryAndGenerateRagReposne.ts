

import { pc, pcIndex } from '../index.js'; // Pinecone client import

import {openai} from '../index.js';
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
  console.log(`QueryAndGenerateResponse Received user query: ${userQuery}`);``
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
    )}
    Price: ${match.metadata?.price || 'N/A'}`
      )
      .join('\n\n');

    console.log(
      'Product Context for GPT:\n',
      productContext
    );

    // Step 4: Send the user query and product context to GPT for generation
    // const gptResponse =
      // await openai.chat.completions.create({
      //   model: 'gpt-4o', // Use GPT-4 or your fine-tuned model
      //   messages: [
      //     {
      //       role: 'system',
      //       content:
      //         process.env.OPENAI_AGENT_PROMPT ||
      //         'You are a helpful assistant recommending fitness products.',
      //     },
      //     {
      //       role: 'user',
      //       content: `When responding, return the response in the following structured JSON format:

      //             {
      //               "intro_message": "An introductory message explaining the context and product selection process.",
      //               "message": "A summary message recommending the chosen product(s).",
      //               "recommendations": [
      //                 {
      //                   "id": "Product ID",
      //                   "title": "Product Title",
      //                   "description": "Product Description",
      //                   "category": "Product Category (e.g., Cardio Equipment, Strength Equipment)",
      //                   "use_case": "How the product fits into the user's fitness routine, with actionable tips for use.",
      //                   "maintenance": "Care or maintenance tips to keep the product in good condition.",
      //                   "image_url": "Image URL for the product."
      //                 }
      //               ],
      //               "fitness_benefits": "A detailed explanation of how these product(s) support the user's fitness journey, including specific fitness outcomes (e.g., endurance, weight loss).",
      //               "next_steps": "Suggested follow-up actions, such as incorporating the product(s) into a workout routine or tracking progress.",
      //               "follow_up_message": "A closing message encouraging the user to return and share their progress for further assistance."
      //             }

      //             Use the following product data to make your recommendation. You can recommend **any number of products**, but normally try to limit the recommendations to 2 for clarity and focus:

      //             ${productContext}

      //             User Query: ${userQuery}

      //             Ensure that each section in the JSON response contains relevant and meaningful content. Follow the structure strictly to ensure the response is easy to parse. If no suitable product can be recommended, explain why within the 'message' field.`,
      //       },
      //   ],
      //   max_tokens: 5000,
      // });
// -----------------------------------------------------------------------------------------------
//       const gptResponse =
//         await openai.chat.completions.create({
//           model: 'gpt-4o', // Use GPT-4 or your fine-tuned model
//           messages: [
//             {
//               role: 'system',
//               content:
//                 process.env.OPENAI_AGENT_PROMPT ||
//                 'You are a helpful assistant recommending fitness products.',
//             },
//             {
//               role: 'user',
//               content: `Use the following product data to make your recommendation. You can recommend any number of products, but normally try to limit the recommendations to 2 for clarity and focus:

//       ${productContext}

//       User Query: ${userQuery}

//       Ensure that each section in the response contains relevant and meaningful content. If no suitable product can be recommended, explain why within the 'message' field.`,
//             },
//           ],
//           functions: [
//             {
//               name: 'get_fitness_recommendations',
//               description:
//                 'Get fitness product recommendations based on user query',
//               parameters: {
//                 type: 'object',
//                 properties: {
//                   intro_message: {
//                     type: 'string',
//                     description:
//                       'An introductory message explaining the context and product selection process and tell your name .',
//                   },
//                   message: {
//                     type: 'string',
//                     description:
//                       'A summary message recommending the chosen product(s).',
//                   },
//                   recommendations: {
//                     type: 'array',
//                     items: {
//                       type: 'object',
//                       properties: {
//                         id: { type: 'string' },
//                         title: { type: 'string' },
//                         description: {
//                           type: 'string',
//                         },
//                         category: {
//                           type: 'string',
//                         },
//                         use_case: {
//                           type: 'string',
//                         },
//                         maintenance: {
//                           type: 'string',
//                         },
//                         image_url: {
//                           type: 'string',
//                         },
//                       },
//                     },
//                   },
//                   fitness_benefits: {
//                     type: 'string',
//                     description:
//                       "A detailed explanation of how these product(s) support the user's fitness journey, including specific fitness outcomes.",
//                   },
//                   next_steps: {
//                     type: 'string',
//                     description:
//                       'Suggested follow-up actions, such as incorporating the product(s) into a workout routine or tracking progress.',
//                   },
//                   follow_up_message: {
//                     type: 'string',
//                     description:
//                       'A closing message encouraging the user to return and share their progress for further assistance.',
//                   },
//                 },
//                 required: [
//                   'intro_message',
//                   'message',
//                   'recommendations',
//                   'fitness_benefits',
//                   'next_steps',
//                   'follow_up_message',
//                 ],
//               },
//             },
//           ],
//           function_call: {
//           name: 'get_fitness_recommendations',
//         },
//         max_tokens: 5000,
//       });

//     console.log('GPT raw response', gptResponse.choices[0]?.message);
//     const gptMessage =
//       gptResponse.choices[0]?.message?.content;
// const functionCall =
//   gptResponse.choices[0]?.message?.function_call;
//     let argumentsString =
//       'Sorry, I could not generate a response.';
//     if (
//       functionCall &&
//         functionCall.name ===
//           'get_fitness_recommendations'
//       ) {
//          argumentsString = functionCall.arguments;
//         console.log('Unparsed Json String:', argumentsString);
//         // const argumentsObject = JSON.parse(
//         //   argumentsString
//         // );

//         // console.log(
//         //   'GPT Response (parsed):',
//         //   argumentsObject
//         // );

//         // Now you can access individual fields
//         // console.log(
//         //   'Intro Message:',
//         //   argumentsObject.intro_message
//         // );
//         // console.log(
//         //   'Recommendations:',
//         //   argumentsObject.recommendations
//         // );
//         // ... and so on for other fields
//       } else {
//         console.log(
//           'No function call found or unexpected function name'
//         );
//       }
//     console.log('GPT raw unparsed json Response:', gptMessage);
// -----------------------------------------------------------------------------------------------------------------

const completion =
  await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant recommending fitness products. Provide responses in Markdown format where applicable.',
      },
      {
        role: 'user',
        content: `Use the following product data to make your recommendation: ${productContext}

User Query: ${userQuery}

Provide a response with Markdown formatting for all sections except 'recommendations', which should be in JSON format.`,
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
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  use_case: { type: 'string' },
                  maintenance: { type: 'string' },
                  image_url: { type: 'string' },
                  price: { type: 'string' },
                },
              },
              description:
                'An array of recommended products in JSON format.',
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
                'A closing message in Strict Markdown format encouraging the user to return and share their progress.',
            },
          },
          required: [
            'intro_message',
            'message',
            'recommendations',
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
 const responseMessage = completion.choices[0].message;
const functionCall =
  completion.choices[0]?.message?.function_call;
    let argumentsString =
      'Sorry, I could not generate a response.';
    if (
      functionCall &&
        functionCall.name ===
          'get_fitness_recommendations'
      ) {
         argumentsString = functionCall.arguments;
        console.log('Unparsed Json String:', argumentsString);
       
      } else {
        console.log(
          'No function call found or unexpected function name'
        );
      }
    console.log(
      'GPT raw unparsed json Response:',
      argumentsString
    );
    // --------------------------------------------------------------------------------------------
    return (
      argumentsString ||
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
