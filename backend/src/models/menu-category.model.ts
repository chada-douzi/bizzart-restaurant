import mongoose, { Document, Schema } from 'mongoose';

// ─── Sub-schema: MultiLanguageText ────────────────────────────────────────────

export interface MultiLanguageText {
  fr: string;
  en?: string;
  ar?: string;
}

const multiLanguageTextSchema = new Schema<MultiLanguageText>(
  {
    fr: { type: String, required: [true, 'French text is required'], trim: true },
    en: { type: String, trim: true, default: '' },
    ar: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMenuCategory extends Document {
  name: MultiLanguageText;
  slug: string;
  description?: MultiLanguageText;
  image?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    name: {
      type: multiLanguageTextSchema,
      required: [true, 'Category name is required'],
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
    image: {
      type: String,
      trim: true,
      default: undefined,
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: [0, 'Order must be a positive number'],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// slug unique index is already created by `unique: true` in the schema field definition
menuCategorySchema.index({ isActive: 1, order: 1 }); // Frequent query: active categories sorted by order

// ─── Export shared schema for reuse in MenuItem ───────────────────────────────

export { multiLanguageTextSchema };

// ─── Model ────────────────────────────────────────────────────────────────────

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', menuCategorySchema);
