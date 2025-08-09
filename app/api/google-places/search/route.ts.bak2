import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query || query.length < 3) {
      return NextResponse.json({
        success: false,
        error: "Query must be at least 3 characters long"
      }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Google Maps API key not configured"
      }, { status: 500 })
    }

    // Use Google Places Autocomplete API for better search experience
    const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment&key=${apiKey}`

    const response = await fetch(placesUrl)
    const data = await response.json()

    if (data.status === "OK") {
      // Format autocomplete predictions for businesses
      const predictions = data.predictions
        .slice(0, 8) // Limit to 8 results for cleaner UI
        .map((prediction: any) => ({
          place_id: prediction.place_id,
          name: prediction.structured_formatting?.main_text || prediction.description,
          formatted_address: prediction.structured_formatting?.secondary_text || prediction.description,
          business_status: "OPERATIONAL", // Default for autocomplete
          types: prediction.types || ["establishment"]
        }))

      return NextResponse.json({
        success: true,
        results: predictions
      })
    } else {
      console.error("Google Places API error:", data.status, data.error_message)

      // Provide more specific error messages based on Google's response
      let errorMessage = "Failed to search places"
      switch (data.status) {
        case "REQUEST_DENIED":
          errorMessage = "Google Places API access denied. Please check API key permissions."
          break
        case "OVER_QUERY_LIMIT":
          errorMessage = "Search quota exceeded. Please try again later."
          break
        case "INVALID_REQUEST":
          errorMessage = "Invalid search request. Please try a different search term."
          break
        default:
          errorMessage = data.error_message || "Failed to search places"
      }

      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error in Google Places search:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}