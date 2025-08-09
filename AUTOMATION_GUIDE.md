# Campaign Automation System Guide

## Overview

The Campaign Automation System automatically sends emails and SMS messages to customers based on your campaign configuration. It triggers when new clients are added and follows your sequence and schedule settings.

## How Campaign Automation Works

### 1. Campaign Creation
- Create a campaign with "New Client" trigger
- Set up sequences (email/SMS content with timing)
- Configure schedule (days and time windows)
- Activate the campaign

### 2. Automatic Triggering
- When new customers are added to your system, they're automatically enrolled in active campaigns
- The system creates automation jobs based on your sequence configuration
- Jobs are scheduled according to your timing and schedule settings

### 3. Automated Processing
- A background cron job processes pending automation jobs
- Emails and SMS are sent automatically at scheduled times
- Job status is tracked (pending → processing → completed/failed)

## Key Components

### API Endpoints

#### Campaign-Specific Automation
- **POST** `/api/campaigns/[id]/automation`
  - `action: "trigger_new_client"` - Manually trigger enrollment for new clients
  - `action: "process_sequence"` - Process pending sequence jobs
  - `action: "send_immediate"` - Send immediate messages to specific contacts
  - `testMode: boolean` - Test without actually sending

- **GET** `/api/campaigns/[id]/automation`
  - `action: "status"` - Get automation status and job counts
  - `action: "jobs"` - Get recent automation jobs

#### Global Automation Processing
- **GET** `/api/campaigns/automation/trigger-new-clients` - Process all active campaigns
- **GET** `/api/campaigns/automation/process-pending` - Process all pending jobs
- **GET** `/api/campaigns/automation/summary` - Get system-wide automation stats

### Cron Jobs

#### Campaign Automation Processor
```bash
# Run every 15 minutes
*/15 * * * * /usr/bin/node /path/to/scripts/process-campaign-automation.js

# For testing
node scripts/process-campaign-automation.js --test
```

The cron job:
1. Finds active campaigns with "New Client" triggers
2. Enrolls new contacts from the last 7 days
3. Processes pending sequence jobs
4. Generates automation summary

## Campaign Configuration

### 1. Sequences
Create multiple steps with timing:
```
Step 1: Immediate welcome message
Step 2: Follow-up after 3 days  
Step 3: Final reminder after 7 days
```

### 2. Schedule
Configure when messages are sent:
- **Days**: Monday-Friday, weekends, specific days
- **Time Window**: 9:00 AM - 6:00 PM
- **Timezone**: User's timezone

### 3. Trigger
Currently supports:
- **New Client**: Automatically triggered when customers are added

## Automation UI

### Automation Tab
Available in each campaign dashboard:

#### Automation Controls
- **Test Trigger**: Preview what would happen without sending
- **Trigger Now**: Manually trigger automation for new clients
- **Test Process**: Test processing pending jobs
- **Process Now**: Manually process pending jobs

#### Status Dashboard
Monitor automation performance:
- Total jobs created
- Pending, processing, completed, failed counts
- Recent job history
- Success/failure rates

#### Job Management
View and manage automation jobs:
- Contact information
- Sequence step
- Message type (email/SMS)
- Scheduling status
- Completion status

## Database Schema

### Core Tables

#### `campaigns`
- Campaign configuration and status
- Trigger type and schedule settings

#### `campaign_sequences`
- Multi-step message content
- Timing between steps
- Subject and content templates

#### `campaign_schedules`
- Day and time restrictions
- Timezone configuration

#### `automation_jobs`
- Individual message jobs
- Scheduling and status tracking
- Error logging

#### `review_requests`
- Customer contact information
- Campaign enrollment tracking via `campaign_id`

## Best Practices

### 1. Campaign Setup
- Write clear, personalized message content
- Test sequences before activating campaigns
- Set appropriate timing between steps
- Configure realistic time windows

### 2. Monitoring
- Check automation status regularly
- Monitor success/failure rates
- Review error messages for failed jobs
- Use test mode for development

### 3. Content Personalization
Use template variables:
- `{{customerName}}` - Customer's full name
- `{{firstName}}` - Customer's first name  
- `{{companyName}}` - Your company name

### 4. Scheduling
- Respect customer time zones
- Avoid sending outside business hours
- Consider frequency to avoid spam
- Test timing with small groups first

## Testing

### Test Mode
All automation endpoints support `testMode=true`:
- No actual emails or SMS sent
- Jobs are processed but marked as test
- Full simulation of automation flow
- Safe for development and testing

### Manual Testing
1. Create test campaign with short sequences
2. Add test contact data
3. Use "Test Trigger" in automation tab
4. Monitor job creation and processing
5. Verify content and timing

## Troubleshooting

### Common Issues

#### No Jobs Created
- Check if campaign is Active
- Verify trigger type is "New Client"
- Ensure recent contacts exist (last 7 days)
- Check contacts aren't already enrolled

#### Jobs Not Processing
- Verify cron job is running
- Check SMTP/Twilio credentials
- Review error messages in automation jobs
- Test with small batches first

#### Failed Deliveries
- Validate email addresses and phone numbers
- Check spam folder for emails
- Verify Twilio phone number setup
- Monitor rate limits

### Error Monitoring
- Check automation job error messages
- Review server logs for processing issues
- Monitor email bounce rates
- Track SMS delivery failures

## Performance Optimization

### Batch Processing
- Jobs are processed in batches of 50-100
- Prevents overwhelming email/SMS services
- Allows for error recovery and retry

### Rate Limiting
- Automatic delays between messages
- Respects service provider limits
- Prevents spam detection

### Cleanup
- Old completed jobs are automatically cleaned up
- Failed jobs are retained for analysis
- System maintains performance over time

## Security

### Authentication
- All automation endpoints require user authentication
- Campaign ownership is verified before processing
- Service role keys used for cron jobs

### Data Protection
- Customer data is handled securely
- Error messages don't expose sensitive information
- Proper database constraints prevent data corruption

## Future Enhancements

### Planned Features
- Advanced trigger types (time-based, behavior-based)
- A/B testing for message variants
- Advanced analytics and reporting
- Integration with external services
- Custom template variables
- Conditional sequences based on responses

### API Extensions
- Webhook support for external triggers
- Bulk operations for enterprise users
- Advanced filtering and segmentation
- Real-time status updates via WebSockets