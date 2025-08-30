import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  const [username, password] = credentials.split(':')
  
  if (username !== process.env.AUTOMATION_API_USERNAME || 
      password !== process.env.AUTOMATION_API_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  
  return NextResponse.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE,
      SENDGRID_API_KEY_EXISTS: !!process.env.SENDGRID_API_KEY,
      SENDGRID_API_KEY_LENGTH: process.env.SENDGRID_API_KEY?.length || 0,
      SENDGRID_API_KEY_PREFIX: process.env.SENDGRID_API_KEY?.substring(0, 7) || 'NOT_SET',
      AUTOMATION_API_USERNAME_EXISTS: !!process.env.AUTOMATION_API_USERNAME,
      AUTOMATION_API_PASSWORD_EXISTS: !!process.env.AUTOMATION_API_PASSWORD,
      SUPABASE_URL_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY_EXISTS: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    message: 'Environment variables check'
  })
}