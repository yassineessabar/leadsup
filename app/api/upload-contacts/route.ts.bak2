import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { parse } from "csv-parse/sync" // Using a synchronous parser for simplicity in this example
import type { ReviewRequest } from "@/types/db"

const MOCK_USER_ID = "1"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const contactType = formData.get("contactType") as "sms" | "email" | null
    const messageContent = formData.get("messageContent") as string | null
    const templateId = formData.get("templateId") as string | null

    if (!file || !contactType || !messageContent) {
      return NextResponse.json(
        { success: false, error: "File, contactType, and messageContent are required" },
        { status: 400 },
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const csvString = fileBuffer.toString("utf-8")

    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
    })

    const requestsToInsert: Omit<ReviewRequest, "id" | "user_id" | "sent_at" | "status">[] = records.map(
      (record: any) => {
        const customerName = record.name || record.Name || null
        const customerContact = contactType === "sms" ? record.number || record.Number : record.email || record.Email

        if (!customerContact) {
          throw new Error(`Missing contact for row: ${JSON.stringify(record)}`)
        }

        return {
          customer_name: customerName,
          customer_contact: customerContact,
          contact_type: contactType,
          message_content: messageContent,
          template_id: templateId,
        }
      },
    )

    const { data, error } = await supabase
      .from("review_requests")
      .insert(requestsToInsert.map((req) => ({ ...req, user_id: MOCK_USER_ID, status: "sent" })))
      .select()

    if (error) {
      console.error("Error inserting contacts from CSV:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, data, message: `${data.length} contacts uploaded and requests sent.` },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Error in POST /api/upload-contacts:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
