/**
 * Fix Prospect Column Names Issue
 * The API is looking for wrong column names
 */

console.log('🔧 Fix Prospect Column Names');
console.log('=' .repeat(50));
console.log('');

console.log('🚨 PROBLEM IDENTIFIED:');
console.log('The API code is looking for:');
console.log('- prospects.email_address (but your table has "email")');
console.log('- prospects.opted_out (which might not exist)');
console.log('- prospects.company_name (might be "company")');
console.log('- prospects.job_title (might be "title")');
console.log('');

console.log('📊 SOLUTION 1: Check Your Column Names');
console.log('```sql');
console.log('-- See what columns actually exist');
console.log('SELECT column_name FROM information_schema.columns');
console.log('WHERE table_name = \'prospects\';');
console.log('```');
console.log('');

console.log('📊 SOLUTION 2: Add Missing Columns (Quick Fix)');
console.log('```sql');
console.log('-- Add email_address as alias for email');
console.log('ALTER TABLE prospects ADD COLUMN IF NOT EXISTS email_address VARCHAR(255);');
console.log('UPDATE prospects SET email_address = email WHERE email_address IS NULL;');
console.log('');
console.log('-- Add opted_out column');
console.log('ALTER TABLE prospects ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;');
console.log('');
console.log('-- Add company_name and job_title if missing');
console.log('ALTER TABLE prospects ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);');
console.log('ALTER TABLE prospects ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);');
console.log('UPDATE prospects SET company_name = company WHERE company_name IS NULL;');
console.log('UPDATE prospects SET job_title = title WHERE job_title IS NULL;');
console.log('```');
console.log('');

console.log('📊 SOLUTION 3: Quick Data Check');
console.log('```sql');
console.log('-- Check if you have prospects assigned');
console.log('SELECT * FROM prospects');
console.log('WHERE campaign_id = \'6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4\'');
console.log('LIMIT 3;');
console.log('```');
console.log('');

console.log('📊 SOLUTION 4: Insert Test Data with Correct Columns');
console.log('```sql');
console.log('-- Insert test prospects with all required columns');
console.log('INSERT INTO prospects (');
console.log('  id, ');
console.log('  email_address, ');
console.log('  first_name, ');
console.log('  last_name, ');
console.log('  campaign_id,');
console.log('  opted_out,');
console.log('  created_at,');
console.log('  updated_at');
console.log(') VALUES ');
console.log('  (gen_random_uuid(), \'test1@example.com\', \'Test\', \'User1\', \'6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4\', false, NOW(), NOW()),');
console.log('  (gen_random_uuid(), \'test2@example.com\', \'Test\', \'User2\', \'6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4\', false, NOW(), NOW()),');
console.log('  (gen_random_uuid(), \'test3@example.com\', \'Test\', \'User3\', \'6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4\', false, NOW(), NOW());');
console.log('```');
console.log('');

console.log('🛠️ BETTER SOLUTION: Fix the API Code');
console.log('In app/api/campaigns/automation/process-pending/route.ts');
console.log('Change line ~186-194:');
console.log('');
console.log('FROM:');
console.log('```javascript');
console.log('.select(`');
console.log('  id,');
console.log('  email_address,  // WRONG');
console.log('  first_name,');
console.log('  last_name,');
console.log('  time_zone,');
console.log('  company_name,   // WRONG');
console.log('  job_title       // WRONG');
console.log('`)');
console.log('```');
console.log('');
console.log('TO:');
console.log('```javascript');
console.log('.select(`');
console.log('  id,');
console.log('  email,          // CORRECT');
console.log('  first_name,');
console.log('  last_name,');
console.log('  time_zone,');
console.log('  company,        // CORRECT');
console.log('  title           // CORRECT');
console.log('`)');
console.log('```');
console.log('');

console.log('🧪 After fixing, test:');
console.log('```bash');
console.log('curl -X GET "https://app.leadsup.io/api/campaigns/automation/process-pending" \\');
console.log('  -u "admin:Integral23.." | jq \'.\'');
console.log('```');
console.log('');
console.log('Should finally see your 3 prospects ready for processing!');