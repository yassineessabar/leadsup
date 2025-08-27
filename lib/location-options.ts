import { LOCATION_TRANSLATIONS } from './location-translations'
import linkedinLocations from '@/scripts/linkedin_locations.json'

// Use LinkedIn locations from JSON file
export const LOCATION_OPTIONS = linkedinLocations

// Helper function to get translated location name
export const getTranslatedLocation = (location: string, language: string = 'en'): string => {
  return LOCATION_TRANSLATIONS[language]?.[location] || location
}

// Helper function to get all locations with translations
export const getTranslatedLocations = (language: string = 'en'): string[] => {
  const translations = LOCATION_TRANSLATIONS[language]
  if (!translations) return LOCATION_OPTIONS
  
  return LOCATION_OPTIONS.map(location => translations[location] || location)
}