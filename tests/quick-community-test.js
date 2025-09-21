/**
 * Quick Community Management Testing Helper
 * 
 * This script provides helper functions to quickly test community functionality
 * in the browser console. Open the app and run these commands to test features.
 * 
 * Usage:
 * 1. Open the VIBE app in your browser
 * 2. Open browser developer console
 * 3. Copy and paste these functions
 * 4. Run the test functions as needed
 */

// Test Helper Functions
const CommunityTestHelpers = {
  
  /**
   * Test community join functionality
   * Navigate to a community URL to test join dialog
   */
  testCommunityJoin: (communityId) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('communityId', communityId);
    window.history.pushState(null, '', currentUrl);
    window.location.reload();
    console.log(`Testing join for community: ${communityId}`);
    console.log('Expected: Join dialog should appear if not a member');
  },

  /**
   * Test banned user simulation
   * This would need to be run after manually adding user to banned list
   */
  testBannedUserAccess: (communityId) => {
    console.log(`Testing banned user access for community: ${communityId}`);
    console.log('Note: User should be manually added to bannedUsers array first');
    CommunityTestHelpers.testCommunityJoin(communityId);
  },

  /**
   * Check current user's community status
   */
  checkUserCommunityStatus: () => {
    const userId = auth?.currentUser?.uid;
    if (!userId) {
      console.log('No authenticated user found');
      return;
    }
    
    console.log(`Current user ID: ${userId}`);
    console.log('Check user\'s role in current community via UI');
    console.log('Expected: User should see appropriate action buttons based on role');
  },

  /**
   * Simulate leave community test
   */
  testLeaveCurrentCommunity: () => {
    console.log('Testing leave current community functionality');
    console.log('Manual step: Use the leave option in community context menu');
    console.log('Expected: Confirmation dialog, then successful leave or error message');
  },

  /**
   * Test member count accuracy
   */
  checkMemberCountAccuracy: () => {
    const currentCommunity = window.localStorage.getItem('selectedCommunity');
    if (currentCommunity) {
      console.log('Current community:', JSON.parse(currentCommunity));
      console.log('Manual check: Verify member count matches actual members in settings');
    } else {
      console.log('No current community found in localStorage');
    }
  },

  /**
   * Test URL parameter handling
   */
  testUrlParameters: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const communityId = urlParams.get('communityId');
    
    console.log(`Current community ID in URL: ${communityId}`);
    console.log('Expected: Community should match URL parameter or default to vibe');
  },

  /**
   * Test error handling by simulating network issues
   */
  simulateNetworkError: () => {
    // This is a mock - real testing would involve network throttling in DevTools
    console.log('To test network errors:');
    console.log('1. Open DevTools > Network tab');
    console.log('2. Set throttling to "Slow 3G" or "Offline"');
    console.log('3. Try community join/leave/kick/ban operations');
    console.log('4. Verify error messages appear and no partial state changes occur');
  },

  /**
   * Validate community data structure
   */
  validateCommunityData: (community) => {
    if (!community) {
      console.error('No community data provided');
      return false;
    }

    const required = ['id', 'name', 'ownerId', 'members', 'moderators', 'admins'];
    const missing = required.filter(field => !(field in community));
    
    if (missing.length > 0) {
      console.error('Missing required fields:', missing);
      return false;
    }

    // Check for duplicate members across arrays
    const owner = [community.ownerId];
    const allMembers = [
      ...owner,
      ...(community.members || []),
      ...(community.moderators || []),
      ...(community.admins || [])
    ];
    
    const uniqueMembers = [...new Set(allMembers)];
    if (allMembers.length !== uniqueMembers.length) {
      console.warn('Duplicate members found across role arrays');
    }

    // Check member count accuracy
    const expectedCount = uniqueMembers.length;
    if (community.memberCount !== expectedCount) {
      console.warn(`Member count mismatch. Expected: ${expectedCount}, Actual: ${community.memberCount}`);
    }

    console.log('Community data validation completed');
    return true;
  },

  /**
   * Run a quick test suite
   */
  runQuickTests: () => {
    console.log('=== Running Quick Community Tests ===');
    
    console.log('\n1. Checking user authentication...');
    CommunityTestHelpers.checkUserCommunityStatus();
    
    console.log('\n2. Checking URL parameters...');
    CommunityTestHelpers.testUrlParameters();
    
    console.log('\n3. Checking member count accuracy...');
    CommunityTestHelpers.checkMemberCountAccuracy();
    
    console.log('\n=== Manual Tests Required ===');
    console.log('- Test community join via URL');
    console.log('- Test leave community functionality');
    console.log('- Test kick/ban operations in community settings');
    console.log('- Test banned users management');
    console.log('- Test private community access');
    
    console.log('\n=== Test Complete ===');
    console.log('Use individual helper functions for specific tests');
  }
};

// Test Data Generators
const TestDataGenerators = {
  
  /**
   * Generate test community data
   */
  generateTestCommunity: (ownerId) => {
    return {
      id: `test-community-${Date.now()}`,
      name: `Test Community ${new Date().toLocaleTimeString()}`,
      description: 'A test community for testing functionality',
      isPrivate: false,
      ownerId: ownerId,
      ownerName: 'Test Owner',
      members: [],
      moderators: [],
      admins: [],
      bannedUsers: [],
      memberCount: 1,
      createdAt: new Date(),
      tags: ['test', 'community']
    };
  },

  /**
   * Generate test user data
   */
  generateTestUser: (role = 'member') => {
    const id = `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: id,
      name: `Test ${role} ${id.slice(-8)}`,
      avatarUrl: null,
      email: `${id}@test.com`
    };
  }
};

// Export for use
if (typeof window !== 'undefined') {
  window.CommunityTestHelpers = CommunityTestHelpers;
  window.TestDataGenerators = TestDataGenerators;
}

console.log('Community Test Helpers loaded!');
console.log('Available functions:');
console.log('- CommunityTestHelpers.runQuickTests()');
console.log('- CommunityTestHelpers.testCommunityJoin(communityId)');
console.log('- CommunityTestHelpers.checkUserCommunityStatus()');
console.log('- CommunityTestHelpers.validateCommunityData(community)');
console.log('- TestDataGenerators.generateTestCommunity(ownerId)');
console.log('- TestDataGenerators.generateTestUser(role)');

/**
 * Example Usage:
 * 
 * // Run all quick tests
 * CommunityTestHelpers.runQuickTests();
 * 
 * // Test joining a specific community
 * CommunityTestHelpers.testCommunityJoin('some-community-id');
 * 
 * // Check current user status
 * CommunityTestHelpers.checkUserCommunityStatus();
 * 
 * // Generate test data
 * const testCommunity = TestDataGenerators.generateTestCommunity('user123');
 * const testUser = TestDataGenerators.generateTestUser('moderator');
 */
