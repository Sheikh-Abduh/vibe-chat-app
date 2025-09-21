# Message Cleanup System

## Overview

The Vibe Community implements an automatic message cleanup system that removes messages older than 30 days to maintain optimal performance and manage storage efficiently while keeping conversations fresh and relevant.

## Features

### Automatic Cleanup
- **Schedule**: Daily at 2:00 AM UTC
- **Retention Period**: 30 days
- **Scope**: Vibe community only (`vibe-community-main`)
- **Channels Affected**: All channels within the vibe community

### Manual Cleanup
- **Permissions**: Community owners and users with cleanup permissions
- **Trigger**: On-demand through the community settings
- **Same Logic**: Uses the same 30-day retention period

### Cleanup Manager Interface
- **Location**: Community Settings → Cleanup tab (vibe community only)
- **Features**:
  - View cleanup history
  - Manual cleanup trigger
  - Statistics and channel breakdown
  - Schedule information

## Implementation Details

### Backend (Firebase Functions)

#### Scheduled Function
```javascript
exports.cleanupOldMessages = onSchedule("0 2 * * *", async (event) => {
  // Runs daily at 2 AM UTC
  // Cleans up messages older than 30 days
});
```

#### Manual Trigger
```javascript
exports.manualMessageCleanup = onCall(async (request) => {
  // Callable function for manual cleanup
  // Requires authentication and permissions
});
```

#### Core Cleanup Logic
- Queries messages older than 30 days using Firestore timestamp comparison
- Processes messages in batches of 500 to avoid timeouts
- Deletes messages using Firestore batch operations
- Logs cleanup activity for audit purposes

### Frontend Components

#### MessageCleanupManager
- **File**: `src/components/communities/message-cleanup-manager.tsx`
- **Purpose**: Full-featured cleanup management interface
- **Features**: History view, manual trigger, statistics

#### CleanupStatusIndicator
- **File**: `src/components/communities/cleanup-status-indicator.tsx`
- **Purpose**: Shows cleanup status in community header
- **Display**: Badge indicating auto-cleanup is active

#### Community Settings Integration
- **File**: `src/components/communities/community-settings.tsx`
- **Addition**: New "Cleanup" tab for vibe community
- **Access**: Only visible for vibe community members

### Utility Functions
- **File**: `src/lib/message-cleanup-utils.ts`
- **Functions**:
  - `isMessageOlderThan()`: Check message age
  - `filterRecentMessages()`: Filter out old messages
  - `getOldMessageCount()`: Count messages to be deleted
  - `groupMessagesByAge()`: Separate recent vs old messages

## Configuration

### Channels Included
The cleanup system targets these channels in the vibe community:
- `vibe-general`
- `vibe-announcements`
- `vibe-passion-*` (all passion channels)

### Permissions
- **Automatic Cleanup**: System-level (no user intervention required)
- **Manual Cleanup**: 
  - Vibe community owner (`sheikhabduh6@gmail.com`)
  - Users with `permissions.canCleanupMessages = true`
- **View History**: Same as manual cleanup permissions

## Monitoring and Logging

### System Logs
- **Collection**: `system_logs`
- **Type**: `message_cleanup`
- **Data Stored**:
  - Total messages deleted
  - Per-channel breakdown
  - Timestamp and cutoff date
  - Success/failure status

### Error Handling
- Individual channel failures don't stop overall cleanup
- Errors are logged with specific channel information
- Failed cleanups are recorded in system logs

## User Experience

### Notifications
- **Success**: Toast notification showing total messages deleted
- **Failure**: Error toast with specific error message
- **History**: Visual history in cleanup manager

### Visual Indicators
- **Status Badge**: Shows "Auto-cleanup" in community header
- **Settings Tab**: Dedicated cleanup management interface
- **History Cards**: Detailed cleanup history with statistics

## Storage Benefits

### Estimated Savings
- Average message size: ~200 bytes
- Daily message volume varies by channel activity
- Cleanup prevents unlimited storage growth
- Maintains optimal query performance

### Performance Impact
- Reduced message collection size
- Faster message loading
- Improved search performance
- Better overall app responsiveness

## Security Considerations

### Access Control
- Function-level authentication required
- Permission-based access to manual triggers
- Audit logging for all cleanup activities

### Data Safety
- 30-day retention ensures important messages remain accessible
- Batch processing prevents accidental mass deletion
- Comprehensive error handling and logging

## Future Enhancements

### Potential Features
- Configurable retention periods per channel
- Message archiving before deletion
- User notification before cleanup
- Selective cleanup by message type
- Export functionality for important messages

### Monitoring Improvements
- Real-time cleanup progress tracking
- Storage usage analytics
- Performance impact metrics
- User activity correlation

## Deployment

### Firebase Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### Required Permissions
- Firestore read/write access
- Cloud Scheduler permissions
- Firebase Functions deployment rights

### Environment Setup
- No additional environment variables required
- Uses existing Firebase project configuration
- Leverages existing Firestore security rules

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check user authentication and cleanup permissions
2. **Function Timeout**: Batch size may need adjustment for large message volumes
3. **Schedule Not Running**: Verify Cloud Scheduler is enabled in Firebase project

### Debugging
- Check Firebase Functions logs for detailed error information
- Review system_logs collection for cleanup history
- Monitor Firestore usage metrics for storage impact

## Testing

### Manual Testing
1. Create test messages with backdated timestamps
2. Trigger manual cleanup through settings
3. Verify messages are deleted correctly
4. Check cleanup history is recorded

### Automated Testing
- Unit tests for utility functions
- Integration tests for cleanup logic
- Mock Firebase functions for testing
- Verify error handling scenarios