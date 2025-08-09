import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { shopDomain } = await request.json()

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: 'Shop domain is required' },
        { status: 400 }
      )
    }

    // Validate shop domain format
    const shopPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
    if (!shopPattern.test(shopDomain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shop domain format. Must be in format: shop-name.myshopify.com' },
        { status: 400 }
      )
    }

    // Shopify OAuth configuration
    const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'demo_key'
    const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'demo_secret'
    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/integrations/shopify/callback`

    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET ||
        process.env.SHOPIFY_API_KEY === 'your_shopify_api_key_here' ||
        process.env.SHOPIFY_API_SECRET === 'your_shopify_api_secret_here') {
      return NextResponse.json(
        {
          success: false,
          error: 'Shopify API credentials not configured. Please create a Shopify app and update SHOPIFY_API_KEY and SHOPIFY_API_SECRET in your .env.local file.',
          setup_required: true
        },
        { status: 400 }
      )
    }

    // Scopes needed to read reviews and customer data
    const scopes = [
      'read_content',
      'read_customers',
      'read_orders',
      'read_products'
    ].join(',')

    // Generate a random state for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Store the state and shop domain temporarily in session/database
    // For now, we'll include it in the redirect URL
    // For custom apps, we need to use the install URL pattern
    // Try both standard OAuth and custom app installation
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` + new URLSearchParams({
      client_id: SHOPIFY_API_KEY,
      scope: scopes,
      redirect_uri: REDIRECT_URI,
      state: `${state}:${shopDomain}`
    }).toString()

    // Alternative: Custom app authorization URL
    const customAppAuthUrl = `https://admin.shopify.com/store/${shopDomain.replace('.myshopify.com', '')}/oauth/authorize?` + new URLSearchParams({
      client_id: SHOPIFY_API_KEY,
      scope: scopes,
      redirect_uri: REDIRECT_URI,
      state: `${state}:${shopDomain}`
    }).toString()

    return NextResponse.json({
      success: true,
      authUrl: customAppAuthUrl, // Try custom app URL first
      alternativeAuthUrl: authUrl, // Fallback to standard URL
      state,
      shopDomain,
      debug: {
        client_id: SHOPIFY_API_KEY,
        redirect_uri: REDIRECT_URI,
        scopes: scopes,
        customAppUrl: customAppAuthUrl,
        standardUrl: authUrl
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}