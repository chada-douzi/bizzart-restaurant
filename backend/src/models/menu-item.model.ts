import mongoose, { Document, Schema, Types } from 'mongoose';
import { MultiLanguageText, multiLanguageTextSchema } from './menu-category.model';

// ─── Sub-interface: NutritionInfo ─────────────────────────────────────────────

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMenuItem extends Document {
  category: Types.ObjectId;
  name: MultiLanguageText;
  slug: string;
  description?: MultiLanguageText;
  price: number;
  image: string;
  video?: string;
  allergens: string[];
  tags: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
  nutritionInfo?: NutritionInfo;
  preparationTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const menuItemSchema = new Schema<IMenuItem>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'MenuCategory',
      required: [true, 'Category is required'],
    },
    name: {
      type: multiLanguageTextSchema,
      required: [true, 'Item name is required'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    description: {
      type: multiLanguageTextSchema,
      default: undefined,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
      trim: true,
    },
    video: {
      type: String,
      trim: true,
      default: undefined,
    },
    allergens: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      min: [0, 'Order must be a positive number'],
      default: 0,
    },
    nutritionInfo: {
      type: new Schema<NutritionInfo>(
        {
          calories: { type: Number, min: 0 },
          protein: { type: Number, min: 0 },
          carbs: { type: Number, min: 0 },
          fat: { type: Number, min: 0 },
        },
        { _id: false }
      ),
      default: undefined,
    },
    preparationTime: {
      type: Number,
      min: [1, 'Preparation time must be at least 1 minute'],
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// slug unique index is already created by `unique: true` in the schema field definition
menuItemSchema.index({ category: 1, isAvailable: 1, order: 1 }); // Items by category, filtered + sorted
menuItemSchema.index({ isFeatured: 1, isAvailable: 1 });          // Featured items on homepage
menuItemSchema.index({ tags: 1 });                                  // Tag-based filtering

// ─── Model ────────────────────────────────────────────────────────────────────

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
