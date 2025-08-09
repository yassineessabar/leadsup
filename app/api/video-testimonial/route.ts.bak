import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Use service role for video uploads to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const customerName = formData.get('customerName') as string
    const customerEmail = formData.get('customerEmail') as string
    const customerId = formData.get('customerId') as string
    const companyName = formData.get('companyName') as string || 'Company'
    const reviewLinkId = formData.get('reviewLinkId') as string // To identify the business owner

    if (!videoFile || !customerName || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get business owner's email from review link
    let userEmail = null
    let reviewLinkData = null
    if (reviewLinkId) {
      const { data: linkData, error: reviewLinkError } = await supabaseAdmin
        .from('review_link')
        .select(`
          id,
          user_id,
          users!inner(email)
        `)
        .like('review_url', `%/r/${reviewLinkId}`)
        .single()

      if (linkData && !reviewLinkError) {
        reviewLinkData = linkData
        userEmail = reviewLinkData.users.email
        } else {
        }
    }

    // Upload video to Supabase Storage
    const fileExtension = videoFile.name.split('.').pop() || 'mp4'
    const fileName = `video-testimonial-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`

    const videoBuffer = await videoFile.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('video-testimonials')
      .upload(fileName, videoBuffer, {
        contentType: videoFile.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Video upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload video' },
        { status: 500 }
      )
    }

    // Get video URL for email
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('video-testimonials')
      .getPublicUrl(fileName)

    // Save testimonial record to database
    let testimonialData = null
    try {
      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('video_testimonials')
        .insert({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_id: customerId,
          video_url: publicUrl,
          video_file_path: uploadData.path,
          company_name: companyName,
          review_link_id: reviewLinkData?.id || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (dbError) {
        console.error('❌ Database save error (continuing anyway):', dbError)
        // Continue even if DB save fails - don't block the upload or email
      } else {
        testimonialData = dbData
        }
    } catch (dbError) {
      console.error('❌ Database operation failed (continuing anyway):', dbError)
      }

    // Send email to business owner with video attachment (non-blocking)
    if (userEmail) {
      // Send email in background - don't wait for completion
      setImmediate(async () => {
        try {
          // Download video file to send as attachment
          const { data: videoData, error: downloadError } = await supabaseAdmin.storage
            .from('video-testimonials')
            .download(uploadData.path)

          if (downloadError) {
            console.error('❌ Failed to download video for email:', downloadError)
            return
          }

          // Convert video to base64 for email attachment
          const videoArrayBuffer = await videoData.arrayBuffer()
          const videoBase64 = Buffer.from(videoArrayBuffer).toString('base64')

          // Send email directly using nodemailer
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          })

          const mailOptions = {
            from: `"${companyName}" <${process.env.FROM_EMAIL}>`,
            to: userEmail,
            subject: `New Video Testimonial from ${customerName}`,
            html: `
              <h2>New Video Testimonial Received!</h2>
              <p>You've received a new video testimonial from <strong>${customerName}</strong>.</p>

              <h3>Customer Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${customerName}</li>
                <li><strong>Email:</strong> ${customerEmail}</li>
                <li><strong>Company:</strong> ${companyName}</li>
                <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
              </ul>

              <p>The video testimonial is attached to this email.</p>
              <p>You can also view it online at: <a href="${publicUrl}">${publicUrl}</a></p>

              <hr>
              <p style="color: #666; font-size: 12px;">
                This email was automatically generated by your review collection system.
              </p>
            `,
            attachments: [
              {
                filename: `testimonial-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${fileExtension}`,
                content: videoBase64,
                encoding: 'base64',
                contentType: videoFile.type
              }
            ]
          }

          await transporter.sendMail(mailOptions)
          } catch (emailError) {
          console.error('❌ Background email error:', emailError)
        }
      })

      } else {
      }

    return NextResponse.json({
      success: true,
      message: 'Video testimonial uploaded successfully',
      data: {
        videoUrl: publicUrl,
        testimonialId: testimonialData?.id
      }
    })

  } catch (error) {
    console.error('❌ Video testimonial upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}