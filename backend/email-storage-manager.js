#!/usr/bin/env node

const { query } = require('./src/utils/database');

class EmailStorageManager {
  constructor() {
    this.defaultRetentionDays = 90;
    this.archiveRetentionDays = 180;
    this.batchSize = 1000;
  }

  async manageStorage() {
    console.log('🗄️ EMAIL STORAGE MANAGEMENT');
    console.log('==========================');
    
    try {
      await this.analyzeCurrentUsage();
      await this.cleanupPendingEmails();
      await this.removeOldEmails();
      await this.optimizeDatabase();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Storage management error:', error.message);
    }
  }

  async analyzeCurrentUsage() {
    console.log('\n📊 STORAGE ANALYSIS:');
    
    const analysis = await query(`
      SELECT 
        COUNT(*) as total_emails,
        pg_size_pretty(pg_total_relation_size('email_communications')) as table_size,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '90 days' THEN 1 END) as last_90_days,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_analysis,
        COUNT(CASE WHEN is_analyzed = false THEN 1 END) as unanalyzed
      FROM email_communications
    `);
    
    const stats = analysis.rows[0];
    console.log(`   Total emails: ${stats.total_emails}`);
    console.log(`   Database size: ${stats.table_size}`);
    console.log(`   Last 7 days: ${stats.last_7_days}`);
    console.log(`   Last 30 days: ${stats.last_30_days}`);
    console.log(`   Last 90 days: ${stats.last_90_days}`);
    console.log(`   Pending analysis: ${stats.pending_analysis}`);
    console.log(`   Unanalyzed: ${stats.unanalyzed}`);
  }

  async cleanupPendingEmails() {
    console.log('\n🧹 CLEANUP PENDING EMAILS:');
    
    // Update old pending emails that failed processing
    const updateResult = await query(`
      UPDATE email_communications 
      SET sync_status = 'failed',
          sync_error = 'Timeout - marked as failed by cleanup process'
      WHERE sync_status = 'pending' 
        AND created_at < NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`   Updated ${updateResult.rowCount} stale pending emails to failed status`);
    
    // Remove completely empty/corrupt emails
    const deleteResult = await query(`
      DELETE FROM email_communications 
      WHERE (subject IS NULL OR subject = '') 
        AND (body_text IS NULL OR body_text = '')
        AND (body_html IS NULL OR body_html = '')
        AND attachments IS NULL
        AND created_at < NOW() - INTERVAL '7 days'
    `);
    
    console.log(`   Removed ${deleteResult.rowCount} empty/corrupt email records`);
  }

  async removeOldEmails() {
    console.log('\n📅 RETENTION POLICY ENFORCEMENT:');
    
    // Archive emails older than retention period
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - this.defaultRetentionDays);
    
    // First, get count of emails to be archived
    const countResult = await query(`
      SELECT COUNT(*) as count 
      FROM email_communications 
      WHERE created_at < $1
    `, [archiveDate]);
    
    const emailsToArchive = parseInt(countResult.rows[0].count);
    
    if (emailsToArchive > 0) {
      console.log(`   Found ${emailsToArchive} emails older than ${this.defaultRetentionDays} days`);
      
      // Create archive table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS email_communications_archive (
          LIKE email_communications INCLUDING ALL
        )
      `);
      
      // Move old emails to archive in batches
      let archivedCount = 0;
      while (archivedCount < emailsToArchive) {
        const batchResult = await query(`
          WITH old_emails AS (
            SELECT * FROM email_communications 
            WHERE created_at < $1 
            ORDER BY created_at 
            LIMIT $2
          )
          INSERT INTO email_communications_archive 
          SELECT * FROM old_emails
          RETURNING id
        `, [archiveDate, this.batchSize]);
        
        if (batchResult.rowCount === 0) break;
        
        // Remove from main table
        const idsToDelete = batchResult.rows.map(row => row.id);
        await query(`
          DELETE FROM email_communications 
          WHERE id = ANY($1)
        `, [idsToDelete]);
        
        archivedCount += batchResult.rowCount;
        console.log(`   Archived ${archivedCount}/${emailsToArchive} emails...`);
      }
      
      console.log(`   ✅ Archived ${archivedCount} old emails`);
    } else {
      console.log(`   ✅ No emails older than ${this.defaultRetentionDays} days found`);
    }
    
