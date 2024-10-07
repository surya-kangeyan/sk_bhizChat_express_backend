import mongoose, {
  Schema,
  Document,
} from 'mongoose';

interface IImage {
  imageId: number;
  src: string;
  altText: string;
  width: number;
  height: number;
}

interface IVariant {
  variantId: number;
  title: string;
  price: string;
  sku: string;
  available: boolean;
  inventoryQuantity: number;
  weight: number;
  weightUnit: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IOption {
  name: string;
  values: string[];
}

interface ILocationInventory {
  locationId: number;
  locationName: string;
  inventoryQuantity: number;
}

interface IInventory {
  totalQuantity: number;
  locations: ILocationInventory[];
}

interface ISEO {
  title: string;
  description: string;
}

interface ICollection {
  collectionId: number;
  title: string;
}

export interface IProduct extends Document {
  productId: number;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  status: string;
  images: IImage[];
  variants: IVariant[];
  options: IOption[];
  inventory: IInventory;
  seo: ISEO;
  collections: ICollection[];
}

const ImageSchema: Schema = new Schema({
  imageId: { type: Number, required: true },
  src: { type: String, required: true },
  altText: { type: String, required: false },
  width: { type: Number, required: false },
  height: { type: Number, required: false },
});

const VariantSchema: Schema = new Schema({
  variantId: { type: Number, required: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
  sku: { type: String, required: true },
  available: { type: Boolean, required: true },
  inventoryQuantity: {
    type: Number,
    required: true,
  },
  weight: { type: Number, required: true },
  weightUnit: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const OptionSchema: Schema = new Schema({
  name: { type: String, required: true },
  values: { type: [String], required: true },
});

const LocationInventorySchema: Schema =
  new Schema({
    locationId: { type: Number, required: true },
    locationName: {
      type: String,
      required: true,
    },
    inventoryQuantity: {
      type: Number,
      required: true,
    },
  });

const InventorySchema: Schema = new Schema({
  totalQuantity: { type: Number, required: true },
  locations: {
    type: [LocationInventorySchema],
    required: true,
  },
});

const SEOSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
});

const CollectionSchema: Schema = new Schema({
  collectionId: { type: Number, required: true },
  title: { type: String, required: true },
});

const ProductSchema: Schema = new Schema({
  productId: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: false },
  vendor: { type: String, required: true },
  productType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  tags: { type: [String], required: false },
  status: { type: String, required: true },
  images: {
    type: [ImageSchema],
    required: false,
  },
  variants: {
    type: [VariantSchema],
    required: false,
  },
  options: {
    type: [OptionSchema],
    required: false,
  },
  inventory: {
    type: InventorySchema,
    required: true,
  },
  seo: { type: SEOSchema, required: false },
  collections: {
    type: [CollectionSchema],
    required: false,
  },
});

export default mongoose.model<IProduct>(
  'Product',
  ProductSchema
);
