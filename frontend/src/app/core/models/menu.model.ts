export interface MenuCategory {
  _id: string;
  name: MultiLanguageText;
  slug: string;
  description?: MultiLanguageText;
  image?: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MenuItem {
  _id: string;
  category: string | MenuCategory;
  name: MultiLanguageText;
  slug: string;
  description?: MultiLanguageText;
  price: number;
  image: string;
  video?: string;
  allergens?: string[];
  tags?: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  preparationTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MultiLanguageText {
  fr: string;
  en?: string;
  ar?: string;
}

export interface CreateMenuItemDto {
  category: string;
  name: MultiLanguageText;
  description?: MultiLanguageText;
  price: number;
  image: string;
  video?: string;
  allergens?: string[];
  tags?: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  preparationTime?: number;
}