    // Remove very old archived emails
    if (await this.tableExists('email_communications_archive')) {
      const purgeDate = new Date();
      purgeDate.setDate(purgeDate.getDate() - this.archiveRetentionDays);
      
      const purgeResult = await query(`
        DELETE FROM email_communications_archive 
        WHERE created_at < $1
      `, [purgeDate]);
      
      if (purgeResult.rowCount > 0) {
        console.log(`   🗑️ Permanently deleted ${purgeResult.rowCount} emails older than ${this.archiveRetentionDays} days`);
      }
    }
  }

  async optimizeDatabase() {
    console.log('\n⚡ DATABASE OPTIMIZATION:');
    
    // Update statistics
    await query(`ANALYZE email_communications`);
    console.log(`   ✅ Updated table statistics`);
    
    // Vacuum to reclaim space
    await query(`VACUUM email_communications`);
    console.log(`   ✅ Vacuumed main table`);
    
    if (await this.tableExists('email_communications_archive')) {
      await query(`VACUUM email_communications_archive`);
      console.log(`   ✅ Vacuumed archive table`);
    }
    
    // Rebuild indexes if needed
    await query(`REINDEX INDEX CONCURRENTLY IF EXISTS idx_email_communications_created_at`);
    await query(`REINDEX INDEX CONCURRENTLY IF EXISTS idx_email_communications_sender_email`);
    console.log(`   ✅ Rebuilt key indexes`);
  }

  async generateReport() {
    console.log('\n📈 STORAGE MANAGEMENT REPORT:');
    
    const report = await query(`
      SELECT 
        COUNT(*) as active_emails,
        pg_size_pretty(pg_total_relation_size('email_communications')) as active_size,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_communications_archive')
             THEN (SELECT COUNT(*) FROM email_communications_archive)
             ELSE 0 END as archived_emails,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_communications_archive')
             THEN pg_size_pretty(pg_total_relation_size('email_communications_archive'))
             ELSE '0 bytes' END as archived_size
      FROM email_communications
    `);
    
    const rep = report.rows[0];
    console.log(`   📊 Active emails: ${rep.active_emails} (${rep.active_size})`);
    console.log(`   📦 Archived emails: ${rep.archived_emails} (${rep.archived_size})`);
    console.log(`   ⏱️ Retention policy: ${this.defaultRetentionDays} days active, ${this.archiveRetentionDays} days total`);
    
    // Calculate projected growth
    const growthAnalysis = await query(`
      SELECT 
        COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400, 1) as emails_per_day,
        AVG(LENGTH(COALESCE(body_text, ''))) as avg_email_size
      FROM email_communications
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    
    const growth = growthAnalysis.rows[0];
    const emailsPerDay = Math.round(growth.emails_per_day);
    const avgSizeKB = Math.round(growth.avg_email_size / 1024);
    const dailyGrowthMB = Math.round(emailsPerDay * avgSizeKB / 1024);
    
    console.log(`   📈 Current growth: ~${emailsPerDay} emails/day (~${dailyGrowthMB} MB/day)`);
    console.log(`   💾 Projected 30-day growth: ~${emailsPerDay * 30} emails (~${dailyGrowthMB * 30} MB)`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (emailsPerDay > 1000) {
      console.log('   ⚠️  High email volume - consider more frequent cleanup');
    }
    if (dailyGrowthMB > 50) {
      console.log('   ⚠️  Large storage growth - monitor disk space');
    }
    if (rep.active_emails > 10000) {
      console.log('   💡 Consider reducing retention period to 60 days');
    }
    
    console.log('\n✅ Storage management completed successfully!');
  }

  async tableExists(tableName) {
    const result = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1
      ) as exists
    `, [tableName]);
    return result.rows[0].exists;
  }

  // Cleanup scheduling method
  static async setupScheduledCleanup() {
    console.log('⏰ Setting up scheduled email storage cleanup...');
    
    // Run daily at 2 AM
    const schedule = '0 2 * * *'; // cron format
    
    const manager = new EmailStorageManager();
    
    // This would integrate with a job scheduler like node-cron
    console.log(`📅 Email storage cleanup scheduled for: ${schedule}`);
    console.log('💡 To enable, integrate with node-cron or system cron');
    
    return {
      schedule,
      task: () => manager.manageStorage()
    };
  }
}

// Command line execution
if (require.main === module) {
  const manager = new EmailStorageManager();
  
  if (process.argv.includes('--setup-schedule')) {
    EmailStorageManager.setupScheduledCleanup();
  } else {
    manager.manageStorage().then(() => {
      console.log('\n🏁 Email storage management completed');
      process.exit(0);
    }).catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = EmailStorageManager; 