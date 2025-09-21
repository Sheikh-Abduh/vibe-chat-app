# Community Management Test Scenarios

This document outlines comprehensive test scenarios to verify that community join, leave, kick, and ban functionality works as expected.

## Test Setup Requirements

1. **Test Users**: Create at least 4 test user accounts:
   - `test_owner`: Community owner
   - `test_admin`: Community admin
   - `test_moderator`: Community moderator
   - `test_member`: Regular member
   - `test_visitor`: Non-member visitor

2. **Test Community**: Create a test community with the following setup:
   - Owner: `test_owner`
   - Admin: `test_admin`
   - Moderator: `test_moderator`
   - Member: `test_member`

## Test Scenarios

### 1. Community Join Functionality

#### 1.1 Public Community Join
- **Setup**: Create a public community
- **Test**: Visitor tries to join via community URL
- **Expected**: 
  - Join dialog appears
  - User can successfully join
  - Member count increments
  - User appears in members list
  - User can access community channels

#### 1.2 Private Community Access Attempt
- **Setup**: Create a private community
- **Test**: Visitor tries to access via community URL
- **Expected**: 
  - Error message about private community
  - No join dialog
  - User remains on default community

#### 1.3 Already Member Join Attempt
- **Setup**: User is already a member
- **Test**: Member tries to join again via URL
- **Expected**: 
  - "Already a Member" message
  - No duplicate entry in members list

#### 1.4 Banned User Join Attempt
- **Setup**: User is in banned users list
- **Test**: Banned user tries to join
- **Expected**: 
  - "Access Denied" message about being banned
  - User cannot join
  - No entry added to members list

### 2. Community Leave Functionality

#### 2.1 Regular Member Leave
- **Setup**: Regular member in community
- **Test**: Member leaves community
- **Expected**: 
  - Confirmation dialog appears
  - User removed from members array
  - Member count decrements
  - User redirected to default community
  - URL parameter cleared

#### 2.2 Admin/Moderator Leave
- **Setup**: Admin or moderator in community
- **Test**: Admin/moderator leaves community
- **Expected**: 
  - User removed from respective role array
  - Member count decrements correctly
  - User can leave successfully

#### 2.3 Owner Leave Attempt
- **Setup**: Community owner tries to leave
- **Test**: Owner attempts to leave their community
- **Expected**: 
  - Error message preventing leave
  - Owner remains in community
  - Suggestion to delete or transfer ownership

#### 2.4 Vibe Community Leave Attempt
- **Setup**: User tries to leave main vibe community
- **Test**: User attempts to leave vibe-community-main
- **Expected**: 
  - Error message preventing leave
  - User remains in vibe community

#### 2.5 Non-member Leave Attempt
- **Setup**: User not in community tries to leave
- **Test**: Non-member attempts to leave
- **Expected**: 
  - "Not a Member" error message
  - No changes to community data

### 3. Community Kick Functionality

#### 3.1 Admin Kicks Member
- **Setup**: Admin kicks a regular member
- **Test**: Admin selects member and clicks kick
- **Expected**: 
  - Member removed from all role arrays
  - Member count decrements
  - Success message displayed
  - Kicked user no longer appears in members list

#### 3.2 Moderator Kicks Member
- **Setup**: Moderator kicks a regular member
- **Test**: Moderator selects member and clicks kick
- **Expected**: 
  - Member removed successfully (if permissions allow)
  - Member count decrements
  - Success message displayed

#### 3.3 Owner Kick Attempt
- **Setup**: Try to kick the community owner
- **Test**: Select owner and attempt kick
- **Expected**: 
  - Owner cannot be selected for kick OR
  - Error message preventing kick of owner
  - Owner remains in community

#### 3.4 Kick Non-member
- **Setup**: Try to kick someone not in community
- **Test**: Attempt kick on non-member
- **Expected**: 
  - No change to member count
  - Appropriate handling (no error or graceful message)

#### 3.5 Multiple Member Kick
- **Setup**: Select multiple members for kick
- **Test**: Kick 2-3 members simultaneously
- **Expected**: 
  - All selected members removed
  - Member count decrements by correct amount
  - Success message shows correct count

### 4. Community Ban Functionality

#### 4.1 Admin Bans Member
- **Setup**: Admin bans a regular member
- **Test**: Admin selects member and clicks ban
- **Expected**: 
  - Member removed from all role arrays
  - Member count decrements
  - Member added to bannedUsers array
  - Success message displayed
  - Banned user appears in banned users tab

#### 4.2 Ban Multiple Members
- **Setup**: Select multiple members for ban
- **Test**: Ban 2-3 members simultaneously
- **Expected**: 
  - All selected members removed and banned
  - Member count decrements correctly
  - All members added to banned users list

#### 4.3 Owner Ban Attempt
- **Setup**: Try to ban the community owner
- **Test**: Select owner and attempt ban
- **Expected**: 
  - Owner cannot be selected for ban OR
  - Error message preventing ban of owner
  - Owner remains in community

#### 4.4 Already Banned User
- **Setup**: User is already in banned users list
- **Test**: Try to ban already banned user
- **Expected**: 
  - Graceful handling (no duplicate or error)
  - No changes to banned users list

### 5. Banned Users Management

#### 5.1 View Banned Users
- **Setup**: Community with banned users
- **Test**: Navigate to Banned Users tab
- **Expected**: 
  - All banned users listed
  - Correct count displayed in tab header
  - User details shown (name, avatar, ID)

