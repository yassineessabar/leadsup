import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

export async function GET(request: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials missing"
      }, { status: 500 })
    }

    const client = twilio(accountSid, authToken)

    // Get all phone numbers in your account
    const phoneNumbers = await client.incomingPhoneNumbers.list()

    // Filter for SMS-capable numbers
    const smsCapableNumbers = phoneNumbers.filter(number =>
      number.capabilities.sms === true
    )

    // Get available phone numbers for purchase (SMS-capable)
    const availableNumbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        smsEnabled: true,
        limit: 10
      })

    return NextResponse.json({
      success: true,
      currentNumbers: phoneNumbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        smsCapable: num.capabilities.sms,
        voiceCapable: num.capabilities.voice
      })),
      smsCapableNumbers: smsCapableNumbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName
      })),
      availableForPurchase: availableNumbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        locality: num.locality,
        region: num.region
      }))
    })

  } catch (error: any) {
    console.error("Error fetching phone numbers:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch phone numbers",
      details: error.message
    }, { status: 500 })
  }
}