
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, Timestamp, limit, doc, writeBatch, where, updateDoc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BellDot, MessageSquareReply, AtSign, ArrowLeft, Users, Heart, Loader2, UserPlus, Check, X, Phone, Crown, Shield } from 'lucide-react';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { createUserDataGetter, isUserDeleted } from '@/lib/user-filtering';

// Defines the structure of an activity item fetched from Firestore
interface ActivityItem {
  id: string;
  type: 'mention' | 'reply' | 'reaction' | 'community_join' | 'new_follower' | 'system_message' | 'connection_request' | 'connection_response' | 'new_message' | 'role_promoted' | 'role_demoted';
  actorId?: string; 
  actorName?: string; 
  actorAvatarUrl?: string; 
  dataAiHint?: string; 
  contentSnippet: string; 
  targetLink?: string; 
  timestamp: Date;
  isRead?: boolean; 
  communityId?: string;
  channelId?: string;
  messageId?: string;
  targetUserId?: string; 
  requestId?: string;
  conversationId?: string;
  mentionedUserIds?: string[];
  roleChangeDetails?: {
    fromRole: string;
    toRole: string;
    communityName: string;
  };
}

interface MuteSettings {
  mutedUsers: string[];
  mutedConversations: string[];
  mutedCommunities: string[];
  allowMentionsWhenMuted: boolean;
}


