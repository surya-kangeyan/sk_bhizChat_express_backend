import mongoose, {
  Schema,
  Document,
} from 'mongoose';

// Define interfaces for nested objects
interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface IOrder {
  orderId: mongoose.Types.ObjectId;
  totalAmount: number;
  orderStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IFavorite {
  productId: number;
  title: string;
  price: number;
}

// Main interface for the User schema
export interface IUser extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: IAddress;
  pastOrders: IOrder[];
  favorites: IFavorite[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the nested schemas
const AddressSchema: Schema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
});

const OrderSchema: Schema = new Schema({
  orderId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  totalAmount: { type: Number, required: true },
  orderStatus: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FavoriteSchema: Schema = new Schema({
  productId: { type: Number, required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
});

// Define the main schema
const UserSchema: Schema = new Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: {
    type: AddressSchema,
    required: true,
  },
  pastOrders: {
    type: [OrderSchema],
    required: false,
  },
  favorites: {
    type: [FavoriteSchema],
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Export the model
export default mongoose.model<IUser>(
  'User',
  UserSchema
);
