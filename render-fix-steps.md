# 🚨 URGENT: FIX RENDER PRODUCTION DEPLOYMENT

## STEP 1: ACCESS RENDER DASHBOARD
1. Go to: https://dashboard.render.com
2. Log in to your account
3. Find your backend service (usually named "securewatch" or similar)

## STEP 2: SET DATABASE ENVIRONMENT VARIABLE
1. Click on your backend service
2. Click the "Environment" tab on the left sidebar
3. Click "Add Environment Variable" button
4. Enter the following EXACTLY:

   **Name:** DATABASE_URL
   **Value:** postgresql://securewatch_user:xal1E0T4RYToxkRwtRHMNXH33cW4zW1z@dpg-d1tcmkruibrs73fc3tu0-a.oregon-postgres.render.com/securewatch

5. Click "Save Changes"

## STEP 3: RESTART THE SERVICE
1. Click the "Manual Deploy" button (top right)
2. Wait for deployment to complete (2-3 minutes)
3. Service will automatically restart with database connection

## STEP 4: VERIFY FIX
1. Refresh your application: https://securewatch.onrender.com
2. All API endpoints should return 200 (not 500)
3. Dashboard should load with data
4. Training Management should be fully functional

## CURRENT STATUS
- ✅ Database configured and ready
- ✅ All tables created
- ❌ Environment variable not set in Render
- ❌ Service not connected to database

## EXPECTED RESULT
Once completed:
- All 500 errors will be resolved
- Full application functionality will be restored
- Training Management system will be live
