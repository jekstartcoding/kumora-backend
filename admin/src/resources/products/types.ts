// Tipe view-model Products di admin panel.
export interface AdminVariant {
  id?: string;
  label: string;
  price: number;
  is_default: boolean;
}

export interface AdminReview {
  id?: string;
  author: string;
  rating: number;
  comment: string;
  sleep_position: string | null;
  body_type: string | null;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: 'pillows' | 'bolsters' | 'beds';
  tags: string[];
  price: number;
  sensory_descriptor: string;
  firmness_rating: number;
  fill_material: string;
  fill_weight_equivalent: string;
  delivery_estimate: string;
  return_policy_text: string;
  gift_safe: boolean;
  gift_safe_note: string | null;
  brand_story_line: string;
  description: string;
  lifestyle_thumbnail?: string;
  variant_count?: number;
  product_images?: { id: string; url: string; image_type: 'lifestyle' | 'texture'; order_index: number }[];
  product_variants?: AdminVariant[];
  product_reviews?: AdminReview[];
}
