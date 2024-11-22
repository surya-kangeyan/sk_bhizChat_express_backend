import { openai } from '../index.js';

/**
 * Classifies the intent of a user query.
 * @param userQuery - The user's input query.
 * @returns The identified intent: 'support', 'recommendation', or 'chat'.
 */
export async function classifyIntent(
  userQuery: string
): Promise<
  'support' | 'recommendation' | 'chat'
> {
  try {
    const response =
      await openai.chat.completions.create({
        model: 'gpt-4', // Corrected model name
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for a fitness-based store that classifies user queries into one of the following intents: 'support', 'recommendation', or 'chat'.

**Definitions:**
- **Support:** Inquiries related to customer service, policies, technical assistance, returns, store information, account issues, and similar topics.
- **Recommendation:** Requests for suggestions, advice, product or service recommendations, best practices, and similar topics.
- **Chat:** General conversations or queries that do not fall under 'support' or 'recommendation'.

**Instructions:**
- Analyze the user's query and determine its intent.
- Respond with only the intent in lowercase: either 'support', 'recommendation', or 'chat'.
- Do not provide any additional text or explanations.

**Examples:**
- User: "What is your return policy?"
  Assistant: support

- User: "Can you recommend a good treadmill for home use?"
  Assistant: recommendation

- User: "Hello! How are you?"
  Assistant: chat

- User: "I need help resetting my password."
  Assistant: support

- User: "What are the best supplements for muscle gain?"
  Assistant: recommendation`,
          },
          {
            role: 'user',
            content: `User Query: "${userQuery}"`,
          },
        ],
        temperature: 0,
      });

    const intent =
      response.choices[0]?.message?.content
        ?.trim()
        .toLowerCase();

    if (
      intent === 'support' ||
      intent === 'recommendation' ||
      intent === 'chat'
    ) {
      return intent;
    } else {
      // Default to 'chat' if intent is unclear
      return 'chat';
    }
  } catch (error) {
    console.error(
      'Error classifying intent:',
      error
    );
    // Default to 'chat' on error
    return 'chat';
  }
}
