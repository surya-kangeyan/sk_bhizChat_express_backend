import {
  pc,
  pcSupportDocIndex,
} from '../index.js'; // Pinecone client import
import { openai } from '../index.js';

export async function getSupportCompletion(
  userQuery: string
): Promise<string> {
  console.log(
    `Received user query: ${userQuery}`
  );

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
      `Generated embedding for the user query ${queryEmbedding} `
    );

    // Step 2: Query Pinecone index for relevant support documents
    const queryResponse =
      await pcSupportDocIndex.query({
        vector: queryEmbedding,
        topK: 20, // Retrieve the top 5 most relevant documents
        includeMetadata: true, // Include metadata for context building
      });
      console.log(`supportRag.ts the query embeddings that match the query ${queryResponse.matches}`)
        console.log(
          'supportRag.ts Query Response:',
          JSON.stringify(queryResponse, null, 2)
        );
    const matches = queryResponse.matches || [];
    if (matches.length === 0) {
      return 'No relevant support documents found.';
    }

    // Step 3: Prepare context from the document matches
    const docContext = matches
      .map((match) => {
        console.log(`suppoerRag.ts the match details are ${match.metadata}`);
        const title =
          match.metadata?.title || 'N/A';
        const summary =
          match.metadata?.summary || 'N/A';
        const contentUrl =
          match.metadata?.description || 'N/A';
        return `Title: ${title}\nSummary: ${summary}\nURL: ${contentUrl}`;
      })
      .join('\n\n');

    console.log(
      'Document Context:\n',
      docContext
    );

    // Step 4: Generate completion based on the retrieved context
    const completionResponse =
      await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:'You are an AI customer service assistant for an online store. Assist customers with their queries, following these guidelines:\
                    Automated Responses:\
                    Provide direct answers to queries about:\
                    - Shipping: Options, costs, delivery times, international policies.\
                    - Returns/Exchanges: Process, timeframes, conditions, procedures.\
                    - Promotions/Discounts: Current offers, eligibility, redemption.\
                    - Reviews/Feedback: How to leave reviews or feedback.\
                    - Refunds: Process, timeframes, conditions.\
                    - Gift Cards/Vouchers: Purchasing, redeeming, terms of use.\
                    - Loyalty Programs: Enrollment, benefits, earning/redeeming points.\
                    - Privacy/Data Security: Information handling, data protection.\
                    - Store Policies: Terms of service, privacy, and guidelines.\
                    Semi-Automated Assistance:\
                    Provide initial help, then direct to store contact:\
                    - Account Management: Account creation, access, password resets.\
                    - Technical Issues: Basic website navigation or functionality.\
                    \
                    Contact Required:\
                    Provide store contact information only for:\
                    - Product Availability: Stock, restocking, pre-orders.\
                    - Order Modifications: Changes or cancellations after order placement.\
                    \
                    General Rules:\
                    - Be friendly and professional in tone.\
                    - If unsure about the query, direct the customer to store support.\
                    - Provide store contact information for semi-automated and contact-required queries.\
                    - Be concise but thorough in responses.\
                    - Ask for clarification if a query is unclear and direct to store support if needed.\
                    \
                    Your goal is to provide accurate, efficient, and exceptional customer service tailored to the query type.\
'
},
          {
            role: 'user',
            content: `Here is the context of relevant documents to assist with the query:\n${docContext}\n\nUser Query: ${userQuery}`,
          },
        ],
      });

    const completion =
      completionResponse.choices[0]?.message
        ?.content || 'No response generated.';
    console.log(
      'Generated Completion:',
      completion
    );

    return completion;
  } catch (error) {
    console.error(
      'Error processing query or generating response:',
      error
    );
    return 'There was an error processing your request.';
  }
}
