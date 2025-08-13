import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
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
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// GET - Fetch inbox messages with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Filter parameters
    const campaigns = searchParams.get('campaigns')?.split(',').filter(Boolean) || []
    const senders = searchParams.get('senders')?.split(',').filter(Boolean) || []
    const leadStatuses = searchParams.get('lead_statuses')?.split(',').filter(Boolean) || []
    const folder = searchParams.get('folder') || 'inbox'
    const channel = searchParams.get('channel') || 'email'
    const search = searchParams.get('search') || ''
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const status = searchParams.get('status') // read, unread, etc.
    const view = searchParams.get('view') || 'threads' // 'threads' or 'messages'
    const conversationId = searchParams.get('conversation_id') // for fetching thread messages

    console.log('📧 Inbox API called with filters:', {
      campaigns, senders, leadStatuses, folder, channel, search, dateFrom, dateTo, status, view, conversationId,
      rawParams: Object.fromEntries(searchParams.entries())
    })

    if (conversationId) {
      // Fetch all messages for a specific conversation/thread
      return await getThreadMessages(userId, conversationId)
    } else if (view === 'threads') {
      // Fetch threaded view (conversations)
      return await getThreadedMessages(userId, {
        page, limit, offset, campaigns, senders, leadStatuses, 
        folder, channel, search, dateFrom, dateTo, status
      })
    } else {
      // Fetch individual messages view
      return await getIndividualMessages(userId, {
        page, limit, offset, campaigns, senders, leadStatuses,
        folder, channel, search, dateFrom, dateTo, status
      })
    }

  } catch (error) {
    console.error("❌ Error fetching inbox data:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get all messages for a specific thread/conversation
async function getThreadMessages(userId: string, conversationId: string) {
  try {
    console.log(`📧 Fetching all messages for conversation: ${conversationId}`)

    // Fetch all messages for this conversation (exclude trashed messages)
    const { data: messages, error } = await supabaseServer
      .from('inbox_messages')
      .select(`
        id, message_id, subject, body_text, body_html, direction, status, 
        sent_at, received_at, sender_email, contact_name, contact_email, 
        has_attachments, folder, created_at, provider_data
      `)
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .neq('folder', 'trash')  // Exclude messages in trash folder
      .order('sent_at', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching thread messages:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Format messages for frontend
    const formattedMessages = messages.map(message => ({
      id: message.id,
      message_id: message.message_id,
      subject: message.subject,
      body_text: message.body_text,
      body_html: message.body_html,
      direction: message.direction,
      status: message.status,
      sender_email: message.sender_email,
      contact_name: message.contact_name,
      contact_email: message.contact_email,
      sent_at: message.sent_at,
      received_at: message.received_at,
      has_attachments: message.has_attachments,
      folder: message.folder,
      created_at: message.created_at,
      provider_data: message.provider_data,
      // Format date for display
      formatted_date: message.sent_at ? new Date(message.sent_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : 'No date',
      // Choose content (prefer text for proper formatting)
      content: message.body_text || message.body_html || 'No content'
    }))

    console.log(`✅ Found ${formattedMessages.length} messages in thread`)

    return NextResponse.json({
      success: true,
      data: formattedMessages
    })

  } catch (error) {
    console.error('❌ Error in getThreadMessages:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Helper function to get threaded messages (conversations)
async function getThreadedMessages(userId: string, filters: any) {
  const { page, limit, offset, campaigns, senders, leadStatuses, folder, channel, search, dateFrom, dateTo, status } = filters

  try {
    // Use thread-based filtering instead of message-based filtering
    // This is more consistent and avoids the inbox_messages dependency issues

    // Build the main query for threads
    let query = supabaseServer
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })

    // Helper function to find fully trashed conversations
    const getFullyTrashedConversations = async () => {
      const { data: trashMessageIds, error: trashError } = await supabaseServer
        .from('inbox_messages')
        .select('conversation_id')
        .eq('user_id', userId)
        .eq('folder', 'trash');
        
      if (trashError || !trashMessageIds) return [];
      
      const trashConversationIds = [...new Set(trashMessageIds.map(m => m.conversation_id))];
      const fullyTrashedConversations = [];
      
      for (const convId of trashConversationIds) {
        const { data: allMessages, error: allMsgError } = await supabaseServer
          .from('inbox_messages')
          .select('folder')
          .eq('user_id', userId)
          .eq('conversation_id', convId);
          
        if (!allMsgError && allMessages) {
          const nonTrashMessages = allMessages.filter(m => m.folder !== 'trash');
          if (nonTrashMessages.length === 0) {
            fullyTrashedConversations.push(convId);
          }
        }
      }
      
      return fullyTrashedConversations;
    }
    
    // Apply folder-specific filtering with trash logic
    let fullyTrashedConversations = [];
    let threadIds: string[] = []
    
    if (folder && folder !== 'all') {
      fullyTrashedConversations = await getFullyTrashedConversations();
      
      if (folder === 'trash') {
        // For trash folder, show only fully trashed conversations
        console.log('🗑️ Showing trash conversations')
        
        if (fullyTrashedConversations.length > 0) {
          query = query.in('conversation_id', fullyTrashedConversations);
          threadIds = fullyTrashedConversations;
        } else {
          // No trash conversations, return empty
          query = query.in('conversation_id', ['no-matches']);
          threadIds = ['no-matches'];
        }
      } else {
        // For inbox and sent folders, exclude fully trashed conversations
        console.log(`📁 Showing ${folder} conversations (excluding trash)`)
        
        if (fullyTrashedConversations.length > 0) {
          // Use multiple .neq() calls to exclude trashed conversations
          fullyTrashedConversations.forEach(conversationId => {
            query = query.neq('conversation_id', conversationId);
          });
        }
        
        // Apply folder-specific logic
        if (folder === 'inbox') {
          query = query.gt('unread_count', 0);
          console.log('📥 + filtering for unread conversations');
        }
      }
    }

    // Apply campaign filter
    if (campaigns.length > 0) {
      query = query.in('campaign_id', campaigns)
    }

    // Apply lead status filter
    if (leadStatuses.length > 0) {
      query = query.in('lead_status', leadStatuses)
    }

    // Apply search filter
    if (search) {
      query = query.or(`subject.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,last_message_preview.ilike.%${search}%`)
    }

    // Apply date filters
    if (dateFrom) {
      query = query.gte('last_message_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('last_message_at', dateTo)
    }

    // Apply status filter through messages
    if (status) {
      // This requires a more complex query - we need to join with messages
      const statusClause = status === 'unread' ? 'unread_count.gt.0' : 'unread_count.eq.0'
      if (status === 'unread') {
        query = query.gt('unread_count', 0)
      } else if (status === 'read') {
        query = query.eq('unread_count', 0)
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: threads, error, count } = await query

    if (error) {
      console.error('❌ Error fetching threads:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseServer
      .from('inbox_threads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Apply same folder filtering logic to count
    if (folder && folder !== 'all') {
      if (folder === 'trash') {
        // Count only fully trashed conversations
        if (threadIds.length > 0 && threadIds[0] !== 'no-matches') {
          countQuery = countQuery.in('conversation_id', threadIds)
        } else {
          // No trash conversations, set count to 0
          countQuery = countQuery.in('conversation_id', ['no-matches'])
        }
      } else {
        // For inbox and sent, exclude fully trashed conversations
        if (fullyTrashedConversations.length > 0) {
          // Use multiple .neq() calls for count query too
          fullyTrashedConversations.forEach(conversationId => {
            countQuery = countQuery.neq('conversation_id', conversationId);
          });
        }
        
        if (folder === 'inbox') {
          countQuery = countQuery.gt('unread_count', 0)
        }
      }
    }

    // Apply same filters for count
    if (campaigns.length > 0) {
      countQuery = countQuery.in('campaign_id', campaigns)
    }
    if (leadStatuses.length > 0) {
      countQuery = countQuery.in('lead_status', leadStatuses)
    }
    if (search) {
      countQuery = countQuery.or(`subject.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,last_message_preview.ilike.%${search}%`)
    }
    if (dateFrom) {
      countQuery = countQuery.gte('last_message_at', dateFrom)
    }
    if (dateTo) {
      countQuery = countQuery.lte('last_message_at', dateTo)
    }

    const { count: totalCount } = await countQuery

    // Get latest messages for each thread
    const formattedThreads = await Promise.all(
      (threads || []).map(async (thread) => {
        // Try to get the latest message for this conversation (optional - use thread data as fallback)
        let latestMessage = null
        try {
          const { data: message, error: messageError } = await supabaseServer
            .from('inbox_messages')
            .select('id, subject, body_text, body_html, direction, status, sent_at, received_at, sender_id, sender_email, contact_name, contact_email, has_attachments, folder')
            .eq('user_id', userId)
            .eq('conversation_id', thread.conversation_id)
            .order('sent_at', { ascending: false, nullsLast: true })
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            
          if (!messageError) {
            latestMessage = message
          }
        } catch (e) {
          // If message fetch fails, we'll use thread data as fallback
          console.log(`📝 Using thread data as fallback for ${thread.conversation_id}`)
        }
        
        return {
          id: thread.id,
          conversation_id: thread.conversation_id,
          
          // UI expects these fields for email display - use thread data as primary source
          sender: thread.contact_email?.trim() || 'Unknown',
          subject: thread.subject || 'No subject',
          preview: thread.last_message_preview || 'No preview available',
          date: new Date(thread.last_message_at).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          isRead: thread.unread_count === 0,
          hasAttachment: latestMessage?.has_attachments || false,
          content: thread.last_message_preview || latestMessage?.body_html || latestMessage?.body_text || 'No content available',
          folder: folder || 'inbox', // Use the requested folder
          
          // Keep original thread data for compatibility
          contact_name: thread.contact_name,
          contact_email: thread.contact_email,
          campaign_id: thread.campaign_id,
          message_count: thread.message_count,
          unread_count: thread.unread_count,
          last_message_at: thread.last_message_at,
          last_message_preview: thread.last_message_preview,
          status: thread.status,
          lead_status: thread.lead_status,
          tags: thread.tags,
          latest_message: latestMessage || null
        }
      })
    ).then(results => results.filter(thread => thread !== null)) // Filter out null threads

    console.log(`✅ Returning ${formattedThreads.length} threads for folder '${folder}'`)
    
    return NextResponse.json({
      success: true,
      emails: formattedThreads, // UI expects 'emails' at root level
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: offset + limit < (totalCount || 0)
      }
    })

  } catch (error) {
    console.error('❌ Error in getThreadedMessages:', error)
    throw error
  }
}

// Helper function to get individual messages
async function getIndividualMessages(userId: string, filters: any) {
  const { page, limit, offset, campaigns, senders, leadStatuses, folder, channel, search, dateFrom, dateTo, status } = filters

  try {
    // Build the query for individual messages
    let query = supabaseServer
      .from('inbox_messages')
      .select(`
        *,
        campaign:campaigns(id, name),
        sequence:campaign_sequences(id, step_number, subject),
        contact:contacts(id, first_name, last_name, email)
      `)
      .eq('user_id', userId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })

    // Apply folder filter
    if (folder && folder !== 'all') {
      if (folder === 'sent') {
        // For sent folder, show outbound messages that are NOT in trash
        query = query
          .eq('direction', 'outbound')
          .neq('folder', 'trash')
      } else {
        query = query.eq('folder', folder)
      }
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply campaign filter
    if (campaigns.length > 0) {
      query = query.in('campaign_id', campaigns)
    }

    // Apply sender filter
    if (senders.length > 0) {
      query = query.in('sender_id', senders)
    }

    // Apply lead status filter
    if (leadStatuses.length > 0) {
      query = query.in('lead_status', leadStatuses)
    }

    // Apply search filter (full-text search on subject, body, and contact info)
    if (search) {
      query = query.or(`subject.ilike.%${search}%,body_text.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`)
    }

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: messages, error } = await query

    if (error) {
      console.error('❌ Error fetching messages:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseServer
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('channel', channel)

    // Apply same filters for count
    if (folder && folder !== 'all') {
      if (folder === 'sent') {
        // For sent folder, show outbound messages that are NOT in trash
        countQuery = countQuery
          .eq('direction', 'outbound')
          .neq('folder', 'trash')
      } else {
        countQuery = countQuery.eq('folder', folder)
      }
    }
    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    if (campaigns.length > 0) {
      countQuery = countQuery.in('campaign_id', campaigns)
    }
    if (senders.length > 0) {
      countQuery = countQuery.in('sender_id', senders)
    }
    if (leadStatuses.length > 0) {
      countQuery = countQuery.in('lead_status', leadStatuses)
    }
    if (search) {
      countQuery = countQuery.or(`subject.ilike.%${search}%,body_text.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`)
    }
    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo)
    }

    const { count: totalCount } = await countQuery

    // Format messages for frontend
    const formattedMessages = messages?.map(message => ({
      id: message.id,
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      thread_id: message.thread_id,
      subject: message.subject,
      body_text: message.body_text,
      body_html: message.body_html,
      direction: message.direction,
      channel: message.channel,
      status: message.status,
      folder: message.folder,
      lead_status: message.lead_status,
      contact_name: message.contact_name,
      contact_email: message.contact_email,
      sender_email: message.sender_email,
      has_attachments: message.has_attachments,
      attachments: message.attachments,
      sent_at: message.sent_at,
      received_at: message.received_at,
      created_at: message.created_at,
      campaign: message.campaign,
      sequence: message.sequence,
      contact: message.contact
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasMore: offset + limit < (totalCount || 0)
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in getIndividualMessages:', error)
    throw error
  }
}

// POST - Create a new message (usually from sequence responses)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const {
      message_id,
      thread_id,
      campaign_id,
      sequence_id,
      contact_email,
      contact_name,
      sender_id,
      sender_email,
      subject,
      body_text,
      body_html,
      direction, // 'inbound' or 'outbound'
      channel = 'email',
      status = 'unread',
      provider = 'gmail',
      provider_data = {},
      sent_at,
      received_at
    } = body

    console.log('📧 Creating inbox message:', { message_id, campaign_id, direction, contact_email })

    // Generate conversation_id deterministically
    const { data: conversationResult, error: convError } = await supabaseServer
      .rpc('generate_conversation_id', {
        contact_email_param: contact_email,
        sender_email_param: sender_email,
        campaign_id_param: campaign_id
      })

    if (convError) {
      console.error('❌ Error generating conversation ID:', convError)
      return NextResponse.json({ success: false, error: "Failed to generate conversation ID" }, { status: 500 })
    }

    const conversation_id = conversationResult

    // Create the message
    const { data: message, error: messageError } = await supabaseServer
      .from('inbox_messages')
      .insert({
        user_id: userId,
        message_id,
        thread_id,
        conversation_id,
        campaign_id,
        sequence_id,
        contact_email,
        contact_name,
        sender_id,
        sender_email,
        subject,
        body_text,
        body_html,
        direction,
        channel,
        status,
        provider,
        provider_data,
        sent_at,
        received_at
      })
      .select()
      .single()

    if (messageError) {
      console.error('❌ Error creating message:', messageError)
      return NextResponse.json({ success: false, error: messageError.message }, { status: 500 })
    }

    // Create or update thread
    const { error: threadError } = await supabaseServer
      .from('inbox_threads')
      .upsert({
        user_id: userId,
        conversation_id,
        thread_id,
        campaign_id,
        contact_email,
        contact_name,
        subject: subject || 'No subject',
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })

    if (threadError) {
      console.error('❌ Error creating/updating thread:', threadError)
      // Don't fail message creation if thread fails
    }

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error("❌ Error creating inbox message:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}