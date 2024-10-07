import mongoose, {
  Schema,
  Document,
} from 'mongoose';

// Main interface for the Review schema
export interface IReview extends Document {
  productId: number;
  userId: mongoose.Types.ObjectId;
  rating: number;
  reviewArr: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the main schema
const ReviewSchema: Schema = new Schema({
  productId: { type: Number, required: true },
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  }, // Assuming rating is between 1 to 5
  reviewArr: { type: [String], required: true }, // Array of review strings
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Export the model
export default mongoose.model<IReview>(
  'Review',
  ReviewSchema
);
