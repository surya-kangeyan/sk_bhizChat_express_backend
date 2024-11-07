import ChatThread from '../models/userChatThread.js';
import mongoose from 'mongoose';


export const saveChatThread = async (userId: mongoose.Types.ObjectId, shopId: string, userQuery: string, gptResponse: string) => {  
    let parsedRecommendations = [];
    let jsonGPTResponse = {};
    try {
        const jsonObject = JSON.parse(gptResponse);
        jsonGPTResponse = jsonObject;
        console.log(jsonObject);
        console.log("intro_message!!!: " + jsonObject.intro_message); // Access individual properties
        if (Array.isArray(jsonObject.recommendations)) {
          parsedRecommendations = jsonObject.recommendations;
          jsonObject.recommendations.forEach((recommendation: any, index: number) => {
              console.log(`Recommendation ${index + 1}:`, recommendation);
          });
      } else {
          console.log("No recommendations found or not an array.");
      }
      } catch (error) {
        console.error("Invalid JSON string:", error);
      }
    try {
    console.log("USER QUERY: " + userQuery)

    const existingChatThread = await ChatThread.findOne({ userId: userId})

    
    if (existingChatThread) {
            console.log("FOUND A USER")
            existingChatThread.messages.push({
                messageId: new mongoose.Types.ObjectId(),
                userInput: {
                    content: userQuery,
                    timestamp: new Date(),
                },
                llmOutput: {
                    content: gptResponse,
                    timestamp: new Date(),
                    recommendations: parsedRecommendations,
                },
            });
            await existingChatThread.save();
            console.log('Chat thread updated successfully');
        } else {
            // Create a new chat thread if none exists
            console.log("DIDNT FIND A USER")
            const chatThread = new ChatThread({
                userId: userId,
                shopId: shopId,
                chatThreadId: new mongoose.Types.ObjectId(),
                messages: [
                    {
                        messageId: new mongoose.Types.ObjectId(),
                        userInput: {
                            content: userQuery,
                            timestamp: new Date(),
                        },
                        llmOutput: {
                            content: gptResponse,
                            timestamp: new Date(),
                            recommendations: parsedRecommendations,
                        },
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await chatThread.save();
            console.log('Chat thread saved successfully');
        }
  } catch (error) {
    console.error('Error saving chat thread:', error);
  }
};
