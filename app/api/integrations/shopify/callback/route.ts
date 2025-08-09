import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=not_authenticated`
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    const hmac = searchParams.get('hmac')

    if (!code || !state || !shop || !hmac) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_parameters`
      )
    }

    // Verify the HMAC for security
    const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!
    const params = new URLSearchParams(searchParams)
    params.delete('hmac')
    params.delete('signature')

    const sortedParams = Array.from(params.entries())
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('&')

    const calculatedHmac = crypto
      .createHmac('sha256', SHOPIFY_API_SECRET)
      .update(sortedParams)
      .digest('hex')

    if (calculatedHmac !== hmac) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_hmac`
      )
    }

    // Extract shop domain from state
    const [stateToken, shopDomain] = state.split(':')

    if (!shopDomain || shopDomain !== shop) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_state`
      )
    }

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token')
    }

    const tokenData = await tokenResponse.json()
    const { access_token, scope } = tokenData

    // Get shop information
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
      },
    })

    if (!shopInfoResponse.ok) {
      throw new Error('Failed to fetch shop information')
    }

    const shopInfo = await shopInfoResponse.json()
    const { shop: shopData } = shopInfo

    // Store the integration in database

    // Use the same table structure as Google integration
    try {
      const integrationData = {
        user_id: userId,
        platform_name: 'shopify',
        integration_status: 'connected',
        business_name: shopData.name,
        business_id: shopData.id.toString(),
        additional_data: {
          shop_domain: shop,
          shop_name: shopData.name,
          shop_email: shopData.email,
          plan: shopData.plan_name,
          scopes: scope.split(','),
          access_token: access_token,
          myshopify_domain: shopData.myshopify_domain,
          country: shopData.country_name,
          currency: shopData.currency,
          shop_owner: shopData.shop_owner
        }
      }

      const { data, error: dbError } = await supabase
        .from('review_integrations')
        .upsert(integrationData, {
          onConflict: 'user_id,platform_name'
        })

      if (dbError) {
        console.error('Database save failed:', dbError)
        console.error('Error details:', JSON.stringify(dbError, null, 2))

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/?error=database_error&msg=${encodeURIComponent(dbError.message)}`
        )
      }

      // Start customer sync in background after successful integration
      setImmediate(async () => {
        try {

          // Import the sync function and webhook registration
          const { syncCustomersFromShopify } = await import('../sync-customers/route')
          const { registerShopifyWebhooks } = await import('../register-webhooks/route')

          // Register webhooks first
          const webhookResults = await registerShopifyWebhooks(shop, access_token)

          // Then sync customers
          const syncResult = await syncCustomersFromShopify(userId, shop, access_token)

          // Update integration with sync result and webhook info
          await supabase
            .from('review_integrations')
            .update({
              additional_data: {
                ...integrationData.additional_data,
                initial_customer_sync: new Date().toISOString(),
                initial_sync_result: syncResult,
                webhooks_registered: new Date().toISOString(),
                webhook_results: webhookResults
              }
            })
            .eq('user_id', userId)
            .eq('platform_name', 'shopify')

        } catch (syncError) {
          console.error('Background customer sync failed:', syncError)
        }
      })

    } catch (error) {
      console.error('Error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=callback_error&msg=${encodeURIComponent(error.message)}`
      )
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?tab=integrations&shopify=connected&customers=syncing`
    )

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=callback_error`
    )
  }
}