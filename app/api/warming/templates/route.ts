import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

// GET /api/warming/templates - Get warming email templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const phase = searchParams.get('phase')
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = supabase
      .from('warmup_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (phase) {
      query = query.or(`phase.is.null,phase.eq.${phase}`)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching warming templates:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Group templates by category
    const groupedTemplates = (templates || []).reduce((acc: any, template: any) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        templates: templates || [],
        grouped: groupedTemplates,
        categories: ['transactional', 'informational', 'conversational'],
        total: templates?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in warming templates GET:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    }, { status: 500 })
  }
}

// POST /api/warming/templates - Create new warming email template
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { 
      name, 
      category, 
      phase, 
      subject_templates, 
      content_templates, 
      weight = 1 
    } = await request.json()

    // Validation
    if (!name || !category || !subject_templates || !content_templates) {
      return NextResponse.json({ 
        success: false, 
        error: "Name, category, subject templates, and content templates are required" 
      }, { status: 400 })
    }

    if (!['transactional', 'informational', 'conversational'].includes(category)) {
      return NextResponse.json({ 
        success: false, 
        error: "Category must be transactional, informational, or conversational" 
      }, { status: 400 })
    }

    if (phase && ![1, 2, 3].includes(phase)) {
      return NextResponse.json({ 
        success: false, 
        error: "Phase must be 1, 2, or 3" 
      }, { status: 400 })
    }

    if (!Array.isArray(subject_templates) || subject_templates.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Subject templates must be a non-empty array" 
      }, { status: 400 })
    }

    if (!Array.isArray(content_templates) || content_templates.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Content templates must be a non-empty array" 
      }, { status: 400 })
    }

    // Insert new template
    const { data: template, error } = await supabase
      .from('warmup_templates')
      .insert({
        name,
        category,
        phase,
        subject_templates,
        content_templates,
        weight,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating warming template:', error)
      return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 })
    }

    console.log(`✅ Created warming template: ${name}`)

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully'
    })

  } catch (error) {
    console.error('Error in warming templates POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template'
    }, { status: 500 })
  }
}

// PUT /api/warming/templates - Update warming email template
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { 
      id,
      name, 
      category, 
      phase, 
      subject_templates, 
      content_templates, 
      weight,
      is_active 
    } = await request.json()

    if (!id) {
      return NextResponse.json({ success: false, error: "Template ID is required" }, { status: 400 })
    }

    // Validation
    if (category && !['transactional', 'informational', 'conversational'].includes(category)) {
      return NextResponse.json({ 
        success: false, 
        error: "Category must be transactional, informational, or conversational" 
      }, { status: 400 })
    }

    if (phase && ![1, 2, 3].includes(phase)) {
      return NextResponse.json({ 
        success: false, 
        error: "Phase must be 1, 2, or 3" 
      }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    if (name) updateData.name = name
    if (category) updateData.category = category
    if (phase !== undefined) updateData.phase = phase
    if (subject_templates) updateData.subject_templates = subject_templates
    if (content_templates) updateData.content_templates = content_templates
    if (weight !== undefined) updateData.weight = weight
    if (is_active !== undefined) updateData.is_active = is_active

    // Update template
    const { data: template, error } = await supabase
      .from('warmup_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating warming template:', error)
      return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 })
    }

    console.log(`✅ Updated warming template: ${id}`)

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Error in warming templates PUT:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template'
    }, { status: 500 })
  }
}

// DELETE /api/warming/templates - Delete warming email template
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({ success: false, error: "Template ID is required" }, { status: 400 })
    }

    // Check if template is in use
    const { data: activitiesUsingTemplate, error: checkError } = await supabase
      .from('warmup_activities')
      .select('id')
      .eq('details->template_id', templateId)
      .limit(1)

    if (checkError) {
      console.error('Error checking template usage:', checkError)
    }

    if (activitiesUsingTemplate && activitiesUsingTemplate.length > 0) {
      // Don't delete, just deactivate
      const { error: deactivateError } = await supabase
        .from('warmup_templates')
        .update({ is_active: false })
        .eq('id', templateId)

      if (deactivateError) {
        console.error('Error deactivating template:', deactivateError)
        return NextResponse.json({ success: false, error: 'Failed to deactivate template' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Template deactivated (cannot delete as it\'s in use)'
      })
    }

    // Delete template
    const { error } = await supabase
      .from('warmup_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting warming template:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete template' }, { status: 500 })
    }

    console.log(`✅ Deleted warming template: ${templateId}`)

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Error in warming templates DELETE:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template'
    }, { status: 500 })
  }
}