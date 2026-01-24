#!/usr/bin/env node

/**
 * Deploy Firebase Realtime Database Rules
 * 
 * This script helps deploy the database rules to Firebase.
 * Run with: node deploy-database-rules.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Database Rules Deployment');
console.log('=====================================');

// Check if database.rules.json exists
const rulesPath = path.join(__dirname, 'database.rules.json');
if (!fs.existsSync(rulesPath)) {
    console.error('❌ database.rules.json not found!');
    console.log('💡 Creating default database rules...');
    
    const defaultRules = {
        "rules": {
            "calls": {
                "$userId": {
                    ".read": "$userId === auth.uid",
                    ".write": "$userId === auth.uid || auth.uid != null",
                    "incoming": {
                        ".read": "$userId === auth.uid",
                        ".write": "auth.uid != null"
                    },
                    "outgoing": {
                        ".read": "$userId === auth.uid",
                        ".write": "$userId === auth.uid"
                    }
                }
            }
        }
    };
    
    fs.writeFileSync(rulesPath, JSON.stringify(defaultRules, null, 2));
    console.log('✅ Created database.rules.json');
}

// Check if Firebase CLI is installed
try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI is installed');
} catch (error) {
    console.error('❌ Firebase CLI not found!');
    console.log('💡 Install with: npm install -g firebase-tools');
    process.exit(1);
}

// Check if Firebase is initialized
if (!fs.existsSync('.firebaserc')) {
    console.error('❌ Firebase not initialized!');
    console.log('💡 Run: firebase init');
    process.exit(1);
}

try {
    console.log('🚀 Deploying database rules...');
    execSync('firebase deploy --only database', { stdio: 'inherit' });
    console.log('✅ Database rules deployed successfully!');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test the connection with test-firebase-connection.html');
    console.log('2. Try the call system with /test-calls page');
    console.log('3. Check browser console for debug logs');
    
} catch (error) {
    console.error('❌ Failed to deploy database rules');
    console.error(error.message);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you are logged in: firebase login');
    console.log('2. Check your Firebase project: firebase projects:list');
    console.log('3. Verify database is enabled in Firebase console');
}