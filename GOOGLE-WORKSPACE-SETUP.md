# Google Workspace Integration Setup Guide

This guide walks you through setting up Google Workspace integration with SecureWatch for Gmail and Google Drive security monitoring.

## 🏗️ **What You'll Get**

✅ **Gmail Security Monitoring**: AI-powered analysis of all Gmail communications  
✅ **Google Drive File Sharing Analysis**: Monitor file sharing patterns and permissions  
✅ **Real-time Threat Detection**: Automatic flagging of suspicious activities  
✅ **Comprehensive Reporting**: Detailed security insights and violation tracking  

## 📋 **Prerequisites**

- Google Workspace Admin access
- Google Cloud Platform project with admin permissions
- Domain-wide delegation enabled

## 🚀 **Setup Steps**

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID for later use

### Step 2: Enable Required APIs

Enable these APIs in your Google Cloud project:

```bash
# Gmail API
https://console.cloud.google.com/apis/library/gmail.googleapis.com

# Google Drive API  
https://console.cloud.google.com/apis/library/drive.googleapis.com

# Admin SDK Directory API
https://console.cloud.google.com/apis/library/admin.googleapis.com

# Admin SDK Reports API
https://console.cloud.google.com/apis/library/admin.googleapis.com
```

### Step 3: Create Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click **"Create Service Account"**
3. Fill in details:
   - **Name**: `SecureWatch Gmail Monitor`
   - **Description**: `Service account for SecureWatch Gmail and Drive monitoring`