export default function ActivityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  
  // Mute settings state
  const [muteSettings, setMuteSettings] = useState<MuteSettings>({
    mutedUsers: [],
    mutedConversations: [],
    mutedCommunities: [],
    allowMentionsWhenMuted: true
  });
  const [muteSettingsLoaded, setMuteSettingsLoaded] = useState(false);

  // Function to check if a message notification should be marked as read
  const checkIfMessageNotificationShouldBeRead = useCallback(async (activity: any): Promise<boolean> => {
    // Only check for message notifications
    if (activity.type !== 'new_message' || !activity.conversationId || !activity.actorId) {
      return false;
    }

    try {
      // Get the conversation document to check last message timestamp
      const conversationRef = doc(db, `direct_messages/${activity.conversationId}`);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        return false;
      }

      const conversationData = conversationDoc.data();
      const lastMessageTimestamp = conversationData.lastMessageTimestamp;
      
      if (!lastMessageTimestamp) {
        return false;
      }

      // Convert timestamps to Date objects for comparison
      const notificationTime = activity.timestamp?.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
      const lastMessageTime = lastMessageTimestamp?.toDate ? lastMessageTimestamp.toDate() : new Date(lastMessageTimestamp);
      
      // If the last message in the conversation is newer than the notification, 
      // the user has likely seen the conversation and the notification should be marked as read
      if (lastMessageTime > notificationTime) {
        console.log('📱 Message notification should be marked as read - conversation has newer messages');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking message notification read status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // Load mute settings from Firestore
  const loadMuteSettings = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 Loading mute settings for user:', currentUser.uid);
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('🔍 User document data:', userData);
        
        if (userData.muteSettings) {
          const firestoreMuteSettings = userData.muteSettings as MuteSettings;
          console.log('🔍 Found mute settings:', firestoreMuteSettings);
          setMuteSettings(firestoreMuteSettings);
          console.log('✅ Mute settings loaded for activity filtering');
        } else {
          console.log('⚠️ No mute settings found in user document');
          setMuteSettings({
            mutedUsers: [],
            mutedConversations: [],
            mutedCommunities: [],
            allowMentionsWhenMuted: true
          });
        }
      } else {
        console.log('⚠️ User document does not exist');
        setMuteSettings({
          mutedUsers: [],
          mutedConversations: [],
          mutedCommunities: [],
          allowMentionsWhenMuted: true
        });
      }
      setMuteSettingsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading mute settings:', error);
      setMuteSettings({
        mutedUsers: [],
        mutedConversations: [],
        mutedCommunities: [],
        allowMentionsWhenMuted: true
      });
      setMuteSettingsLoaded(true);
    }
  }, [currentUser]);

  // Load mute settings when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Loading mute settings due to user change');
      loadMuteSettings();
    }
  }, [currentUser, loadMuteSettings]);

  // Debug effect to log when mute settings change
  useEffect(() => {
    console.log('🔄 Mute settings state changed:', {
      mutedUsers: muteSettings.mutedUsers,
      mutedConversations: muteSettings.mutedConversations,
      mutedCommunities: muteSettings.mutedCommunities,
      allowMentionsWhenMuted: muteSettings.allowMentionsWhenMuted
    });
  }, [muteSettings]);

  const markActivitiesAsRead = async (activityIdsToMark: string[]) => {
    console.log('🔍 markActivitiesAsRead called with:', { activityIdsToMark, currentUser: !!currentUser });
    
    if (!currentUser || activityIdsToMark.length === 0) {
      console.log('❌ Cannot mark activities as read:', { currentUser: !!currentUser, activityIdsToMark });
      return;
    }
    
    setIsMarkingAsRead(true);
    const batch = writeBatch(db);
    
    console.log('📝 Creating batch update for activities:', activityIdsToMark);
    activityIdsToMark.forEach(id => {
      const activityRef = doc(db, `users/${currentUser.uid}/activityItems`, id);
      console.log('📄 Adding update for activity:', id, 'at path:', `users/${currentUser.uid}/activityItems/${id}`);
      batch.update(activityRef, { isRead: true });
    });
    
    try {
      console.log('🚀 Committing batch update...');
      await batch.commit();
      console.log('✅ Successfully marked', activityIdsToMark.length, 'notifications as read');
      
      // Show success toast
      toast({
        title: "Notifications Marked as Read",
        description: `Successfully marked ${activityIdsToMark.length} notification${activityIdsToMark.length > 1 ? 's' : ''} as read.`,
      });
    } catch (error) {
      console.error("❌ Error marking activities as read: ", error);
      toast({
        variant: "destructive",
        title: "Error updating notifications",
        description: "Could not mark notifications as read. Check console for details.",
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleConnectionRequest = async (activity: ActivityItem, action: 'accept' | 'reject') => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to handle connection requests.",
      });
      return;
    }

    if (!activity.requestId) {
      console.error('Missing requestId in activity:', activity);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing connection request ID. This might be an old notification. Please try refreshing the page.",
      });
      return;
    }

    if (!activity.actorId) {
      console.error('Missing actorId in activity:', activity);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing sender information. This might be an old notification. Please try refreshing the page.",
      });
      return;
    }

    setProcessingRequests(prev => new Set(prev).add(activity.id));

    try {
      let requestId = activity.requestId;
      
      // If requestId is missing, try to find the connection request by matching actorId and targetUserId
      if (!requestId && activity.actorId && activity.targetUserId) {
        console.log('Attempting to find connection request by actorId and targetUserId');
        const requestsRef = collection(db, 'connectionRequests');
        const q = query(
          requestsRef,
          where('fromUserId', '==', activity.actorId),
          where('toUserId', '==', activity.targetUserId),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          requestId = snapshot.docs[0].id;
          console.log('Found connection request with ID:', requestId);
        }
      }
      
      if (!requestId) {
        throw new Error('Could not find connection request');
      }
      
      // Update the connection request status
      const requestRef = doc(db, 'connectionRequests', requestId);
      await updateDoc(requestRef, { 
        status: action === 'accept' ? 'accepted' : 'rejected',
        respondedAt: serverTimestamp()
      });

      // Create activity notification for the sender
      const senderActivityRef = collection(db, `users/${activity.actorId}/activityItems`);
      await setDoc(doc(senderActivityRef), {
        type: 'connection_response',
        actorId: currentUser.uid,
        actorName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        actorAvatarUrl: currentUser.photoURL || null,
        contentSnippet: action === 'accept' ? 'accepted your connection request' : 'rejected your connection request',
        timestamp: serverTimestamp(),
        isRead: false,
        targetUserId: activity.actorId,
      });

      // If connection was accepted, create a DM conversation
      if (action === 'accept') {
        try {
          // Create conversation ID (sorted user IDs joined with underscore)
          const userIds = [currentUser.uid, activity.actorId].sort();
          const conversationId = `${userIds[0]}_${userIds[1]}`;
          
          // Create the conversation document
          const conversationRef = doc(db, 'direct_messages', conversationId);
          await setDoc(conversationRef, {
            participants: userIds,
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
            [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
            [`user_${activity.actorId}_name`]: activity.actorName || "User",
            [`user_${activity.actorId}_avatar`]: activity.actorAvatarUrl || null,
          });

          // Add a welcome message to the conversation
          const messagesRef = collection(db, `direct_messages/${conversationId}/messages`);
          await addDoc(messagesRef, {
            text: `🎉 You are now connected! Start chatting with ${activity.actorName || 'your new connection'}.`,
            senderId: 'system',
            senderName: 'System',
            timestamp: serverTimestamp(),
            type: 'text',
          });

          console.log('DM conversation created successfully:', conversationId);
        } catch (error) {
          console.error('Error creating DM conversation:', error);
          // Don't fail the entire operation if DM creation fails
        }
      }

      // Remove the activity item from current user's feed
      const activityRef = doc(db, `users/${currentUser.uid}/activityItems`, activity.id);
      await deleteDoc(activityRef);

      toast({
        title: action === 'accept' ? "Connection Accepted!" : "Connection Rejected",
        description: action === 'accept' 
          ? `You are now connected with ${activity.actorName}. Check your messages to start chatting!` 
          : `You rejected the connection request from ${activity.actorName}.`,
      });

      // Navigate to messages screen if connection was accepted
      if (action === 'accept') {
        // Dispatch custom event to notify messages page to refresh connected users
        window.dispatchEvent(new CustomEvent('connectionAccepted', {
          detail: { connectedUserId: activity.actorId }
        }));
        
        // Small delay to ensure the toast is visible
        setTimeout(() => {
          router.push('/messages');
        }, 1500);
      }

    } catch (error) {
      console.error(`Error ${action}ing connection request:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Could not ${action} connection request. Please try again.`,
      });
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(activity.id);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (currentUser && muteSettingsLoaded) {
      console.log('🔄 Loading activities - mute settings loaded:', muteSettingsLoaded);
      setIsLoadingActivities(true);
      const activityItemsRef = collection(db, `users/${currentUser.uid}/activityItems`);
      const q = query(activityItemsRef, orderBy('timestamp', 'desc'), limit(50));

      const unsubscribeFirestore = onSnapshot(q, async (querySnapshot) => {
        console.log('🔍 Activity feed: Loading activities, mute settings:', muteSettings);
        
        const fetchedActivities: ActivityItem[] = [];
        const unreadActivityIds: string[] = [];
        let filteredCount = 0;
        
        // Ensure muteSettings exists and has the required properties
        const safeMuteSettings = muteSettings || {
          mutedUsers: [],
          mutedConversations: [],
          mutedCommunities: [],
          allowMentionsWhenMuted: true
        };
        
        // Create user data getter for deleted user filtering
        const getUserData = createUserDataGetter(getDoc, doc, db);
        
        // Process activities sequentially to check message notifications
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          
          const activity = {
            id: docSnap.id,
            type: data.type,
            actorId: data.actorId,
            actorName: data.actorName,
            actorAvatarUrl: data.actorAvatarUrl,
            dataAiHint: data.dataAiHint || 'person face',
            contentSnippet: data.contentSnippet,
            targetLink: data.targetLink,
            timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            isRead: data.isRead || false,
            communityId: data.communityId,
            channelId: data.channelId,
            messageId: data.messageId,
            targetUserId: data.targetUserId,
            requestId: data.requestId,
            conversationId: data.conversationId,
            mentionedUserIds: data.mentionedUserIds || [],
          } as ActivityItem;
          
          // Filter out notifications from deleted users
          if (data.actorId && data.actorId !== 'system') {
            try {
              const actorUserData = await getUserData(data.actorId);
              if (isUserDeleted(actorUserData)) {
                console.log('🚫 Filtering out notification from deleted user:', data.actorId, data.type);
                filteredCount++;
                continue; // Skip this activity from deleted user
              }
            } catch (error) {
              console.error(`Error checking actor deletion status for ${data.actorId}:`, error);
              // If we can't verify user status, skip for safety
              console.log('🚫 Filtering out notification due to verification error:', data.actorId, data.type);
              filteredCount++;
              continue;
            }
          }
          
          // Check if this activity should be filtered based on mute settings
          let shouldFilter = false;
          let filterReason = '';
          
          // Check if user is muted
          if (data.actorId && safeMuteSettings.mutedUsers && safeMuteSettings.mutedUsers.includes(data.actorId)) {
            shouldFilter = true;
            filterReason = 'muted user';
          }
          
          // Check if conversation is muted
          if (data.conversationId && safeMuteSettings.mutedConversations && safeMuteSettings.mutedConversations.includes(data.conversationId)) {
            shouldFilter = true;
            filterReason = 'muted conversation';
          }
          
          // Check if community is muted
          if (data.communityId && safeMuteSettings.mutedCommunities && safeMuteSettings.mutedCommunities.includes(data.communityId)) {
            shouldFilter = true;
            filterReason = 'muted community';
          }
          
          // Allow mentions to pass through if enabled
          if (shouldFilter && safeMuteSettings.allowMentionsWhenMuted) {
            const mentionedUserIds = data.mentionedUserIds || [];
            if (mentionedUserIds.includes(currentUser?.uid || '')) {
              shouldFilter = false;
              filterReason = 'mention allowed';
            }
          }
          
          // Always allow connection requests and system messages
          if (data.type === 'connection_request' || data.type === 'system_message') {
            shouldFilter = false;
            filterReason = 'system message';
          }
          
          if (shouldFilter) {
            console.log('🚫 Filtering out notification:', filterReason, data.actorId, data.type);
            filteredCount++;
            continue; // Skip this activity
          }
          
          // Check if message notification should be marked as read
          let shouldMarkAsRead = false;
          if (data.type === 'new_message' && !data.isRead) {
            shouldMarkAsRead = await checkIfMessageNotificationShouldBeRead(activity);
            if (shouldMarkAsRead) {
              activity.isRead = true;
              console.log('📱 Marking message notification as read:', docSnap.id);
            }
          }
          
          console.log('✅ Adding activity to feed:', data.type, 'from', data.actorId);
          fetchedActivities.push(activity);
          if (!activity.isRead) {
            unreadActivityIds.push(activity.id);
          }
        }
        console.log('📊 Activity feed summary:', {
          totalActivities: querySnapshot.size,
          filteredOut: filteredCount,
          displayedActivities: fetchedActivities.length,
          muteSettings: safeMuteSettings
        });
        setActivities(fetchedActivities);
        setIsLoadingActivities(false);

        // Mark all unread activities as read when page loads
        const allUnreadActivities = fetchedActivities.filter(activity => !activity.isRead);
        console.log('📊 Activity processing:', {
          totalActivities: fetchedActivities.length,
          unreadActivities: allUnreadActivities.length,
          unreadActivityIds: allUnreadActivities.map(a => a.id),
          activityTypes: fetchedActivities.map(a => a.type)
        });
        
        if (allUnreadActivities.length > 0) {
          const allUnreadActivityIds = allUnreadActivities.map(activity => activity.id);
          console.log('📱 Marking all notifications as read on page load:', allUnreadActivityIds.length, 'notifications');
          
          // Show toast notification
          toast({
            title: "Marking Notifications as Read",
            description: `Marking ${allUnreadActivityIds.length} notification${allUnreadActivityIds.length > 1 ? 's' : ''} as read...`,
          });
          
          markActivitiesAsRead(allUnreadActivityIds);
          
          // Mark activities as read in local state for immediate UI update
          const updatedActivities = fetchedActivities.map(activity => ({
            ...activity,
            isRead: true
          }));
          setActivities(updatedActivities);
        } else {
          console.log('📱 No unread activities to mark as read');
          setActivities(fetchedActivities);
        }
      }, (error: any) => {
        console.error("Error fetching activity items: ", error);
        setActivities([]);
        setIsLoadingActivities(false);
        toast({
          variant: "destructive",
          title: "Error loading activity",
          description: "Could not fetch your latest activity.",
        });
      });

      return () => unsubscribeFirestore();
    }
  }, [currentUser, toast, muteSettings, muteSettingsLoaded, checkIfMessageNotificationShouldBeRead]);

  // Mark all notifications as read when user visits the activity page
  useEffect(() => {
    if (currentUser && activities.length > 0) {
      const unreadActivities = activities.filter(activity => !activity.isRead);
      if (unreadActivities.length > 0) {
        const unreadActivityIds = unreadActivities.map(activity => activity.id);
        console.log('📱 Marking all notifications as read:', unreadActivityIds.length, 'notifications');
        markActivitiesAsRead(unreadActivityIds);
        
        // Mark activities as read in local state for immediate UI update
        const updatedActivities = activities.map(activity => ({
          ...activity,
          isRead: true
        }));
        setActivities(updatedActivities);
      }
    }
  }, [currentUser, activities, markActivitiesAsRead]);

  // Additional effect to ensure all notifications are marked as read on page mount
  useEffect(() => {
    const markAllAsReadOnMount = async () => {
      if (!currentUser) return;
      
      try {
        // Get all unread activities directly from Firestore
        const activityItemsRef = collection(db, `users/${currentUser.uid}/activityItems`);
        const unreadQuery = query(activityItemsRef, where("isRead", "==", false));
        const unreadSnapshot = await getDocs(unreadQuery);
        
        if (!unreadSnapshot.empty) {
          const unreadActivityIds = unreadSnapshot.docs.map(doc => doc.id);
          console.log('🔄 Marking', unreadActivityIds.length, 'notifications as read on activity page mount');
          
          // Show brief toast
          if (unreadActivityIds.length > 0) {
            toast({
              title: "Notifications Marked as Read",
              description: `${unreadActivityIds.length} notification${unreadActivityIds.length > 1 ? 's' : ''} marked as read.`,
              duration: 2000,
            });
          }
          
          // Mark them as read
          await markActivitiesAsRead(unreadActivityIds);
        }
      } catch (error) {
        console.error('❌ Error marking activities as read on mount:', error);
      }
    };
    
    // Only run this once when the component mounts and user is available
    if (currentUser && muteSettingsLoaded) {
      markAllAsReadOnMount();
    }
  }, [currentUser, muteSettingsLoaded]); // Only depend on currentUser and muteSettingsLoaded

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  const renderIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-5 w-5 text-primary" />;
      case 'reply':
        return <MessageSquareReply className="h-5 w-5 text-accent" />;
      case 'reaction':
        return <Heart className="h-5 w-5 text-destructive" />; 
      case 'community_join':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'new_follower':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'connection_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'connection_response':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'new_message':
        return <MessageSquareReply className="h-5 w-5 text-blue-500" />;
      case 'system_message':
        return <BellDot className="h-5 w-5 text-yellow-500" />;
      case 'role_promoted':
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 'role_demoted':
        return <Shield className="h-5 w-5 text-orange-500" />;
      default:
        return <BellDot className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const ActivityItemDisplay: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
    const isProcessing = processingRequests.has(activity.id);
    
    const content = (
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10 mt-0.5">
          <AvatarImage src={activity.actorAvatarUrl || `https://placehold.co/40x40.png?text=${(activity.actorName || 'V').charAt(0)}`} alt={activity.actorName || 'System'} data-ai-hint={activity.dataAiHint} />
          <AvatarFallback>{(activity.actorName || 'V').substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm text-foreground">
            {activity.actorName && <span className="font-semibold">{activity.actorName}</span>} {activity.contentSnippet}
          </p>
          <p className="text-xs text-muted-foreground">
            {activity.timestamp ? formatDistanceToNowStrict(activity.timestamp, { addSuffix: true }) : 'Just now'}
          </p>
          {activity.type === 'connection_request' && (
            <div className="flex space-x-2 mt-2">
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => handleConnectionRequest(activity, 'accept')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={() => handleConnectionRequest(activity, 'reject')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Ignore
              </Button>
            </div>
          )}
          {activity.type === 'new_message' && activity.conversationId && (
            <div className="flex space-x-2 mt-2">
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  router.push(`/messages?conversation=${activity.conversationId}`);
                  // Mark as read when clicked
                  markActivitiesAsRead([activity.id]);
                }}
              >
                <MessageSquareReply className="h-3 w-3 mr-1" />
                View Message
              </Button>
            </div>
          )}
          {activity.type === 'mention' && activity.targetLink && (
            <div className="flex space-x-2 mt-2">
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  if (activity.targetLink) {
                    router.push(activity.targetLink);
                    // Mark as read when clicked
                    markActivitiesAsRead([activity.id]);
                  }
                }}
              >
                <AtSign className="h-3 w-3 mr-1" />
                View Mention
              </Button>
            </div>
          )}
          {(activity.type === 'role_promoted' || activity.type === 'role_demoted') && activity.communityId && (
            <div className="flex space-x-2 mt-2">
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  router.push(`/communities?communityId=${activity.communityId}`);
                  // Mark as read when clicked
                  markActivitiesAsRead([activity.id]);
                }}
              >
                {activity.type === 'role_promoted' ? <Crown className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                View Community
              </Button>
            </div>
          )}
        </div>
        <div className="shrink-0">
          {renderIcon(activity.type)}
        </div>
      </div>
    );

    if (activity.targetLink) {
      return (
        <Link 
          href={activity.targetLink}
          className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/30"
        >
          {content}
        </Link>
      );
    }

    return (
      <div className={`block p-3 rounded-lg border border-border/30 relative ${
        !activity.isRead 
          ? 'bg-blue-50/50 border-blue-200/50' 
          : ''
      }`}>
        {content}
        {!activity.isRead && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500"></div>
        )}
      </div>
    );
  };


  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-6 flex flex-col">
      <div className="flex items-center mb-6 shrink-0">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <BellDot className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Activity Feed
          {isMarkingAsRead && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Marking as read...
            </span>
          )}
        </h1>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-auto text-xs mr-2"
          onClick={() => {
            console.log('🔍 Debug: Current mute settings:', muteSettings);
            loadMuteSettings();
          }}
        >
          Debug Mute
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs"
          onClick={() => {
            if ('Notification' in window) {
              if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    toast({ title: "Notifications Enabled", description: "You'll now receive call notifications!" });
                  }
                });
              } else if (Notification.permission === 'denied') {
                toast({ 
                  title: "Notifications Disabled", 
                  description: "Please enable notifications in your browser settings to receive call alerts.",
                  variant: "destructive"
                });
              } else {
                toast({ title: "Notifications Active", description: "Call notifications are already enabled!" });
              }
            }
          }}
        >
          {Notification?.permission === 'granted' ? '🔔' : '🔕'} Notifications
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs ml-2"
          disabled={isMarkingAsRead || activities.filter(a => !a.isRead).length === 0}
          onClick={async () => {
            const unreadActivities = activities.filter(activity => !activity.isRead);
            if (unreadActivities.length > 0) {
              setIsMarkingAsRead(true);
              try {
                const activityIds = unreadActivities.map(activity => activity.id);
                console.log('📝 Marking all activities as read:', activityIds);
                await markActivitiesAsRead(activityIds);
                toast({
                  title: "All Activities Marked as Read",
                  description: `Marked ${unreadActivities.length} notification${unreadActivities.length > 1 ? 's' : ''} as read.`,
                });
              } catch (error) {
                console.error('❌ Error marking all activities as read:', error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to mark activities as read. Please try again.",
                });
              } finally {
                setIsMarkingAsRead(false);
              }
            } else {
              toast({ 
                title: "No Unread Activities", 
                description: "All activities are already marked as read." 
              });
            }
          }}
        >
          {isMarkingAsRead ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Marking...
            </>
          ) : (
            <>
              ✓ Mark All as Read
              {activities.filter(a => !a.isRead).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {activities.filter(a => !a.isRead).length}
                </span>
              )}
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs ml-2"
          onClick={() => {
            // Test marking activities as read
            const unreadActivities = activities.filter(activity => !activity.isRead);
            if (unreadActivities.length > 0) {
              const activityIds = unreadActivities.map(activity => activity.id);
              console.log('🧪 Testing mark as read for:', activityIds);
              markActivitiesAsRead(activityIds);
            } else {
              toast({ title: "No Unread Activities", description: "All activities are already marked as read." });
            }
          }}
        >
          🧪 Test Mark Read
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs ml-2"
          onClick={() => {
            // Debug current activities state
            console.log('🔍 Current activities state:', {
              totalActivities: activities.length,
              activities: activities.map(a => ({
                id: a.id,
                type: a.type,
                isRead: a.isRead,
                actorName: a.actorName,
                contentSnippet: a.contentSnippet
              })),
              unreadCount: activities.filter(a => !a.isRead).length
            });
            toast({ 
              title: "Debug Info", 
              description: `Total: ${activities.length}, Unread: ${activities.filter(a => !a.isRead).length}` 
            });
          }}
        >
          🔍 Debug State
        </Button>
      </div>

      <Card className="w-full flex-1 flex flex-col bg-card border-border/50 shadow-lg overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-foreground">
              Recent Activity
              {activities.filter(a => !a.isRead).length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                  {activities.filter(a => !a.isRead).length}
                </span>
              )}
            </CardTitle>
            {activities.filter(a => !a.isRead).length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                disabled={isMarkingAsRead}
                onClick={async () => {
                  const unreadActivities = activities.filter(activity => !activity.isRead);
                  if (unreadActivities.length > 0) {
                    setIsMarkingAsRead(true);
                    try {
                      const activityIds = unreadActivities.map(activity => activity.id);
                      console.log('📝 Marking all activities as read:', activityIds);
                      await markActivitiesAsRead(activityIds);
                      toast({
                        title: "All Activities Marked as Read",
                        description: `Marked ${unreadActivities.length} notification${unreadActivities.length > 1 ? 's' : ''} as read.`,
                      });
                    } catch (error) {
                      console.error('❌ Error marking all activities as read:', error);
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to mark activities as read. Please try again.",
                      });
                    } finally {
                      setIsMarkingAsRead(false);
                    }
                  }
                }}
              >
                {isMarkingAsRead ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Marking...
                  </>
                ) : (
                  <>
                    ✓ Mark All as Read
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      {activities.filter(a => !a.isRead).length}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
          <CardDescription className="text-muted-foreground pt-1">
            <div>
              Stay updated with mentions, replies, and other important events.
              <br />
              <span className="text-xs italic">(Note: Generation of these notifications is a backend task. This page displays existing notifications.)</span>
              {(muteSettings.mutedUsers.length > 0 || muteSettings.mutedConversations.length > 0 || muteSettings.mutedCommunities.length > 0) && (
                <>
                  <br />
                  <span className="text-xs text-blue-500">
                    🔇 Some notifications are hidden due to mute settings
                  </span>
                </>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {!muteSettingsLoaded ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2"/> Loading mute settings...
            </div>
          ) : isLoadingActivities ? (
             <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2"/> Loading activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No new activity. Your feed is clear!
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {activities.map((activity) => (
                  <ActivityItemDisplay key={activity.id} activity={activity} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

