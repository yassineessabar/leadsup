-- Add timezone column to contacts table if it doesn't exist
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add timezone column to prospects table if it doesn't exist  
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Update John Doe's timezone based on location
UPDATE contacts 
SET timezone = 'Australia/Sydney'
WHERE id = 268 AND location = 'Sydney';

-- Update other Sydney contacts
UPDATE contacts 
SET timezone = 'Australia/Sydney'
WHERE location LIKE '%Sydney%' AND timezone IS NULL;

-- Update other common locations
UPDATE contacts SET timezone = 'America/New_York' WHERE location LIKE '%New York%' AND timezone IS NULL;
UPDATE contacts SET timezone = 'America/Los_Angeles' WHERE location LIKE '%Los Angeles%' AND timezone IS NULL;
UPDATE contacts SET timezone = 'America/Chicago' WHERE location LIKE '%Chicago%' AND timezone IS NULL;
UPDATE contacts SET timezone = 'Europe/London' WHERE location LIKE '%London%' AND timezone IS NULL;
UPDATE contacts SET timezone = 'Asia/Tokyo' WHERE location LIKE '%Tokyo%' AND timezone IS NULL;

-- Do the same for prospects table
UPDATE prospects SET timezone = 'Australia/Sydney' WHERE location LIKE '%Sydney%' AND timezone IS NULL;
UPDATE prospects SET timezone = 'America/New_York' WHERE location LIKE '%New York%' AND timezone IS NULL;
UPDATE prospects SET timezone = 'America/Los_Angeles' WHERE location LIKE '%Los Angeles%' AND timezone IS NULL;
UPDATE prospects SET timezone = 'America/Chicago' WHERE location LIKE '%Chicago%' AND timezone IS NULL;
UPDATE prospects SET timezone = 'Europe/London' WHERE location LIKE '%London%' AND timezone IS NULL;
UPDATE prospects SET timezone = 'Asia/Tokyo' WHERE location LIKE '%Tokyo%' AND timezone IS NULL;