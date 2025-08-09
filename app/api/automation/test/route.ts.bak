import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action = "test_latest_review", userId, reviewId } = body

    switch (action) {
      case "test_latest_review":
        return await testLatestReview(userId)

      case "test_specific_review":
        return await testSpecificReview(reviewId)

      case "create_test_review":
        return await createTestReview(userId)

      case "list_workflows":
        return await listUserWorkflows(userId)

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Error in automation test:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function testLatestReview(userId?: string) {
  try {
    // Get the latest review for testing
    let query = supabase
      .from("reviews")
      .select(`
        *,
        users (
          id,
          email,
          company
        )
      `)
      .order("created_at", { ascending: false })
      .limit(1)

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: reviews, error } = await query

    if (error || !reviews || reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No reviews found for testing"
      })
    }

    const review = reviews[0]
    `)

    // Trigger automation for this review
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/automation/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewId: review.id,
        testMode: true // Test mode so it doesn't actually send emails
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      data: {
        reviewTested: {
          id: review.id,
          rating: review.rating,
          customer_name: review.customer_name,
          created_at: review.created_at
        },
        automationResult: result.data
      }
    })

  } catch (error) {
    console.error("Error testing latest review:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

async function testSpecificReview(reviewId: string) {
  if (!reviewId) {
    return NextResponse.json({
      success: false,
      error: "reviewId is required"
    }, { status: 400 })
  }

  try {
    // Trigger automation for specific review
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/automation/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewId: reviewId,
        testMode: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error("Error testing specific review:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

async function createTestReview(userId?: string) {
  try {
    // Create a test review to trigger automation
    const testUserId = userId || "test-user-id"

    const testReview = {
      user_id: testUserId,
      customer_id: `test_${Date.now()}`,
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      rating: 5, // 5 stars to trigger positive review automation
      comment: "Test review created for automation testing",
      platform: "internal",
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .insert(testReview)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test review: ${error.message}`)
    }

    // Now trigger automation for this review
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/automation/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewId: review.id,
        testMode: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const automationResult = await response.json()

    return NextResponse.json({
      success: true,
      data: {
        testReview: review,
        automationResult: automationResult.data
      }
    })

  } catch (error) {
    console.error("Error creating test review:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

async function listUserWorkflows(userId?: string) {
  try {
    let query = supabase
      .from("automation_workflows")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: workflows, error } = await query

    if (error) {
      throw new Error(`Failed to fetch workflows: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        workflows: workflows || [],
        count: workflows?.length || 0
      }
    })

  } catch (error) {
    console.error("Error listing workflows:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const userId = searchParams.get('userId')

    if (action === 'status') {
      // Return system status
      return NextResponse.json({
        success: true,
        data: {
          automationSystemActive: true,
          availableActions: [
            'test_latest_review',
            'test_specific_review',
            'create_test_review',
            'list_workflows'
          ],
          testEndpoint: '/api/automation/test',
          triggerEndpoint: '/api/automation/trigger'
        }
      })
    }

    if (action === 'list_workflows') {
      return await listUserWorkflows(userId)
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action"
    }, { status: 400 })

  } catch (error) {
    console.error("Error in automation test GET:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}