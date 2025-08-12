#!/usr/bin/env node

/**
 * Test improved email parsing with quoted-printable decoding
 */

const testEmailContent = `Content-Transfer-Encoding: quoted-printable
rwerewr
On Tue, 12 Aug 2025 at 13:30, LeadsUp Campaign <noreply@leadsup.io> wrote:
> Hola Jane,
>
> Espero que est=C3=A9s teniendo un gran d=C3=ADa. Soy parte del equipo de =
Uboard,
> donde revolucionamos la publicidad en veh=C3=ADculos de rideshare con nue=
stras
> pantallas inteligentes en el techo. Me gustar=C3=ADa saber si est=C3=A1s =
interesado
> en explorar c=C3=B3mo nuestras soluciones pueden maximizar la visibilidad=
 de tus
> anuncios.
>
> Saludos,
> [Tu Nombre]
*Yassine Essabar *
M: +61 412 345 595`

function decodeQuotedPrintable(text) {
  if (!text) return text
  
  return text
    // Decode soft line breaks (=\n)
    .replace(/=\r?\n/g, '')
    // Decode hex-encoded characters (=XX)
    .replace(/=([0-9A-F]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    // Clean up any remaining quoted-printable artifacts
    .replace(/=$/gm, '')
}

function extractActualReply(text) {
  if (!text) return ''
  
  // Split by common reply separators
  const separators = [
    /On .+? wrote:/i,
    /From: .+?\n/i,
    /-----Original Message-----/i,
    /----- Forwarded message -----/i,
    /> .+/g // Remove quoted lines
  ]
  
  let cleanText = text
  
  // First, decode quoted-printable
  cleanText = decodeQuotedPrintable(cleanText)
  
  // Remove "Content-Transfer-Encoding" lines
  cleanText = cleanText.replace(/Content-Transfer-Encoding: .+?\n/gi, '')
  
  // Find the actual reply by splitting on "On ... wrote:" pattern
  const onWroteMatch = cleanText.match(/(.*?)On .+? wrote:/is)
  if (onWroteMatch) {
    cleanText = onWroteMatch[1].trim()
  }
  
  // Remove quoted lines (lines starting with >)
  const lines = cleanText.split('\n')
  const replyLines = lines.filter(line => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('>')
  })
  
  return replyLines.join('\n').trim()
}

function testEmailParsing() {
  console.log('🧪 Testing email parsing improvements\n')
  
  console.log('Original content:')
  console.log('=' .repeat(50))
  console.log(testEmailContent)
  
  console.log('\nDecoded quoted-printable:')
  console.log('=' .repeat(50))
  const decoded = decodeQuotedPrintable(testEmailContent)
  console.log(decoded)
  
  console.log('\nExtracted actual reply:')
  console.log('=' .repeat(50))
  const reply = extractActualReply(testEmailContent)
  console.log(`"${reply}"`)
  
  console.log('\nResult:')
  console.log('=' .repeat(50))
  console.log(`Original length: ${testEmailContent.length}`)
  console.log(`Decoded length: ${decoded.length}`)
  console.log(`Clean reply length: ${reply.length}`)
  console.log(`Clean reply: "${reply}"`)
}

testEmailParsing()