# Email Automation End-to-End Testing Guide

## Overview

This document provides a comprehensive testing plan for the email automation system, including API endpoints, UI components, and business logic validation.

## System Architecture

### Core Components

1. **Automation Engine** (`/api/automation/run`)
   - Processes active campaigns
   - Enforces daily sending limits
   - Respects contact timezones
   - Implements sender rotation
   - Generates comprehensive logs

2. **Logging System** (`/api/automation/logs`)
   - Records all automation events
   - Provides filtering and search
   - Generates performance metrics
   - Supports real-time monitoring

3. **UI Components**
   - **Automation Logs Tab** in Account section
   - Real-time log viewer with filtering
   - Performance statistics dashboard
   - Test mode execution

## Database Schema

### automation_logs Table
```sql
CREATE TABLE automation_logs (
  id SERIAL PRIMARY KEY,
  run_id UUID NOT NULL,
  campaign_id INTEGER REFERENCES campaigns(id),
  contact_id INTEGER REFERENCES contacts(id),
  sender_id INTEGER REFERENCES sender_accounts(id),
  log_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  message TEXT,
  details JSONB,
  sequence_step INTEGER,
  email_subject VARCHAR(255),
  skip_reason VARCHAR(100),
  execution_time_ms INTEGER,
  timezone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing Scenarios

### 1. Active Campaign Check
**Purpose**: Verify system correctly identifies and processes only active campaigns

**Test Steps**:
1. Create campaigns with different statuses (Active, Draft, Paused)
2. Run automation
3. Verify only Active campaigns are processed
4. Check logs for "No active campaigns" when none exist

**Expected Results**:
- ✅ Only Active campaigns processed
- ✅ Appropriate log entries created
- ✅ System exits gracefully when no active campaigns

### 2. Daily Cap Enforcement
**Purpose**: Ensure daily sending limits are respected

**Test Steps**:
1. Set campaign daily limit to 10 emails
2. Create 20 eligible contacts
3. Run automation
4. Verify exactly 10 emails sent
5. Run automation again same day
6. Verify no additional emails sent

**Expected Results**:
- ✅ Exactly 10 emails sent on first run
- ✅ 0 emails sent on subsequent runs same day
- ✅ "cap_reached" skip reason in logs
- ✅ Counter resets next day

### 3. Timezone-Aware Sending
**Purpose**: Validate emails are sent only during business hours in contact's timezone

**Test Cases**:
```javascript
// Test different timezones
contacts = [
  { email: "ny@test.com", timezone: "America/New_York" },     // EST/EDT
  { email: "london@test.com", timezone: "Europe/London" },    // GMT/BST
  { email: "tokyo@test.com", timezone: "Asia/Tokyo" },        // JST
  { email: "sydney@test.com", timezone: "Australia/Sydney" }  // AEST/AEDT
]
```

**Expected Results**:
- ✅ Emails sent only between 8 AM - 5 PM contact's local time
- ✅ "outside_hours" skip reason for contacts outside business hours
- ✅ Correct timezone displayed in logs

### 4. Email Sequence Timing
**Purpose**: Verify multi-step sequences follow correct timing

**Test Steps**:
1. Create 3-step sequence (Day 0, Day 3, Day 7)
2. Add new contact
3. Run automation Day 0 - Step 1 sent
4. Run automation Day 1-2 - No email sent
5. Run automation Day 3 - Step 2 sent
6. Run automation Day 7 - Step 3 sent

**Expected Results**:
- ✅ Correct sequence steps sent
- ✅ Timing delays respected
- ✅ next_sequence_at updated correctly
- ✅ current_sequence_step incremented

### 5. Sender Rotation
**Purpose**: Validate round-robin sender distribution

**Test Steps**:
1. Configure campaign with 3 sender accounts
2. Send 9 emails
3. Verify each sender used exactly 3 times
4. Check sender_id in logs

**Expected Results**:
- ✅ Equal distribution across senders
- ✅ Round-robin pattern maintained
- ✅ Unhealthy senders (score < 70) excluded

### 6. Error Handling
**Purpose**: Ensure graceful error handling

**Test Scenarios**:
- No healthy senders available
- Missing email templates
- Invalid contact data
- API failures
- Database connection issues

**Expected Results**:
- ✅ Appropriate error logs created
- ✅ Automation continues for other contacts
- ✅ Failed sends don't count toward daily cap
- ✅ Detailed error messages in logs

### 7. Log Generation & UI
**Purpose**: Verify comprehensive logging and UI functionality

**Test Steps**:
1. Run automation in test mode
2. Navigate to Account > Logs tab
3. Test filtering by type, status, campaign
4. Test search functionality
5. Verify real-time updates
6. Check pagination

**Expected Results**:
- ✅ All events logged with appropriate detail
- ✅ Filters work correctly
- ✅ Search returns relevant results
- ✅ Stats update in real-time
- ✅ Pagination handles large datasets

### 8. Performance Benchmarks
**Purpose**: Ensure system performs efficiently at scale

**Metrics**:
- Process 100 contacts in < 5 seconds
- Log query response < 200ms
- UI render < 100ms
- Memory usage < 100MB for 1000 contacts

**Load Test**:
```bash
# Run performance test
node scripts/test-automation.js
```

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Create test campaign with status "Active"
- [ ] Add test contacts with various timezones
- [ ] Configure sender accounts
- [ ] Set up email templates for each sequence step
- [ ] Clear previous test logs

### Test Execution
- [ ] Run automation in test mode
- [ ] Verify test mode doesn't send actual emails
- [ ] Check log generation
- [ ] Validate skip reasons
- [ ] Test UI filtering and search
- [ ] Verify statistics accuracy

### Post-Test Validation
- [ ] All expected logs created
- [ ] Contact statuses updated correctly
- [ ] No duplicate sends
- [ ] Performance within limits
- [ ] Error handling working

## API Testing with cURL

### Run Automation (Test Mode)
```bash
curl -X POST http://localhost:3000/api/automation/run \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-token" \
  -d '{"testMode": true}'
