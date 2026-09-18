// Fase 3 — Registry resource CMS (plan KUMORA_CMS_IMPLEMENTATION_PLAN_FINAL.md 3.1/3.2).
// Satu sumber kebenaran untuk nama endpoint, tabel, dan whitelist kolom — router
// generik di routes.ts memakai registry ini supaya 20 resource tidak di-copy-paste.
// Endpoint tetap persis seperti plan: /api/admin/cms/<slug> masing-masing resource.

export interface SingletonDef {
  kind: 'singleton';
  table: string;
  /** Kolom yang boleh di-set dari payload (selain id=1). */
  fields: string[];
  /** Kolom URL CTA/link yang wajib lolos validasi 3.4 (path relatif atau URL lengkap). */
  urlFields?: string[];
}

export interface ListDef {
  kind: 'list';
  table: string;
  fields: string[];
  /** Kolom urutan default (selalu order_index untuk repeater CMS). */
  reorderable: boolean;
}

export type CmsResourceDef = SingletonDef | ListDef;

const CTA_URL_FIELDS = [
  'cta_1_url',
  'cta_2_url',
  'cta_3_url',
  'cta_url',
  'link_url',
];

export const CMS_SINGLETONS: Record<string, SingletonDef> = {
  'home-hero': {
    kind: 'singleton',
    table: 'home_hero',
    fields: ['hook', 'title', 'subtitle', 'background_image_url', 'cta_1_text', 'cta_1_url', 'cta_2_text', 'cta_2_url'],
    urlFields: ['cta_1_url', 'cta_2_url'],
  },
  'home-showcase-section': {
    kind: 'singleton',
    table: 'home_showcase_section',
    fields: ['eyebrow', 'title', 'subtitle'],
  },
  'home-philosophy-teaser': {
    kind: 'singleton',
    table: 'home_philosophy_teaser',
    fields: ['eyebrow', 'title', 'paragraph_1', 'paragraph_2', 'link_text', 'link_url', 'image_url'],
    urlFields: ['link_url'],
  },
  'home-trust-section': {
    kind: 'singleton',
    table: 'home_trust_section',
    fields: ['eyebrow', 'title'],
  },
  'home-category-section': {
    kind: 'singleton',
    table: 'home_category_section',
    fields: ['eyebrow', 'title'],
  },
  'home-banner': {
    kind: 'singleton',
    table: 'home_banner',
    fields: ['title', 'subtitle', 'background_image_url'],
  },
  'home-testimonials-section': {
    kind: 'singleton',
    table: 'home_testimonials_section',
    fields: ['eyebrow', 'title'],
  },
  'home-final-cta': {
    kind: 'singleton',
    table: 'home_final_cta',
    fields: ['title', 'subtitle', 'cta_1_text', 'cta_1_url', 'cta_2_text', 'cta_2_url', 'cta_3_text', 'cta_3_url'],
    urlFields: ['cta_1_url', 'cta_2_url', 'cta_3_url'],
  },
  'about-hero': {
    kind: 'singleton',
    table: 'about_hero',
    fields: ['eyebrow', 'title', 'subtitle', 'background_image_url'],
  },
  'about-story': {
    kind: 'singleton',
    table: 'about_story',
    fields: ['title', 'paragraph_1', 'paragraph_2', 'image_url'],
  },
  'about-milestones-section': {
    kind: 'singleton',
    table: 'about_milestones_section',
    fields: ['eyebrow', 'title'],
  },
  'about-vision-mission': {
    kind: 'singleton',
    table: 'about_vision_mission',
    fields: ['vision_label', 'vision_text', 'mission_label'],
  },
  'about-values-section': {
    kind: 'singleton',
    table: 'about_values_section',
    fields: ['eyebrow', 'title'],
  },
  'about-final-cta': {
    kind: 'singleton',
    table: 'about_final_cta',
    fields: ['title', 'subtitle', 'cta_text', 'cta_url'],
    urlFields: ['cta_url'],
  },
};

export const CMS_LISTS: Record<string, ListDef> = {
  'showcase-products': {
    kind: 'list',
    table: 'home_showcase_products',
    fields: ['product_id', 'order_index'],
    reorderable: true,
  },
  'trust-items': {
    kind: 'list',
    table: 'home_trust_items',
    fields: ['icon_name', 'title', 'description', 'order_index'],
    reorderable: true,
  },
  testimonials: {
    kind: 'list',
    table: 'testimonials',
    fields: ['author_name', 'author_location', 'rating', 'comment', 'order_index', 'is_published'],
    reorderable: true,
  },
  milestones: {
    kind: 'list',
    table: 'about_milestones',
    fields: ['counter_number', 'year', 'title', 'description', 'order_index'],
    reorderable: true,
  },
  'mission-items': {
    kind: 'list',
    table: 'about_mission_items',
    fields: ['text', 'order_index'],
    reorderable: true,
  },
  values: {
    kind: 'list',
    table: 'about_values',
    fields: ['title', 'description', 'order_index'],
    reorderable: true,
  },
};

/** Kolom CTA/link yang wajib validasi URL — gabungan def masing-masing resource. */
export function ctaUrlFieldsFor(fields: string[]): string[] {
  return fields.filter((f) => CTA_URL_FIELDS.includes(f));
}
