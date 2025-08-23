import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'Not set',
    OPENAI: process.env.OPENAI ? 'Set (length: ' + process.env.OPENAI.length + ')' : 'Not set',
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
  })
}