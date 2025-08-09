const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSpecificVideoLink() {
  try {
    console.log('🔧 Fixing video testimonial links with wrong button text...')
    
    // Get all review links that have video testimonial in links array
    const { data: reviewLinks, error } = await supabase
      .from('review_link')
      .select('*')
    
    if (error) {
      console.error('❌ Error fetching review links:', error)
      return
    }
    
    let fixCount = 0
    
    for (const reviewLink of reviewLinks) {
      if (reviewLink.links && Array.isArray(reviewLink.links)) {
        const videoLinkIndex = reviewLink.links.findIndex(link => link.platformId === 'video-testimonial')
        
        if (videoLinkIndex !== -1) {
          const videoLink = reviewLink.links[videoLinkIndex]
          console.log(`\n🎥 Found video link in review ${reviewLink.id}:`)
          console.log(`  Current button text: "${videoLink.buttonText}"`)
          console.log(`  Current URL: "${videoLink.url}"`)
          
          if (videoLink.buttonText !== 'Upload Video Testimonial' || videoLink.url !== '#video-upload') {
            console.log('🔧 Fixing this link...')
            
            // Fix the video link
            const updatedLinks = [...reviewLink.links]
            updatedLinks[videoLinkIndex] = {
              ...videoLink,
              title: 'Video Testimonial',
              url: '#video-upload',
              buttonText: 'Upload Video Testimonial',
              isActive: true,
              platformLogo: '/video-testimonial-icon.svg'
            }
            
            // Also add video-testimonial to enabled_platforms if not present
            let updatedEnabledPlatforms = reviewLink.enabled_platforms || []
            if (!updatedEnabledPlatforms.includes('video-testimonial')) {
              updatedEnabledPlatforms = [...updatedEnabledPlatforms, 'video-testimonial']
              console.log('📋 Adding video-testimonial to enabled_platforms')
            }
            
            const { error: updateError } = await supabase
              .from('review_link')
              .update({ 
                links: updatedLinks,
                enabled_platforms: updatedEnabledPlatforms,
                updated_at: new Date().toISOString()
              })
              .eq('id', reviewLink.id)
            
            if (updateError) {
              console.error('❌ Error updating:', updateError)
            } else {
              console.log('✅ Fixed successfully!')
              console.log(`  New button text: "Upload Video Testimonial"`)
              console.log(`  New URL: "#video-upload"`)
              fixCount++
            }
          } else {
            console.log('✅ Already correct')
          }
        }
      }
    }
    
    console.log(`\n🎉 Fixed ${fixCount} video testimonial links`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixSpecificVideoLink()