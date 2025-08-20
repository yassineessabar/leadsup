-- Test Scenarios for Sequence Automation Timing
-- ==============================================
-- This SQL creates test contacts with various timing conditions
-- to verify automation behavior with business hours and sequence timing

-- Test Campaign ID (adjust if needed)
DO $$
DECLARE
    test_campaign_id UUID := '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';
    prospect_id UUID;
BEGIN
    -- Clean up existing test data (optional)
    DELETE FROM prospects WHERE email_address LIKE 'test.%.due@example.com';
    
    -- SCENARIO 1: NY Morning - Due Now (Inside business hours, sequence_time < now())
    -- Expected: SHOULD SEND
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone, 
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.ny.morning.due@example.com', 'John', 'Due-Morning', 'America/New_York',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    -- Create progression entry with sequence_time 2 hours ago
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step, 
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '2 hours', 'active', NOW()
    );
    
    -- SCENARIO 2: Tokyo Night - Due but Outside Hours
    -- Expected: SHOULD NOT SEND (outside business hours)
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.tokyo.night.due@example.com', 'Akira', 'Due-Night', 'Asia/Tokyo',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '3 hours', 'active', NOW()
    );
    
    -- SCENARIO 3: London Afternoon - Not Due Yet
    -- Expected: SHOULD NOT SEND (sequence_time > now())
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.london.notdue@example.com', 'Oliver', 'NotDue-Afternoon', 'Europe/London',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() + INTERVAL '2 hours', 'active', NOW()
    );
    
    -- SCENARIO 4: Sydney Start of Day - Due
    -- Expected: SHOULD SEND (at 9 AM business hours start)
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.sydney.start.due@example.com', 'Emma', 'Due-StartDay', 'Australia/Sydney',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '1 hour', 'active', NOW()
    );
    
    -- SCENARIO 5: LA End of Day - Due
    -- Expected: SHOULD SEND (at 4:30 PM, still in business hours)
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.la.endday.due@example.com', 'Michael', 'Due-EndDay', 'America/Los_Angeles',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '4 hours', 'active', NOW()
    );
    
    -- SCENARIO 6: Chicago Weekend - Due
    -- Expected: DEPENDS ON WEEKEND RULES
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.chicago.weekend.due@example.com', 'Sarah', 'Due-Weekend', 'America/Chicago',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '24 hours', 'active', NOW()
    );
    
    -- SCENARIO 7: Paris Multiple Due
    -- Expected: SHOULD SEND (multiple sequences due)
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.paris.multiple.due@example.com', 'Pierre', 'Multiple-Due', 'Europe/Paris',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    -- Create multiple progression entries
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES 
        (prospect_id, test_campaign_id, 1, NOW() - INTERVAL '5 hours', 'active', NOW()),
        (prospect_id, test_campaign_id, 2, NOW() - INTERVAL '2 hours', 'pending', NOW() + INTERVAL '1 minute'),
        (prospect_id, test_campaign_id, 3, NOW() - INTERVAL '1 hour', 'pending', NOW() + INTERVAL '2 minutes');
    
    -- SCENARIO 8: Berlin Future
    -- Expected: SHOULD NOT SEND (7 days in future)
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.berlin.future@example.com', 'Hans', 'Future-Sequence', 'Europe/Berlin',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() + INTERVAL '7 days', 'active', NOW()
    );
    
    -- SCENARIO 9: Dubai Just Due
    -- Expected: SHOULD SEND (just became due 3 minutes ago)
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.dubai.justdue@example.com', 'Ahmed', 'JustDue', 'Asia/Dubai',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '3 minutes', 'active', NOW()
    );
    
    -- SCENARIO 10: Invalid Timezone - Due
    -- Expected: SHOULD USE UTC FALLBACK
    INSERT INTO prospects (
        email_address, first_name, last_name, timezone,
        company, position, source, campaign_id, created_at
    ) VALUES (
        'test.invalid.tz.due@example.com', 'Test', 'InvalidTZ', 'Invalid/Timezone',
        'Test Automation Inc', 'Test Contact', 'test_automation', test_campaign_id, NOW()
    ) RETURNING id INTO prospect_id;
    
    INSERT INTO prospect_progression (
        prospect_id, campaign_id, current_sequence_step,
        sequence_time, status, created_at
    ) VALUES (
        prospect_id, test_campaign_id, 1,
        NOW() - INTERVAL '2 hours', 'active', NOW()
    );
    
    RAISE NOTICE 'Test scenarios created successfully!';
END $$;

-- Verification Query - Check all test scenarios
SELECT 
    p.email_address,
    p.first_name || ' ' || p.last_name AS full_name,
    p.timezone,
    pp.sequence_time,
    pp.current_sequence_step,
    pp.status,
    CASE 
        WHEN pp.sequence_time < NOW() THEN 'DUE ✓'
        ELSE 'NOT DUE ✗'
    END AS timing_status,
    CASE
        WHEN pp.sequence_time < NOW() THEN 
            ROUND(EXTRACT(EPOCH FROM (NOW() - pp.sequence_time))/3600, 1) || ' hours overdue'
        ELSE 
            ROUND(EXTRACT(EPOCH FROM (pp.sequence_time - NOW()))/3600, 1) || ' hours until due'
    END AS timing_detail,
    -- Simple business hours check (9 AM - 5 PM in contact's timezone)
    -- Note: This is simplified - actual implementation may be more complex
    CASE 
        WHEN p.timezone = 'America/New_York' AND 
             EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/New_York') BETWEEN 9 AND 17 THEN 'IN HOURS ✓'
        WHEN p.timezone = 'Europe/London' AND 
             EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Europe/London') BETWEEN 9 AND 17 THEN 'IN HOURS ✓'
        WHEN p.timezone = 'Asia/Tokyo' AND 
             EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Tokyo') BETWEEN 9 AND 17 THEN 'IN HOURS ✓'
        WHEN p.timezone = 'Australia/Sydney' AND 
             EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Australia/Sydney') BETWEEN 9 AND 17 THEN 'IN HOURS ✓'
        ELSE 'OUT OF HOURS ✗'
    END AS business_hours_status
FROM prospects p
LEFT JOIN prospect_progression pp ON p.id = pp.prospect_id
WHERE p.email_address LIKE 'test.%.due@example.com'
   OR p.email_address LIKE 'test.%.notdue@example.com'
   OR p.email_address LIKE 'test.%.future@example.com'
   OR p.email_address LIKE 'test.%.justdue@example.com'
ORDER BY 
    CASE 
        WHEN pp.sequence_time < NOW() THEN 0 
        ELSE 1 
    END,
    pp.sequence_time;

-- Summary Statistics
SELECT 
    COUNT(*) AS total_test_contacts,
    COUNT(CASE WHEN pp.sequence_time < NOW() THEN 1 END) AS due_now,
    COUNT(CASE WHEN pp.sequence_time >= NOW() THEN 1 END) AS not_due_yet,
    COUNT(CASE WHEN pp.status = 'active' THEN 1 END) AS active_status,
    COUNT(CASE WHEN pp.status = 'pending' THEN 1 END) AS pending_status
FROM prospects p
LEFT JOIN prospect_progression pp ON p.id = pp.prospect_id
WHERE p.source = 'test_automation';