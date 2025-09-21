# Deployment Guide - Message Cleanup System

## Prerequisites

1. **Firebase CLI**: Make sure you have the Firebase CLI installed and authenticated
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Project Setup**: Ensure you're in the correct Firebase project
   ```bash
   firebase use vibe-35004
   ```

## Deploying Firebase Functions

### 1. Deploy Functions Only
```bash
# Deploy only the functions (recommended for this feature)
firebase deploy --only functions
```

### 2. Deploy Specific Functions (Optional)
```bash
# Deploy only the cleanup functions
firebase deploy --only functions:cleanupOldMessages,functions:manualMessageCleanup,functions:getCleanupStats
```

### 3. Verify Deployment
After deployment, verify the functions are active:

```bash
# Check function logs
firebase functions:log

# List deployed functions
firebase functions:list
```

## Post-Deployment Verification

### 1. Check Cloud Scheduler
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Navigate to Cloud Scheduler
- Verify the `cleanupOldMessages` job is created and scheduled for daily execution at 2:00 AM UTC

### 2. Test Manual Cleanup (Optional)
You can test the manual cleanup function using the Firebase console or by triggering it through the app interface.

### 3. Monitor System Logs
Check the `system_logs` collection in Firestore to see cleanup activity logs.

## Environment Configuration

### Required Permissions
Ensure your Firebase project has these services enabled:
- ✅ Cloud Functions
- ✅ Cloud Scheduler
- ✅ Firestore Database
- ✅ Firebase Authentication

### Security Rules
The existing Firestore security rules should allow the cleanup functions to operate. The functions run with admin privileges and bypass security rules.

## Monitoring and Maintenance

### 1. Function Logs
Monitor function execution:
```bash
# View recent logs
firebase functions:log --limit 50

# Follow logs in real-time
firebase functions:log --follow
```

### 2. Performance Monitoring
- Monitor function execution time in Firebase Console
- Check for timeout errors (functions have a 9-minute timeout by default)
- Monitor memory usage and adjust if needed

### 3. Cost Monitoring
- Track function invocations in Firebase Console
- Monitor Firestore read/write operations
- The scheduled function runs once daily, manual triggers are user-initiated

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Ensure you're authenticated and have the right permissions
   firebase login
   firebase use vibe-35004
   ```

2. **Function Timeout**
   - The cleanup processes messages in batches of 500
   - If timeouts occur, consider reducing batch size in `messageCleanup.js`

3. **Scheduler Not Working**
   - Verify Cloud Scheduler is enabled in Google Cloud Console
   - Check the timezone is set to UTC
   - Ensure the cron expression is correct: `"0 2 * * *"`

4. **Missing Dependencies**
   ```bash
   cd functions
   npm install
   ```

### Debug Commands

```bash
# Test functions locally (optional)
cd functions
npm run serve

# Check function configuration
firebase functions:config:get

# View function details
firebase functions:list --filter="cleanup"
```

## Rollback Plan

If you need to rollback the deployment:

1. **Disable Scheduler**
   - Go to Cloud Scheduler in Google Cloud Console
   - Pause or delete the `cleanupOldMessages` job

2. **Remove Functions** (if needed)
   ```bash
   # Delete specific functions
   firebase functions:delete cleanupOldMessages
   firebase functions:delete manualMessageCleanup
   firebase functions:delete getCleanupStats
   ```

3. **Redeploy Previous Version**
   ```bash
   # If you have a previous version
   git checkout <previous-commit>
   firebase deploy --only functions
   ```

## Success Indicators

After successful deployment, you should see:

1. ✅ Functions deployed successfully in Firebase Console
2. ✅ Cloud Scheduler job created and active
3. ✅ "Auto-cleanup" badge visible in vibe community header
4. ✅ Cleanup tab available in vibe community settings
5. ✅ System logs collection created in Firestore (after first run)

## Next Steps

1. **Monitor First Execution**: Check logs after the first scheduled run (next day at 2:00 AM UTC)
2. **User Communication**: Inform community members about the new cleanup policy
3. **Feedback Collection**: Monitor user feedback and adjust retention period if needed
4. **Performance Optimization**: Monitor and optimize based on actual usage patterns

## Support

If you encounter issues during deployment:

1. Check Firebase Console for error messages
2. Review function logs for detailed error information
3. Verify all prerequisites are met
4. Ensure proper permissions and project configuration

The message cleanup system is now ready for production use!