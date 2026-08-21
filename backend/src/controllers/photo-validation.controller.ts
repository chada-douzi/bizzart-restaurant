/**
 * PHOTO VALIDATION CONTROLLER
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Fournit les données nécessaires pour l'outil de validation visuelle.
 * AUCUNE modification de MongoDB ou Cloudinary.
 * AUCUNE route POST/PUT/DELETE.
 */

import { Request, Response } from 'express';
import { MenuItem } from '../models/menu-item.model';
import { Media } from '../models/media.model';
import { ResponseUtil } from '../utils/response.util';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/photo-validation/items
// Retourne tous les MenuItems avec leurs informations pour la validation
// ═══════════════════════════════════════════════════════════════════════════════

export const getItemsForValidation = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await MenuItem.find({})
      .populate('category', 'name slug')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const formatted = items.map((item, index) => ({
      index: index + 1,
      _id: item._id.toString(),
      name: item.name,
      category: item.category,
      slug: item.slug,
      image: item.image,
      price: item.price,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      order: item.order,
    }));

    ResponseUtil.success(res, formatted, 'Items retrieved for validation');
  } catch (error) {
    console.error('❌ getItemsForValidation error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/photo-validation/available-photos
// Retourne l'inventaire complet des photos disponibles
// Sources : MenuItems.image + Media.url
// ═══════════════════════════════════════════════════════════════════════════════

export const getAvailablePhotos = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Récupérer tous les MenuItems
    const menuItems = await MenuItem.find({}).select('name image').lean();
    
    // Récupérer tous les Media
    const mediaItems = await Media.find({}).select('url title publicId category').lean();

    // Map URL → info
    const photoMap = new Map<string, {
      url: string;
      source: 'menuitem' | 'media' | 'both';
      usedBy: string[];
      usageCount: number;
      fileName: string;
      title?: string;
      category?: string;
    }>();

    // Ajouter les photos des MenuItems
    for (const item of menuItems) {
      if (!item.image) continue;

      const url = item.image;
      const fileName = url.split('/').pop() || url;
      const itemName = item.name.fr || item.name.en || 'Unknown';

      if (!photoMap.has(url)) {
        photoMap.set(url, {
          url,
          source: 'menuitem',
          usedBy: [itemName],
          usageCount: 1,
          fileName,
        });
      } else {
        const existing = photoMap.get(url)!;
        existing.usedBy.push(itemName);
        existing.usageCount++;
        if (existing.source === 'media') {
          existing.source = 'both';
        }
      }
    }

    // Ajouter les photos des Media
    for (const media of mediaItems) {
      if (!media.url) continue;

      const url = media.url;
      const fileName = url.split('/').pop() || url;

      if (!photoMap.has(url)) {
        photoMap.set(url, {
          url,
          source: 'media',
          usedBy: [],
          usageCount: 0,
          fileName,
          title: media.title || undefined,
          category: media.category,
        });
      } else {
        const existing = photoMap.get(url)!;
        if (existing.source === 'menuitem') {
          existing.source = 'both';
        }
        if (media.title) {
          existing.title = media.title;
        }
        if (media.category) {
          existing.category = media.category;
        }
      }
    }

    // Convertir en array
    const photos = Array.from(photoMap.values());

    // Trier par nombre d'utilisations décroissant
    photos.sort((a, b) => b.usageCount - a.usageCount);

    ResponseUtil.success(res, {
      total: photos.length,
      photos,
    }, 'Available photos retrieved');
  } catch (error) {
    console.error('❌ getAvailablePhotos error:', error);
    ResponseUtil.serverError(res);
  }
};
