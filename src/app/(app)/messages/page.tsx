"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc, runTransaction, setDoc, getDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import type { TenorGif as TenorGifType } from '@/types/tenor';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paperclip, Smile, Film, Send, Trash2, Pin, PinOff, Loader2, Star, StopCircle, AlertTriangle, SmilePlus, User as UserIcon, Mic, Bookmark, Reply, Share2, X, Search, MessageSquareReply, CornerUpRight, AtSign, Phone, VideoIcon, VolumeX, Volume2, MoreHorizontal, RefreshCw, ShieldCheck, MicOff, VideoOff, Monitor, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { Badge } from '@/components/ui/badge';
import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type ILocalVideoTrack, type IAgoraRTCRemoteUser, type UID } from 'agora-rtc-sdk-ng';
import type { ChatMessage } from '@/types/app';

const EmojiPicker = dynamic(() => import('emoji-picker-react').then(mod => mod.default), {
  ssr: false,
  loading: () => <p className="p-2 text-sm text-muted-foreground">Loading emojis...</p>
});


const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac',
];

const TIMESTAMP_GROUPING_THRESHOLD_MS = 60 * 1000; // 1 minute

interface TenorGif extends TenorGifType {}


// Tenor API key should be moved to server-side for security
// const TENOR_API_KEY = "YOUR_TENOR_API_KEY";

const AGORA_APP_ID = "530ba273ad0847019e4e48e70135e345"; 
// IMPORTANT: You must replace 'https://your-token-server.com/generate-agora-token' with your actual token server URL.
const TOKEN_SERVER_URL_PLACEHOLDER = 'https://your-token-server.com/generate-agora-token';
const TOKEN_SERVER_API_KEY = "ACo4e06ba0f991d4bc1891d6c8ae0d71b0a"; 

async function fetchAgoraToken(channelName: string, uid: string | number): Promise<string> {
  const TOKEN_SERVER_URL = TOKEN_SERVER_URL_PLACEHOLDER;

  try {
    const response = await fetch(TOKEN_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TOKEN_SERVER_API_KEY,
      },
      body: JSON.stringify({
        channelName: channelName,
        uid: uid,
      }),
    });

    if (!response.ok) {
      let errorDetails = `Token server responded with ${response.status}.`;
      try {
        const errorData = await response.text(); 
        errorDetails += ` Body: ${errorData}`;
      } catch (e) { /* ignore if reading body fails */ }
      // console.error('Failed to fetch Agora token (server error):', errorDetails); // Original console.error
      throw new Error(errorDetails); // Let the calling function handle this with a toast
    }

    const data = await response.json();
    if (data.token) {
      return data.token;
    } else {
      // console.error('Token not found in server response:', data); // Original console.error
      throw new Error('Token not found in server response.');
    }
  } catch (error: any) {
    if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
      const specificErrorMessage = `Network error fetching Agora token. Please ensure the token server URL ('${TOKEN_SERVER_URL}') is correct, reachable, and has CORS configured if necessary. Original error: ${error.message}`;
      console.error(specificErrorMessage); 
      throw new Error(specificErrorMessage); 
    }
    // For other errors during fetch (e.g., JSON parsing if server sends non-JSON, or errors thrown from !response.ok)
    const generalErrorMessage = `Error fetching Agora token: ${error.message || 'Unknown error'}. Check server response and network.`;
    console.error(generalErrorMessage, error);
    throw new Error(generalErrorMessage);
  }
}

interface DmConversation {
  id: string;
  name: string;
  avatarUrl?: string;
  dataAiHint?: string;
  partnerId: string;
  unreadCount?: number;
}

