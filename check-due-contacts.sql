-- SQL Query to check which contacts and sequences need to be executed
-- This replicates the automation logic with time and timezone conditions

WITH contact_progress AS (
  -- Calculate current step for each contact based on sent emails
  SELECT 
    c.id as contact_id,
    c.email,
    c.first_name,
    c.last_name,
    c.location,
    c.timezone,
    c.created_at,
    c.campaign_id,
    c.status,
    COALESCE(COUNT(et.id), 0) as current_step,
    MAX(et.sent_at) as last_sent_at
  FROM contacts c
  LEFT JOIN email_tracking et ON c.id::text = et.contact_id 
    AND et.campaign_id = c.campaign_id 
    AND et.status = 'sent'
  WHERE c.campaign_id IS NOT NULL
  GROUP BY c.id, c.email, c.first_name, c.last_name, c.location, c.timezone, c.created_at, c.campaign_id, c.status
),

contact_with_next_sequence AS (
  -- Join with campaign sequences to get next sequence
  SELECT 
    cp.*,
    cs.step_number as next_step_number,
    cs.subject as next_subject,
    cs.timing_days,
    cs.email_content,
    -- Calculate scheduled date for next email
    CASE 
      WHEN cp.current_step = 0 THEN 
        -- First email: based on contact creation + timing_days
        cp.created_at + (cs.timing_days || ' days')::interval
      WHEN cp.last_sent_at IS NOT NULL THEN
        -- Subsequent emails: based on last sent + timing_days
        cp.last_sent_at + (cs.timing_days || ' days')::interval
      ELSE NULL
    END as scheduled_date,
    -- Determine contact timezone
    CASE 
      WHEN cp.timezone IS NOT NULL THEN cp.timezone
      WHEN cp.location ILIKE '%Sydney%' THEN 'Australia/Sydney'
      WHEN cp.location ILIKE '%Melbourne%' THEN 'Australia/Melbourne'
      WHEN cp.location ILIKE '%Brisbane%' THEN 'Australia/Brisbane'
      WHEN cp.location ILIKE '%Perth%' THEN 'Australia/Perth'
      WHEN cp.location ILIKE '%Adelaide%' THEN 'Australia/Adelaide'
      WHEN cp.location ILIKE '%Tokyo%' THEN 'Asia/Tokyo'
      WHEN cp.location ILIKE '%London%' THEN 'Europe/London'
      WHEN cp.location ILIKE '%New York%' THEN 'America/New_York'
      WHEN cp.location ILIKE '%Los Angeles%' THEN 'America/Los_Angeles'
      WHEN cp.location ILIKE '%Chicago%' THEN 'America/Chicago'
      WHEN cp.location ILIKE '%Boston%' THEN 'America/New_York'
      WHEN cp.location ILIKE '%Seattle%' THEN 'America/Los_Angeles'
      WHEN cp.location ILIKE '%Miami%' THEN 'America/New_York'
      WHEN cp.location ILIKE '%Denver%' THEN 'America/Denver'
      WHEN cp.location ILIKE '%Phoenix%' THEN 'America/Phoenix'
      ELSE NULL
    END as derived_timezone
  FROM contact_progress cp
  LEFT JOIN campaign_sequences cs ON cp.campaign_id = cs.campaign_id 
    AND cs.step_number = cp.current_step + 1
  LEFT JOIN campaigns cam ON cp.campaign_id = cam.id
  WHERE cam.status = 'Active'
    AND cp.status NOT IN ('Completed', 'Replied', 'Unsubscribed', 'Bounced')
),

contacts_with_business_hours AS (
  -- Check business hours in contact timezone
  SELECT 
    *,
    -- Current time in contact's timezone (approximation - PostgreSQL timezone conversion)
    CASE 
      WHEN derived_timezone IS NOT NULL THEN
        NOW() AT TIME ZONE 'UTC' AT TIME ZONE derived_timezone
      ELSE NOW()
    END as contact_local_time,
    -- Scheduled time in contact's timezone
    CASE 
      WHEN derived_timezone IS NOT NULL AND scheduled_date IS NOT NULL THEN
        scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE derived_timezone
      ELSE scheduled_date
    END as scheduled_local_time,
    -- Business hours check (8 AM to 6 PM in contact's timezone)
    CASE 
      WHEN derived_timezone IS NOT NULL THEN
        EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE derived_timezone)) BETWEEN 8 AND 17
      ELSE 
        EXTRACT(HOUR FROM NOW()) BETWEEN 8 AND 17
    END as in_business_hours,
    -- Weekend check
    CASE 
      WHEN scheduled_date IS NOT NULL THEN
        EXTRACT(DOW FROM scheduled_date) NOT IN (0, 6)  -- 0=Sunday, 6=Saturday
      ELSE true
    END as not_weekend
  FROM contact_with_next_sequence
  WHERE next_step_number IS NOT NULL  -- Has a next sequence
)

-- Final query: Contacts that should be processed NOW
SELECT 
  contact_id,
  email,
  first_name,
  last_name,
  location,
  derived_timezone,
  current_step,
  next_step_number,
  next_subject,
  timing_days,
  scheduled_date,
  scheduled_local_time,
  contact_local_time,
  in_business_hours,
  not_weekend,
  -- Conditions check
  CASE WHEN scheduled_date <= NOW() THEN '✅ DUE' ELSE '❌ NOT DUE' END as date_condition,
  CASE WHEN in_business_hours THEN '✅ BUSINESS HOURS' ELSE '❌ OUTSIDE HOURS' END as hours_condition,
  CASE WHEN not_weekend THEN '✅ WEEKDAY' ELSE '❌ WEEKEND' END as weekend_condition,
  -- Final decision
  CASE 
    WHEN scheduled_date <= NOW() 
         AND in_business_hours 
         AND not_weekend 
    THEN '🚀 READY TO SEND'
    ELSE '⏸️ BLOCKED'
  END as final_status,
  -- Reasons for blocking
  CASE 
    WHEN scheduled_date > NOW() THEN 'Not due yet (' || 
      EXTRACT(EPOCH FROM (scheduled_date - NOW()))/3600 || ' hours remaining)'
    WHEN NOT in_business_hours THEN 'Outside business hours'
    WHEN NOT not_weekend THEN 'Weekend'
    ELSE 'Ready'
  END as block_reason
FROM contacts_with_business_hours
WHERE campaign_id = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'  -- Your campaign ID
ORDER BY 
  CASE WHEN scheduled_date <= NOW() AND in_business_hours AND not_weekend THEN 0 ELSE 1 END,
  created_at ASC;

-- Additional query to check John Doe contacts specifically
SELECT 
  '=== JOHN DOE CONTACTS ANALYSIS ===' as section;

SELECT 
  contact_id,
  email,
  first_name,
  last_name,
  current_step,
  next_step_number,
  timing_days,
  created_at,
  scheduled_date,
  NOW() as current_time,
  scheduled_date <= NOW() as is_due,
  EXTRACT(EPOCH FROM (NOW() - scheduled_date))/60 as minutes_overdue,
  final_status,
  block_reason
FROM contacts_with_business_hours
WHERE first_name = 'John' AND last_name = 'Doe'
  AND campaign_id = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
ORDER BY contact_id;