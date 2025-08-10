import { type NextRequest, NextResponse } from "next/server"

// GET - Handle OAuth callback from Gmail
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This contains the email
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'OAuth authorization failed',
        error_details: error,
        error_description: searchParams.get('error_description')
      }, { status: 400 })
    }

    if (!code || !state) {
      return NextResponse.json({
        success: false,
        error: 'Missing authorization code or email (state parameter)'
      }, { status: 400 })
    }

    const email = state

    // Return a simple HTML page that shows the result and provides the curl command
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gmail OAuth - Authorization Complete</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .success { color: #4CAF50; }
            .code-block { background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
            .copy-btn { background: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px; }
        </style>
    </head>
    <body>
        <h2 class="success">✅ Gmail OAuth Authorization Successful!</h2>
        
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Authorization Code:</strong> ${code.substring(0, 20)}...</p>
        
        <h3>Next Step: Complete the setup</h3>
        <p>Run this command to save the OAuth tokens:</p>
        
        <div class="code-block">
curl -u 'admin:password' -X POST http://localhost:3000/api/auth/gmail-oauth \\
-H "Content-Type: application/json" \\
-d '{
  "code": "${code}",
  "email": "${email}"
}'
        </div>
        
        <button class="copy-btn" onclick="copyToClipboard()">Copy Command</button>
        
        <h3>Or use this simplified version:</h3>
        <div class="code-block" id="simple-command">
curl -u 'admin:password' -X POST http://localhost:3000/api/auth/gmail-oauth -H "Content-Type: application/json" -d '{"code":"${code}","email":"${email}"}'
        </div>
        
        <script>
        function copyToClipboard() {
            const command = \`curl -u 'admin:password' -X POST http://localhost:3000/api/auth/gmail-oauth -H "Content-Type: application/json" -d '{"code":"${code}","email":"${email}"}'\`;
            navigator.clipboard.writeText(command).then(() => {
                alert('Command copied to clipboard!');
            });
        }
        </script>
        
        <hr>
        <p><small>After running the command, your Gmail account will be ready for sending emails through the campaign system.</small></p>
    </body>
    </html>
    `

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('❌ Error in OAuth callback:', error)
    
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gmail OAuth - Error</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .error { color: #f44336; }
        </style>
    </head>
    <body>
        <h2 class="error">❌ OAuth Callback Error</h2>
        <p>There was an error processing the Gmail OAuth callback.</p>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
        
        <h3>Try again:</h3>
        <p>Go back to your terminal and run the Gmail OAuth command again:</p>
        <code>curl -u 'admin:password' "http://localhost:3000/api/auth/gmail-oauth?email=your@gmail.com"</code>
    </body>
    </html>
    `

    return new Response(errorHtml, {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    })
  }
}