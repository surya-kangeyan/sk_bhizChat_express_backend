import mongoose, {
  Schema,
  Document,
} from 'mongoose';

// Define interfaces for nested objects
interface IProduct {
  productId: number;
  title: string;
  quantity: number;
  price: number;
}

interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Main interface for the Order schema
export interface IOrder extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  products: IProduct[];
  totalAmount: number;
  orderStatus: string;
  shippingAddress: IShippingAddress;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the nested schemas
const ProductSchema: Schema = new Schema({
  productId: { type: Number, required: true },
  title: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const ShippingAddressSchema: Schema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
});

// Define the main schema
const OrderSchema: Schema = new Schema({
  orderId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  products: {
    type: [ProductSchema],
    required: true,
  },
  totalAmount: { type: Number, required: true },
  orderStatus: { type: String, required: true },
  shippingAddress: {
    type: ShippingAddressSchema,
    required: true,
  },
  paymentStatus: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Export the model
export default mongoose.model<IOrder>(
  'Order',
  OrderSchema
);
