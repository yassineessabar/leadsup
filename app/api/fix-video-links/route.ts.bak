import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Use service role for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's review link
    const { data: reviewLink, error: fetchError } = await supabaseAdmin
      .from('review_link')
      .select('id, links, enabled_platforms')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching review link:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (!reviewLink) {
      return NextResponse.json({ success: false, error: 'No review link found' }, { status: 404 })
    }

    let hasUpdates = false
    let updatedLinks = []

    // Check if enabled_platforms includes video-testimonial but links don't exist or are wrong
    if (reviewLink.enabled_platforms && reviewLink.enabled_platforms.includes('video-testimonial')) {
      // Check existing links
      const existingLinks = reviewLink.links || []
      const videoLink = existingLinks.find((link: any) => link.platformId === 'video-testimonial')

      if (!videoLink) {
        // Create new video testimonial link
        updatedLinks = [
          ...existingLinks,
          {
            id: Date.now(),
            title: 'Video Testimonial',
            url: '#video-upload',
            buttonText: 'Upload Video Testimonial',
            clicks: 0,
            isActive: true,
            platformId: 'video-testimonial',
            platformLogo: '/video-testimonial-icon.svg'
          }
        ]
        hasUpdates = true
      } else if (videoLink.buttonText !== 'Upload Video Testimonial' || videoLink.url !== '#video-upload') {
        // Fix existing video testimonial link
        updatedLinks = existingLinks.map((link: any) => {
          if (link.platformId === 'video-testimonial') {
            return {
              ...link,
              url: '#video-upload',
              buttonText: 'Upload Video Testimonial',
              isActive: true
            }
          }
          return link
        })
        hasUpdates = true
      } else {
        updatedLinks = existingLinks
      }
    } else {
      updatedLinks = reviewLink.links || []
    }

    if (hasUpdates) {
      const { error: updateError } = await supabaseAdmin
        .from('review_link')
        .update({
          links: updatedLinks,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewLink.id)

      if (updateError) {
        console.error('❌ Error updating review link:', updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Video testimonial link fixed',
        data: { updated: true, links: updatedLinks }
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No updates needed',
        data: { updated: false, links: updatedLinks }
      })
    }

  } catch (error) {
    console.error('❌ Error fixing video links:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}