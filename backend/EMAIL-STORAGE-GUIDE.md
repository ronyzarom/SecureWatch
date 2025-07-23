# 📧 Email Storage Management Guide

## 🗄️ Current Storage Status

Your synced emails are stored in:
- **Database:** PostgreSQL 
- **Table:** `email_communications`
- **Current Size:** 18 MB (1,690 emails)
- **Growth Rate:** ~1,685 emails/day (~25 MB/day)
- **Retention:** No automatic cleanup (all emails kept)

## 📊 Storage Components

### Main Data
```sql
email_communications  -- Active emails (current: 1,690)
├── message_id        -- Unique email identifier
├── subject          -- Email subject line
├── body_text        -- Email content (plain text)
├── body_html        -- Email content (HTML)
├── attachments      -- Attachment metadata (JSONB)
├── risk_score       -- AI-generated risk assessment
├── sender_email     -- Sender address
├── recipients       -- Recipient list (JSONB)
├── sent_at          -- When email was sent
└── created_at       -- When email was synced
```

### Archive Storage (Auto-created)
```sql
email_communications_archive  -- Old emails (created as needed)
└── [Same structure as main table]
```

## 🛠️ Management Tools

### 1. **Storage Manager Script**
```bash
# Run storage management
cd backend
node email-storage-manager.js

# Check what the script would do
node email-storage-manager.js --dry-run
```

### 2. **Manual Storage Analysis**
```sql
-- Check current storage usage
SELECT 
  COUNT(*) as total_emails,
  pg_size_pretty(pg_total_relation_size('email_communications')) as table_size,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM email_communications;

-- Find oldest/newest emails
SELECT 
  MIN(created_at) as oldest_email,
  MAX(created_at) as newest_email
FROM email_communications;
```

## ⚙️ Storage Management Features

### 🧹 **Automatic Cleanup**
- **Stale Pending Emails:** Updates emails stuck in "pending" status >24h
- **Empty Emails:** Removes corrupt/empty email records >7 days old
- **Failed Analysis:** Marks unprocessed emails as failed

### 📅 **Retention Policies**
- **Active Storage:** 90 days (configurable)
- **Archive Storage:** 180 days total (configurable)
- **Automatic Archival:** Moves old emails to archive table
- **Permanent Deletion:** Removes emails >180 days old

### ⚡ **Database Optimization**
- **VACUUM:** Reclaims disk space from deleted records
- **ANALYZE:** Updates query planner statistics
- **REINDEX:** Rebuilds indexes for better performance

## 🔧 Configuration Options

### Modify Retention Periods
```javascript
// In email-storage-manager.js
constructor() {
  this.defaultRetentionDays = 90;    // Change active retention
  this.archiveRetentionDays = 180;   // Change archive retention
  this.batchSize = 1000;             // Change processing batch size
}
```

### Custom Storage Policies
```javascript
// Example: Keep high-risk emails longer
async removeOldEmails() {
  // Keep high-risk emails for 1 year
  const highRiskResult = await query(`
    UPDATE email_communications 
    SET retention_extended = true
    WHERE risk_score >= 80 
      AND created_at >= NOW() - INTERVAL '365 days'
  `);
}
```

## 📈 Monitoring & Alerts

### Storage Growth Tracking
```sql
-- Daily email volume
SELECT 
  DATE(created_at) as date,
  COUNT(*) as emails_per_day,
  pg_size_pretty(SUM(LENGTH(COALESCE(body_text, '')))) as content_size
FROM email_communications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Storage Warnings
- **High Volume:** >1,000 emails/day
- **Large Growth:** >50 MB/day  
- **Large Dataset:** >10,000 total emails

## 🔄 Automated Scheduling

### Option 1: Cron Job (Linux/Mac)
```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/backend && node email-storage-manager.js >> /var/log/email-cleanup.log 2>&1
```

### Option 2: Node.js Scheduler
```bash
# Install node-cron
npm install node-cron

# Add to your main server.js
const cron = require('node-cron');
const EmailStorageManager = require('./email-storage-manager');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const manager = new EmailStorageManager();
  await manager.manageStorage();
});
```

### Option 3: System Service
```bash
# Create systemd service (Linux)
sudo nano /etc/systemd/system/email-cleanup.service

[Unit]
Description=Email Storage Cleanup
After=postgresql.service

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node email-storage-manager.js

# Create timer
sudo nano /etc/systemd/system/email-cleanup.timer

[Unit]
Description=Run email cleanup daily
Requires=email-cleanup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

## 🚨 Emergency Storage Management

### Quick Space Recovery
```sql
-- Emergency: Remove old unanalyzed emails
DELETE FROM email_communications 
WHERE is_analyzed = false 
  AND created_at < NOW() - INTERVAL '30 days';

-- Emergency: Remove emails without content
DELETE FROM email_communications 
WHERE body_text IS NULL 
  AND body_html IS NULL 
  AND subject IS NULL;
```

### Bulk Archive Creation
```sql
-- Manual archive for emails >60 days
CREATE TABLE email_communications_archive_manual AS 
SELECT * FROM email_communications 
WHERE created_at < NOW() - INTERVAL '60 days';

-- Then delete from main table
DELETE FROM email_communications 
WHERE created_at < NOW() - INTERVAL '60 days';
```

## 📋 Best Practices

### 1. **Regular Monitoring**
- Run storage analysis weekly
- Monitor database size growth
- Check for failed sync jobs

### 2. **Backup Strategy**
- Archive important emails before deletion
- Regular database backups
- Test restore procedures

### 3. **Performance Optimization**
- Keep main table under 50,000 records
- Archive old emails regularly
- Monitor query performance

### 4. **Compliance Considerations**
- Check legal retention requirements
- Document data retention policies
- Ensure secure deletion methods

## 🎯 Recommended Settings

### Small Team (<1,000 emails/day)
```javascript
defaultRetentionDays = 90;
archiveRetentionDays = 365;
batchSize = 500;
```

### Medium Team (1,000-5,000 emails/day)
```javascript
defaultRetentionDays = 60;
archiveRetentionDays = 180;
batchSize = 1000;
```

### Large Team (>5,000 emails/day)
```javascript
defaultRetentionDays = 30;
archiveRetentionDays = 90;
batchSize = 2000;
```

## 🔍 Troubleshooting

### Common Issues
1. **"Table doesn't exist" errors:** Run initial storage manager to create tables
2. **Permission errors:** Ensure database user has CREATE/DELETE permissions
3. **Disk space errors:** Implement emergency cleanup procedures
4. **Slow performance:** Reduce batch sizes or increase retention periods

### Performance Tuning
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_email_created_at ON email_communications(created_at);
CREATE INDEX CONCURRENTLY idx_email_sync_status ON email_communications(sync_status);
CREATE INDEX CONCURRENTLY idx_email_risk_score ON email_communications(risk_score);
```

---

**📞 Support:** Run `node email-storage-manager.js` for current status and recommendations. 