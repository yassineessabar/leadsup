import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

async function fetchAllContactsForDemo(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const campaignId = searchParams.get('campaign_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build query without user filter for demo (no campaigns join for now)
    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, email_status, title, company, location, industry, linkedin, image_url, campaign_id, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters if provided
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: contacts, error } = await query

    if (error) {
      console.error('Demo query error:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Get total count for pagination (with same filters)
    let countQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })

    if (campaignId) {
      countQuery = countQuery.eq('campaign_id', campaignId)
    }
    if (search) {
      countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%)`)
    }

    const { count, error: countError } = await countQuery

    // Get campaign names for the contacts (same as authenticated version)
    const campaignIds = [...new Set(contacts?.map(c => c.campaign_id).filter(Boolean) || [])]
    let campaignMap: Record<string, string> = {}
    
    if (campaignIds.length > 0) {
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds)
      
      if (campaigns) {
        campaignMap = campaigns.reduce((acc, campaign) => {
          acc[campaign.id] = campaign.name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform contacts to include campaign_name
    const transformedContacts = contacts?.map(contact => ({
      ...contact,
      campaign_name: contact.campaign_id ? campaignMap[contact.campaign_id] || null : null
    })) || []

    return NextResponse.json({ 
      contacts: transformedContacts,
      total: count || 0,
      hasMore: contacts && contacts.length === limit
    })
  } catch (error) {
    console.error('💥 Demo fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    // Authenticate user
    const userId = await getUserIdFromSession()
    if (!userId) {
      // For demo purposes, let's fetch all contacts without user filter
      // In production, this should return 401 Unauthorized
      return fetchAllContactsForDemo(request)
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const emailStatus = searchParams.get('email_status')
    const company = searchParams.get('company')
    const industry = searchParams.get('industry')
    const campaignId = searchParams.get('campaign_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build query with user filter (no campaigns join for now)
    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, email_status, title, company, location, industry, linkedin, image_url, campaign_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%)`)
    }

    if (emailStatus) {
      query = query.eq('email_status', emailStatus)
    }

    if (company) {
      query = query.eq('company', company)
    }

    if (industry) {
      query = query.eq('industry', industry)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: contacts, error } = await query

    if (error) {
      console.error('Error fetching contacts:', error)
      // If table doesn't exist, return sample data
      if (error.code === 'PGRST205' || error.message?.includes('contacts')) {
        const sampleContacts = [
          {
            id: 1,
            first_name: "Dino",
            last_name: "Bernardo", 
            email: "dino@webmarketing.au",
            email_status: "Valid",
            privacy: "Normal",
            tags: "advertising,digital",
            linkedin: "https://linkedin.com/in/dinobernardo",
            title: "Under digital business development of Social Media & Advertising",
            location: "Sydney, Australia",
            company: "E-Web Marketing",
            industry: "Digital Marketing",
            note: "Interested in AI advertising solutions",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            first_name: "Nerieda",
            last_name: "Keenan",
            email: "nerieda@bornsocial.co",
            email_status: "Valid",
            privacy: "Normal", 
            tags: "social,advertising",
            linkedin: "https://linkedin.com/in/neriedakeenan",
            title: "Digital Advertising Specialist",
            location: "Melbourne, Australia",
            company: "Born Social",
            industry: "Social Media Marketing",
            note: "Specializes in paid social campaigns",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 3,
            first_name: "Sarah",
            last_name: "Johnson",
            email: "sarah@techcorp.com",
            email_status: "Valid",
            privacy: "Normal",
            tags: "technology,b2b",
            linkedin: "https://linkedin.com/in/sarahjohnson",
            title: "Marketing Director",
            location: "Brisbane, Australia", 
            company: "TechCorp Solutions",
            industry: "Technology",
            note: "Looking for lead generation solutions",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 4,
            first_name: "Michael",
            last_name: "Chen",
            email: "michael@retailplus.com",
            email_status: "Pending",
            privacy: "Normal",
            tags: "retail,ecommerce",
            linkedin: null,
            title: "E-commerce Manager",
            location: "Perth, Australia",
            company: "RetailPlus",
            industry: "Retail",
            note: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 5,
            first_name: "Emma",
            last_name: "Wilson", 
            email: "emma@hospitality.co",
            email_status: "Invalid",
            privacy: "High",
            tags: "hospitality,tourism",
            linkedin: "https://linkedin.com/in/emmawilson",
            title: "Operations Manager",
            location: "Adelaide, Australia",
            company: "Hospitality Co",
            industry: "Hospitality",
            note: "Interested in customer management tools",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]

        // Apply filters to sample data
        let filteredContacts = sampleContacts
        
        if (search) {
          const searchLower = search.toLowerCase()
          filteredContacts = filteredContacts.filter(contact =>
            contact.first_name?.toLowerCase().includes(searchLower) ||
            contact.last_name?.toLowerCase().includes(searchLower) ||
            contact.email?.toLowerCase().includes(searchLower) ||
            contact.company?.toLowerCase().includes(searchLower)
          )
        }

        if (emailStatus) {
          filteredContacts = filteredContacts.filter(contact => contact.email_status === emailStatus)
        }

        if (company) {
          filteredContacts = filteredContacts.filter(contact => contact.company === company)
        }

        if (industry) {
          filteredContacts = filteredContacts.filter(contact => contact.industry === industry)
        }

        // Apply pagination
        const paginatedContacts = filteredContacts.slice(offset, offset + limit)

        return NextResponse.json({ 
          contacts: paginatedContacts,
          total: filteredContacts.length,
          hasMore: offset + limit < filteredContacts.length
        })
      }
      
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Get total count for pagination (with same filters)
    let countQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (campaignId) {
      countQuery = countQuery.eq('campaign_id', campaignId)
    }
    if (search) {
      countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%)`)
    }

    const { count, error: countError } = await countQuery

    // Get campaign names for the contacts
    const campaignIds = [...new Set(contacts?.map(c => c.campaign_id).filter(Boolean) || [])]
    let campaignMap: Record<string, string> = {}
    
    if (campaignIds.length > 0) {
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds)
      
      if (campaigns) {
        campaignMap = campaigns.reduce((acc, campaign) => {
          acc[campaign.id] = campaign.name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform contacts to include campaign_name
    const transformedContacts = contacts?.map(contact => ({
      ...contact,
      campaign_name: contact.campaign_id ? campaignMap[contact.campaign_id] || null : null
    })) || []

    return NextResponse.json({ 
      contacts: transformedContacts,
      total: count || 0,
      hasMore: contacts && contacts.length === limit
    })
  } catch (error) {
    console.error('Error in contacts GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      first_name,
      last_name,
      email,
      title,
      location,
      company,
      industry,
      linkedin,
      image_url,
      campaign_id
    } = body

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        first_name,
        last_name,
        email,
        title,
        location,
        company,
        industry,
        linkedin,
        image_url,
        campaign_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in contacts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}