#### 5.2 Unban Single User
- **Setup**: Banned user in list
- **Test**: Click unban on single user
- **Expected**: 
  - User removed from banned users list
  - Success message displayed
  - User can now attempt to rejoin community

#### 5.3 Unban Multiple Users
- **Setup**: Multiple banned users
- **Test**: Select multiple banned users and unban
- **Expected**: 
  - All selected users removed from banned list
  - Success message with correct count
  - All users can attempt to rejoin

#### 5.4 Empty Banned Users List
- **Setup**: Community with no banned users
- **Test**: View banned users tab
- **Expected**: 
  - "No banned users" message displayed
  - Empty state UI shown
  - Tab shows count of 0

### 6. Edge Cases and Error Handling

#### 6.1 Network Connection Issues
- **Test**: Perform actions with poor/no network
- **Expected**: 
  - Appropriate error messages
  - No partial state changes
  - User can retry actions

#### 6.2 Permissions Changes Mid-Action
- **Test**: User's role changes while performing action
- **Expected**: 
  - Action completes or fails gracefully
  - Updated permissions reflected in UI

#### 6.3 Community Deletion During Action
- **Test**: Community gets deleted while user performing action
- **Expected**: 
  - Graceful error handling
  - User redirected appropriately

#### 6.4 Invalid Community ID
- **Test**: Visit URL with non-existent community ID
- **Expected**: 
  - User redirected to default community
  - No error crashes

#### 6.5 Firestore Permission Errors
- **Test**: Simulate Firestore security rule violations
- **Expected**: 
  - Clear error messages to user
  - No partial data corruption

### 7. UI and UX Testing

#### 7.1 Join Dialog UX
- **Test**: Community join dialog appearance and behavior
- **Expected**: 
  - Clear community information shown
  - Intuitive buttons and actions
  - Proper loading states

#### 7.2 Member Management UX
- **Test**: Member selection and action UI
- **Expected**: 
  - Easy member selection
  - Clear action buttons
  - Proper confirmation for destructive actions

#### 7.3 Mobile Responsiveness
- **Test**: All functionality on mobile devices
- **Expected**: 
  - All buttons accessible
  - Proper layout on small screens
  - Touch-friendly interactions

#### 7.4 Loading States
- **Test**: All async operations show loading
- **Expected**: 
  - Loading spinners during actions
  - Disabled buttons during processing
  - Clear feedback to user

### 8. Data Integrity Testing

#### 8.1 Member Count Accuracy
- **Test**: Verify member count after all operations
- **Expected**: 
  - Count always matches actual members
  - No negative counts
  - Proper minimum count handling

#### 8.2 Role Array Consistency
- **Test**: User appears in only one role array
- **Expected**: 
  - No user in multiple role arrays
  - Proper cleanup during role changes
  - No orphaned references

#### 8.3 Banned Users List Accuracy
- **Test**: Banned users list reflects actual state
- **Expected**: 
  - Only actually banned users in list
  - No duplicates
  - Proper cleanup on unban

## Test Checklist

### Pre-test Setup
- [ ] Test users created and authenticated
- [ ] Test community created with proper roles
- [ ] Test database has proper permissions
- [ ] Test environment configured

### Join Functionality
- [ ] Public community join works
- [ ] Private community blocks access
- [ ] Already member handling works
- [ ] Banned user access blocked
- [ ] Join dialog UI functions properly

### Leave Functionality  
- [ ] Regular member can leave
- [ ] Admin/moderator can leave
- [ ] Owner cannot leave
- [ ] Vibe community leave blocked
- [ ] Non-member leave handled

### Kick Functionality
- [ ] Admin can kick members
- [ ] Moderator kick permissions work
- [ ] Owner cannot be kicked
- [ ] Multiple kick works
- [ ] Member count updates correctly

### Ban Functionality
- [ ] Admin can ban members
- [ ] Multiple ban works
- [ ] Owner cannot be banned
- [ ] Banned users list updates
- [ ] Ban prevents rejoin

### Banned Users Management
- [ ] Banned users tab displays correctly
- [ ] Single unban works
- [ ] Multiple unban works
- [ ] Empty state displays properly
- [ ] Unbanned users can rejoin

### Error Handling
- [ ] Network issues handled gracefully
- [ ] Permission errors display clearly
- [ ] Invalid data handled properly
- [ ] UI remains functional after errors

### Data Integrity
- [ ] Member counts accurate
- [ ] No duplicate user entries
- [ ] Role arrays consistent
- [ ] Banned users list accurate

## Test Results Template

```
Test Date: ____
Tester: ____
Environment: ____

Results:
- [ ] All join functionality tests passed
- [ ] All leave functionality tests passed  
- [ ] All kick functionality tests passed
- [ ] All ban functionality tests passed
- [ ] All banned users management tests passed
- [ ] All error handling tests passed
- [ ] All data integrity tests passed

Issues Found:
1. ____
2. ____
3. ____

Overall Status: [PASS/FAIL/PARTIAL]
```

## Notes for Developers

1. **Testing Order**: Run tests in the order listed to avoid dependencies
2. **Data Cleanup**: Clean up test data between test runs
3. **Permissions**: Verify Firestore security rules allow test operations
4. **Logging**: Check browser console for any errors during tests
5. **Network**: Test both online and offline scenarios where applicable

This comprehensive test suite should catch any issues with the community management functionality and ensure a robust user experience.
