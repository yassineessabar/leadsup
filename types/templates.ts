export interface Template {
  id: string
  name: string
  imageUrl: string
  category: 'business' | 'creative' | 'minimal' | 'personal' | 'restaurant'
  description?: string
  isPro?: boolean
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  templates: Template[]
}

export const TEMPLATE_CATEGORIES = {
  BUSINESS: 'business',
  CREATIVE: 'creative', 
  MINIMAL: 'minimal',
  PERSONAL: 'personal',
  RESTAURANT: 'restaurant'
} as const

export type TemplateCategoryType = typeof TEMPLATE_CATEGORIES[keyof typeof TEMPLATE_CATEGORIES]