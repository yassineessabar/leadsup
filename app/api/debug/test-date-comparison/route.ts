import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Testing date comparison logic...')
    
    // Simulate the dates we're seeing in the logs
    const now = new Date() // Current time: Aug 28, 2025 13:xx
    const scheduledDateSep1 = new Date('2025-09-01T04:35:00.000Z') // Sep 1, 2025 04:35 UTC
    const scheduledDateAug31 = new Date('2025-08-31T13:13:55.436Z') // Aug 31, 2025 13:13 UTC
    
    console.log(`Now: ${now.toISOString()}`)
    console.log(`Scheduled Sep 1: ${scheduledDateSep1.toISOString()}`)
    console.log(`Scheduled Aug 31: ${scheduledDateAug31.toISOString()}`)
    
    // Test the comparison logic
    const isSep1Due = now >= scheduledDateSep1
    const isAug31Due = now >= scheduledDateAug31
    
    console.log(`now >= Sep1Date: ${isSep1Due} (WRONG - should be false!)`)
    console.log(`now >= Aug31Date: ${isAug31Due} (should be false until Aug 31)`)
    
    // Manual date comparison
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sep1Date = new Date(scheduledDateSep1.getFullYear(), scheduledDateSep1.getMonth(), scheduledDateSep1.getDate())
    const aug31Date = new Date(scheduledDateAug31.getFullYear(), scheduledDateAug31.getMonth(), scheduledDateAug31.getDate())
    
    console.log('Date-only comparisons:')
    console.log(`Today: ${nowDate.toDateString()}`)
    console.log(`Sep1: ${sep1Date.toDateString()}`)
    console.log(`Aug31: ${aug31Date.toDateString()}`)
    console.log(`Today >= Sep1: ${nowDate >= sep1Date}`)
    console.log(`Today >= Aug31: ${nowDate >= aug31Date}`)

    return NextResponse.json({
      success: true,
      debug: {
        currentTime: now.toISOString(),
        currentDateString: now.toDateString(),
        tests: [
          {
            label: 'September 1st email (SHOULD NOT BE DUE)',
            scheduledDate: scheduledDateSep1.toISOString(),
            scheduledDateString: scheduledDateSep1.toDateString(),
            comparison: `${now.toISOString()} >= ${scheduledDateSep1.toISOString()}`,
            result: isSep1Due,
            expected: false,
            correct: isSep1Due === false
          },
          {
            label: 'August 31st email',
            scheduledDate: scheduledDateAug31.toISOString(),
            scheduledDateString: scheduledDateAug31.toDateString(),
            comparison: `${now.toISOString()} >= ${scheduledDateAug31.toISOString()}`,
            result: isAug31Due,
            expected: false, // Should be false until Aug 31
            correct: isAug31Due === false
          }
        ],
        dateOnlyComparisons: {
          nowDate: nowDate.toDateString(),
          sep1Date: sep1Date.toDateString(),
          aug31Date: aug31Date.toDateString(),
          nowVsSep1: nowDate >= sep1Date,
          nowVsAug31: nowDate >= aug31Date
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error testing date comparison:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}