const formatChatMessage = (text?: string, restrictedWords: string[] = []): string => {
  if (!text) return '';
  let formattedText = text;
  
  // Only censor restricted words if the current user has them in their list
  if (restrictedWords.length > 0) {
    restrictedWords.forEach(({ word, convertTo }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      // If convertTo is a single character, repeat it for the length of the word
      // If it's multiple characters, use it as is
      const replacement = convertTo.length === 1 ? convertTo.repeat(word.length) : convertTo;
      formattedText = formattedText.replace(regex, replacement);
    });
  }
  
  formattedText = formattedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // @Mentions: @username (basic styling) - Apply this first
  formattedText = formattedText.replace(/@([\w.-]+)/g, '<span class="bg-accent/20 text-accent font-medium px-0.5 rounded-sm">@$1</span>');

  // Bold: **text** or __text__
  formattedText = formattedText.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
  // Italic: *text* or _text_
  formattedText = formattedText.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
  // Strikethrough: ~~text~~
  formattedText = formattedText.replace(/~~(.*?)~~/g, '<del>$1</del>');
  // Underline: ++text++
  formattedText = formattedText.replace(/\+\+(.*?)\+\+/g, '<u>$1</u>');
  // Superscript: ^^text^^
  formattedText = formattedText.replace(/\^\^(.*?)\^\^/g, '<sup>$1</sup>');
  // Subscript: vvtextvv
  formattedText = formattedText.replace(/vv(.*?)vv/g, '<sub>$1</sub>');
  return formattedText;
};

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedConversation, setSelectedConversation] = useState<DmConversation | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dmPartnerProfile, setDmPartnerProfile] = useState<Partial<User> & {bio?: string; mutualInterests?: string[]} | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<DmConversation[]>([]);
  const [isLoadingConnectedUsers, setIsLoadingConnectedUsers] = useState(false);
  const [conversationSearchTerm, setConversationSearchTerm] = useState("");
  const [currentUnsubscribe, setCurrentUnsubscribe] = useState<(() => void) | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Mute settings state
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [mutedUsersNotifications, setMutedUsersNotifications] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isMessagesRightBarOpen, setIsMessagesRightBarOpen] = useState(true);

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const gifSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [gifPickerView, setGifPickerView] = useState<'search' | 'favorites'>('search');
  const [favoritedGifs, setFavoritedGifs] = useState<TenorGif[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [reactionPickerOpenForMessageId, setReactionPickerOpenForMessageId] = useState<string | null>(null);
  const [chatEmojiPickerOpen, setChatEmojiPickerOpen] = useState(false);
  const [currentThemeMode, setCurrentThemeMode] = useState<'light' | 'dark'>('dark');

  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [forwardSearchTerm, setForwardSearchTerm] = useState("");
  const [isRestrictedWordsDialogOpen, setIsRestrictedWordsDialogOpen] = useState(false);
  const [restrictedWords, setRestrictedWords] = useState<Array<{word: string, convertTo: string}>>([]);
  const [newRestrictedWord, setNewRestrictedWord] = useState("");
  const [newRestrictedWordConvertTo, setNewRestrictedWordConvertTo] = useState("*");

  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const mentionSuggestionsRef = useRef<HTMLDivElement>(null);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenTrack, setLocalScreenTrack] = useState<ILocalVideoTrack | null>(null);

  // Agora state variables
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]); // For DMs, this will likely be one user
  const localVideoPlayerContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoPlayerContainerRef = useRef<HTMLDivElement>(null);

  // State to track current mute settings
  const [currentMuteSettings, setCurrentMuteSettings] = useState<{
    mutedUsers: string[];
    mutedConversations: string[];
    mutedCommunities: string[];
    allowMentionsWhenMuted: boolean;
  }>({
    mutedUsers: [],
    mutedConversations: [],
    mutedCommunities: [],
    allowMentionsWhenMuted: true
  });

  // Check if current conversation is muted
  const isConversationMuted = useMemo(() => {
    if (!currentUser || !conversationId) return false;
    return currentMuteSettings.mutedConversations && currentMuteSettings.mutedConversations.includes(conversationId);
  }, [currentUser, conversationId, currentMuteSettings.mutedConversations]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        
        // Check if there's a conversation parameter in the URL
        const conversationParam = searchParams.get('conversation');
        
        if (conversationParam) {
          // Parse the conversation ID to get the other user ID
          const userIds = conversationParam.split('_');
          const otherUserId = userIds.find(id => id !== user.uid) || user.uid;
          
          // Set up the conversation for the connected user
          setOtherUserId(otherUserId);
          setOtherUserName('Connected User'); // Will be updated when profile is fetched
          
          // Create a temporary conversation object
          const connectedUserConvo: DmConversation = {
            id: conversationParam,
            name: 'Connected User',
            partnerId: otherUserId,
            avatarUrl: undefined,
            dataAiHint: 'person face',
          };
          setSelectedConversation(connectedUserConvo);
        } else {
          // Default to Saved Messages
          const savedMessagesConvo: DmConversation = {
              id: `${user.uid}_self`,
              name: 'Saved Messages',
              partnerId: user.uid,
              avatarUrl: user.photoURL || undefined,
              dataAiHint: 'bookmark save',
          };
          setSelectedConversation(savedMessagesConvo);
          setOtherUserId(user.uid);
          setOtherUserName('Saved Messages');
          setDmPartnerProfile({ // Set partner profile for "Saved Messages"
              uid: user.uid,
              displayName: user.displayName || "You",
              photoURL: user.photoURL,
              email: user.email,
              bio: "This is your personal space to save messages.",
              mutualInterests: [] // No mutual interests for self
          });
        }

        const modeFromStorage = localStorage.getItem(`appSettings_${user.uid}`);
        if (modeFromStorage) {
            const settings = JSON.parse(modeFromStorage);
            setCurrentThemeMode(settings.themeMode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        } else {
             setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }

        const storedFavorites = localStorage.getItem(`favorited_gifs_${user.uid}`);
        setFavoritedGifs(storedFavorites ? JSON.parse(storedFavorites) : []);
        
        // Load restricted words from localStorage
        const storedRestrictedWords = localStorage.getItem(`restricted_words_${user.uid}`);
        if (storedRestrictedWords) {
          const parsed = JSON.parse(storedRestrictedWords);
          // Handle migration from old format (string array) to new format (object array)
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            const migrated = parsed.map((word: string) => ({ word, convertTo: '*' }));
            setRestrictedWords(migrated);
            localStorage.setItem(`restricted_words_${user.uid}`, JSON.stringify(migrated));
          } else {
            setRestrictedWords(parsed);
          }
        } else {
          setRestrictedWords([]);
        }
        setIsCheckingAuth(false);
      } else {
        setIsCheckingAuth(false);
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router, searchParams]);

  // Function to calculate mutual interests between two users
  const calculateMutualInterests = useCallback(async (userId1: string, userId2: string): Promise<string[]> => {
    try {
      // Fetch both users' profiles
      const [user1Doc, user2Doc] = await Promise.all([
        getDoc(doc(db, 'users', userId1)),
        getDoc(doc(db, 'users', userId2))
      ]);

      if (!user1Doc.exists() || !user2Doc.exists()) {
        return [];
      }

      const user1Data = user1Doc.data();
      const user2Data = user2Doc.data();
      
      const user1Profile = user1Data.profileDetails || {};
      const user2Profile = user2Data.profileDetails || {};

      // Extract interests from both users
      const user1Interests = [
        user1Profile.passion,
        ...(user1Profile.hobbies ? user1Profile.hobbies.split(',').map((h: string) => h.trim()) : []),
        ...(user1Profile.tags ? user1Profile.tags.split(',').map((t: string) => t.trim()) : [])
      ].filter(Boolean);

      const user2Interests = [
        user2Profile.passion,
        ...(user2Profile.hobbies ? user2Profile.hobbies.split(',').map((h: string) => h.trim()) : []),
        ...(user2Profile.tags ? user2Profile.tags.split(',').map((t: string) => t.trim()) : [])
      ].filter(Boolean);

      // Find mutual interests (case-insensitive comparison)
      const mutualInterests = user1Interests.filter(interest1 =>
        user2Interests.some(interest2 => 
          interest1.toLowerCase() === interest2.toLowerCase()
        )
      );

      return [...new Set(mutualInterests)]; // Remove duplicates
    } catch (error) {
      console.error('Error calculating mutual interests:', error);
      return [];
    }
  }, []);

  // Function to calculate unread messages for a conversation
  const calculateUnreadMessages = useCallback(async (conversationId: string, currentUserId: string): Promise<number> => {
    try {
      const messagesRef = collection(db, 'direct_messages', conversationId, 'messages');
      // Get all messages and filter client-side to avoid complex queries
      const q = query(messagesRef, orderBy('timestamp', 'desc'));
      
      const snapshot = await getDocs(q);
      const unreadMessages = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.senderId !== currentUserId && (!data.readBy || !data.readBy.includes(currentUserId));
      });
      
      return unreadMessages.length;
    } catch (error) {
      console.error('Error calculating unread messages:', error);
      return 0;
    }
  }, []);

  // Function to mark messages as read for a conversation
  const markMessagesAsRead = useCallback(async (conversationId: string, currentUserId: string) => {
    try {
      const messagesRef = collection(db, 'direct_messages', conversationId, 'messages');
      // Get all messages and filter client-side
      const q = query(messagesRef, orderBy('timestamp', 'desc'));
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let hasUpdates = false;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.senderId !== currentUserId && (!data.readBy || !data.readBy.includes(currentUserId))) {
          const readBy = data.readBy || [];
          readBy.push(currentUserId);
          batch.update(doc.ref, { readBy });
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        await batch.commit();
        // Update unread counts immediately after marking as read
        setTimeout(() => {
          if (currentUser) {
            updateUnreadCounts();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [currentUser]);

  // Function to update unread counts for all conversations
  const updateUnreadCounts = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const updatedConnectedUsers = await Promise.all(
        connectedUsers.map(async (user) => {
          const unreadCount = await calculateUnreadMessages(user.id, currentUser.uid);
          return {
            ...user,
            unreadCount: unreadCount > 0 ? unreadCount : undefined,
          };
        })
      );
      
      setConnectedUsers(updatedConnectedUsers);
    } catch (error) {
      console.error('Error updating unread counts:', error);
    }
  }, [currentUser, connectedUsers, calculateUnreadMessages]);

  // Fetch connected user's profile when navigating from connection
  useEffect(() => {
    const fetchConnectedUserProfile = async () => {
      if (currentUser && otherUserId && otherUserId !== currentUser.uid) {
        try {
          const userDocRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const profile = userData.profileDetails || {};
            
            // Calculate actual mutual interests
            const mutualInterests = await calculateMutualInterests(currentUser.uid, otherUserId);
            
            setDmPartnerProfile({
              uid: otherUserId,
              displayName: profile.displayName || userData.email?.split('@')[0] || "User",
              photoURL: profile.photoURL || null,
              email: userData.email,
              bio: profile.aboutMe || "",
              mutualInterests: mutualInterests
            });
            
            setOtherUserName(profile.displayName || userData.email?.split('@')[0] || "User");
            
            // Update the selected conversation with the user's info
            setSelectedConversation(prev => prev ? {
              ...prev,
              name: profile.displayName || userData.email?.split('@')[0] || "User",
              avatarUrl: profile.photoURL || undefined,
            } : null);
          }
        } catch (error) {
          console.error('Error fetching connected user profile:', error);
        }
      }
    };

    fetchConnectedUserProfile();
  }, [currentUser, otherUserId, calculateMutualInterests]);


  useEffect(() => {
    if (currentUser && otherUserId) {
      const ids = [currentUser.uid, otherUserId].sort();
      setConversationId(`${ids[0]}_${ids[1]}`);
    } else {
        setConversationId(null);
    }
  }, [currentUser, otherUserId]);

  // Fetch all connected users
  const fetchConnectedUsers = useCallback(async () => {
    if (!currentUser) return;

    setIsLoadingConnectedUsers(true);
    try {
      // Get all connection requests where the current user is involved and status is 'accepted'
      const requestsRef = collection(db, 'connectionRequests');
      const q = query(
        requestsRef,
        where('status', '==', 'accepted'),
        where('fromUserId', '==', currentUser.uid)
      );
      const fromSnapshot = await getDocs(q);
      
      const q2 = query(
        requestsRef,
        where('status', '==', 'accepted'),
        where('toUserId', '==', currentUser.uid)
      );
      const toSnapshot = await getDocs(q2);

      const connectedUserIds = new Set<string>();
      
      // Add users the current user sent requests to
      fromSnapshot.docs.forEach(doc => {
        const data = doc.data();
        connectedUserIds.add(data.toUserId);
      });
      
      // Add users who sent requests to the current user
      toSnapshot.docs.forEach(doc => {
        const data = doc.data();
        connectedUserIds.add(data.fromUserId);
      });

      // Fetch user profiles and conversation data for connected users
      const connectedUsersData: (DmConversation & { lastMessageTimestamp?: any })[] = [];
      
      for (const userId of connectedUserIds) {
        try {
          const userDocRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const profile = userData.profileDetails || {};
            
            const conversationId = [currentUser.uid, userId].sort().join('_');
            
            // Fetch conversation document to get last message timestamp
            const conversationRef = doc(db, 'direct_messages', conversationId);
            const conversationDoc = await getDoc(conversationRef);
            
            let lastMessageTimestamp = null;
            if (conversationDoc.exists()) {
              const conversationData = conversationDoc.data();
              lastMessageTimestamp = conversationData.lastMessageTimestamp;
            }
            
            connectedUsersData.push({
              id: conversationId,
              name: profile.displayName || userData.email?.split('@')[0] || "User",
              partnerId: userId,
              avatarUrl: profile.photoURL || undefined,
              dataAiHint: 'person face',
              lastMessageTimestamp: lastMessageTimestamp,
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
        }
      }

      // Sort by last message timestamp (most recent first)
      const sortedConnectedUsers = connectedUsersData.sort((a, b) => {
        // If both have timestamps, compare them
        if (a.lastMessageTimestamp && b.lastMessageTimestamp) {
          const aTime = a.lastMessageTimestamp.toDate ? a.lastMessageTimestamp.toDate() : new Date(a.lastMessageTimestamp);
          const bTime = b.lastMessageTimestamp.toDate ? b.lastMessageTimestamp.toDate() : new Date(b.lastMessageTimestamp);
          return bTime.getTime() - aTime.getTime(); // Most recent first
        }
        
        // If only one has timestamp, prioritize the one with timestamp
        if (a.lastMessageTimestamp && !b.lastMessageTimestamp) return -1;
        if (!a.lastMessageTimestamp && b.lastMessageTimestamp) return 1;
        
        // If neither has timestamp, sort alphabetically by name
        return a.name.localeCompare(b.name);
      });

      // Calculate unread counts for each conversation
      const finalConnectedUsers: DmConversation[] = [];
      
      for (const user of sortedConnectedUsers) {
        const unreadCount = await calculateUnreadMessages(user.id, currentUser.uid);
        finalConnectedUsers.push({
        id: user.id,
        name: user.name,
        partnerId: user.partnerId,
        avatarUrl: user.avatarUrl,
        dataAiHint: user.dataAiHint,
          unreadCount: unreadCount > 0 ? unreadCount : undefined,
        });
      }

      setConnectedUsers(finalConnectedUsers);
    } catch (error) {
      console.error('Error fetching connected users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load connected users.",
      });
    } finally {
      setIsLoadingConnectedUsers(false);
    }
  }, [currentUser, toast]);

  // Fetch connected users when current user changes
  useEffect(() => {
    fetchConnectedUsers();
  }, [fetchConnectedUsers]);



  // Save mute settings to Firestore
  const saveMuteSettings = useCallback(async () => {
    if (!currentUser) return;
    try {
      console.log('💾 Saving mute settings to Firestore:', {
        mutedUsers: Array.from(mutedUsers),
        mutedUsersNotifications: Array.from(mutedUsersNotifications)
      });
      const userDocRef = doc(db, "users", currentUser.uid);
      const muteData = {
        muteSettings: {
          mutedUsers: Array.from(mutedUsers),
          mutedUsersNotifications: Array.from(mutedUsersNotifications)
        }
      };
      console.log('💾 Attempting to save mute data:', muteData);
      await setDoc(userDocRef, muteData, { merge: true });
      console.log('✅ Mute settings saved to Firestore successfully');
    } catch (error: any) {
      console.error('❌ Error saving mute settings:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
    }
  }, [currentUser, mutedUsers, mutedUsersNotifications]);

  // Load mute settings from Firestore
  const loadMuteSettings = useCallback(async () => {
    if (!currentUser) return;
    try {
      console.log('🔄 Loading mute settings for user:', currentUser.uid);
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('🔄 User document data:', userData);
        
        if (userData.muteSettings) {
          const muteSettings = userData.muteSettings;
          console.log('🔄 Found mute settings:', muteSettings);
          setMutedUsers(new Set(muteSettings.mutedUsers || []));
          setMutedUsersNotifications(new Set(muteSettings.mutedUsersNotifications || []));
          console.log('✅ Mute settings loaded from Firestore successfully');
        } else {
          console.log('⚠️ No mute settings found in user document');
          setMutedUsers(new Set());
          setMutedUsersNotifications(new Set());
        }
      } else {
        console.log('⚠️ User document does not exist');
        setMutedUsers(new Set());
        setMutedUsersNotifications(new Set());
      }
    } catch (error: any) {
      console.error('❌ Error loading mute settings:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      setMutedUsers(new Set());
      setMutedUsersNotifications(new Set());
    }
  }, [currentUser]);

  // Ensure mute settings are loaded on mount
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Loading mute settings on mount for user:', currentUser.uid);
      loadMuteSettings();
    }
  }, [currentUser, loadMuteSettings]);

  // Auto-save mute settings whenever they change
  useEffect(() => {
    if (currentUser && (mutedUsers.size > 0 || mutedUsersNotifications.size > 0)) {
      console.log('🔄 Auto-saving mute settings due to state change');
      saveMuteSettings();
    }
  }, [mutedUsers, mutedUsersNotifications, currentUser, saveMuteSettings]);

  // Auto-save mute settings whenever they change
  useEffect(() => {
    if (currentUser && (mutedUsers.size > 0 || mutedUsersNotifications.size > 0)) {
      console.log('🔄 Auto-saving mute settings due to state change');
      saveMuteSettings();
    }
  }, [mutedUsers, mutedUsersNotifications, currentUser, saveMuteSettings]);

  const handleMuteUser = useCallback((userId: string) => {
    setMutedUsers(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      console.log('🔇 Muting all for user:', userId, 'New set:', Array.from(newSet));
      return newSet;
    });
    // Save after state update
    setTimeout(() => saveMuteSettings(), 0);
    toast({
      title: "User Muted",
      description: "You will no longer receive messages from this user.",
    });
  }, [saveMuteSettings, toast]);

  const handleUnmuteUser = useCallback((userId: string) => {
    setMutedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      console.log('🔊 Unmuting all for user:', userId, 'New set:', Array.from(newSet));
      return newSet;
    });
    // Save after state update
    setTimeout(() => saveMuteSettings(), 0);
    toast({
      title: "User Unmuted",
      description: "You will now receive messages from this user again.",
    });
  }, [saveMuteSettings, toast]);

  const handleMuteUserNotifications = useCallback((userId: string) => {
    setMutedUsersNotifications(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      console.log('🔇 Muting notifications for user:', userId, 'New set:', Array.from(newSet));
      return newSet;
    });
    // Save after state update
    setTimeout(() => saveMuteSettings(), 0);
    toast({
      title: "Notifications Muted",
      description: "You will no longer receive notifications from this user.",
    });
  }, [saveMuteSettings, toast]);

  const handleUnmuteUserNotifications = useCallback((userId: string) => {
    setMutedUsersNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      console.log('🔊 Unmuting notifications for user:', userId, 'New set:', Array.from(newSet));
      return newSet;
    });
    // Save after state update
    setTimeout(() => saveMuteSettings(), 0);
    toast({
      title: "Notifications Unmuted",
      description: "You will now receive notifications from this user again.",
    });
  }, [saveMuteSettings, toast]);

  // Listen for connection accepted events to refresh the list
  useEffect(() => {
    const handleConnectionAccepted = () => {
      fetchConnectedUsers();
    };

    window.addEventListener('connectionAccepted', handleConnectionAccepted);
    
    return () => {
      window.removeEventListener('connectionAccepted', handleConnectionAccepted);
    };
  }, [fetchConnectedUsers]);

  // Function to refresh connected users (can be called from other components)
  const refreshConnectedUsers = () => {
    fetchConnectedUsers();
  };

  // Function to create activity notification for new messages
  const createMessageNotification = useCallback(async (recipientId: string, messageText: string, conversationId: string) => {
    if (!currentUser || !recipientId || recipientId === currentUser.uid) return;
    
    try {
      const activityRef = collection(db, `users/${recipientId}/activityItems`);
      await addDoc(activityRef, {
        type: 'new_message',
        actorId: currentUser.uid,
        actorName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        actorAvatarUrl: currentUser.photoURL || null,
        contentSnippet: `sent you a message: "${messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText}"`,
        timestamp: serverTimestamp(),
        isRead: false,
        conversationId: conversationId,
        targetUserId: recipientId,
      });
      console.log('✅ Message notification created for user:', recipientId);
    } catch (error) {
      console.error('Error creating message notification:', error);
    }
  }, [currentUser]);

  // Test function to debug conversation creation permissions


  // Cleanup effect to ensure listeners are properly cleaned up
  useEffect(() => {
    return () => {
      if (currentUnsubscribe) {
        currentUnsubscribe();
        setCurrentUnsubscribe(null);
      }
    };
  }, [currentUnsubscribe]);

  const ensureConversationDocument = useCallback(async (): Promise<boolean> => {
    console.log("ensureConversationDocument called with:", { 
      hasCurrentUser: !!currentUser, 
      currentUserUid: currentUser?.uid,
      otherUserId, 
      conversationId 
    });
    
    if (!currentUser || !otherUserId || !conversationId) {
        console.log("Missing required data for conversation:", { currentUser: !!currentUser, otherUserId, conversationId });
        return false;
    }

    // Verify authentication state
    if (!auth.currentUser) {
        console.error("No authenticated user found");
        toast({ 
            variant: "destructive", 
            title: "Authentication Error", 
            description: "Please log in again." 
        });
        return false;
    }

    console.log("Authentication verified:", {
        authCurrentUser: auth.currentUser.uid,
        currentUserUid: currentUser.uid,
        match: auth.currentUser.uid === currentUser.uid
    });

    const convoDocRef = doc(db, `direct_messages/${conversationId}`);
    
    try {
        // First, try to get the existing document
        const convoSnap = await getDoc(convoDocRef);
        
        if (convoSnap.exists()) {
            console.log("Conversation document already exists:", conversationId);
            return true;
        }

        // Create new conversation document
        console.log("Creating new conversation document:", conversationId);
        
        let participants = [currentUser.uid, otherUserId].sort();
        if (currentUser.uid === otherUserId) { 
            participants = [currentUser.uid, currentUser.uid];
        }

        // Prepare conversation data with null safety
        const conversationData = {
            participants: participants,
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
            [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
            [`user_${otherUserId}_name`]: dmPartnerProfile?.displayName || (otherUserId === currentUser.uid ? (currentUser.displayName || "You") : "User"),
            [`user_${otherUserId}_avatar`]: dmPartnerProfile?.photoURL || (otherUserId === currentUser.uid ? currentUser.photoURL : null),
        };

        // Filter out undefined values and ensure all values are valid
        const filteredData = Object.fromEntries(
            Object.entries(conversationData).filter(([_, value]) => {
                if (value === undefined) return false;
                if (value === null) return true; // Allow null values
                if (typeof value === 'string' && value.trim() === '') return false; // Filter empty strings
                return true;
            })
        );

        console.log("Creating conversation with data:", filteredData);
        console.log("Participants array:", participants);
        console.log("Current user UID:", currentUser.uid);
        console.log("Other user ID:", otherUserId);
        
        // Try multiple approaches to create the document
        try {
            // Approach 1: Direct setDoc
            await setDoc(convoDocRef, filteredData);
            console.log("✅ Conversation document created successfully with setDoc");
            return true;
        } catch (setDocError: any) {
            console.error("setDoc failed:", setDocError);
            
            try {
                // Approach 2: Try with addDoc to a subcollection first
                const tempCollectionRef = collection(db, 'temp_conversations');
                await addDoc(tempCollectionRef, {
                    ...filteredData,
                    originalConversationId: conversationId,
                    temp: true
                });
                console.log("✅ Temporary conversation created, will migrate later");
                
                // For now, return true to allow messaging to continue
                return true;
            } catch (addDocError: any) {
                console.error("addDoc also failed:", addDocError);
                
                // Approach 3: Skip conversation creation for now and just return true
                console.log("⚠️ Skipping conversation creation, allowing messaging to continue");
                return true;
            }
        }
        
    } catch (error: any) {
        console.error("Error ensuring conversation document:", error);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        
        // Log specific error details for debugging
        if (error.code === 'permission-denied') {
            console.error("Permission denied error details:", {
                conversationId,
                currentUserUid: currentUser?.uid,
                otherUserId,
                participants: [currentUser?.uid, otherUserId].sort(),
                errorCode: error.code,
                errorMessage: error.message,
                errorStack: error.stack
            });
        }
        
        // Try to recover by checking if document was actually created
        try {
            const recoverySnap = await getDoc(convoDocRef);
            if (recoverySnap.exists()) {
                console.log("Conversation document exists after error, continuing...");
                return true;
            }
        } catch (recoveryError) {
            console.error("Recovery check failed:", recoveryError);
        }
        
        // For now, allow messaging to continue even if conversation creation fails
        console.log("⚠️ Allowing messaging to continue despite conversation creation failure");
        return true;
    }
  }, [currentUser, otherUserId, conversationId, dmPartnerProfile, toast]);


  useEffect(() => {
    if (conversationId && currentUser && otherUserId && dmPartnerProfile) {
      console.log("Setting up messages listener for conversation:", conversationId);
      
      if (currentUser.uid === otherUserId && conversationId === `${currentUser.uid}_${currentUser.uid}`) {
        ensureConversationDocument(); 
      }
      
      setMessages([]);
      
      // Mark notifications as read when conversation is loaded
      markMessageNotificationsAsRead();
      
      // Add a small delay to ensure conversation document is created
      const setupMessagesListener = async () => {
        try {
          // Ensure conversation exists before setting up listener
          const conversationReady = await ensureConversationDocument();
          if (!conversationReady) {
            console.log("Conversation not ready, skipping messages listener");
            return;
          }
          
          // Mark message notifications as read when conversation is loaded
          markMessageNotificationsAsRead();
          
          const messagesQueryRef = collection(db, `direct_messages/${conversationId}/messages`);
          const q = query(messagesQueryRef, orderBy('timestamp', 'asc'));

          const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
            try {
              const fetchedMessages = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                  id: docSnap.id,
                  text: data.text,
                  senderId: data.senderId,
                  senderName: data.senderName,
                  senderAvatarUrl: data.senderAvatarUrl || null,
                  timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
                  type: data.type || 'text',
                  fileUrl: data.fileUrl,
                  fileName: data.fileName,
                  fileType: data.fileType,
                  gifUrl: data.gifUrl,
                  gifId: data.gifId,
                  gifTinyUrl: data.gifTinyUrl,
                  gifContentDescription: data.gifContentDescription,
                  isPinned: data.isPinned || false,
                  reactions: data.reactions || {},
                  replyToMessageId: data.replyToMessageId,
                  replyToSenderName: data.replyToSenderName,
                  replyToSenderId: data.replyToSenderId,
                  replyToTextSnippet: data.replyToTextSnippet,
                  isForwarded: data.isForwarded || false,
                  forwardedFromSenderName: data.forwardedFromSenderName,
                  mentionedUserIds: data.mentionedUserIds || [],
                  readBy: data.readBy || [],
                } as ChatMessage;
              });
              
              if (fetchedMessages.length > 0 || querySnapshot.metadata.hasPendingWrites === false) {
                setMessages(fetchedMessages);
                // Mark message notifications as read when messages are loaded
                if (fetchedMessages.length > 0) {
                  markMessageNotificationsAsRead();
                  // Mark messages as read when conversation is active
                  markMessagesAsRead(conversationId, currentUser.uid);
                  // Update unread counts for all conversations
                  updateUnreadCounts();
                }
              }
              
              // Check if there are new unread messages and update counts immediately
              const newMessages = fetchedMessages.filter(msg => 
                msg.senderId !== currentUser.uid && 
                (!msg.readBy || !msg.readBy.includes(currentUser.uid))
              );
              
              if (newMessages.length > 0) {
                // Update unread count for current conversation immediately
                setConnectedUsers(prev => prev.map(user => {
                  if (user.id === conversationId) {
                    const currentUnread = user.unreadCount || 0;
                    return { ...user, unreadCount: currentUnread + newMessages.length };
                  }
                  return user;
                }));
              }
            } catch (parseError) {
              console.error("Error parsing messages:", parseError);
              setMessages([{
                id: 'system-error-dm',
                text: 'Error loading messages. Please try refreshing the page.',
                senderId: 'system',
                senderName: 'System',
                timestamp: new Date(),
                type: 'text',
              } as ChatMessage]);
            }
          }, (error) => {
            console.error("Error fetching DM messages: ", error);
            
            // Check if it's a permission error or internal error
            if (error.code === 'permission-denied') {
              toast({ 
                variant: "destructive", 
                title: "Permission Error", 
                description: "You don't have permission to access this conversation." 
              });
            } else {
              toast({ 
                variant: "destructive", 
                title: "Error loading messages", 
                description: "Could not load DMs. Please try refreshing the page." 
              });
            }
            
            setMessages([{
              id: 'system-error-dm',
              text: 'Error loading messages. Please check your connection and try again.',
              senderId: 'system',
              senderName: 'System',
              timestamp: new Date(),
              type: 'text',
            } as ChatMessage]);
          });
          
          // Store the unsubscribe function
          return unsubscribeFirestore;
        } catch (setupError) {
          console.error("Error setting up messages listener:", setupError);
          toast({ 
            variant: "destructive", 
            title: "Setup Error", 
            description: "Could not set up message listener. Please try refreshing the page." 
          });
          return null;
        }
      };
      
      // Clean up any existing listener
      if (currentUnsubscribe) {
        currentUnsubscribe();
        setCurrentUnsubscribe(null);
      }
      
      // Set up the listener with a small delay
      const timeoutId = setTimeout(() => {
        setupMessagesListener().then(unsubscribe => {
          if (unsubscribe) {
            setCurrentUnsubscribe(() => unsubscribe);
          }
        });
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        if (currentUnsubscribe) {
          currentUnsubscribe();
          setCurrentUnsubscribe(null);
        }
      };
    } else {
      setMessages([]);
    }
  }, [conversationId, currentUser, otherUserId, dmPartnerProfile, toast, ensureConversationDocument]);


  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages, showPinnedMessages, chatSearchTerm]);

  const getFavoriteStorageKey = () => currentUser ? `favorited_gifs_${currentUser.uid}` : null;

  const handleToggleFavoriteGif = (gif: TenorGif) => {
    if (!currentUser) return;
    const key = getFavoriteStorageKey();
    if (!key) return;
    let updatedFavorites;
    if (favoritedGifs.some(fav => fav.id === gif.id)) {
      updatedFavorites = favoritedGifs.filter(fav => fav.id !== gif.id);
      toast({ title: "GIF Unfavorited" });
    } else {
      updatedFavorites = [...favoritedGifs, gif];
      toast({ title: "GIF Favorited!" });
    }
    setFavoritedGifs(updatedFavorites);
    localStorage.setItem(key, JSON.stringify(updatedFavorites));
  };

  const isGifFavorited = (gifId: string): boolean => !!favoritedGifs.find(fav => fav.id === gifId);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    
    console.log("Attempting to send message:", { 
      hasMessage: !!newMessage.trim(), 
      hasUser: !!currentUser, 
      hasConversationId: !!conversationId, 
      hasOtherUserId: !!otherUserId 
    });
    
    if (newMessage.trim() === "" || !currentUser || !conversationId || !otherUserId) {
      console.log("Cannot send message - missing required data");
      return;
    }

    try {
      const conversationReady = await ensureConversationDocument();
      if (!conversationReady) {
        console.log("Conversation not ready, cannot send message");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not send message. Please try again.",
        });
        return;
      }

          const messageText = newMessage.trim();
      const mentionRegex = /@([\w.-]+)/g;
      let match;
      const mentionedUserDisplayNames: string[] = [];
      while ((match = mentionRegex.exec(messageText)) !== null) {
        mentionedUserDisplayNames.push(match[1]);
      }
      const resolvedMentionedUserIds = mentionedUserDisplayNames; 

      const messageData: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        senderAvatarUrl: currentUser.photoURL || undefined,
        timestamp: serverTimestamp() as Timestamp,
        type: 'text' as const,
        text: messageText,
      };
      if (resolvedMentionedUserIds.length > 0) messageData.mentionedUserIds = resolvedMentionedUserIds;
      if (replyingToMessage) {
          messageData.replyToMessageId = replyingToMessage.id;
          messageData.replyToSenderName = replyingToMessage.senderName;
          messageData.replyToSenderId = replyingToMessage.senderId;
          messageData.replyToTextSnippet = (replyingToMessage.text || (replyingToMessage.type === 'image' ? 'Image' : replyingToMessage.type === 'file' ? `File: ${replyingToMessage.fileName || 'attachment'}` : replyingToMessage.type === 'gif' ? 'GIF' : replyingToMessage.type === 'voice_message' ? 'Voice Message' : '')).substring(0, 75) + ((replyingToMessage.text && replyingToMessage.text.length > 75) || (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : '');
      }

      console.log("Sending message with data:", messageData);

      const messagesColRef = collection(db, `direct_messages/${conversationId}/messages`);
      await addDoc(messagesColRef, messageData);

      const convoDocRef = doc(db, `direct_messages/${conversationId}`);
      await updateDoc(convoDocRef, {
        lastMessage: messageData.text,
        lastMessageTimestamp: serverTimestamp(),
        [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
        [`user_${otherUserId}_name`]: dmPartnerProfile?.displayName || (otherUserId === currentUser.uid ? (currentUser.displayName || "You") : "User"),
        [`user_${otherUserId}_avatar`]: dmPartnerProfile?.photoURL || (otherUserId === currentUser.uid ? currentUser.photoURL : null),
      });

      setNewMessage("");
      setReplyingToMessage(null);
      setShowMentionSuggestions(false);
      
      console.log("Message sent successfully");

      // Create activity notification for the recipient (only if notifications not muted)
      if (otherUserId && !mutedUsersNotifications.has(otherUserId)) {
        await createMessageNotification(otherUserId, messageText, conversationId);
      }
      
      // Update unread counts after sending message
      updateUnreadCounts();
    } catch (error) {
      console.error("Error sending DM:", error);
      
      // Check for specific error types
      if (error.code === 'permission-denied') {
        toast({ 
          variant: "destructive", 
          title: "Permission Error", 
          description: "You don't have permission to send messages in this conversation." 
        });
      } else if (error.code === 'unavailable') {
        toast({ 
          variant: "destructive", 
          title: "Connection Error", 
          description: "Network error. Please check your connection and try again." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Message Not Sent", 
          description: "Could not send your message. Please try again." 
        });
      }
    }
  };

  const sendAttachmentMessageToFirestore = async (fileUrl: string, fileName: string, fileType: string) => {
    if (!currentUser || !conversationId || !otherUserId) {
        toast({ variant: "destructive", title: "Error", description: "Cannot send attachment." });
        return;
    }

    const conversationReady = await ensureConversationDocument();
    if (!conversationReady) return;

    let messageType: ChatMessage['type'] = 'file';
    if (fileType.startsWith('image/')) {
      messageType = 'image';
    } else if (fileType.startsWith('audio/')) {
      messageType = 'voice_message';
    }

    const messageData: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        senderAvatarUrl: currentUser.photoURL || undefined,
        timestamp: serverTimestamp() as Timestamp,
        type: messageType,
        fileUrl: fileUrl,
        fileName: fileName,
        fileType: fileType,
    };
    if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        messageData.replyToSenderId = replyingToMessage.senderId;
        messageData.replyToTextSnippet = (replyingToMessage.text || (replyingToMessage.type === 'image' ? 'Image' : replyingToMessage.type === 'file' ? `File: ${replyingToMessage.fileName || 'attachment'}` : replyingToMessage.type === 'gif' ? 'GIF' : replyingToMessage.type === 'voice_message' ? 'Voice Message' : '')).substring(0, 75) + ((replyingToMessage.text && replyingToMessage.text.length > 75) || (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : '');
    }


    try {
      const messagesColRef = collection(db, `direct_messages/${conversationId}/messages`);
      await addDoc(messagesColRef, messageData);

       const convoDocRef = doc(db, `direct_messages/${conversationId}`);
        await updateDoc(convoDocRef, {
            lastMessage: messageType === 'image' ? 'Sent an image' : (messageType === 'voice_message' ? 'Sent a voice message' : `Sent a file: ${fileName}`),
            lastMessageTimestamp: serverTimestamp(),
            [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
            [`user_${otherUserId}_name`]: dmPartnerProfile?.displayName || (otherUserId === currentUser.uid ? (currentUser.displayName || "You") : "User"),
            [`user_${otherUserId}_avatar`]: dmPartnerProfile?.photoURL || (otherUserId === currentUser.uid ? currentUser.photoURL : null),
        });
      setReplyingToMessage(null);
      toast({ title: `${messageType.charAt(0).toUpperCase() + messageType.slice(1).replace('_', ' ')} Sent!` });

      // Create activity notification for the recipient (only if notifications not muted)
      if (otherUserId && !mutedUsersNotifications.has(otherUserId)) {
        await createMessageNotification(otherUserId, `sent you a ${messageType}`, conversationId);
      }
      
      // Update unread counts after sending attachment
      updateUnreadCounts();
    } catch (error) {
      console.error(`Error sending ${messageType}:`, error);
      toast({ variant: "destructive", title: `${messageType.charAt(0).toUpperCase() + messageType.slice(1).replace('_', ' ')} Not Sent`, description: `Could not send your ${messageType}.`});
    }
  };

  const uploadFileToCloudinaryAndSend = async (file: File, isVoiceMessage: boolean = false) => {
    if (!currentUser) return;
    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('resource_type', isVoiceMessage ? 'video' : 'auto');
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVoiceMessage ? 'video' : 'auto'}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Cloudinary upload failed.');
      }
      const data = await response.json();
      const secureUrl = data.secure_url;
      const originalFilename = data.original_filename || file.name;
      const fileTypeFromCloudinary = isVoiceMessage ? file.type : (data.resource_type === 'video' && data.format === 'webm' ? 'audio/webm' : (data.format ? `${data.resource_type}/${data.format}` : file.type));

      if (secureUrl) {
        await sendAttachmentMessageToFirestore(secureUrl, originalFilename, fileTypeFromCloudinary);
      } else {
        throw new Error('Cloudinary did not return a URL.');
      }
    } catch (error: any) {
      console.error("Error during Cloudinary upload or message sending:", error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload file or send message.',
      });
    } finally {
      setIsUploadingFile(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: `Please select a file smaller than ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
      });
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please select a supported file type (images, audio, PDF, DOC, TXT).',
        });
        if (attachmentInputRef.current) attachmentInputRef.current.value = "";
        return;
    }
    uploadFileToCloudinaryAndSend(file);
  };

  const handleSendGif = async (gif: TenorGif) => {
    if (!currentUser || !conversationId || !otherUserId) return;

    const conversationReady = await ensureConversationDocument();
    if (!conversationReady) return;

    const messageData: Partial<ChatMessage> = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      senderAvatarUrl: currentUser.photoURL || undefined,
      timestamp: serverTimestamp() as Timestamp,
      type: 'gif' as const,
      gifUrl: gif.media_formats.gif.url,
      gifId: gif.id,
      gifTinyUrl: gif.media_formats.tinygif.url,
      gifContentDescription: gif.content_description,
    };
    if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        messageData.replyToSenderId = replyingToMessage.senderId;
        messageData.replyToTextSnippet = (replyingToMessage.text || (replyingToMessage.type === 'image' ? 'Image' : replyingToMessage.type === 'file' ? `File: ${replyingToMessage.fileName || 'attachment'}` : replyingToMessage.type === 'gif' ? 'GIF' : replyingToMessage.type === 'voice_message' ? 'Voice Message' : '')).substring(0, 75) + ((replyingToMessage.text && replyingToMessage.text.length > 75) || (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : '');
    }

    try {
      const messagesColRef = collection(db, `direct_messages/${conversationId}/messages`);
      await addDoc(messagesColRef, messageData);
        const convoDocRef = doc(db, `direct_messages/${conversationId}`);
        await updateDoc(convoDocRef, {
            lastMessage: 'Sent a GIF',
            lastMessageTimestamp: serverTimestamp(),
            [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
            [`user_${otherUserId}_name`]: dmPartnerProfile?.displayName || (otherUserId === currentUser.uid ? (currentUser.displayName || "You") : "User"),
            [`user_${otherUserId}_avatar`]: dmPartnerProfile?.photoURL || (otherUserId === currentUser.uid ? currentUser.photoURL : null),
        });
      setShowGifPicker(false); setGifSearchTerm(""); setGifs([]);
      setReplyingToMessage(null);

      // Create activity notification for the recipient (only if notifications not muted)
      if (otherUserId && !mutedUsersNotifications.has(otherUserId)) {
        await createMessageNotification(otherUserId, "sent you a GIF", conversationId);
      }
      
      // Update unread counts after sending GIF
      updateUnreadCounts();
    } catch (error) {
      console.error("Error sending GIF:", error);
      toast({ variant: "destructive", title: "GIF Not Sent", description: "Could not send GIF." });
    }
  };

  const handleFavoriteGifFromChat = (message: ChatMessage) => {
    if (!message.gifId || !message.gifTinyUrl || !message.gifContentDescription) {
        toast({ variant: "destructive", title: "Cannot Favorite", description: "GIF information missing."});
        return;
    }
    const gifToFavorite: TenorGif = {
        id: message.gifId,
        media_formats: {
            tinygif: { url: message.gifTinyUrl, dims: [0,0], preview: '', duration: 0, size:0 },
            gif: { url: message.gifUrl || '', dims: [0,0], preview: '', duration: 0, size:0 }
        },
        content_description: message.gifContentDescription,
        created: 0, hasaudio: false, itemurl: '', shares: 0, source_id: '', tags: [], url: '', composite: null, hascaption: false, title: '', flags: []
    };
    handleToggleFavoriteGif(gifToFavorite);
  };

  const handleDeleteMessage = async () => {
    console.log("🗑️ handleDeleteMessage called with:", { deletingMessageId, conversationId, currentUserUid: currentUser?.uid });
    
    if (!deletingMessageId || !conversationId || !currentUser) {
        console.log("❌ Cannot delete message - missing data");
        toast({ variant: "destructive", title: "Error", description: "Cannot delete message." });
        setDeletingMessageId(null);
        return;
    }
    const msgDoc = messages.find(m => m.id === deletingMessageId);
    if (msgDoc && msgDoc.senderId !== currentUser.uid) {
      console.log("❌ Cannot delete message - not the sender");
      toast({ variant: "destructive", title: "Error", description: "You can only delete your own messages." });
      setDeletingMessageId(null); return;
    }
    try {
      console.log("🗑️ Attempting to delete message:", deletingMessageId);
      await deleteDoc(doc(db, `direct_messages/${conversationId}/messages/${deletingMessageId}`));
      console.log("✅ Message deleted successfully");
      toast({ title: "Message Deleted" });
    } catch (error) {
      console.error("❌ Error deleting DM:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete the message." });
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Function to mark message notifications as read when viewing a conversation
  const markMessageNotificationsAsRead = useCallback(async () => {
    if (!currentUser || !conversationId) {
      console.log("Cannot mark notifications as read - missing data:", { currentUser: !!currentUser, conversationId });
      return;
    }

    try {
      console.log("🔍 Checking for unread message notifications for conversation:", conversationId);
      
      // Get all unread message notifications for this conversation
      const activityItemsRef = collection(db, `users/${currentUser.uid}/activityItems`);
      const q = query(
        activityItemsRef,
        where("type", "==", "new_message"),
        where("conversationId", "==", conversationId),
        where("isRead", "==", false)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`🔍 Found ${querySnapshot.size} unread message notifications for conversation: ${conversationId}`);
      
      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
          console.log("📝 Marking notification as read:", doc.id);
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
        console.log(`✅ Successfully marked ${querySnapshot.size} message notifications as read for conversation: ${conversationId}`);
      } else {
        console.log("ℹ️ No unread message notifications found for this conversation");
      }
    } catch (error) {
      console.error("❌ Error marking message notifications as read:", error);
    }
  }, [currentUser, conversationId]);

  // Function to handle delete button click with Shift+click support
  const handleDeleteButtonClick = async (messageId: string, event: React.MouseEvent) => {
    console.log("🔍 Delete button clicked:", { messageId, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey });
    
    if (event.shiftKey) {
      // Shift+click: Delete immediately without confirmation
      console.log("🚀 Shift+click detected - deleting immediately");
      setDeletingMessageId(messageId);
      await handleDeleteMessage();
    } else {
      // Normal click: Show confirmation dialog
      console.log("📋 Normal click - showing confirmation dialog");
      setDeletingMessageId(messageId);
    }
  };

  const handleTogglePinMessage = async (messageId: string, currentPinnedStatus: boolean) => {
    if (!conversationId || !currentUser) return;
    
    try {
      // First, get the message to check if the user is the sender
      const messageRef = doc(db, `direct_messages/${conversationId}/messages/${messageId}`);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        toast({ variant: "destructive", title: "Error", description: "Message not found." });
        return;
      }
      
      const messageData = messageDoc.data();
      
      // Check if the user is the sender of the message (only sender can pin/unpin)
      if (messageData.senderId !== currentUser.uid) {
        toast({ variant: "destructive", title: "Permission Denied", description: "You can only pin your own messages." });
        return;
      }
      
      // Update the pin status
      await updateDoc(messageRef, { isPinned: !currentPinnedStatus });
      toast({ title: `Message ${!currentPinnedStatus ? 'Pinned' : 'Unpinned'}` });
    } catch (error) {
      console.error("Error pinning DM:", error);
      
      // Check for specific error types
      if (error.code === 'permission-denied') {
        toast({ variant: "destructive", title: "Permission Denied", description: "You don't have permission to pin this message." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not update pin status." });
      }
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !conversationId) return;

    const messageRef = doc(db, `direct_messages/${conversationId}/messages/${messageId}`);
    try {
      await runTransaction(db, async (transaction) => {
        const messageDocSnap = await transaction.get(messageRef);
        if (!messageDocSnap.exists()) {
          throw new Error("Message document not found to toggle reaction.");
        }
        const currentReactions = (messageDocSnap.data().reactions || {}) as Record<string, string[]>;
        const usersReactedWithEmoji = currentReactions[emoji] || [];

        let newUsersReactedWithEmoji;
        if (usersReactedWithEmoji.includes(currentUser.uid)) {
          newUsersReactedWithEmoji = usersReactedWithEmoji.filter(uid => uid !== currentUser.uid);
        } else {
          newUsersReactedWithEmoji = [...usersReactedWithEmoji, currentUser.uid];
        }

        const newReactionsData = { ...currentReactions };
        if (newUsersReactedWithEmoji.length === 0) {
          delete newReactionsData[emoji];
        } else {
          newReactionsData[emoji] = newUsersReactedWithEmoji;
        }
        transaction.update(messageRef, { reactions: newReactionsData });
      });
    setReactionPickerOpenForMessageId(null);
    } catch (error) {
      console.error("Error toggling reaction: ", error);
      toast({
        variant: "destructive",
        title: "Reaction Failed",
        description: "Could not update reaction.",
      });
    }
  };

  const handleReplyClick = (message: ChatMessage) => {
    setReplyingToMessage(message);
    chatInputRef.current?.focus();
  };

  const handleForwardMessage = async () => {
    if (!forwardingMessage || !currentUser ) {
        toast({ variant: "destructive", title: "Forward Error", description: "Cannot forward message." });
        setIsForwardDialogOpen(false);
        setForwardingMessage(null);
        return;
    }

    const targetConversationId = [currentUser.uid, currentUser.uid].sort().join('_');

    const savedMessagesConvoDocRef = doc(db, `direct_messages/${targetConversationId}`);
    try {
        const savedMessagesConvoSnap = await getDoc(savedMessagesConvoDocRef);
        if (!savedMessagesConvoSnap.exists()) {
            const participants = [currentUser.uid, currentUser.uid]; 
            await setDoc(savedMessagesConvoDocRef, {
                participants: participants,
                createdAt: serverTimestamp(),
                lastMessageTimestamp: serverTimestamp(),
                [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
                [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
            });
        }
    } catch (error) {
        console.error("Error ensuring Saved Messages conversation:", error);
        toast({ variant: "destructive", title: "Forward Error", description: "Could not prepare Saved Messages." });
        setIsForwardDialogOpen(false);
        setForwardingMessage(null);
        return;
    }

    const messageData: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        senderAvatarUrl: currentUser.photoURL || undefined,
        timestamp: serverTimestamp() as Timestamp,
        type: forwardingMessage.type,
        isForwarded: true,
        forwardedFromSenderName: forwardingMessage.senderName,
    };

    if (forwardingMessage.text) messageData.text = forwardingMessage.text;
    if (forwardingMessage.fileUrl) messageData.fileUrl = forwardingMessage.fileUrl;
    if (forwardingMessage.fileName) messageData.fileName = forwardingMessage.fileName;
    if (forwardingMessage.fileType) messageData.fileType = forwardingMessage.fileType;
    if (forwardingMessage.gifUrl) messageData.gifUrl = forwardingMessage.gifUrl;
    if (forwardingMessage.gifId) messageData.gifId = forwardingMessage.gifId;
    if (forwardingMessage.gifTinyUrl) messageData.gifTinyUrl = forwardingMessage.gifTinyUrl;
    if (forwardingMessage.gifContentDescription) messageData.gifContentDescription = forwardingMessage.gifContentDescription;

    try {
      const messagesColRef = collection(db, `direct_messages/${targetConversationId}/messages`);
      await addDoc(messagesColRef, messageData);

      const convoDocRef = doc(db, `direct_messages/${targetConversationId}`);
      let lastMessageText = "Forwarded message";
      if (messageData.text) lastMessageText = messageData.text.substring(0, 50) + (messageData.text.length > 50 ? "..." : "");
      else if (messageData.type === 'image') lastMessageText = "Forwarded an image";
      else if (messageData.type === 'gif') lastMessageText = "Forwarded a GIF";
      else if (messageData.type === 'file') lastMessageText = `Forwarded a file: ${messageData.fileName || 'attachment'}`;
      else if (messageData.type === 'voice_message') lastMessageText = "Forwarded a voice message";

      await updateDoc(convoDocRef, {
        lastMessage: lastMessageText,
        lastMessageTimestamp: serverTimestamp(),
      });

      toast({ title: "Message Forwarded", description: "Message forwarded to your Saved Messages." });
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast({ variant: "destructive", title: "Forward Failed", description: "Could not forward the message." });
    } finally {
      setIsForwardDialogOpen(false);
      setForwardingMessage(null);
      setForwardSearchTerm("");
    }
  };

  const fetchTrendingGifs = async () => {
    setLoadingGifs(true);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/gifs?type=trending&_t=${timestamp}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch trending GIFs');
      }
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error fetching trending GIFs:", error);
      setGifs([]);
      toast({ 
        variant: "destructive", 
        title: "GIF Error", 
        description: (error as Error).message || "Could not load trending GIFs." 
      });
    } finally {
      setLoadingGifs(false);
    }
  };

  const fetchCategoryGifs = async (category: string) => {
    setLoadingGifs(true);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/gifs?type=category&category=${encodeURIComponent(category)}&_t=${timestamp}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch category GIFs');
      }
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error fetching category GIFs:", error);
      setGifs([]);
      toast({ 
        variant: "destructive", 
        title: "GIF Error", 
        description: (error as Error).message || "Could not load category GIFs." 
      });
    } finally {
      setLoadingGifs(false);
    }
  };

  const searchTenorGifs = async (term: string) => {
    if (!term.trim()) { 
      fetchTrendingGifs(); 
      return; 
    }
    setLoadingGifs(true);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/gifs?type=search&q=${encodeURIComponent(term)}&_t=${timestamp}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search GIFs');
      }
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error searching GIFs:", error);
      setGifs([]);
      toast({ 
        variant: "destructive", 
        title: "GIF Error", 
        description: (error as Error).message || "Could not search GIFs." 
      });
    } finally {
      setLoadingGifs(false);
    }
  };

  useEffect(() => {
    if (showGifPicker && gifPickerView === 'search' && gifs.length === 0 && !gifSearchTerm) fetchTrendingGifs();
  }, [showGifPicker, gifs.length, gifSearchTerm, gifPickerView]);

  const handleGifSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value; 
    setGifSearchTerm(term);
    setSelectedCategory(''); // Clear selected category when searching
    if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current);
    gifSearchTimeoutRef.current = setTimeout(() => searchTenorGifs(term), 500);
  };

  const requestMicPermission = async (): Promise<boolean> => {
    if (hasMicPermission === true) return true;
    if (hasMicPermission === false) {
        toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings to use this feature." });
        return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true); stream.getTracks().forEach(track => track.stop()); return true;
    } catch (error) {
      console.error("Error requesting mic permission:", error);
      setHasMicPermission(false);
      toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings." }); return false;
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(status => {
        if (status.state === 'granted') setHasMicPermission(true);
        else if (status.state === 'denied') setHasMicPermission(false);
         status.onchange = () => {
            if (status.state === 'granted') setHasMicPermission(true);
            else if (status.state === 'denied') setHasMicPermission(false);
            else setHasMicPermission(null);
        };
      }).catch(() => {
        setHasMicPermission(null);
      });
    } else {
        setHasMicPermission(null);
    }
  }, []);

  const handleToggleRecording = async () => {
    if (!currentUser || !conversationId || isUploadingFile) return;
    const permissionGranted = await requestMicPermission();
    if (!permissionGranted) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop(); setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });
          toast({ title: "Voice Message Recorded", description: "Uploading..." });
          await uploadFileToCloudinaryAndSend(audioFile, true);
          stream.getTracks().forEach(track => track.stop());
          setReplyingToMessage(null);
        };
        mediaRecorderRef.current.start(); setIsRecording(true);
      } catch (error) {
        console.error("Recording Error:", error);
        toast({ variant: "destructive", title: "Recording Error", description: "Could not start voice recording." }); setIsRecording(false);
      }
    }
  };

 const handleStartCall = async (isVideoCall: boolean) => {
    if (!otherUserId || !currentUser || (currentUser.uid === otherUserId) || isStartingCall || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER" || TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token') {
        if (!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") {
            toast({ variant: "destructive", title: "Agora App ID Missing", description: "Agora App ID is not configured for DM calls." });
        } else if (TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token') {
             toast({ variant: "destructive", title: "Token Server URL Missing", description: "Token server URL not configured. DM calls disabled."});
        } else if (currentUser && currentUser.uid === otherUserId) {
            toast({ title: "Cannot Call Yourself", description: "This feature is for calling other users." });
        }
        setIsStartingCall(false);
        return;
    }
    setIsStartingCall(true);

    const micPermission = await requestMicPermission();
    if (!micPermission) {
        toast({ variant: "destructive", title: "Microphone Required", description: "Please allow microphone access to start a call." });
        setIsStartingCall(false);
        return;
    }
    let cameraPermission = true;
    if (isVideoCall) {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream.getTracks().forEach(track => track.stop());
        } catch (error) {
            toast({ variant: "destructive", title: "Camera Access Denied", description: "Please allow camera access for video calls." });
            cameraPermission = false;
        }
    }

    toast({
        title: `Starting ${isVideoCall ? 'Video' : 'Voice'} Call...`,
        description: `Attempting to call ${otherUserName || 'User'}.`,
    });

    try {
        agoraClientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        const client = agoraClientRef.current;

        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
             if (mediaType === "video" && user.videoTrack) {
                if (remoteVideoPlayerContainerRef.current) {
                     const playerContainer = document.getElementById(`remote-dm-player-${user.uid}`) || document.createElement('div');
                     playerContainer.id = `remote-dm-player-${user.uid}`;
                     playerContainer.className = 'w-full h-full bg-black rounded-md shadow';
                     if(!document.getElementById(playerContainer.id)) remoteVideoPlayerContainerRef.current.appendChild(playerContainer);
                     user.videoTrack.play(playerContainer);
                }
            }
            if (mediaType === "audio" && user.audioTrack) {
                user.audioTrack.play();
            }
        });
        client.on("user-unpublished", (user, mediaType) => {
            if (mediaType === "video") {
                const playerContainer = document.getElementById(`remote-dm-player-${user.uid}`);
                if (playerContainer) playerContainer.innerHTML = '';
            }
        });
        client.on("user-left", (user) => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            const playerContainer = document.getElementById(`remote-dm-player-${user.uid}`);
            if (playerContainer) playerContainer.remove();
        });

        const uid: UID = currentUser!.uid;
        const token = await fetchAgoraToken(conversationId!, uid); 
        
        if (!token) { 
            throw new Error("Failed to fetch Agora token for DM call.");
        }

        await client.join(AGORA_APP_ID, conversationId!, token, uid);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);
        let tracksToPublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [audioTrack];

        if (isVideoCall && cameraPermission) {
            const videoTrack = await AgoraRTC.createCameraVideoTrack();
            setLocalVideoTrack(videoTrack);
            tracksToPublish.push(videoTrack);
            if (localVideoPlayerContainerRef.current) {
                videoTrack.play(localVideoPlayerContainerRef.current);
            }
        }
        await client.publish(tracksToPublish);
        setIsInCall(true);
        setCallStartTime(new Date());
        setCallDuration(0);
        setIsMuted(false);
        setIsCameraOff(!cameraPermission);
        toast({ title: `${isVideoCall && cameraPermission ? 'Video' : 'Voice'} Call Active`, description: `Connected with ${otherUserName || 'User'}.` });
    } catch (error: any) {
        console.error("Agora DM call error:", error);
        toast({ variant: "destructive", title: "Call Failed", description: error.message || "Could not start or connect to the call." });
        if (localAudioTrack) { localAudioTrack.close(); setLocalAudioTrack(null); }
        if (localVideoTrack) { localVideoTrack.close(); setLocalVideoTrack(null); }
        if (agoraClientRef.current) { await agoraClientRef.current.leave(); agoraClientRef.current = null; }
        setRemoteUsers([]);
         if(remoteVideoPlayerContainerRef.current) remoteVideoPlayerContainerRef.current.innerHTML = '';
         if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = '';
    } finally {
        setIsStartingCall(false);
    }
};


  const handleLeaveDmCall = async () => {
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        setLocalAudioTrack(null);
    }
     if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
    }
    if (localScreenTrack) {
        localScreenTrack.stop();
        localScreenTrack.close();
        setLocalScreenTrack(null);
    }
    if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
        setRemoteUsers([]);
        if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = '';
        if(remoteVideoPlayerContainerRef.current) remoteVideoPlayerContainerRef.current.innerHTML = '';
        toast({ title: "Call Ended", description: `Call ended. Duration: ${formatCallDuration(callDuration)}`});
    }
    setIsStartingCall(false);
    setIsInCall(false);
    setCallStartTime(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  };
  useEffect(() => {
    return () => {
        if (agoraClientRef.current) {
            handleLeaveDmCall();
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInCall, callStartTime]);

  // Format call duration
  const formatCallDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle mute/unmute
  const handleToggleMute = async () => {
    if (!localAudioTrack) return;
    
    if (isMuted) {
      await localAudioTrack.setEnabled(true);
      setIsMuted(false);
      toast({ title: "Microphone On", description: "Your microphone is now active." });
    } else {
      await localAudioTrack.setEnabled(false);
      setIsMuted(true);
      toast({ title: "Microphone Off", description: "Your microphone is now muted." });
    }
  };

  // Toggle camera on/off
  const handleToggleCamera = async () => {
    if (!localVideoTrack) return;
    
    if (isCameraOff) {
      await localVideoTrack.setEnabled(true);
      setIsCameraOff(false);
      toast({ title: "Camera On", description: "Your camera is now active." });
    } else {
      await localVideoTrack.setEnabled(false);
      setIsCameraOff(true);
      toast({ title: "Camera Off", description: "Your camera is now disabled." });
    }
  };

  // Toggle screen sharing
  const handleToggleScreenShare = async () => {
    if (!agoraClientRef.current) return;
    
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (localScreenTrack) {
          await agoraClientRef.current.unpublish(localScreenTrack);
          localScreenTrack.close();
          setLocalScreenTrack(null);
        }
        setIsScreenSharing(false);
        toast({ title: "Screen Share Stopped", description: "Screen sharing has been disabled." });
      } else {
        // Start screen sharing
        const screenTrack = await AgoraRTC.createScreenVideoTrack();
        await agoraClientRef.current.publish(screenTrack);
        setLocalScreenTrack(screenTrack);
        setIsScreenSharing(true);
        toast({ title: "Screen Share Started", description: "You are now sharing your screen." });
      }
    } catch (error: any) {
      console.error("Screen sharing error:", error);
      toast({ 
        variant: "destructive", 
        title: "Screen Share Error", 
        description: error.message || "Could not toggle screen sharing." 
      });
    }
  };

  const shouldShowFullMessageHeader = (currentMessage: ChatMessage, previousMessage: ChatMessage | null) => {
    if (!previousMessage) return true;
    if (currentMessage.senderId !== previousMessage.senderId) return true;
    if (currentMessage.timestamp.getTime() - previousMessage.timestamp.getTime() > TIMESTAMP_GROUPING_THRESHOLD_MS) return true;
    if (currentMessage.replyToMessageId !== previousMessage.replyToMessageId) return true;
    if (currentMessage.isForwarded !== previousMessage.isForwarded) return true;
    return false;
  };

  const handleChatSearchToggle = () => {
    setIsChatSearchOpen(!isChatSearchOpen);
    if (!isChatSearchOpen && chatSearchInputRef.current) {
        setTimeout(() => chatSearchInputRef.current?.focus(), 0);
    } else {
        setChatSearchTerm("");
    }
  };

 const filteredMessages = messages.filter(msg => {
    if (!chatSearchTerm.trim()) return true;
    const term = chatSearchTerm.toLowerCase();
    if (msg.text?.toLowerCase().includes(term)) return true;
    if (censorRestrictedWords(msg.text || '').toLowerCase().includes(term)) return true;
    if (msg.fileName?.toLowerCase().includes(term)) return true;
    if (msg.senderName?.toLowerCase().includes(term)) return true;
    if (msg.gifContentDescription?.toLowerCase().includes(term)) return true;
    if (msg.replyToSenderName?.toLowerCase().includes(term)) return true;
    if (msg.replyToTextSnippet?.toLowerCase().includes(term)) return true;
    if (censorRestrictedWords(msg.replyToTextSnippet || '').toLowerCase().includes(term)) return true;
    if (msg.forwardedFromSenderName?.toLowerCase().includes(term)) return true;
    return false;
  });

  const displayedMessages = showPinnedMessages
    ? filteredMessages.filter(msg => msg.isPinned).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    : filteredMessages;

  const handleMentionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    if (value.match(/@\S*$/) && otherUserId && currentUser?.uid !== otherUserId) {
        setShowMentionSuggestions(true);
    } else {
        setShowMentionSuggestions(false);
    }
  };

  const handleMentionSelect = (memberName: string) => {
    setNewMessage(prev => prev.substring(0, prev.lastIndexOf('@') + 1) + memberName + " ");
    setShowMentionSuggestions(false);
    chatInputRef.current?.focus();
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  const savedMessagesConversation: DmConversation = {
    id: `${currentUser.uid}_self`,
    name: 'Saved Messages',
    partnerId: currentUser.uid,
    avatarUrl: currentUser.photoURL || undefined,
    dataAiHint: 'bookmark save',
  };

  // Filter connected users based on search term
  const filteredConnectedUsers = connectedUsers.filter(user =>
    user.name.toLowerCase().includes(conversationSearchTerm.toLowerCase())
  );

  // Function to handle mute/unmute conversation
  const handleToggleMuteConversation = async () => {
    if (!currentUser || !conversationId) return;

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let updatedMuteSettings = {
        mutedUsers: [],
        mutedConversations: [],
        mutedCommunities: [],
        allowMentionsWhenMuted: true
      };

      if (userDocSnap.exists() && userDocSnap.data().muteSettings) {
        const firestoreMuteSettings = userDocSnap.data().muteSettings;
        // Ensure all required properties exist
        updatedMuteSettings = {
          mutedUsers: firestoreMuteSettings.mutedUsers || [],
          mutedConversations: firestoreMuteSettings.mutedConversations || [],
          mutedCommunities: firestoreMuteSettings.mutedCommunities || [],
          allowMentionsWhenMuted: firestoreMuteSettings.allowMentionsWhenMuted !== false
        };
      }

      const isCurrentlyMuted = updatedMuteSettings.mutedConversations && updatedMuteSettings.mutedConversations.includes(conversationId);
      
      if (isCurrentlyMuted) {
        // Unmute conversation
        updatedMuteSettings.mutedConversations = updatedMuteSettings.mutedConversations.filter(id => id !== conversationId);
        toast({ title: "Conversation Unmuted", description: "You will now receive notifications from this conversation." });
      } else {
        // Mute conversation
        updatedMuteSettings.mutedConversations.push(conversationId);
        toast({ title: "Conversation Muted", description: "You will no longer receive notifications from this conversation." });
      }

      // Update local state
      setCurrentMuteSettings(updatedMuteSettings);

      // Update Firestore
      await setDoc(userDocRef, { 
        muteSettings: updatedMuteSettings
      }, { merge: true });

    } catch (error) {
      console.error("Error toggling conversation mute:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update mute settings." });
    }
  };

  // Function to censor restricted words with asterisks
  const censorRestrictedWords = (text: string): string => {
    if (!restrictedWords.length) return text;
    
    let censoredText = text;
    restrictedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const asterisks = '*'.repeat(word.length);
      censoredText = censoredText.replace(regex, asterisks);
    });
    
    return censoredText;
  };

  // Function to add a new restricted word
  const addRestrictedWord = () => {
    if (!newRestrictedWord.trim() || !currentUser) return;
    
    const word = newRestrictedWord.trim().toLowerCase();
    const convertTo = newRestrictedWordConvertTo.trim() || "*";
    
    if (restrictedWords.some(rw => rw.word === word)) {
      toast({
        variant: "destructive",
        title: "Word Already Restricted",
        description: "This word is already in your restricted words list."
      });
      return;
    }
    
    const updatedWords = [...restrictedWords, { word, convertTo }];
    setRestrictedWords(updatedWords);
    localStorage.setItem(`restricted_words_${currentUser.uid}`, JSON.stringify(updatedWords));
    setNewRestrictedWord("");
    setNewRestrictedWordConvertTo("*");
    
    toast({
      title: "Word Restricted",
      description: `"${word}" has been added to your restricted words list.`
    });
  };

  // Function to remove a restricted word
  const removeRestrictedWord = (word: string) => {
    if (!currentUser) return;
    
    const updatedWords = restrictedWords.filter(rw => rw.word !== word);
    setRestrictedWords(updatedWords);
    localStorage.setItem(`restricted_words_${currentUser.uid}`, JSON.stringify(updatedWords));
    
    toast({
      title: "Word Unrestricted",
      description: `"${word}" has been removed from your restricted words list.`
    });
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Column 1: Conversation List */}
      <div className="h-full w-64 sm:w-72 bg-card border-r border-border/40 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/40 shadow-sm shrink-0">
          <Input 
            placeholder="Search DMs..." 
            className="bg-muted border-border/60 text-sm"
            value={conversationSearchTerm}
            onChange={(e) => setConversationSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
             <Button
                key={savedMessagesConversation.id}
                variant="ghost"
                className={cn(
                    "w-full justify-start h-auto py-2.5 px-3",
                    selectedConversation?.id === savedMessagesConversation.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                    if (agoraClientRef.current) { handleLeaveDmCall(); }
                    setSelectedConversation(savedMessagesConversation);
                    setOtherUserId(savedMessagesConversation.partnerId);
                    setOtherUserName(savedMessagesConversation.name);
                    setDmPartnerProfile({
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || "You",
                        photoURL: currentUser.photoURL,
                        email: currentUser.email,
                        bio: "This is your personal space for notes and saved messages.",
                        mutualInterests: [] // No mutual interests for self
                    });
                    setReplyingToMessage(null);
                    setShowPinnedMessages(false);
                    setIsChatSearchOpen(false);
                    setChatSearchTerm("");
                }}
             >
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 mr-3">
                    {savedMessagesConversation.avatarUrl ? (
                         <AvatarImage src={savedMessagesConversation.avatarUrl} alt={savedMessagesConversation.name} data-ai-hint={savedMessagesConversation.dataAiHint}/>
                    ) : (
                        <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                    <AvatarFallback><Bookmark /></AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate text-left">
                    <p className="font-semibold text-sm">{savedMessagesConversation.name}</p>
                    <p className="text-xs text-muted-foreground truncate">Messages you save for later</p>
                </div>
            </Button>
            {/* Connected Users Section */}
            {isLoadingConnectedUsers ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading connections...
              </div>
            ) : filteredConnectedUsers.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Connected Users
                </div>
                {filteredConnectedUsers.map((conversation) => (
                  <ContextMenu key={conversation.id}>
                    <ContextMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-auto py-2.5 px-3",
                          selectedConversation?.id === conversation.id && "bg-accent text-accent-foreground"
                        )}
                        onClick={async () => {
                          if (agoraClientRef.current) { handleLeaveDmCall(); }
                          setSelectedConversation(conversation);
                          setOtherUserId(conversation.partnerId);
                          setOtherUserName(conversation.name);
                          
                          // Calculate mutual interests
                          const mutualInterests = await calculateMutualInterests(currentUser.uid, conversation.partnerId);
                          
                          setDmPartnerProfile({
                            uid: conversation.partnerId,
                            displayName: conversation.name,
                            photoURL: conversation.avatarUrl || null,
                            email: "",
                            bio: "",
                            mutualInterests: mutualInterests
                          });
                          setReplyingToMessage(null);
                          setShowPinnedMessages(false);
                          setIsChatSearchOpen(false);
                          setChatSearchTerm("");
                          
                          // Mark messages as read when conversation is opened
                          if (conversation.unreadCount && conversation.unreadCount > 0) {
                            // Immediately update the UI to remove the badge
                            setConnectedUsers(prev => prev.map(user => 
                              user.id === conversation.id 
                                ? { ...user, unreadCount: undefined }
                                : user
                            ));
                            // Then mark messages as read in the database
                            markMessagesAsRead(conversation.id, currentUser.uid);
                          }
                        }}
                      >
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 mr-3">
                          {conversation.avatarUrl ? (
                            <AvatarImage src={conversation.avatarUrl} alt={conversation.name} data-ai-hint={conversation.dataAiHint}/>
                          ) : (
                            <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          )}
                          <AvatarFallback>{conversation.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate text-left">
                          <p className="font-semibold text-sm flex items-center">
                            {conversation.name}
                            {currentMuteSettings.mutedConversations && currentMuteSettings.mutedConversations.includes(conversation.id) && (
                              <VolumeX className="h-3 w-3 ml-1 text-orange-500" />
                            )}
                            {currentMuteSettings.mutedUsers && currentMuteSettings.mutedUsers.includes(conversation.partnerId) && (
                              <VolumeX className="h-3 w-3 ml-1 text-blue-500" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Connected
                            {currentMuteSettings.mutedConversations && currentMuteSettings.mutedConversations.includes(conversation.id) && (
                              <span className="ml-1 text-orange-500">• Conversation muted</span>
                            )}
                            {currentMuteSettings.mutedUsers && currentMuteSettings.mutedUsers.includes(conversation.partnerId) && (
                              <span className="ml-1 text-blue-500">• User muted</span>
                            )}
                          </p>
                        </div>
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                          >
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          const isUserMuted = currentMuteSettings.mutedUsers && currentMuteSettings.mutedUsers.includes(conversation.partnerId);
                          if (isUserMuted) {
                            // Remove from muted users
                            const updatedSettings = {
                              ...currentMuteSettings,
                              mutedUsers: currentMuteSettings.mutedUsers.filter(id => id !== conversation.partnerId)
                            };
                            setCurrentMuteSettings(updatedSettings);
                            // Update Firestore
                            const userDocRef = doc(db, "users", currentUser.uid);
                            setDoc(userDocRef, { muteSettings: updatedSettings }, { merge: true });
                            toast({ title: "User Unmuted", description: "You will now receive all messages from this user." });
                          } else {
                            // Add to muted users
                            const updatedSettings = {
                              ...currentMuteSettings,
                              mutedUsers: [...(currentMuteSettings.mutedUsers || []), conversation.partnerId]
                            };
                            setCurrentMuteSettings(updatedSettings);
                            // Update Firestore
                            const userDocRef = doc(db, "users", currentUser.uid);
                            setDoc(userDocRef, { muteSettings: updatedSettings }, { merge: true });
                            toast({ title: "User Muted", description: "You will no longer receive messages from this user." });
                          }
                        }}
                        className="flex items-center"
                      >
                        {currentMuteSettings.mutedUsers && currentMuteSettings.mutedUsers.includes(conversation.partnerId) ? (
                          <>
                            <Volume2 className="mr-2 h-4 w-4" />
                            Unmute user
                          </>
                        ) : (
                          <>
                            <VolumeX className="mr-2 h-4 w-4" />
                            Mute user
                          </>
                        )}
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          const isConversationMuted = currentMuteSettings.mutedConversations && currentMuteSettings.mutedConversations.includes(conversation.id);
                          if (isConversationMuted) {
                            // Remove from muted conversations
                            const updatedSettings = {
                              ...currentMuteSettings,
                              mutedConversations: currentMuteSettings.mutedConversations.filter(id => id !== conversation.id)
                            };
                            setCurrentMuteSettings(updatedSettings);
                            // Update Firestore
                            const userDocRef = doc(db, "users", currentUser.uid);
                            setDoc(userDocRef, { muteSettings: updatedSettings }, { merge: true });
                            toast({ title: "Conversation Unmuted", description: "You will now receive notifications from this conversation." });
                          } else {
                            // Add to muted conversations
                            const updatedSettings = {
                              ...currentMuteSettings,
                              mutedConversations: [...(currentMuteSettings.mutedConversations || []), conversation.id]
                            };
                            setCurrentMuteSettings(updatedSettings);
                            // Update Firestore
                            const userDocRef = doc(db, "users", currentUser.uid);
                            setDoc(userDocRef, { muteSettings: updatedSettings }, { merge: true });
                            toast({ title: "Conversation Muted", description: "You will no longer receive notifications from this conversation." });
                          }
                        }}
                        className="flex items-center"
                      >
                        {currentMuteSettings.mutedConversations && currentMuteSettings.mutedConversations.includes(conversation.id) ? (
                          <>
                            <Volume2 className="mr-2 h-4 w-4" />
                            Unmute conversation
                          </>
                        ) : (
                          <>
                            <VolumeX className="mr-2 h-4 w-4" />
                            Mute conversation
                          </>
                        )}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </>
            ) : conversationSearchTerm && filteredConnectedUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No connections found matching "{conversationSearchTerm}".
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No connections yet. Connect with people from the dashboard to start chatting!
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Chat Area */}
      <div className="h-full flex-1 bg-background flex flex-col overflow-hidden">
        {selectedConversation && otherUserId && conversationId ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm flex items-center justify-between shrink-0">
              <div className="flex items-center min-w-0"> 
                 <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mr-2 sm:mr-3">
                    <AvatarImage src={selectedConversation.avatarUrl || dmPartnerProfile?.photoURL || undefined} alt={otherUserName || ''} data-ai-hint={selectedConversation.dataAiHint}/>
                    <AvatarFallback>{(otherUserName || 'U').substring(0,1)}</AvatarFallback>
                </Avatar>
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate flex items-center">
                  {otherUserName || 'Direct Message'}
                  {isConversationMuted && (
                    <VolumeX className="h-4 w-4 ml-2 text-orange-500" title="Conversation is muted" />
                  )}
                </h3>
              </div>
              <div className={cn("flex items-center space-x-1", isChatSearchOpen && "w-full sm:max-w-xs")}>
                 {isChatSearchOpen ? (
                    <div className="flex items-center w-full bg-muted rounded-md px-2">
                        <Search className="h-4 w-4 text-muted-foreground mr-2"/>
                        <Input
                            ref={chatSearchInputRef}
                            type="text"
                            placeholder={`Search DMs...`}
                            className="flex-1 bg-transparent h-8 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={chatSearchTerm}
                            onChange={(e) => setChatSearchTerm(e.target.value)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleChatSearchToggle}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                ) : (
                    <>
                         {otherUserId !== currentUser.uid && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
                                    title={agoraClientRef.current ? "End Call" : "Start Voice Call"}
                                    onClick={!agoraClientRef.current ? () => handleStartCall(false) : handleLeaveDmCall}
                                    disabled={isStartingCall || (!AGORA_APP_ID && !agoraClientRef.current) || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER" || TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token' }
                                >
                                    {isStartingCall && !agoraClientRef.current ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin"/> : (agoraClientRef.current ? <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive"/> : <Phone className="h-4 w-4 sm:h-5 sm:w-5"/>)}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
                                    title={agoraClientRef.current && localVideoTrack ? "End Video Call" : "Start Video Call"}
                                    onClick={!agoraClientRef.current ? () => handleStartCall(true) : handleLeaveDmCall}
                                    disabled={isStartingCall || (!AGORA_APP_ID && !agoraClientRef.current) || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER" || TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token'}
                                >
                                     {isStartingCall && !agoraClientRef.current ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin"/> : (agoraClientRef.current && localVideoTrack ? <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive"/> : <VideoIcon className="h-4 w-4 sm:h-5 sm:w-5"/>)}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
                            onClick={handleChatSearchToggle}
                            title="Search Messages in DM"
                        >
                            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9", showPinnedMessages && "text-primary bg-primary/10")}
                            onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                            title={showPinnedMessages ? "Show All Messages" : "Show Pinned Messages"}
                        >
                            {showPinnedMessages ? <PinOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Pin className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9", isConversationMuted && "text-destructive bg-destructive/10")}
                          onClick={handleToggleMuteConversation}
                          title={isConversationMuted ? "Unmute Conversation" : "Mute Conversation"}
                        >
                          {isConversationMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => setIsRestrictedWordsDialogOpen(true)}
                          title="Restricted Words"
                        >
                          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 md:hidden", isMessagesRightBarOpen && "bg-accent/20 text-accent")}
                          onClick={() => setIsMessagesRightBarOpen(!isMessagesRightBarOpen)}
                          title={isMessagesRightBarOpen ? "Hide User Info" : "Show User Info"}
                        >
                          <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </>
                 )}
              </div>
            </div>

            {agoraClientRef.current && otherUserId !== currentUser.uid && (
                <div className="p-2 border-b border-border/40 bg-black/50 flex flex-col items-center">
                    {/* Call Duration */}
                    {isInCall && (
                        <div className="flex items-center gap-2 text-white text-sm mb-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatCallDuration(callDuration)}</span>
                        </div>
                    )}
                    
                    {/* Video Display */}
                    <div className="w-full flex flex-col items-center gap-2">
                        {localVideoTrack && (
                            <div id="local-dm-video-player-container" ref={localVideoPlayerContainerRef} className="w-32 h-24 sm:w-40 sm:h-30 md:w-48 md:h-36 bg-black rounded-md shadow relative">
                                <p className="text-white text-xs p-1 absolute top-0 left-0 bg-black/50 rounded-br-md">You</p>
                                {isCameraOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-md">
                                        <VideoOff className="h-8 w-8 text-white/70" />
                                    </div>
                                )}
                            </div>
                        )}
                        {remoteUsers.length > 0 && remoteUsers[0].videoTrack && (
                            <div id="remote-dm-video-player-container" ref={remoteVideoPlayerContainerRef} className="w-full flex-1 aspect-video bg-black rounded-md shadow relative">
                                <p className="text-white text-xs p-1 absolute top-0 left-0 bg-black/50 rounded-br-md">{remoteUsers[0].uid === otherUserId ? otherUserName : `User ${remoteUsers[0].uid}`}</p>
                            </div>
                        )}
                        {remoteUsers.length === 0 && localVideoTrack && (
                            <p className="text-sm text-muted-foreground">Waiting for {otherUserName || 'user'} to join...</p>
                        )}
                        {remoteUsers.length > 0 && !remoteUsers[0].videoTrack && localVideoTrack && (
                            <div className="flex-1 flex items-center justify-center">
                                <Avatar className="h-16 w-16 sm:h-24 sm:w-24">
                                    <AvatarImage src={dmPartnerProfile?.photoURL || undefined} alt={otherUserName || ''} />
                                    <AvatarFallback className="text-2xl sm:text-3xl">{(otherUserName || 'U').substring(0,1)}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                    </div>

                    {/* Call Controls */}
                    {isInCall && (
                        <div className="flex items-center gap-2 mt-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-full",
                                    isMuted ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={handleToggleMute}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </Button>
                            
                            {localVideoTrack && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-10 w-10 rounded-full",
                                        isCameraOff ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                    onClick={handleToggleCamera}
                                    title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                                >
                                    {isCameraOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
                                </Button>
                            )}
                            
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-full",
                                    isScreenSharing ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={handleToggleScreenShare}
                                title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
                            >
                                <Monitor className="h-5 w-5" />
                            </Button>
                            
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-destructive text-destructive-foreground"
                                onClick={handleLeaveDmCall}
                                title="End Call"
                            >
                                <Phone className="h-5 w-5 rotate-90" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <ScrollArea className="flex-1 min-h-0 bg-card/30">
              <div className="p-2 sm:p-4 space-y-0.5">
                {displayedMessages.length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    {chatSearchTerm.trim() ? "No DMs found matching your search." :
                     (showPinnedMessages ? "No pinned DMs in this conversation." :
                      (messages.length === 0 && !currentUser ? "Loading messages..." : "No messages yet. Start the conversation!"))}
                  </div>
                )}
                {displayedMessages.map((msg, index) => {
                  const previousMessage = index > 0 ? displayedMessages[index - 1] : null;
                  const showHeader = shouldShowFullMessageHeader(msg, previousMessage);
                  const isCurrentUserMsg = msg.senderId === currentUser.uid;
                   let hasBeenRepliedTo = false;
                    if (isCurrentUserMsg && currentUser) {
                      hasBeenRepliedTo = displayedMessages.some(
                        (replyCandidate) => replyCandidate.replyToMessageId === msg.id && replyCandidate.senderId !== currentUser?.uid
                      );
                    }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-start space-x-2 group relative hover:bg-muted/30 px-2 py-1 rounded-md",
                         isCurrentUserMsg && "flex-row-reverse space-x-reverse"
                      )}
                    >
                      {!isCurrentUserMsg && showHeader && (
                        <Avatar className="mt-1 h-8 w-8 shrink-0">
                          <AvatarImage src={msg.senderAvatarUrl || undefined} data-ai-hint="person default" />
                          <AvatarFallback>{msg.senderName.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                       {!isCurrentUserMsg && !showHeader && ( <div className="w-8 shrink-0"></div> )}

                      <div className={cn("flex-1 min-w-0 text-left", isCurrentUserMsg ? "pr-10 sm:pr-12" : "pl-0")}>
                        {showHeader && (
                          <div className={cn("flex items-baseline space-x-1.5")}>
                            <p className="font-semibold text-sm text-foreground">{msg.senderName}</p>
                            <div className="flex items-baseline text-xs text-muted-foreground">
                              <p title={msg.timestamp ? format(msg.timestamp, 'PPpp') : undefined}>
                                {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp, { addSuffix: true }) : 'Sending...'}
                              </p>
                              {msg.timestamp && <p className="ml-1.5 mr-0.5">({format(msg.timestamp, 'p')})</p>}
                            </div>
                            {msg.isPinned && <Pin className="h-3 w-3 text-amber-400 ml-1" title="Pinned Message"/>}
                             {hasBeenRepliedTo && <MessageSquareReply className="h-3 w-3 text-blue-400 ml-1" title="Someone replied to this" />}
                          </div>
                        )}
                         {msg.replyToMessageId && msg.replyToSenderName && msg.replyToTextSnippet && (
                            <div className={cn("mb-1 p-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md border-l-2 border-primary/50 max-w-max text-left", isCurrentUserMsg ? "ml-auto" : "mr-auto")}>
                                 <div className="flex items-center">
                                  <CornerUpRight className="h-3 w-3 mr-1.5 text-primary/70" />
                                  <span>Replying to <span className="font-medium text-foreground/80">{msg.replyToSenderName}</span>:
                                  <span className="italic ml-1 truncate" dangerouslySetInnerHTML={{ __html: formatChatMessage(`"${msg.replyToTextSnippet}"`, restrictedWords) }}></span></span>
                                </div>
                            </div>
                        )}
                        {msg.isForwarded && msg.forwardedFromSenderName && (
                          <div className={cn("text-xs text-muted-foreground italic mb-0.5 flex items-center text-left", isCurrentUserMsg ? "justify-start" : "justify-start")}>
                            <Share2 className="h-3 w-3 mr-1.5 text-muted-foreground/80" />
                            Forwarded from {msg.forwardedFromSenderName}
                          </div>
                        )}
                         {msg.type === 'text' && msg.text && (
                            <p className={cn("text-sm text-foreground/90 whitespace-pre-wrap break-words text-left")}
                            dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text, restrictedWords) }} />
                        )}
                        {msg.type === 'gif' && msg.gifUrl && (
                           <div className="relative max-w-[250px] sm:max-w-[300px] mt-1 group/gif">
                                <Image src={msg.gifUrl} alt={msg.gifContentDescription || "GIF"} width={0} height={0} style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '200px', borderRadius: '0.375rem', objectFit: 'contain' }} unoptimized priority={false} data-ai-hint="animated gif" />
                                {currentUser && msg.gifId && (
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover/gif:opacity-100 transition-opacity" onClick={() => handleFavoriteGifFromChat(msg)} title={isGifFavorited(msg.gifId || "") ? "Unfavorite" : "Favorite"}>
                                        <Star className={cn("h-4 w-4", isGifFavorited(msg.gifId || "") ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/>
                                    </Button>
                                )}
                           </div>
                        )}
                        {msg.type === 'voice_message' && msg.fileUrl && (
                            <audio controls src={msg.fileUrl} className="my-1 w-full max-w-xs h-10 rounded-md shadow-sm bg-muted invert-[5%] dark:invert-0" data-ai-hint="audio player">Your browser does not support audio.</audio>
                        )}
                        {msg.type === 'image' && msg.fileUrl && (
                             <Image src={msg.fileUrl} alt={msg.fileName || "Uploaded image"} width={300} height={300} style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.375rem', marginTop: '0.25rem' }} data-ai-hint="user uploaded image" />
                        )}
                        {msg.type === 'file' && msg.fileUrl && (
                            <div className="mt-1 p-2 border rounded-md bg-muted/50 max-w-xs">
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center">
                                    <Paperclip className="h-4 w-4 mr-2 shrink-0" />
                                    <span className="truncate">{msg.fileName || "Attached File"}</span>
                                </a>
                            </div>
                        )}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className={cn("mt-1.5 flex flex-wrap gap-1.5", isCurrentUserMsg && "justify-end")}>
                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                    userIds.length > 0 && (
                                        <Button key={emoji} variant="outline" size="sm" onClick={() => handleToggleReaction(msg.id, emoji)}
                                            className={cn("h-auto px-2 py-0.5 text-xs rounded-full bg-muted/50 hover:bg-muted/80 border-border/50", currentUser && userIds.includes(currentUser.uid) && "bg-primary/20 border-primary text-primary hover:bg-primary/30")}
                                            title={userIds.join(', ')} >
                                            {emoji} <span className="ml-1 text-muted-foreground">{userIds.length}</span>
                                        </Button>
                                    )
                                ))}
                            </div>
                        )}
                      </div>
                      {isCurrentUserMsg && showHeader && (
                        <Avatar className="mt-1 h-8 w-8 shrink-0">
                          <AvatarImage src={msg.senderAvatarUrl || undefined} data-ai-hint="person default" />
                          <AvatarFallback>{msg.senderName.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      {isCurrentUserMsg && !showHeader && ( <div className="w-8 shrink-0"></div> )}

                       <div className={cn("absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card p-0.5 rounded-md shadow-sm border border-border/50 z-10")}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground" title="Forward"
                            onClick={() => {
                                setForwardingMessage(msg);
                                setIsForwardDialogOpen(true);
                                setForwardSearchTerm("");
                            }}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground" title="Reply" onClick={() => handleReplyClick(msg)}>
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Popover open={reactionPickerOpenForMessageId === msg.id} onOpenChange={(open) => setReactionPickerOpenForMessageId(open ? msg.id : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground" title="React">
                              <SmilePlus className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                             <EmojiPicker
                                onEmojiClick={(emojiData: EmojiClickData) => {
                                    handleToggleReaction(msg.id, emojiData.emoji);
                                    setReactionPickerOpenForMessageId(null);
                                }}
                                theme={currentThemeMode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                emojiStyle={EmojiStyle.NATIVE}
                                searchPlaceholder="Search reaction..."
                                previewConfig={{showPreview: false}}
                             />
                          </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" title={msg.isPinned ? "Unpin" : "Pin"} onClick={() => handleTogglePinMessage(msg.id, !!msg.isPinned)}>
                          {msg.isPinned ? <PinOff className="h-4 w-4 text-amber-500" /> : <Pin className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
                        </Button>
                        {currentUser?.uid === msg.senderId && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Delete (Shift+click to skip confirmation)" onClick={(event) => handleDeleteButtonClick(msg.id, event)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-2 sm:p-3 border-t border-border/40 shrink-0 relative">
                {replyingToMessage && (
                    <div className="mb-2 p-2 text-sm bg-muted rounded-md flex justify-between items-center">
                        <div>
                            Replying to <span className="font-semibold text-foreground">{replyingToMessage.senderName}</span>:
                            <em className="ml-1 text-muted-foreground truncate">
                                "{replyingToMessage.text?.substring(0,50) ||
                                 (replyingToMessage.type === 'image' && "Image") ||
                                 (replyingToMessage.type === 'file' && `File: ${replyingToMessage.fileName || 'attachment'}`) ||
                                 (replyingToMessage.type === 'gif' && "GIF") ||
                                 (replyingToMessage.type === 'voice_message' && "Voice Message") || "..."}"
                                {(replyingToMessage.text && replyingToMessage.text.length > 50) ||
                                 (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : ''}
                            </em>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingToMessage(null)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
                 {showMentionSuggestions && (
                     <Popover open={showMentionSuggestions} onOpenChange={setShowMentionSuggestions} modal={false}>
                        <PopoverTrigger asChild>
                            <div ref={mentionSuggestionsRef} className="absolute bottom-full left-0 mb-1 w-full max-w-sm"></div>
                        </PopoverTrigger>
                        <PopoverContent
                            className="p-1 w-64 max-h-48 overflow-y-auto z-20 shadow-lg rounded-md border bg-popover"
                            side="top"
                            align="start"
                            avoidCollisions={false}
                        >
                            {otherUserId && currentUser?.uid !== otherUserId && dmPartnerProfile?.displayName &&
                             dmPartnerProfile.displayName.toLowerCase().startsWith(newMessage.substring(newMessage.lastIndexOf('@') + 1).toLowerCase()) ? (
                                <button
                                    onClick={() => handleMentionSelect(dmPartnerProfile.displayName!)}
                                    className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                                >
                                    {dmPartnerProfile.displayName}
                                </button>
                            ) : (
                                 <p className="p-2 text-xs text-muted-foreground">No matching user to mention. Search not available yet.</p>
                            )}
                        </PopoverContent>
                    </Popover>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center p-1.5 rounded-lg bg-muted space-x-1 sm:space-x-1.5">
                    <input type="file" ref={attachmentInputRef} onChange={handleFileSelected} className="hidden" accept={ALLOWED_FILE_TYPES.join(',')} disabled={isUploadingFile || isRecording || agoraClientRef.current !==null} />
                    {isUploadingFile ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary shrink-0" /> : (
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Attach File" onClick={() => attachmentInputRef.current?.click()} disabled={isUploadingFile || isRecording || agoraClientRef.current !==null}>
                        <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    )}
                    <Input ref={chatInputRef} type="text" placeholder={isRecording ? "Recording..." : (agoraClientRef.current !== null ? "In a call..." :`Message ${otherUserName || 'User'} (@mention, **bold**)`)}
                        className="flex-1 bg-transparent text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 sm:h-9 px-2"
                        value={newMessage} onChange={handleMentionInputChange}
                        onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isUploadingFile && agoraClientRef.current === null) handleSendMessage(e); }}
                        disabled={isRecording || isUploadingFile || agoraClientRef.current !==null}
                    />
                    <Button type="button" variant={isRecording ? "destructive" : "ghost"} size="icon"
                        className={cn("shrink-0 h-8 w-8 sm:h-9 sm:w-9", isRecording ? "text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:text-foreground")}
                        title={isRecording ? "Stop Recording" : "Send Voice Message"} onClick={handleToggleRecording} disabled={hasMicPermission === false || isUploadingFile || agoraClientRef.current !==null}>
                        {isRecording ? <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </Button>
                    {hasMicPermission === false && <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" title="Mic permission denied"/>}
                    <Popover open={chatEmojiPickerOpen} onOpenChange={setChatEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Emoji" disabled={isRecording || isUploadingFile || agoraClientRef.current !==null}>
                            <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <EmojiPicker
                            onEmojiClick={(emojiData: EmojiClickData) => {
                                setNewMessage(prev => prev + emojiData.emoji);
                                setChatEmojiPickerOpen(false);
                                chatInputRef.current?.focus();
                            }}
                            theme={currentThemeMode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                            emojiStyle={EmojiStyle.NATIVE}
                            searchPlaceholder="Search emoji..."
                            previewConfig={{showPreview: false}}
                        />
                    </PopoverContent>
                    </Popover>
                    <Dialog open={showGifPicker} onOpenChange={setShowGifPicker}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="GIF" disabled={isRecording || isUploadingFile || agoraClientRef.current !==null}>
                            <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-[900px] h-[80vh] p-0 bg-background/95 backdrop-blur-xl border-0 shadow-2xl rounded-2xl">
                        <DialogTitle className="sr-only">GIF Picker</DialogTitle>
                        {/* Header */}
                        <div className="flex items-center p-6 border-b border-border/30">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Film className="h-5 w-5 text-primary" />
                                    </div>
                                <div>
                                    <h2 className="text-xl font-bold">GIF Picker</h2>
                                    <p className="text-sm text-muted-foreground">Find the perfect GIF for your message</p>
                                    </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="px-6 py-4 border-b border-border/20">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    type="text" 
                                    placeholder="Search for GIFs..." 
                                    value={gifSearchTerm} 
                                    onChange={handleGifSearchChange} 
                                    className="pl-10 h-12 text-base bg-muted/30 border-border/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-border/20">
                                <button
                                    onClick={() => setGifPickerView('search')}
                                    className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                                        gifPickerView === 'search' 
                                            ? 'text-primary border-b-2 border-primary bg-primary/5' 
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                    }`}
                                >
                                    <Search className="h-4 w-4 inline mr-2" />
                                    Search & Trending
                                </button>
                                <button
                                    onClick={() => setGifPickerView('favorites')}
                                    className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                                        gifPickerView === 'favorites' 
                                            ? 'text-primary border-b-2 border-primary bg-primary/5' 
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                    }`}
                                >
                                    <Star className="h-4 w-4 inline mr-2" />
                                    Favorites
                                </button>
                            </div>

                            {/* GIF Grid */}
                            <div className="h-full overflow-auto p-6">
                                {loadingGifs ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        </div>
                                        <p className="text-muted-foreground font-medium">Loading GIFs...</p>
                                    </div>
                                ) : gifPickerView === 'search' ? (
                                    gifs.length > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="text-sm font-medium text-foreground">
                                                        {gifSearchTerm ? `Search results for "${gifSearchTerm}"` : selectedCategory ? `${selectedCategory} GIFs` : "Trending GIFs"}
                                                    </h3>
                                                    <span className="text-xs text-muted-foreground">({gifs.length} GIFs)</span>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (gifSearchTerm) {
                                                            searchTenorGifs(gifSearchTerm);
                                                        } else if (selectedCategory) {
                                                            fetchCategoryGifs(selectedCategory);
                                                        } else {
                                                            fetchTrendingGifs();
                                                        }
                                                    }}
                                                    disabled={loadingGifs}
                                                    className="h-8 px-3 text-xs"
                                                >
                                                    <RefreshCw className={cn("h-3 w-3 mr-1", loadingGifs && "animate-spin")} />
                                                    Reload
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {gifs.map((gif) => (
                                                    <div key={gif.id} className="group relative aspect-square bg-muted/20 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
                                                        <button 
                                                            onClick={() => handleSendGif(gif)} 
                                                            className="w-full h-full relative focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                                                        >
                                                            <Image 
                                                                src={gif.media_formats.tinygif.url} 
                                                                alt={gif.content_description || "GIF"} 
                                                                fill 
                                                                className="object-cover transition-transform duration-300 group-hover:scale-110" 
                                                                unoptimized
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                            <div className="absolute bottom-2 left-2 right-2">
                                                                <p className="text-xs text-white font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                    {gif.content_description}
                                                                </p>
                                                            </div>
                                                        </button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-200 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110" 
                                                            onClick={() => handleToggleFavoriteGif(gif)} 
                                                            title={isGifFavorited(gif.id) ? "Remove from favorites" : "Add to favorites"}
                                                        >
                                                            <Star className={cn("h-4 w-4 transition-all duration-200", isGifFavorited(gif.id) ? "fill-yellow-400 text-yellow-400" : "text-white")}/>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {!gifSearchTerm && !selectedCategory && (
                                                <div className="mb-6">
                                                    <h3 className="text-sm font-medium text-foreground mb-3">Categories</h3>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                        {['Happy', 'Sad', 'Angry', 'WTF', 'Love', 'Funny', 'Cute', 'Dance', 'Food', 'Animals', 'Sports', 'Gaming'].map((category) => (
                                                            <Button
                                                                key={category}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCategory(category);
                                                                    fetchCategoryGifs(category);
                                                                }}
                                                                className="h-8 text-xs"
                                                            >
                                                                {category}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                                <div className="p-4 bg-muted/30 rounded-full">
                                                    <Film className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-foreground">
                                                        {gifSearchTerm ? "No GIFs found" : selectedCategory ? `No ${selectedCategory} GIFs found` : "Choose a category or search for GIFs"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {gifSearchTerm ? "Try a different search term" : selectedCategory ? "Try reloading or choose another category" : "Select a category above or search for specific GIFs"}
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )
                                ) : (
                                    favoritedGifs.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {favoritedGifs.map((gif) => (
                                                <div key={gif.id} className="group relative aspect-square bg-muted/20 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
                                                    <button 
                                                        onClick={() => handleSendGif(gif)} 
                                                        className="w-full h-full relative focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                                                    >
                                                        <Image 
                                                            src={gif.media_formats.tinygif.url} 
                                                            alt={gif.content_description || "GIF"} 
                                                            fill 
                                                            className="object-cover transition-transform duration-300 group-hover:scale-110" 
                                                            unoptimized
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        <div className="absolute bottom-2 left-2 right-2">
                                                            <p className="text-xs text-white font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                {gif.content_description}
                                                            </p>
                                                        </div>
                                                    </button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-200 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110" 
                                                        onClick={() => handleToggleFavoriteGif(gif)} 
                                                        title="Remove from favorites"
                                                    >
                                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                                            <div className="p-4 bg-muted/30 rounded-full">
                                                <Star className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-foreground">No favorited GIFs</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Start favoriting GIFs to see them here
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border/30 bg-muted/20">
                            <div className="flex items-center justify-center">
                                <p className="text-xs text-muted-foreground">Powered by Tenor • Secured API</p>
                            </div>
                        </div>
                    </DialogContent>
                    </Dialog>
                    <Button type="submit" variant="ghost" size="icon" className="text-primary hover:text-primary/80 shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Send" disabled={!newMessage.trim() || isRecording || isUploadingFile || agoraClientRef.current !==null}>
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-base sm:text-lg">
            {currentUser ? "Select 'Saved Messages' to start." : <SplashScreenDisplay />}
          </div>
        )}
      </div>

      {/* Column 3: DM Partner Info Bar */}
      {isMessagesRightBarOpen && selectedConversation && dmPartnerProfile && (
          <div className="h-full w-64 sm:w-72 bg-card border-l border-border/40 flex-col overflow-hidden hidden md:flex relative"> 
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-20 h-8 w-8"
                  onClick={() => setIsMessagesRightBarOpen(false)}
                  title="Close User Info"
                  aria-label="Close user info panel"
                >
                  <X className="h-5 w-5"/>
                </Button>
                <div className="p-3 sm:p-4 border-b border-border/40 shadow-sm shrink-0">
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mb-3 border-2 border-primary shadow-md">
                            <AvatarImage src={dmPartnerProfile.photoURL || undefined} alt={dmPartnerProfile.displayName || 'User'} data-ai-hint="person portrait"/>
                            <AvatarFallback className="text-2xl sm:text-3xl">
                                {(dmPartnerProfile.displayName || 'U').substring(0,1).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">{dmPartnerProfile.displayName || 'User'}</h3>
                        {dmPartnerProfile.email && selectedConversation.id === `${currentUser?.uid}_self` && (
                            <p className="text-xs sm:text-sm text-muted-foreground">{dmPartnerProfile.email}</p>
                        )}
                         <p className="text-xs text-muted-foreground mt-1 italic">{dmPartnerProfile.bio || (otherUserId === currentUser?.uid ? "Your personal space." : "User bio placeholder.")}</p>
                    </div>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 sm:p-4 space-y-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {otherUserId === currentUser?.uid ? "Your Info" : "About"}
                        </h4>
                        <p className="text-sm text-foreground/90">{dmPartnerProfile.bio || (otherUserId === currentUser?.uid ? "Saved messages and notes." : "This user hasn't shared their bio yet.")}</p>

                        {selectedConversation.id !== `${currentUser?.uid}_self` && dmPartnerProfile.mutualInterests && dmPartnerProfile.mutualInterests.length > 0 && (
                            <>
                                <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-3">Mutual Interests</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {dmPartnerProfile.mutualInterests.map(interest => (
                                        <Badge key={interest} variant="secondary">{interest}</Badge>
                                    ))}
                                </div>
                            </>
                        )}
                         <Button variant="outline" className="w-full mt-4 text-xs sm:text-sm" onClick={() => toast({title: "Coming Soon", description: "Viewing full profiles will be available later."})}>View Full Profile</Button>
                         <Button variant="outline" className="w-full mt-2 text-xs sm:text-sm" onClick={() => setIsRestrictedWordsDialogOpen(true)}>Set Restricted Words</Button>
                    </div>
                </ScrollArea>
            </div>
      )}
      {!selectedConversation && isMessagesRightBarOpen && (
         <div className="h-full w-64 sm:w-72 bg-card border-l border-border/40 flex-col items-center justify-center text-muted-foreground p-4 text-center overflow-hidden hidden md:flex">
            Select a conversation to see details.
         </div>
      )}


      <AlertDialog open={!!deletingMessageId} onOpenChange={(open) => !open && setDeletingMessageId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the message.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingMessageId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Forward Message</DialogTitle>
                <DialogDescription>
                   Forward this message to your "Saved Messages".
                </DialogDescription>
            </DialogHeader>
            {forwardingMessage && (
                 <div className="mt-2 p-2 border rounded-md bg-muted/50 text-sm">
                    <p className="font-medium text-foreground mb-1">Message from: {forwardingMessage.senderName}</p>
                    {forwardingMessage.type === 'text' && forwardingMessage.text && <p className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formatChatMessage(forwardingMessage.text, restrictedWords) }} />}
                    {forwardingMessage.type === 'image' && forwardingMessage.fileUrl && <Image src={forwardingMessage.fileUrl} alt="Forwarded Image" width={100} height={100} className="rounded-md mt-1 max-w-full h-auto object-contain" data-ai-hint="forwarded content" />}
                    {forwardingMessage.type === 'gif' && forwardingMessage.gifUrl && <Image src={forwardingMessage.gifUrl} alt="Forwarded GIF" width={100} height={100} className="rounded-md mt-1 max-w-full h-auto object-contain" unoptimized data-ai-hint="forwarded content"/>}
                    {forwardingMessage.type === 'voice_message' && forwardingMessage.fileUrl && <audio controls src={forwardingMessage.fileUrl} className="my-1 w-full max-w-xs h-10 rounded-md shadow-sm bg-muted invert-[5%] dark:invert-0" data-ai-hint="audio player"/>}
                    {forwardingMessage.type === 'file' && forwardingMessage.fileUrl && <a href={forwardingMessage.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center"><Paperclip className="h-4 w-4 mr-2 shrink-0" /><span className="truncate">{forwardingMessage.fileName || "Attached File"}</span></a>}
                 </div>
            )}
            <div className="grid gap-4 py-4">
                <Input
                    placeholder="Search users or Saved Messages (coming soon)..."
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => {setIsForwardDialogOpen(false); setForwardingMessage(null); setForwardSearchTerm("");}}>Cancel</Button>
                <Button onClick={handleForwardMessage} >
                    Forward to Saved Messages
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRestrictedWordsDialogOpen} onOpenChange={setIsRestrictedWordsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Restricted Words</DialogTitle>
                <DialogDescription>
                    Add words that will be automatically censored in your messages. You can specify what to replace them with.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter a word to restrict..."
                            value={newRestrictedWord}
                            onChange={(e) => setNewRestrictedWord(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addRestrictedWord()}
                        />
                        <Input
                            placeholder="Convert to (default: *)"
                            value={newRestrictedWordConvertTo}
                            onChange={(e) => setNewRestrictedWordConvertTo(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addRestrictedWord()}
                            className="w-32"
                        />
                        <Button onClick={addRestrictedWord} disabled={!newRestrictedWord.trim()}>
                            Add
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Single characters will be repeated (e.g., "*" becomes "****" for a 4-letter word). 
                        Multiple characters will be used as-is.
                    </p>
                </div>
                
                {restrictedWords.length > 0 ? (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Restricted Words ({restrictedWords.length})</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {restrictedWords.map(({ word, convertTo }, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{word}</span>
                                        <span className="text-xs text-muted-foreground">→</span>
                                        <span className="text-sm text-muted-foreground">
                                            {convertTo.length === 1 ? convertTo.repeat(word.length) : convertTo}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRestrictedWord(word)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No restricted words added yet.</p>
                        <p className="text-xs mt-1">Add words above to start censoring them in messages.</p>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRestrictedWordsDialogOpen(false)}>
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    



