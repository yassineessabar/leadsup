import { LOCATION_TRANSLATIONS } from './location-translations'

// Predefined list of valid locations - used across the application
export const LOCATION_OPTIONS = [
  "United States", "Canada", "United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands",
  "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Poland",
  "Australia", "New Zealand", "Japan", "South Korea", "Singapore", "Hong Kong", "India", "China",
  "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru", "South Africa", "Nigeria",
  "Israel", "United Arab Emirates", "Saudi Arabia", "Turkey", "Russia", "Ukraine", "Czech Republic",
  "Europe", "North America", "Asia Pacific", "Latin America", "Middle East", "Africa", "Global"
]

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