```

### Fetch Logs
```bash
curl http://localhost:3000/api/automation/logs \
  -H "Cookie: session=your-session-token"
```

### Filter Logs
```bash
curl "http://localhost:3000/api/automation/logs?type=email_sent&status=success" \
  -H "Cookie: session=your-session-token"
```

### Get Statistics
```bash
curl -X POST http://localhost:3000/api/automation/logs \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-token" \
  -d '{"period": "24h"}'
```

## Automated Test Script

Run the comprehensive test suite:

```bash
# Set authentication token
export TEST_SESSION_COOKIE="session=your-token"

# Run tests
npm run test:automation
# or
node scripts/test-automation.js
```

## Test Results Interpretation

### Success Criteria
- ✅ All 8 test categories pass
- ✅ Success rate > 95%
- ✅ No critical errors in logs
- ✅ Performance within benchmarks

### Common Issues & Solutions

1. **Timezone Issues**
   - Verify server timezone configuration
   - Check contact timezone data format
   - Validate business hours calculation

2. **Cap Not Enforced**
   - Check daily_contacts_limit in campaign_settings
   - Verify date comparison logic
   - Clear test data between runs

3. **Sequences Out of Order**
   - Verify sequence_step incrementing
   - Check next_sequence_at calculation
   - Validate timing_days configuration

4. **Logs Not Appearing**
   - Check database connection
   - Verify log insert permissions
   - Check for transaction rollbacks

## Monitoring in Production

### Key Metrics to Track
- Daily send volume
- Success/failure rates
- Average processing time
- Skip reasons distribution
- Sender health scores

### Alerts to Configure
- Failed automation runs
- Low sender health scores
- High error rates (> 5%)
- Performance degradation
- Daily cap exceeded

## Troubleshooting Guide

### Debug Mode
Enable detailed logging:
```javascript
// In /api/automation/run/route.ts
const DEBUG = true
```

### Common Log Queries
```sql
-- Failed sends today
SELECT * FROM automation_logs 
WHERE log_type = 'email_failed' 
AND created_at > CURRENT_DATE;

-- Skip reason breakdown
SELECT skip_reason, COUNT(*) 
FROM automation_logs 
WHERE log_type = 'email_skipped'
GROUP BY skip_reason;

-- Campaign performance
SELECT 
  campaign_id,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM automation_logs
GROUP BY campaign_id;
```

## Security Considerations

1. **Authentication**: All API endpoints require valid session
2. **Authorization**: Users can only view their own campaign logs
3. **Rate Limiting**: Implement to prevent abuse
4. **Data Privacy**: PII in logs should be minimal
5. **Audit Trail**: All actions logged with user context

## Future Enhancements

1. **A/B Testing**: Test different email variants
2. **Smart Timing**: ML-based optimal send time
3. **Bounce Handling**: Automatic sender health updates
4. **Webhook Integration**: Real-time email events
5. **Advanced Analytics**: Engagement tracking
6. **Bulk Operations**: Process multiple campaigns
7. **Template Preview**: Test email rendering
8. **Sandbox Mode**: Full isolation for testing

## Conclusion

This comprehensive testing plan ensures the email automation system works reliably at scale while respecting all business rules and constraints. Regular testing using both automated scripts and manual verification ensures continued system health and performance.