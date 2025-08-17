-- Create three test contacts for testing auto-scheduling
-- First, let's check if we have any active campaigns

-- Find an active campaign to use
DO $$
DECLARE
    campaign_record RECORD;
    user_record RECORD;
    contact_id_1 UUID;
    contact_id_2 UUID;
    contact_id_3 UUID;
BEGIN
    -- Get the first user
    SELECT id INTO user_record FROM auth.users LIMIT 1;
    
    IF user_record.id IS NULL THEN
        RAISE NOTICE 'No users found in the system';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using user ID: %', user_record.id;
    
    -- Get the first campaign for this user
    SELECT id, name, status INTO campaign_record 
    FROM campaigns 
    WHERE user_id = user_record.id 
    LIMIT 1;
    
    IF campaign_record.id IS NULL THEN
        RAISE NOTICE 'No campaigns found for user';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using campaign: % (Status: %)', campaign_record.name, campaign_record.status;
    
    -- Create three test contacts
    INSERT INTO contacts (
        id,
        campaign_id,
        user_id,
        email,
        first_name,
        last_name,
        company,
        title,
        status,
        sequence_step,
        timezone,
        created_at,
        updated_at
    ) VALUES 
    (
        gen_random_uuid(),
        campaign_record.id,
        user_record.id,
        'john.doe@testcompany.com',
        'John',
        'Doe',
        'Test Company Inc',
        'Software Engineer',
        'Pending',
        0,
        'UTC',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        campaign_record.id,
        user_record.id,
        'jane.smith@innovatecorp.com',
        'Jane',
        'Smith',
        'Innovate Corp',
        'Marketing Manager',
        'Pending',
        0,
        'America/New_York',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        campaign_record.id,
        user_record.id,
        'mike.wilson@techstartup.io',
        'Mike',
        'Wilson',
        'Tech Startup',
        'CEO',
        'Pending',
        0,
        'America/Los_Angeles',
        NOW(),
        NOW()
    )
    RETURNING id INTO contact_id_1, contact_id_2, contact_id_3;
    
    RAISE NOTICE 'Successfully created 3 test contacts for campaign: %', campaign_record.name;
    RAISE NOTICE 'Contact emails: john.doe@testcompany.com, jane.smith@innovatecorp.com, mike.wilson@techstartup.io';
    
    -- Show campaign sequences if any exist
    DECLARE
        sequence_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO sequence_count 
        FROM campaign_sequences 
        WHERE campaign_id = campaign_record.id;
        
        RAISE NOTICE 'Campaign has % email sequences configured', sequence_count;
        
        IF sequence_count > 0 THEN
            RAISE NOTICE 'Sequence details:';
            FOR campaign_record IN 
                SELECT step_number, subject, timing_days 
                FROM campaign_sequences 
                WHERE campaign_id = campaign_record.id 
                ORDER BY step_number
            LOOP
                RAISE NOTICE '  Step %: "%" (% days)', 
                    campaign_record.step_number, 
                    campaign_record.subject, 
                    campaign_record.timing_days;
            END LOOP;
            
            -- If campaign is active, note that auto-scheduling would trigger
            IF EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_record.id AND status = 'Active') THEN
                RAISE NOTICE 'NOTE: Since campaign is Active, the auto-scheduling feature would have triggered if contacts were added via API';
            ELSE
                RAISE NOTICE 'NOTE: Campaign is not Active, so auto-scheduling would not trigger';
            END IF;
        END IF;
    END;
    
END $$;

-- Show the newly created contacts
SELECT 
    c.email,
    c.first_name,
    c.last_name,
    c.company,
    c.status,
    c.sequence_step,
    camp.name as campaign_name,
    camp.status as campaign_status,
    c.created_at
FROM contacts c
JOIN campaigns camp ON c.campaign_id = camp.id
WHERE c.created_at > NOW() - INTERVAL '1 minute'
ORDER BY c.created_at DESC;