4. Click **"Create and Continue"**
5. Skip role assignment (we'll use domain-wide delegation)
6. Click **"Done"**

### Step 4: Generate Service Account Key

1. Click on your newly created service account
2. Go to **"Keys"** tab
3. Click **"Add Key > Create New Key"**
4. Select **JSON** format
5. Download the JSON file securely
6. **Keep this file safe** - it's your authentication credential

### Step 5: Configure Domain-Wide Delegation

1. In the service account details, note the **"Unique ID"** (numeric client ID)
2. Go to [Google Admin Console](https://admin.google.com)
3. Navigate to **Security > API Controls > Domain-wide Delegation**
4. Click **"Add new"**
5. Enter your service account's **Client ID** (the numeric Unique ID)
6. Add these OAuth Scopes:

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/admin.reports.audit.readonly
```

7. Click **"Authorize"**

### Step 6: Configure SecureWatch

1. Open SecureWatch admin panel
2. Go to **Settings > Integrations**
3. Click **"Configure"** on Google Workspace card
4. Fill in the form:

   **Organization Domain**: `yourcompany.com`  
   **Delegated Admin Email**: `admin@yourcompany.com` (your Google Workspace admin email)  
   **Service Account Key**: Upload the JSON file from Step 4 or paste its contents

5. **Enable Integration**: ✅ Check this box
6. **Enable Gmail Monitoring**: ✅ Check this box  
7. Configure sync settings:
   - **Sync Frequency**: How often to check for new emails (recommend 4-24 hours)
   - **Days Back to Sync**: How far back to initially sync (recommend 7 days)
   - **Max Messages per User**: Limit per user per sync (recommend 100-200)

### Step 7: Test Connection

1. Click **"Test Connection"** button
2. You should see: ✅ **"Successfully connected to Google Workspace. Found X users in domain yourcompany.com"**

If you see an error, check:
- Service account key is valid JSON
- Domain-wide delegation is configured correctly  
- Admin email has proper permissions
- All required APIs are enabled

### Step 8: Start Initial Sync

1. Click **"Start Gmail Sync"** button
2. Monitor progress in the sync status section
3. Initial sync may take 10-30 minutes depending on organization size

## 🔐 **Security & Permissions**

### Required Google API Scopes

| Scope | Purpose | Risk Level |
|-------|---------|------------|
| `gmail.readonly` | Read Gmail messages for security analysis | **High** - Access to all emails |
| `drive.readonly` | Monitor file sharing and permissions | **High** - Access to all files |
| `admin.directory.user.readonly` | Get user list and organization info | **Medium** - User directory access |
| `admin.reports.audit.readonly` | Access audit logs for security events | **Medium** - Audit log access |

### What SecureWatch Will Access

✅ **Gmail Messages**: Subject, body, sender, recipients, timestamps  
✅ **Google Drive Files**: File names, sharing permissions, owner information  
✅ **User Directory**: User emails, names, organizational units  
✅ **Audit Logs**: Login events, file sharing events, admin actions  

❌ **Will NOT Access**: Personal files, private messages outside work domain, modify any data

### Data Protection

- **No Data Modification**: SecureWatch only reads data, never modifies or deletes
- **Encrypted Storage**: All data stored with enterprise-grade encryption
- **Limited Retention**: Configurable data retention policies
- **Access Controls**: Role-based access within SecureWatch
- **Audit Trail**: Complete audit log of all SecureWatch activities

## 🛠️ **Configuration Options**

### Gmail Monitoring Settings

```yaml
Sync Frequency: 1-168 hours (1 hour to 1 week)
Days Back to Sync: 1-30 days
Max Messages per User: 50-500 messages
Auto-analyze Emails: Enable/Disable AI analysis
```

### Drive Monitoring Settings (Coming Soon)

```yaml
Monitor File Sharing: Public links, external sharing
File Type Filtering: Documents, spreadsheets, presentations
Size Thresholds: Large file monitoring
Permission Changes: Track sharing permission changes
```

## 📊 **What You'll Monitor**

### Gmail Security Analysis

🚨 **High-Risk Indicators**:
- Unusual sending patterns
- External forwarding rules
- Suspicious attachments
- Phishing attempts
- Data exfiltration patterns

📈 **Metrics Tracked**:
- Email volume per user
- External contacts ratio
- After-hours activity
- Large attachment transfers
- Suspicious keyword usage

### Google Drive Security Analysis

🚨 **High-Risk Indicators**:
- Files shared publicly
- Excessive external sharing
- Sensitive document exposure
- Unusual download patterns
- Permission escalations

📈 **Metrics Tracked**:
- Files shared externally
- Public link creation
- Large file downloads
- Permission changes
- Access from unusual locations

## 🔧 **Troubleshooting**

### Common Issues

**"Invalid service account key format"**
- Ensure JSON file is valid and contains `client_email` and `private_key`
- Check for extra characters or formatting issues

**"Insufficient permissions"**
- Verify domain-wide delegation is configured
- Check that all required OAuth scopes are added
- Ensure admin email has proper Google Workspace permissions

**"Domain not found"**
- Verify domain name matches your Google Workspace domain exactly
- Check domain format (e.g., `company.com` not `www.company.com`)

**"No users found"**
- Verify delegated admin email is correct
- Check that admin has permission to list users
- Ensure Admin SDK API is enabled

### Testing Commands

```bash
# Test basic connectivity
curl -X POST http://localhost:3001/api/integrations/google-workspace/test

# Check sync status
curl -X GET http://localhost:3001/api/integrations/google-workspace/sync/status

# Start manual sync
curl -X POST http://localhost:3001/api/integrations/google-workspace/sync
```

## 📋 **Support Checklist**

Before contacting support, verify:

- [ ] Google Cloud project has all required APIs enabled
- [ ] Service account is created and has domain-wide delegation
- [ ] JSON key file is downloaded and valid
- [ ] OAuth scopes are correctly configured in Google Admin Console
- [ ] Delegated admin email has proper permissions
- [ ] Organization domain is correctly formatted
- [ ] Test connection passes successfully

## 🎯 **Next Steps**

After successful setup:

1. **Monitor Dashboard**: Check Gmail activity in SecureWatch dashboard
2. **Review Violations**: Investigate any flagged security issues
3. **Configure Alerts**: Set up notifications for high-risk activities
4. **Schedule Reports**: Generate regular security reports
5. **Train Team**: Educate staff on new security monitoring capabilities

## 🔄 **Maintenance**

### Regular Tasks

- **Weekly**: Review flagged violations and false positives
- **Monthly**: Update sync settings based on organizational changes
- **Quarterly**: Review service account permissions and rotate keys
- **Annually**: Audit OAuth scopes and remove unnecessary permissions

### Service Account Key Rotation

1. Generate new service account key in Google Cloud Console
2. Update SecureWatch configuration with new key
3. Test connection to ensure functionality
4. Delete old key from Google Cloud Console

---

## 🆘 **Need Help?**

- **Documentation**: Check this guide and API documentation
- **Test Connection**: Use built-in connection test in SecureWatch
- **Logs**: Check SecureWatch backend logs for detailed error messages
- **Google Admin Console**: Verify all permissions and configurations

**Remember**: This integration provides powerful security monitoring capabilities. Regular review and maintenance ensure optimal protection for your organization's Google Workspace data. 

This guide walks you through setting up Google Workspace integration with SecureWatch for Gmail and Google Drive security monitoring.

## 🏗️ **What You'll Get**

✅ **Gmail Security Monitoring**: AI-powered analysis of all Gmail communications  
✅ **Google Drive File Sharing Analysis**: Monitor file sharing patterns and permissions  
✅ **Real-time Threat Detection**: Automatic flagging of suspicious activities  
✅ **Comprehensive Reporting**: Detailed security insights and violation tracking  

## 📋 **Prerequisites**

- Google Workspace Admin access
- Google Cloud Platform project with admin permissions
- Domain-wide delegation enabled

## 🚀 **Setup Steps**

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID for later use

### Step 2: Enable Required APIs

Enable these APIs in your Google Cloud project:

```bash
# Gmail API
https://console.cloud.google.com/apis/library/gmail.googleapis.com

# Google Drive API  
https://console.cloud.google.com/apis/library/drive.googleapis.com

# Admin SDK Directory API
https://console.cloud.google.com/apis/library/admin.googleapis.com

# Admin SDK Reports API
https://console.cloud.google.com/apis/library/admin.googleapis.com
```

### Step 3: Create Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click **"Create Service Account"**
3. Fill in details:
   - **Name**: `SecureWatch Gmail Monitor`
   - **Description**: `Service account for SecureWatch Gmail and Drive monitoring`
4. Click **"Create and Continue"**
5. Skip role assignment (we'll use domain-wide delegation)
6. Click **"Done"**

### Step 4: Generate Service Account Key

1. Click on your newly created service account
2. Go to **"Keys"** tab
3. Click **"Add Key > Create New Key"**
4. Select **JSON** format
5. Download the JSON file securely
6. **Keep this file safe** - it's your authentication credential

### Step 5: Configure Domain-Wide Delegation

1. In the service account details, note the **"Unique ID"** (numeric client ID)
2. Go to [Google Admin Console](https://admin.google.com)
3. Navigate to **Security > API Controls > Domain-wide Delegation**
4. Click **"Add new"**
5. Enter your service account's **Client ID** (the numeric Unique ID)
6. Add these OAuth Scopes:

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/admin.reports.audit.readonly
```

7. Click **"Authorize"**

### Step 6: Configure SecureWatch

1. Open SecureWatch admin panel
2. Go to **Settings > Integrations**
3. Click **"Configure"** on Google Workspace card
4. Fill in the form:

   **Organization Domain**: `yourcompany.com`  
   **Delegated Admin Email**: `admin@yourcompany.com` (your Google Workspace admin email)  
   **Service Account Key**: Upload the JSON file from Step 4 or paste its contents

5. **Enable Integration**: ✅ Check this box
6. **Enable Gmail Monitoring**: ✅ Check this box  
7. Configure sync settings:
   - **Sync Frequency**: How often to check for new emails (recommend 4-24 hours)
   - **Days Back to Sync**: How far back to initially sync (recommend 7 days)
   - **Max Messages per User**: Limit per user per sync (recommend 100-200)

### Step 7: Test Connection

1. Click **"Test Connection"** button
2. You should see: ✅ **"Successfully connected to Google Workspace. Found X users in domain yourcompany.com"**

If you see an error, check:
- Service account key is valid JSON
- Domain-wide delegation is configured correctly  
- Admin email has proper permissions
- All required APIs are enabled

### Step 8: Start Initial Sync

1. Click **"Start Gmail Sync"** button
2. Monitor progress in the sync status section
3. Initial sync may take 10-30 minutes depending on organization size

## 🔐 **Security & Permissions**

### Required Google API Scopes

| Scope | Purpose | Risk Level |
|-------|---------|------------|
| `gmail.readonly` | Read Gmail messages for security analysis | **High** - Access to all emails |
| `drive.readonly` | Monitor file sharing and permissions | **High** - Access to all files |
| `admin.directory.user.readonly` | Get user list and organization info | **Medium** - User directory access |
| `admin.reports.audit.readonly` | Access audit logs for security events | **Medium** - Audit log access |

### What SecureWatch Will Access

✅ **Gmail Messages**: Subject, body, sender, recipients, timestamps  
✅ **Google Drive Files**: File names, sharing permissions, owner information  
✅ **User Directory**: User emails, names, organizational units  
✅ **Audit Logs**: Login events, file sharing events, admin actions  

❌ **Will NOT Access**: Personal files, private messages outside work domain, modify any data

### Data Protection

- **No Data Modification**: SecureWatch only reads data, never modifies or deletes
- **Encrypted Storage**: All data stored with enterprise-grade encryption
- **Limited Retention**: Configurable data retention policies
- **Access Controls**: Role-based access within SecureWatch
- **Audit Trail**: Complete audit log of all SecureWatch activities

## 🛠️ **Configuration Options**

### Gmail Monitoring Settings

```yaml
Sync Frequency: 1-168 hours (1 hour to 1 week)
Days Back to Sync: 1-30 days
Max Messages per User: 50-500 messages
Auto-analyze Emails: Enable/Disable AI analysis
```

### Drive Monitoring Settings (Coming Soon)

```yaml
Monitor File Sharing: Public links, external sharing
File Type Filtering: Documents, spreadsheets, presentations
Size Thresholds: Large file monitoring
Permission Changes: Track sharing permission changes
```

## 📊 **What You'll Monitor**

### Gmail Security Analysis

🚨 **High-Risk Indicators**:
- Unusual sending patterns
- External forwarding rules
- Suspicious attachments
- Phishing attempts
- Data exfiltration patterns

📈 **Metrics Tracked**:
- Email volume per user
- External contacts ratio
- After-hours activity
- Large attachment transfers
- Suspicious keyword usage

### Google Drive Security Analysis

🚨 **High-Risk Indicators**:
- Files shared publicly
- Excessive external sharing
- Sensitive document exposure
- Unusual download patterns
- Permission escalations

📈 **Metrics Tracked**:
- Files shared externally
- Public link creation
- Large file downloads
- Permission changes
- Access from unusual locations

## 🔧 **Troubleshooting**

### Common Issues

**"Invalid service account key format"**
- Ensure JSON file is valid and contains `client_email` and `private_key`
- Check for extra characters or formatting issues

**"Insufficient permissions"**
- Verify domain-wide delegation is configured
- Check that all required OAuth scopes are added
- Ensure admin email has proper Google Workspace permissions

**"Domain not found"**
- Verify domain name matches your Google Workspace domain exactly
- Check domain format (e.g., `company.com` not `www.company.com`)

**"No users found"**
- Verify delegated admin email is correct
- Check that admin has permission to list users
- Ensure Admin SDK API is enabled

### Testing Commands

```bash
# Test basic connectivity
curl -X POST http://localhost:3001/api/integrations/google-workspace/test

# Check sync status
curl -X GET http://localhost:3001/api/integrations/google-workspace/sync/status

# Start manual sync
curl -X POST http://localhost:3001/api/integrations/google-workspace/sync
```

## 📋 **Support Checklist**

Before contacting support, verify:

- [ ] Google Cloud project has all required APIs enabled
- [ ] Service account is created and has domain-wide delegation
- [ ] JSON key file is downloaded and valid
- [ ] OAuth scopes are correctly configured in Google Admin Console
- [ ] Delegated admin email has proper permissions
- [ ] Organization domain is correctly formatted
- [ ] Test connection passes successfully

## 🎯 **Next Steps**

After successful setup:

1. **Monitor Dashboard**: Check Gmail activity in SecureWatch dashboard
2. **Review Violations**: Investigate any flagged security issues
3. **Configure Alerts**: Set up notifications for high-risk activities
4. **Schedule Reports**: Generate regular security reports
5. **Train Team**: Educate staff on new security monitoring capabilities

## 🔄 **Maintenance**

### Regular Tasks

- **Weekly**: Review flagged violations and false positives
- **Monthly**: Update sync settings based on organizational changes
- **Quarterly**: Review service account permissions and rotate keys
- **Annually**: Audit OAuth scopes and remove unnecessary permissions

### Service Account Key Rotation

1. Generate new service account key in Google Cloud Console
2. Update SecureWatch configuration with new key
3. Test connection to ensure functionality
4. Delete old key from Google Cloud Console

---

## 🆘 **Need Help?**

- **Documentation**: Check this guide and API documentation
- **Test Connection**: Use built-in connection test in SecureWatch
- **Logs**: Check SecureWatch backend logs for detailed error messages
- **Google Admin Console**: Verify all permissions and configurations

**Remember**: This integration provides powerful security monitoring capabilities. Regular review and maintenance ensure optimal protection for your organization's Google Workspace data. 