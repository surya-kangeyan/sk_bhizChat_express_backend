import mongoose, {
  Schema,
  Document,
} from 'mongoose';

// Define interfaces for nested objects
interface IUserInput {
  content: string;
  timestamp: Date;
}

interface IRecommendation {
  productId: number;
  title: string;
  description: string;
  rating: number;
  quality: string;
}

interface ILLMOutput {
  content: string;
  timestamp: Date;
  recommendations: IRecommendation[];
}

interface IMessage {
  messageId: mongoose.Types.ObjectId;
  userInput: IUserInput;
  llmOutput: ILLMOutput;
}

// Main interface for the ChatThread schema
export interface IChatThread extends Document {
  userId: mongoose.Types.ObjectId;
  shopId: string;
  chatThreadId: mongoose.Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the nested schemas
const UserInputSchema: Schema = new Schema({
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const RecommendationSchema: Schema = new Schema({
  id: { type: String, required: true }, 
  //changed above line to type String, was originally number
  title: { type: String, required: true },
  description: { type: String, required: false },
  rating: { type: Number, required: false },
  quality: { type: String, required: false },
});

const LLMOutputSchema: Schema = new Schema({
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  recommendations: {
    type: [RecommendationSchema],
    required: false,
  },
});

const MessageSchema: Schema = new Schema({
  messageId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  userInput: {
    type: UserInputSchema,
    required: true,
  },
  llmOutput: {
    type: LLMOutputSchema,
    required: true,
  },
});

// Define the main schema
const ChatThreadSchema: Schema = new Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  shopId: { type: String, required: true },
  chatThreadId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  messages: {
    type: [MessageSchema],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Export the model
export default mongoose.model<IChatThread>(
  'ChatThread',
  ChatThreadSchema
);
