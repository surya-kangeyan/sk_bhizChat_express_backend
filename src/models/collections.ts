import mongoose, {
  Schema,
  Document,
} from 'mongoose';

// Define interfaces for nested objects
interface IRule {
  column: string;
  relation: string;
  condition: string;
}

interface IProduct {
  productId: number;
  title: string;
  price: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IImage {
  src: string;
  altText: string;
}

// Main interface for the Collection schema
export interface ICollection extends Document {
  collectionId: number;
  title: string;
  body_html: string;
  handle: string;
  publishedAt: Date;
  updatedAt: Date;
  sortOrder: string;
  disjunctive: boolean;
  rules: IRule[];
  products: IProduct[];
  collectionType: string;
  publishedScope: string;
  image: IImage;
}

// Define the nested schemas
const RuleSchema: Schema = new Schema({
  column: { type: String, required: true },
  relation: { type: String, required: true },
  condition: { type: String, required: true },
});

const ProductSchema: Schema = new Schema({
  productId: { type: Number, required: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
  handle: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ImageSchema: Schema = new Schema({
  src: { type: String, required: true },
  altText: { type: String, required: false },
});

// Define the main schema
const CollectionSchema: Schema = new Schema({
  collectionId: { type: Number, required: true },
  title: { type: String, required: true },
  body_html: { type: String, required: false },
  handle: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  sortOrder: { type: String, required: false },
  disjunctive: { type: Boolean, required: true },
  rules: { type: [RuleSchema], required: true },
  products: {
    type: [ProductSchema],
    required: false,
  },
  collectionType: {
    type: String,
    required: true,
  },
  publishedScope: {
    type: String,
    required: true,
  },
  image: { type: ImageSchema, required: false },
});

// Export the model
export default mongoose.model<ICollection>(
  'Collection',
  CollectionSchema
);
