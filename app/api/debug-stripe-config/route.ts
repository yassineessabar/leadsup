import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    webhook_secret_preview: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 15) + "...",
    secret_key_preview: process.env.STRIPE_SECRET_KEY?.substring(0, 15) + "...",
    has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    has_secret_key: !!process.env.STRIPE_SECRET_KEY,
  })
}