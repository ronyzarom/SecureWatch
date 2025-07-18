# Microsoft Teams Integration - Required API Permissions

## Microsoft Graph API Permissions for Teams Access

To enable Microsoft Teams integration in SecureWatch, the following permissions must be configured in your Azure AD App Registration:

### Required Application Permissions (for daemon/service access):

#### 🔐 **Teams Permissions:**
- `Team.ReadBasic.All` - Read the names and descriptions of teams
- `TeamMember.Read.All` - Read the members of teams
- `Channel.ReadBasic.All` - Read the names and descriptions of channels
- `ChannelMessage.Read.All` - Read all channel messages

#### 📧 **User/Directory Permissions (already required for Office 365):**
- `User.Read.All` - Read all users' profiles
- `Directory.Read.All` - Read directory data

### Permission Details:

#### `Team.ReadBasic.All`
- **Purpose**: Allows the app to read basic team information
- **Access**: Team names, descriptions, settings
- **Required for**: Getting list of teams in organization

#### `TeamMember.Read.All`
- **Purpose**: Read team memberships
- **Access**: Team member information
- **Required for**: Understanding team structure

#### `Channel.ReadBasic.All`
- **Purpose**: Read basic channel information
- **Access**: Channel names, descriptions, types
- **Required for**: Getting channels within teams

#### `ChannelMessage.Read.All`
- **Purpose**: Read all messages in channels
- **Access**: All channel messages and their content
- **Required for**: Security monitoring and analysis

### How to Configure:

1. **Azure Portal** → App Registrations → Your App
2. **API Permissions** → Add a permission
3. **Microsoft Graph** → Application permissions
4. Search and add each permission above
5. **Grant admin consent** (required for application permissions)

### Security Notes:

- ✅ All permissions are **read-only** - SecureWatch cannot modify or delete Teams data
- ✅ Uses **application permissions** - no user sign-in required for monitoring
- ✅ **Admin consent required** - ensures proper authorization
- ✅ **Audit logging** - all API calls are logged by Microsoft

### Verification:

After configuring permissions, use the "Test Connection" feature in SecureWatch Teams configuration to verify access.

### Compliance:

These permissions align with security monitoring best practices and provide necessary access for:
- 🔍 **Security threat detection**
- 📊 **Risk analysis of communications**
- 🚨 **Policy violation detection**
- 📈 **Behavioral analytics** 