import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // Get the latest logs ordered by creation time
    const { data: logs, error } = await supabaseServer
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Format logs for easy reading
    const formattedLogs = logs?.map(log => ({
      time: new Date(log.created_at).toLocaleTimeString(),
      type: log.log_type,
      status: log.status,
      message: log.message,
      details: log.details,
      campaign: log.campaign_id,
      contact: log.contact_id,
      sender: log.sender_id,
      skipReason: log.skip_reason,
      runId: log.run_id
    }))

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      totalLogs: logs?.length || 0
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}