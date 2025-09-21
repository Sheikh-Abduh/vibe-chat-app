"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import dynamic from 'next/dynamic';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Hash, Users, Settings, UserCircle, ChevronDown, Pin, PinOff, Search, X, Loader2, LogOut } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { filterDeletedUsers, logFilteringStats, isUserDeleted } from '@/lib/user-filtering';
import { 
  Palette, MusicIcon, BookOpen, Code, Plane, Gamepad2, Bike, ChefHat, Film,
  MessageSquare, Megaphone, Music, Coffee, Heart, Star, Zap, Globe, Lock, Eye,
  Mic, Video, ImageIcon, FileText, Calendar, Clock, Target, Lightbulb, Gift, Trophy,
  Rocket, Compass, Map, CameraIcon, Headphones, Monitor, Smartphone, Wifi, Database,
  Server, Cloud, HardDrive, Cpu, MemoryStick, Battery, Bluetooth, Radio, Tv,
  Speaker, Volume2, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Download,
  UploadIcon, Share, LinkIcon, Copy, Scissors, Paperclip, PinIcon, Flag, Bookmark,
  TagIcon, Filter, SearchIcon, Move, RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Maximize, Minimize, Square, Circle, Triangle, Hexagon, Pentagon, Octagon
} from 'lucide-react';

import type { ChatMessage, TenorGif } from '@/types/app';
import ChatMessageDisplay from '@/components/communities/chat-message';
import ChatInput from '@/components/communities/chat-input';
import CommunityInfoPanel from '@/components/communities/community-info-panel';
import CommunitySettings from '@/components/communities/community-settings';
import CleanupStatusIndicator from '@/components/communities/cleanup-status-indicator';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const passionChannelOptions = [
  { value: "art_design", label: "Art & Design", icon: Palette },
  { value: "movies_tv", label: "Movies & TV", icon: Film },
  { value: "music", label: "Music", icon: MusicIcon },
  { value: "reading", label: "Reading", icon: BookOpen },
  { value: "technology", label: "Technology", icon: Code },
  { value: "travel", label: "Travel", icon: Plane },
  { value: "gaming", label: "Gaming", icon: Gamepad2 },
  { value: "sports_fitness", label: "Sports & Fitness", icon: Bike },
  { value: "food_cooking", label: "Food & Cooking", icon: ChefHat },
  { value: "other_hobbies", label: "Other Hobbies", icon: Hash },
];

const vibeCommunityStaticProps = {
  id: 'vibe-community-main',
  name: 'vibe',
  dataAiHint: 'abstract colorful logo',
  description: 'The official community for all vibe users. Connect, share, discuss your passions, and discover new vibes!',
  dataAiHintBanner: 'community abstract vibrant',
  tags: ['General', 'Announcements', ...passionChannelOptions.map(p => p.label)]
};

const placeholderCommunities = [
  {
    ...vibeCommunityStaticProps,
  }
];

// Icon mapping function to convert icon names back to components
const getIconComponent = (iconName?: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    Hash, MessageSquare, Megaphone, Music, Gamepad2, BookOpen, Code, Palette,
    Coffee, Heart, Star, Zap, Globe, Lock, Eye, Mic, Video, ImageIcon, FileText,
    Calendar, Clock, Target, Lightbulb, Gift, Trophy, Rocket, Compass, Map,
    CameraIcon, Headphones, Monitor, Smartphone, Wifi, Database, Server, Cloud,
    HardDrive, Cpu, MemoryStick, Battery, Bluetooth, Radio, Tv, Speaker,
    Volume2, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Download,
    UploadIcon, Share, LinkIcon, Copy, Scissors, Paperclip, PinIcon, Flag,
    Bookmark, TagIcon, Filter, SearchIcon, Move, RotateCcw, RotateCw,
    FlipHorizontal, FlipVertical, Maximize, Minimize, Square, Circle,
    Triangle, Hexagon, Pentagon, Octagon, ShieldCheck, Users,
    // Add some aliases for common names
    Camera: CameraIcon,
    Image: ImageIcon,
    Upload: UploadIcon,
    Link: LinkIcon,
    Pin: PinIcon,
    Tag: TagIcon,
    Search: SearchIcon
  };
  
  return iconMap[iconName || 'Hash'] || Hash;
};

const placeholderChannels: Record<string, Array<{ id: string; name: string; type: 'text'; icon: React.ElementType }>> = {
  'vibe-community-main': [
    { id: 'vibe-general', name: 'general-chat', type: 'text', icon: Hash },
    { id: 'vibe-announcements', name: 'announcements', type: 'text', icon: ShieldCheck },
    ...passionChannelOptions.map((p) => ({
      id: `vibe-passion-${p.value}`,
      name: p.label.toLowerCase().replace(/\s&?\s/g, '-').replace(/[^a-z0-9-]/g, ''),
      type: 'text' as 'text',
      icon: p.icon || Hash
    })),
  ],
};

type Community = {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  memberCount: number;
  isPrivate: boolean;
  ownerId: string;
  ownerName: string;
  members: string[];
  moderators: string[];
  admins: string[];
  bannedUsers?: string[];
  createdAt: any;
  tags: string[];
  permissions?: {
    member: any;
    moderator: any;
    admin: any;
    owner: any;
  };
};

type Channel = { id: string; name: string; type: 'text'; icon: React.ElementType; description?: string; createdAt?: any; createdBy?: string; iconName?: string };
export type Member = { id: string; name: string; avatarUrl?: string; dataAiHint: string; vibeTag?: "AURA" | "BONE" | "FORM" | "INIT" | "LITE" };






export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [communityMembers, setCommunityMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isRightBarOpen, setIsRightBarOpen] = useState(true);

  const [currentThemeMode, setCurrentThemeMode] = useState<'light' | 'dark'>('dark');

  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  // Restricted words functionality
  const [restrictedWords, setRestrictedWords] = useState<Array<{ word: string, convertTo: string }>>([]);
  const [newRestrictedWord, setNewRestrictedWord] = useState("");
  const [newRestrictedWordConvertTo, setNewRestrictedWordConvertTo] = useState("*");
  const [isRestrictedWordsDialogOpen, setIsRestrictedWordsDialogOpen] = useState(false);

  // Community settings
  const [isCommunitySettingsOpen, setIsCommunitySettingsOpen] = useState(false);

  // Add state to track when to refresh communities
  const [refreshCommunities, setRefreshCommunities] = useState(false);
  
  // Add state to track join dialog
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [communityToJoin, setCommunityToJoin] = useState<Community | null>(null);
  
  // Add state for user connections (for demo purposes - in real app this would come from a connections API)
  const [userConnections, setUserConnections] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Function to get the vibe community owner ID
  const getVibeOwnerInfo = async () => {
    try {
      // Look for user with the specific email
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.email === 'sheikhabduh6@gmail.com') {
          return {
            ownerId: userDoc.id,
            ownerName: userData.profileDetails?.displayName || userData.email?.split('@')[0] || 'Sheikh'
          };
        }
      }
      
      // Fallback to current user if they have the email
      if (currentUser?.email === 'sheikhabduh6@gmail.com') {
        return {
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Sheikh'
        };
      }
      
      // Default fallback
      return {
        ownerId: 'vibe-official',
        ownerName: 'Vibe Team'
      };
    } catch (error) {
      console.error('Error getting vibe owner info:', error);
      return {
        ownerId: 'vibe-official',
        ownerName: 'Vibe Team'
      };
    }
  };

  // Fetch communities from Firestore
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingCommunities(false);
      return;
    }

    const fetchCommunities = async () => {
      setIsLoadingCommunities(true);
      try {
        const communitiesRef = collection(db, 'communities');
        const q = query(communitiesRef, orderBy('createdAt', 'desc'));
        
        // Get the proper owner info for vibe community
        const vibeOwnerInfo = await getVibeOwnerInfo();
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedCommunities: Community[] = [];
          
          // Always include the vibe community first with proper ownership and member structure
          const vibeCommunity: Community = {
            ...vibeCommunityStaticProps,
            logoUrl: dynamicVibeCommunityIcon,
            bannerUrl: dynamicVibeCommunityBanner,
            memberCount: 0, // Will be dynamically updated
            isPrivate: false,
            ownerId: vibeOwnerInfo.ownerId,
            ownerName: vibeOwnerInfo.ownerName,
            // Initialize with empty member structure - vibe community shows all users regardless
            members: [],
            moderators: [],
            // Add admins - can add specific user IDs here for VIBE community admins
            admins: [],
            bannedUsers: [],
            createdAt: null,
            permissions: {
              // VIBE community permissions - more open than typical communities
              member: {
                canInviteMembers: true,
                canCreateChannels: false,
                canDeleteMessages: false,
                canMentionEveryone: false,
                canManageRoles: false,
                canKickMembers: false,
                canBanMembers: false,
                canManageServer: false,
              },
              moderator: {
                canInviteMembers: true,
                canCreateChannels: true,
                canDeleteMessages: true,
                canMentionEveryone: true,
                canManageRoles: false,
                canKickMembers: true,
                canBanMembers: false,
                canManageServer: false,
              },
              admin: {
                canInviteMembers: true,
                canCreateChannels: true,
                canDeleteMessages: true,
                canMentionEveryone: true,
                canManageRoles: true,
                canKickMembers: true,
                canBanMembers: true,
                canManageServer: true,
              },
              owner: {
                canInviteMembers: true,
                canCreateChannels: true,
                canDeleteMessages: true,
                canMentionEveryone: true,
                canManageRoles: true,
                canKickMembers: true,
                canBanMembers: true,
                canManageServer: true,
              }
            },
          };
          console.log("Vibe community data:", vibeCommunity);
          fetchedCommunities.push(vibeCommunity);
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Only show communities where user is actually a member
            const isUserMember = data.members?.includes(currentUser.uid) || 
                                data.moderators?.includes(currentUser.uid) || 
                                data.admins?.includes(currentUser.uid) || 
                                data.ownerId === currentUser.uid;
            
            // Log for debugging
            console.log(`Community ${data.name} - isUserMember: ${isUserMember}`);
            
            // Only include communities where the user is actually a member
            if (isUserMember) {
              const communityData = {
                id: doc.id,
                name: data.name,
                description: data.description,
                logoUrl: data.logoUrl,
                bannerUrl: data.bannerUrl,
                memberCount: data.memberCount || 1,
                isPrivate: data.isPrivate || false,
                ownerId: data.ownerId,
                ownerName: data.ownerName,
                members: data.members || [],
                moderators: data.moderators || [],
                admins: data.admins || [],
                createdAt: data.createdAt,
                tags: data.tags || [],
                permissions: data.permissions || undefined,
              };
              console.log("Fetched community data:", communityData);
              fetchedCommunities.push(communityData);
            }
          });
          
          setCommunities(fetchedCommunities);
          
          // Check if there's a specific community ID in the URL
          const urlParams = new URLSearchParams(window.location.search);
          const communityId = urlParams.get('communityId');
          
          if (communityId) {
            const targetCommunity = fetchedCommunities.find(c => c.id === communityId);
            if (targetCommunity) {
              setSelectedCommunity(targetCommunity);
            } else {
              // Community not found in user's accessible communities
              // Try to fetch the specific community to see if it exists but user isn't a member
              const fetchCommunityForJoin = async () => {
                try {
                  const communityRef = doc(db, 'communities', communityId);
                  const communityDoc = await getDoc(communityRef);
                  
                  if (communityDoc.exists()) {
                    const data = communityDoc.data();
                    const isUserMember = data.members?.includes(currentUser.uid) || 
                                        data.moderators?.includes(currentUser.uid) || 
                                        data.admins?.includes(currentUser.uid) || 
                                        data.ownerId === currentUser.uid;
                    
                    if (!isUserMember && !data.isPrivate) {
                      // Community exists, is public, but user isn't a member - show join dialog
                      const communityToJoin: Community = {
                        id: communityDoc.id,
                        name: data.name,
                        description: data.description,
                        logoUrl: data.logoUrl,
                        bannerUrl: data.bannerUrl,
                        memberCount: data.memberCount || 1,
                        isPrivate: data.isPrivate || false,
                        ownerId: data.ownerId,
                        ownerName: data.ownerName,
                        members: data.members || [],
                        moderators: data.moderators || [],
                        admins: data.admins || [],
                        createdAt: data.createdAt,
                        tags: data.tags || [],
                        permissions: data.permissions || undefined,
                      };
                      setCommunityToJoin(communityToJoin);
                      setShowJoinDialog(true);
                    } else if (!isUserMember && data.isPrivate) {
                      // Private community - user can't join
                      toast({
                        variant: "destructive",
                        title: "Private Community",
                        description: "This community is private and requires an invitation to join.",
                      });
                    }
                  }
                } catch (error) {
                  console.error('Error fetching community for join:', error);
                }
                
                // Default to first community regardless
                setSelectedCommunity(fetchedCommunities[0] || null);
              };
              
              fetchCommunityForJoin();
            }
          } else {
            // Default to first community (vibe)
            setSelectedCommunity(fetchedCommunities[0] || null);
          }
          
          setIsLoadingCommunities(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching communities:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Communities",
          description: "Could not load communities. Please try again later.",
        });
        setIsLoadingCommunities(false);
      }
    };

    fetchCommunities();
  }, [currentUser, toast, refreshCommunities]);

  // Fetch channels when community changes
  useEffect(() => {
    if (!selectedCommunity || !currentUser) {
      setChannels([]);
      setSelectedChannel(null);
      return;
    }

    if (selectedCommunity.id === 'vibe-community-main') {
      // Use hardcoded channels for vibe community
      const vibeChannels = placeholderChannels[selectedCommunity.id] || [];
      setChannels(vibeChannels);
      setSelectedChannel(vibeChannels[0] || null);
    } else {
      // Fetch channels from Firestore for user-created communities
      const channelsRef = collection(db, `communities/${selectedCommunity.id}/channels`);
      const q = query(channelsRef, orderBy('createdAt', 'asc'));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedChannels: Channel[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedChannels.push({
            id: doc.id,
            name: data.name,
            type: data.type || 'text',
            icon: getIconComponent(data.iconName),
            description: data.description,
          });
        });
        
        setChannels(fetchedChannels);
        setSelectedChannel(fetchedChannels[0] || null);
      });
      
      return unsubscribe;
    }
  }, [selectedCommunity, currentUser]);

  useEffect(() => {
    if (currentUser && selectedCommunity) {
      const modeFromStorage = localStorage.getItem(`appSettings_${currentUser.uid}`);
      if (modeFromStorage) {
        try {
          const settings = JSON.parse(modeFromStorage);
          setCurrentThemeMode(settings.themeMode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        } catch (e) {
          console.error("Error parsing theme from localStorage", e);
          setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
      } else {
        setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }

      // Load restricted words from localStorage
      const storedRestrictedWords = localStorage.getItem(`restricted_words_${currentUser.uid}`);
      if (storedRestrictedWords) {
        const parsed = JSON.parse(storedRestrictedWords);
        // Handle migration from old format (string array) to new format (object array)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          const migrated = parsed.map((word: string) => ({ word, convertTo: '*' }));
          setRestrictedWords(migrated);
          localStorage.setItem(`restricted_words_${currentUser.uid}`, JSON.stringify(migrated));
        } else {
          setRestrictedWords(parsed);
        }
      } else {
        setRestrictedWords([]);
      }

      const fetchMembers = async () => {
        setIsLoadingMembers(true);
        try {
          console.log("Current user for fetching members:", auth.currentUser?.uid);
          
          // Get all users from the database
          const usersSnapshot = await getDocs(collection(db, "users"));
          
          // Use filtering functions
          
          // Filter out deleted users before processing
          const activeUserDocs = filterDeletedUsers(usersSnapshot.docs);
          logFilteringStats(usersSnapshot.docs.length, activeUserDocs.length, "communities");
          
          const fetchedMembers: Member[] = [];
          
          activeUserDocs.forEach((docSnap) => {
            const userData = docSnap.data();
            
            // Double-check for deleted users (extra safety)
            if (isUserDeleted(userData)) {
              return; // Skip this user
            }
            
            const userId = docSnap.id;
            
            // For the vibe community, include ALL active users
            if (selectedCommunity.id === 'vibe-community-main') {
              fetchedMembers.push({
                id: docSnap.id,
                name: userData.profileDetails?.displayName || userData.email?.split('@')[0] || "User",
                avatarUrl: userData.profileDetails?.photoURL || undefined,
                dataAiHint: "person face",
                vibeTag: userData.profileDetails?.vibeTag,
              });
            } else {
              // For other communities, include users who are members of that specific community
              // This ensures all community members can see each other
              if (
                selectedCommunity.ownerId === userId ||
                selectedCommunity.admins?.includes(userId) ||
                selectedCommunity.moderators?.includes(userId) ||
                selectedCommunity.members?.includes(userId)
              ) {
                fetchedMembers.push({
                  id: docSnap.id,
                  name: userData.profileDetails?.displayName || userData.email?.split('@')[0] || "User",
                  avatarUrl: userData.profileDetails?.photoURL || undefined,
                  dataAiHint: "person face",
                  vibeTag: userData.profileDetails?.vibeTag,
                });
              }
            }
          });
          
          console.log(`Fetched community members for ${selectedCommunity.name} (active only):`, fetchedMembers);
          console.log(`Community member count: ${fetchedMembers.length}`);
          setCommunityMembers(fetchedMembers);
          
          // Update community member count in the communities list
          setCommunities(prevCommunities => 
            prevCommunities.map(community => 
              community.id === selectedCommunity.id 
                ? { ...community, memberCount: fetchedMembers.length }
                : community
            )
          );
        } catch (error) {
          console.error("Error loading members (full error object):", error);
          toast({
            variant: "destructive",
            title: "Error Loading Members",
            description: "Could not load community members. Please ensure you are authenticated and check Firestore security rules in the Firebase Console. See browser console for more details.",
          });
          setCommunityMembers([]);
        } finally {
          setIsLoadingMembers(false);
        }
      };

      fetchMembers();
    } else {
      setCommunityMembers([]);
      setIsLoadingMembers(false);
    }
  }, [currentUser, selectedCommunity, toast]);
  

  const dynamicVibeCommunityIcon = currentThemeMode === 'dark' ? '/pfd.png' : '/pfl.png';
  const dynamicVibeCommunityBanner = currentThemeMode === 'dark' ? '/bannerd.png' : '/bannerl.png';


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, showPinnedMessages, chatSearchTerm]);




  useEffect(() => {
    if (selectedChannel && selectedCommunity && currentUser && selectedChannel.type === 'text') {
      // Check if user is a member of the community before accessing messages
      const isUserMember = selectedCommunity.ownerId === currentUser.uid ||
                          selectedCommunity.admins?.includes(currentUser.uid) ||
                          selectedCommunity.moderators?.includes(currentUser.uid) ||
                          selectedCommunity.members?.includes(currentUser.uid) ||
                          selectedCommunity.id === 'vibe-community-main'; // Allow vibe community for all users
      
      if (!isUserMember) {
        setMessages([{
          id: 'access-denied',
          text: `You need to join ${selectedCommunity.name} to view messages in this channel.`,
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date(),
          type: 'text',
        } as ChatMessage]);
        return;
      }
      
      setMessages([]);

      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatarUrl: data.senderAvatarUrl || null,
            timestamp: (data.timestamp)?.toDate() || new Date(),
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
          } as ChatMessage;
        });
        if (fetchedMessages.length > 0 || querySnapshot.metadata.hasPendingWrites === false) {
          setMessages(fetchedMessages);
        }
      }, (error) => {
        console.error("Error fetching messages: ", error);
        toast({
          variant: "destructive",
          title: "Error loading messages",
          description: "Could not load messages for this channel.",
        });
        if (selectedChannel) {
          setMessages([{
            id: 'system-error-' + selectedChannel.id,
            text: `Error loading messages for #${selectedChannel.name}. Please try again later.`,
            senderId: 'system',
            senderName: 'System',
            timestamp: new Date(),
            type: 'text',
          } as ChatMessage]);
        }
      });

      return () => unsubscribeFirestore();

    } else {
      setMessages([]);
    }
  }, [selectedChannel, selectedCommunity, currentUser, toast]);


  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    // Clear the current URL params and optionally set new ones
    const url = new URL(window.location.href);
    if (community.id !== 'vibe-community-main') {
      url.searchParams.set('communityId', community.id);
    } else {
      url.searchParams.delete('communityId');
    }
    window.history.replaceState(null, '', url);
    
    setShowPinnedMessages(false);
    setIsChatSearchOpen(false);
    setChatSearchTerm("");
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowPinnedMessages(false);
    setIsChatSearchOpen(false);
    setChatSearchTerm("");
  };

  const handleCommunityProfileEdit = () => {
    toast({
      title: "Coming Soon!",
      description: "Editing your community-specific profile is a future feature.",
    });
  };

  // Add leave community function
  const handleLeaveCommunity = async () => {
    if (!selectedCommunity || !currentUser) return;
    
    // Prevent owner from leaving their own community
    if (selectedCommunity.ownerId === currentUser.uid) {
      toast({
        variant: "destructive",
        title: "Cannot Leave Community",
        description: "Community owners cannot leave their own community. You can delete the community or transfer ownership instead.",
      });
      return;
    }
    
    // Prevent leaving the vibe community
    if (selectedCommunity.id === 'vibe-community-main') {
      toast({
        variant: "destructive",
        title: "Cannot Leave",
        description: "You cannot leave the main vibe community.",
      });
      return;
    }
    
    // Confirm before leaving
    const confirmed = window.confirm(`Are you sure you want to leave ${selectedCommunity.name}?`);
    if (!confirmed) return;
    
    try {
      // Remove user from all role arrays in the community
      const communityRef = doc(db, 'communities', selectedCommunity.id);
      
      // Get current community data
      const communityDoc = await getDoc(communityRef);
      if (!communityDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Community not found.",
        });
        return;
      }
      
      const communityData = communityDoc.data();
      const userId = currentUser.uid;
      
      // Verify user is actually a member
      const isUserMember = communityData.members?.includes(userId) || 
                          communityData.moderators?.includes(userId) || 
                          communityData.admins?.includes(userId);
      
      if (!isUserMember) {
        toast({
          variant: "destructive",
          title: "Not a Member",
          description: "You are not a member of this community.",
        });
        return;
      }
      
      // Create updated arrays without the current user
      // Ensure user is removed from all possible role arrays to handle any data inconsistencies
      const updatedMembers = (communityData.members || []).filter((id: string) => id !== userId);
      const updatedModerators = (communityData.moderators || []).filter((id: string) => id !== userId);
      const updatedAdmins = (communityData.admins || []).filter((id: string) => id !== userId);
      
      // Calculate new member count - don't count owner in member count
      const totalMembers = updatedMembers.length + updatedModerators.length + updatedAdmins.length;
      const newMemberCount = Math.max(totalMembers, 1); // Minimum 1 to account for owner
      
      // Update the community document
      await updateDoc(communityRef, {
        members: updatedMembers,
        moderators: updatedModerators,
        admins: updatedAdmins,
        memberCount: newMemberCount
      });
      
      toast({
        title: "Left Community",
        description: `You have successfully left ${selectedCommunity.name}.`,
      });
      
      // Trigger a refresh of the communities list
      setRefreshCommunities(prev => !prev);
      
      // Clear URL parameter if this was the selected community
      const url = new URL(window.location.href);
      if (url.searchParams.get('communityId') === selectedCommunity.id) {
        url.searchParams.delete('communityId');
        window.history.replaceState(null, '', url);
      }
      
      // Reset the selected community to the first available one after a short delay
      // to ensure the communities list has been updated
      setTimeout(() => {
        // Filter out the community that was just left
        const updatedCommunities = communities.filter(c => c.id !== selectedCommunity.id);
        
        // Select the first available community (vibe), or null if none available
        const newSelectedCommunity = updatedCommunities.length > 0 ? updatedCommunities[0] : null;
        setSelectedCommunity(newSelectedCommunity);
      }, 300);
    } catch (error) {
      console.error("Error leaving community:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave community. Please try again.",
      });
    }
  };

  // Add join community function
  const handleJoinCommunity = async (community: Community) => {
    if (!currentUser || !community) return;
    
    // Check if user is already a member
    const isUserMember = community.members?.includes(currentUser.uid) || 
                        community.moderators?.includes(currentUser.uid) || 
                        community.admins?.includes(currentUser.uid) || 
                        community.ownerId === currentUser.uid;
    
    if (isUserMember) {
      toast({
        title: "Already a Member",
        description: `You are already a member of ${community.name}.`,
      });
      return;
    }
    
    // Check if community is private
    if (community.isPrivate) {
      toast({
        variant: "destructive",
        title: "Private Community",
        description: "This community is private and requires an invitation to join.",
      });
      return;
    }
    
    try {
      const communityRef = doc(db, 'communities', community.id);
      
      // Get current community data
      const communityDoc = await getDoc(communityRef);
      if (!communityDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Community not found.",
        });
        return;
      }
      
      const communityData = communityDoc.data();
      const userId = currentUser.uid;
      
      // Check if user is banned (if banned users list exists)
      if (communityData.bannedUsers && communityData.bannedUsers.includes(userId)) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You have been banned from this community.",
        });
        return;
      }
      
      // Add user to members array and increment member count
      const updatedMembers = [...(communityData.members || []), userId];
      const newMemberCount = (communityData.memberCount || 0) + 1;
      
      // Update the community document
      await updateDoc(communityRef, {
        members: updatedMembers,
        memberCount: newMemberCount
      });
      
      toast({
        title: "Joined Community!",
        description: `You have successfully joined ${community.name}.`,
      });
      
      // Trigger a refresh of the communities list
      setRefreshCommunities(prev => !prev);
      
      // Close join dialog if it was open
      setShowJoinDialog(false);
      setCommunityToJoin(null);
      
    } catch (error) {
      console.error("Error joining community:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join community. Please try again.",
      });
    }
  };

  // User interaction handlers
  const handleConnectUser = async (userId: string) => {
    try {
      // In a real app, this would make an API call to create a connection
      setUserConnections(prev => [...prev, userId]);
      toast({
        title: "Connection Sent",
        description: "Your connection request has been sent.",
      });
    } catch (error) {
      console.error('Error connecting to user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send connection request.",
      });
    }
  };

  const handleMessageUser = async (userId: string) => {
    try {
      // In a real app, this would navigate to the messaging interface
      toast({
        title: "Opening Message",
        description: "Messaging feature coming soon!",
      });
      // Example: router.push(`/messages/${userId}`);
    } catch (error) {
      console.error('Error opening message:', error);
    }
  };

  const handleDisconnectUser = async (userId: string) => {
    try {
      // In a real app, this would make an API call to remove the connection
      setUserConnections(prev => prev.filter(id => id !== userId));
      toast({
        title: "Disconnected",
        description: "You have disconnected from this user.",
      });
    } catch (error) {
      console.error('Error disconnecting from user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to disconnect from user.",
      });
    }
  };

  const handleKickUser = async (userId: string) => {
    if (!selectedCommunity || !currentUser) return;
    
    // Prevent kicking from VIBE community unless user has admin/owner rights
    if (selectedCommunity.id === 'vibe-community-main') {
      const hasVibeAdminRights = currentUser.email === 'sheikhabduh6@gmail.com' ||
                                selectedCommunity.admins?.includes(currentUser.uid) ||
                                selectedCommunity.moderators?.includes(currentUser.uid);
      if (!hasVibeAdminRights) {
        toast({
          variant: "destructive",
          title: "Insufficient Permissions",
          description: "Only VIBE administrators can manage members.",
        });
        return;
      }
    }
    
    const confirmed = window.confirm('Are you sure you want to kick this member?');
    if (!confirmed) return;
    
    try {
      const communityRef = doc(db, 'communities', selectedCommunity.id);
      const communityDoc = await getDoc(communityRef);
      
      if (!communityDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Community not found.",
        });
        return;
      }
      
      const communityData = communityDoc.data();
      
      // Remove user from all role arrays
      const updatedMembers = (communityData.members || []).filter((id: string) => id !== userId);
      const updatedModerators = (communityData.moderators || []).filter((id: string) => id !== userId);
      const updatedAdmins = (communityData.admins || []).filter((id: string) => id !== userId);
      const newMemberCount = Math.max((communityData.memberCount || 1) - 1, 1);
      
      await updateDoc(communityRef, {
        members: updatedMembers,
        moderators: updatedModerators,
        admins: updatedAdmins,
        memberCount: newMemberCount
      });
      
      toast({
        title: "Member Kicked",
        description: "The member has been removed from the community.",
      });
      
      // Refresh communities to update the UI
      setRefreshCommunities(prev => !prev);
      
    } catch (error) {
      console.error('Error kicking member:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to kick member. Please try again.",
      });
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!selectedCommunity || !currentUser) return;
    
    // Prevent banning from VIBE community unless user has admin/owner rights
    if (selectedCommunity.id === 'vibe-community-main') {
      const hasVibeAdminRights = currentUser.email === 'sheikhabduh6@gmail.com' ||
                                selectedCommunity.admins?.includes(currentUser.uid) ||
                                selectedCommunity.moderators?.includes(currentUser.uid);
      if (!hasVibeAdminRights) {
        toast({
          variant: "destructive",
          title: "Insufficient Permissions",
          description: "Only VIBE administrators can ban members.",
        });
        return;
      }
    }
    
    const confirmed = window.confirm('Are you sure you want to ban this member? This will remove them and prevent them from rejoining.');
    if (!confirmed) return;
    
    try {
      const communityRef = doc(db, 'communities', selectedCommunity.id);
      const communityDoc = await getDoc(communityRef);
      
      if (!communityDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Community not found.",
        });
        return;
      }
      
      const communityData = communityDoc.data();
      
      // Remove user from all role arrays and add to banned list
      const updatedMembers = (communityData.members || []).filter((id: string) => id !== userId);
      const updatedModerators = (communityData.moderators || []).filter((id: string) => id !== userId);
      const updatedAdmins = (communityData.admins || []).filter((id: string) => id !== userId);
      const updatedBannedUsers = [...(communityData.bannedUsers || []), userId];
      const newMemberCount = Math.max((communityData.memberCount || 1) - 1, 1);
      
      await updateDoc(communityRef, {
        members: updatedMembers,
        moderators: updatedModerators,
        admins: updatedAdmins,
        bannedUsers: updatedBannedUsers,
        memberCount: newMemberCount
      });
      
      toast({
        title: "Member Banned",
        description: "The member has been banned from the community.",
      });
      
      // Refresh communities to update the UI
      setRefreshCommunities(prev => !prev);
      
    } catch (error) {
      console.error('Error banning member:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to ban member. Please try again.",
      });
    }
  };

  const handleToggleScreenShare = useCallback(() => {
    toast({
      title: "Coming Soon",
      description: "Screen sharing will be available in a future update.",
    });
  }, [toast]);

  const handleChatSearchToggle = () => {
    setIsChatSearchOpen(!isChatSearchOpen);
    if (!isChatSearchOpen && chatSearchInputRef.current) {
      setTimeout(() => chatSearchInputRef.current?.focus(), 0);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser || !selectedCommunity || !selectedChannel) return;

    try {
      const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${messageId}`);
      await deleteDoc(messageRef);

      toast({
        title: "Message Deleted",
        description: "The message has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle toggling message reactions
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !selectedCommunity || !selectedChannel) return;

    try {
      const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${messageId}`);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) return;

      const messageData = messageDoc.data();
      const reactions = messageData.reactions || {};
      const userReactions = reactions[emoji] || [];

      if (userReactions.includes(currentUser.uid)) {
        // Remove reaction
        userReactions.splice(userReactions.indexOf(currentUser.uid), 1);
      } else {
        // Add reaction
        userReactions.push(currentUser.uid);
      }

      reactions[emoji] = userReactions;

      await updateDoc(messageRef, { reactions });
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle replying to a message
  const handleReplyClick = (message: ChatMessage) => {
    setReplyingToMessage(message);
  };

  // Handle toggling message pin status
  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    if (!currentUser || !selectedCommunity || !selectedChannel) return;

    try {
      const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${messageId}`);
      await updateDoc(messageRef, { isPinned: !isPinned });

      toast({
        title: isPinned ? "Message Unpinned" : "Message Pinned",
        description: isPinned ? "Message has been unpinned." : "Message has been pinned to the channel."
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast({
        title: "Error",
        description: "Failed to update pin status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle favoriting a GIF
  const handleFavoriteGif = (message: ChatMessage) => {
    if (!currentUser || !message.gifId) return;

    const storageKey = `favorited_gifs_${currentUser.uid}`;
    const storedFavorites = localStorage.getItem(storageKey);
    const favoritedGifs = storedFavorites ? JSON.parse(storedFavorites) : [];

    if (favoritedGifs.some((gif: any) => gif.id === message.gifId)) {
      // Remove from favorites
      const updatedFavorites = favoritedGifs.filter((gif: any) => gif.id !== message.gifId);
      localStorage.setItem(storageKey, JSON.stringify(updatedFavorites));
      toast({ title: "GIF Unfavorited", description: "Removed from your favorites." });
    } else {
      // Add to favorites
      const gifToFavorite = {
        id: message.gifId,
        media_formats: {
          tinygif: { url: message.gifTinyUrl || '', dims: [0, 0], preview: '', duration: 0, size: 0 },
          gif: { url: message.gifUrl || '', dims: [0, 0], preview: '', duration: 0, size: 0 }
        },
        content_description: message.gifContentDescription || '',
        created: 0, hasaudio: false, itemurl: '', shares: 0, source_id: '', tags: [], url: '', composite: null, hascaption: false, title: '', flags: []
      };
      const updatedFavorites = [...favoritedGifs, gifToFavorite];
      const favoritesKey = `favoritedGifs_${currentUser?.uid || 'anonymous'}`;
      localStorage.setItem(favoritesKey, JSON.stringify(updatedFavorites));
      toast({ title: "GIF Favorited!", description: "Added to your favorites." });
    }
  };

  const isGifFavorited = (gifId: string): boolean => {
    if (!currentUser) return false;
    const key = `favorited_gifs_${currentUser.uid}`;
    const storedFavorites = localStorage.getItem(key);
    const favoritedGifs = storedFavorites ? JSON.parse(storedFavorites) : [];
    return favoritedGifs.some((gif: any) => gif.id === gifId);
  };

  const handleForward = (message: ChatMessage) => {
    // For now, just show a toast. Forwarding functionality can be implemented later
    toast({
      title: "Forward Feature",
      description: "Message forwarding will be implemented in a future update."
    });
  };

  // Function to censor restricted words with custom replacement characters
  const censorRestrictedWords = (text: string): string => {
    if (!restrictedWords.length) return text;

    let censoredText = text;
    restrictedWords.forEach(({ word, convertTo }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      // If convertTo is a single character, repeat it for the length of the word
      // If it's multiple characters, use it as is
      const replacement = convertTo.length === 1 ? convertTo.repeat(word.length) : convertTo;
      censoredText = censoredText.replace(regex, replacement);
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

  // Community settings handlers
  const handleCommunitySettingsOpen = () => {
    if (!selectedCommunity || !currentUser) {
      toast({ title: "Access Denied", description: "You must be logged in to access settings." });
      return;
    }
    
    const isOwner = selectedCommunity.ownerId === currentUser.uid;
    const isAdmin = selectedCommunity.admins?.includes(currentUser.uid);
    
    if (!isOwner && !isAdmin) {
      toast({ 
        title: "Access Restricted", 
        description: "Only community owners and admins can access settings.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCommunitySettingsOpen(true);
  };

  const handleCommunitySettingsSave = async (updates: Partial<Community>) => {
    if (!selectedCommunity || !currentUser) return;

    try {
      const communityRef = doc(db, 'communities', selectedCommunity.id);
      await updateDoc(communityRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Settings Updated",
        description: "Community settings have been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating community settings:', error);
      throw error;
    }
  };

  const handleChannelCreate = async (channel: { name: string; description: string; type: 'text'; icon?: React.ElementType }) => {
    if (!selectedCommunity || !currentUser) return;

    try {
      const channelsRef = collection(db, `communities/${selectedCommunity.id}/channels`);
      await addDoc(channelsRef, {
        ...channel,
        // Store icon name instead of the component for Firestore
        iconName: channel.icon?.name || 'Hash',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  };

  const handleChannelUpdate = async (channelId: string, updates: { name?: string; description?: string; icon?: React.ElementType }) => {
    if (!selectedCommunity) return;

    try {
      const channelRef = doc(db, `communities/${selectedCommunity.id}/channels`, channelId);
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      // Store icon name instead of the component for Firestore
      if (updates.icon) {
        updateData.iconName = updates.icon.name || 'Hash';
      }
      
      await updateDoc(channelRef, updateData);
    } catch (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  };

  const handleChannelDelete = async (channelId: string) => {
    if (!selectedCommunity) return;

    try {
      const channelRef = doc(db, `communities/${selectedCommunity.id}/channels`, channelId);
      await deleteDoc(channelRef);
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  };
  
  // Handle community deletion
  const handleCommunityDelete = async () => {
    if (!selectedCommunity || !currentUser) return;
    
    // Only allow owners to delete communities
    if (selectedCommunity.ownerId !== currentUser.uid) {
      throw new Error('Only community owners can delete communities.');
    }
    
    try {
      // Delete all channels first
      const channelsRef = collection(db, `communities/${selectedCommunity.id}/channels`);
      const channelsSnapshot = await getDocs(channelsRef);
      
      // Delete each channel and its messages
      for (const channelDoc of channelsSnapshot.docs) {
        const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${channelDoc.id}/messages`);
        const messagesSnapshot = await getDocs(messagesRef);
        
        // Delete all messages in the channel
        for (const messageDoc of messagesSnapshot.docs) {
          await deleteDoc(messageDoc.ref);
        }
        
        // Delete the channel
        await deleteDoc(channelDoc.ref);
      }
      
      // Finally delete the community
      const communityRef = doc(db, 'communities', selectedCommunity.id);
      await deleteDoc(communityRef);
      
      // Navigate to discover page
      router.push('/discover');
      
    } catch (error) {
      console.error('Error deleting community:', error);
      throw error;
    }
  };

  const currentChannels = channels;

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const userAvatar = currentUser?.photoURL;

  const filteredMessages = messages.filter(msg => {
    if (!chatSearchTerm.trim()) return true;
    const term = chatSearchTerm.toLowerCase();
    if (msg.text?.toLowerCase().includes(term)) return true;
    if (msg.fileName?.toLowerCase().includes(term)) return true;
    if (msg.senderName?.toLowerCase().includes(term)) return true;
    if (msg.gifContentDescription?.toLowerCase().includes(term)) return true;
    if (msg.replyToSenderName?.toLowerCase().includes(term)) return true;
    if (msg.replyToTextSnippet?.toLowerCase().includes(term)) return true;
    if (msg.forwardedFromSenderName?.toLowerCase().includes(term)) return true;
    return false;
  });

  const displayedMessages = showPinnedMessages
    ? filteredMessages.filter(msg => msg.isPinned).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    : filteredMessages;

  return (
    <TooltipProvider>
      <div className="flex h-full overflow-hidden bg-background">
      {/* Column 1: Community Server List */}
      <div className="h-full w-14 sm:w-16 md:w-20 bg-muted/20 border-r border-border/30 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-1.5 sm:p-2 space-y-2 sm:space-y-3">
            {isLoadingCommunities ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              communities.map((community) => (
                <ContextMenu key={community.id}>
                  <ContextMenuTrigger>
                    <button
                      onClick={() => handleSelectCommunity(community)}
                      className={cn(
                        "block w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden focus:outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring transition-all duration-150 ease-in-out",
                        selectedCommunity?.id === community.id ? 'ring-2 ring-primary scale-110 rounded-xl' : 'hover:rounded-xl hover:scale-105'
                      )}
                      title={community.name}
                    >
                      <Image
                        src={community.id === 'vibe-community-main' ? dynamicVibeCommunityIcon : (community.logoUrl || dynamicVibeCommunityIcon)}
                        alt={community.name}
                        width={56} height={56}
                        className="object-cover w-full h-full"
                        data-ai-hint={community.id === 'vibe-community-main' ? 'abstract colorful logo' : 'community logo'}
                        priority={community.id === 'vibe-community-main'}
                        quality={95}
                        sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 56px"
                      />
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {community && 
                     community.id !== 'vibe-community-main' &&
                     currentUser && 
                     (community.ownerId !== currentUser.uid) &&
                     (community.admins?.includes(currentUser.uid) || 
                      community.moderators?.includes(currentUser.uid) || 
                      community.members?.includes(currentUser.uid)) && (
                      <ContextMenuItem onClick={() => {
                        // Set this community as selected first, then leave it
                        setSelectedCommunity(community);
                        setTimeout(() => {
                          handleLeaveCommunity();
                        }, 100);
                      }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Leave Community</span>
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Channel List */}
      <div className={cn(
        "h-full bg-card flex flex-col border-r border-border/40 overflow-hidden transition-all duration-300 ease-in-out",
        "w-52 sm:w-56 md:w-64",
        // Hide on mobile when in chat view for better UX
        selectedChannel ? "hidden lg:flex" : "flex"
      )}>
        {selectedCommunity ? (
          <>
            <div className="p-2.5 sm:p-3 border-b border-border/40 shadow-sm shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">{selectedCommunity.name}</h2>
                <CleanupStatusIndicator communityId={selectedCommunity.id} />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-1.5 sm:p-2 md:p-3 space-y-0.5 sm:space-y-1">
                {currentChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant="ghost"
                    onClick={() => handleSelectChannel(channel)}
                    className={cn(
                      "w-full justify-start text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted py-1.5 sm:py-2",
                      selectedChannel?.id === channel.id && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <channel.icon className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    <span className="truncate">{channel.name}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <div className="p-1.5 sm:p-2 border-t border-border/40 shrink-0">
              {currentUser ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs sm:text-sm text-foreground hover:bg-muted py-1.5 sm:py-2 h-auto"
                  onClick={handleCommunityProfileEdit}
                >
                  <Avatar className="mr-1.5 sm:mr-2 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8">
                    <AvatarImage src={userAvatar || undefined} alt={userName} />
                    <AvatarFallback className="bg-muted-foreground/30 text-xs">
                      {userName.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1 text-left">{userName}</span>
                  <ChevronDown className="ml-1 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                </Button>
              ) : (
                <div className="flex items-center p-2 text-xs text-muted-foreground">
                  <UserCircle className="mr-1.5 h-4 w-4" /> Loading user...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-3 sm:p-4 text-center text-muted-foreground flex-1 flex items-center justify-center text-xs sm:text-sm md:text-base">Select a community</div>
        )}
      </div>

      {/* Column 3: Main Content Area (Chat UI / Voice UI) */}
      <div className="h-full flex-1 bg-background flex flex-col overflow-hidden">
        {selectedCommunity && selectedChannel ? (
          <>
            <div className="p-2 sm:p-3 border-b border-border/40 shadow-sm flex items-center justify-between shrink-0">
              <div className="flex items-center min-w-0">
                {/* Mobile back button to show channel list */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden mr-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedChannel(null)}
                  title="Back to Channels"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <selectedChannel.icon className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">{selectedChannel.name}</h3>
              </div>
              <div className={cn("flex items-center space-x-1", isChatSearchOpen && "w-full sm:max-w-xs")}>
                {isChatSearchOpen && selectedChannel.type === 'text' ? (
                  <div className="flex items-center w-full bg-muted rounded-md px-2">
                    <Search className="h-4 w-4 text-muted-foreground mr-2" />
                    <Input
                      ref={chatSearchInputRef}
                      type="text"
                      placeholder={`Search in #${selectedChannel.name}...`}
                      className="flex-1 bg-transparent h-8 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={chatSearchTerm}
                      onChange={(e) => setChatSearchTerm(e.target.value)}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleChatSearchToggle}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {selectedChannel.type === 'text' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
                        onClick={handleChatSearchToggle}
                        title="Search Messages in Channel"
                      >
                        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    )}
                    {selectedChannel.type === 'text' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9",
                          showPinnedMessages && "text-primary bg-primary/10 hover:text-primary/90 hover:bg-primary/20"
                        )}
                        onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                        title={showPinnedMessages ? "Show All Messages" : "Show Pinned Messages"}
                      >
                        {showPinnedMessages ? <PinOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Pin className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9", isRightBarOpen && "bg-accent/20 text-accent")}
                      onClick={() => setIsRightBarOpen(!isRightBarOpen)}
                      title={isRightBarOpen ? "Hide Server Info" : "Show Server Info"}
                    >
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  </>
                )}
              </div>
            </div>

            {selectedChannel.type === 'text' && (
              <ScrollArea className="flex-1 min-h-0 bg-card/30">
                <div className="p-2 sm:p-4 space-y-0.5">
                  {displayedMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-4 text-sm">
                      {chatSearchTerm.trim() ? "No messages found matching your search." :
                        (showPinnedMessages ? "No pinned messages in this channel." :
                          (messages.length === 0 && !currentUser ? "Loading messages..." : "No messages yet. Be the first to say something!"))}
                    </div>
                  )}
                  {displayedMessages.map((msg, index) => (
                    <ChatMessageDisplay
                      key={msg.id}
                      message={msg}
                      previousMessage={index > 0 ? displayedMessages[index - 1] : null}
                      currentUser={currentUser}
                      communityMembers={communityMembers}
                      currentThemeMode={currentThemeMode}
                      onToggleReaction={handleToggleReaction}
                      onReplyClick={handleReplyClick}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDeleteMessage}
                      onFavoriteGif={handleFavoriteGif}
                      isGifFavorited={isGifFavorited}
                      onForward={handleForward}
                      selectedCommunity={selectedCommunity}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            <ChatInput
              currentUser={currentUser}
              selectedChannel={selectedChannel}
              selectedCommunity={selectedCommunity}
              communityMembers={communityMembers}
              currentThemeMode={currentThemeMode}
              hasMicPermission={null}
              requestMicPermission={async () => false}
              replyingToMessage={replyingToMessage}
              onClearReply={() => setReplyingToMessage(null)}
              restrictedWords={restrictedWords}
              censorRestrictedWords={censorRestrictedWords}
            />

          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-base sm:text-lg p-4">
            {selectedCommunity ? "Select a channel to start." : "Select a community to see its channels."}
          </div>
        )}
      </div>

      <CommunityInfoPanel
        isOpen={isRightBarOpen}
        setIsOpen={setIsRightBarOpen}
        selectedCommunity={selectedCommunity}
        dynamicVibeCommunityBanner={dynamicVibeCommunityBanner}
        dynamicVibeCommunityIcon={dynamicVibeCommunityIcon}
        isLoadingMembers={isLoadingMembers}
        communityMembers={communityMembers}
        onCommunitySettingsClick={handleCommunitySettingsOpen}
        onLeaveCommunity={handleLeaveCommunity}
        currentUser={currentUser}
        onConnectUser={handleConnectUser}
        onMessageUser={handleMessageUser}
        onDisconnectUser={handleDisconnectUser}
        onKickUser={handleKickUser}
        onBanUser={handleBanUser}
        userConnections={userConnections}
      />

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

      <CommunitySettings
        isOpen={isCommunitySettingsOpen}
        onOpenChange={setIsCommunitySettingsOpen}
        community={selectedCommunity}
        currentUser={currentUser}
        onSave={handleCommunitySettingsSave}
        onChannelCreate={handleChannelCreate}
        onChannelUpdate={handleChannelUpdate}
        onChannelDelete={handleChannelDelete}
        onCommunityDelete={handleCommunityDelete}
        channels={channels}
        communityMembers={communityMembers}
      />

      {/* Join Community Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Join Community
            </DialogTitle>
            <DialogDescription>
              Would you like to join this community?
            </DialogDescription>
          </DialogHeader>
          
          {communityToJoin && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <Image
                    src={communityToJoin.logoUrl || communityToJoin.bannerUrl || dynamicVibeCommunityIcon}
                    alt={communityToJoin.name}
                    fill
                    className="object-cover"
                    quality={95}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{communityToJoin.name}</h3>
                  <p className="text-sm text-muted-foreground">{communityToJoin.description}</p>
                  <div className="flex items-center mt-2 text-xs text-muted-foreground">
                    <Users className="mr-1 h-3 w-3" />
                    {communityToJoin.memberCount} member{communityToJoin.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowJoinDialog(false);
                setCommunityToJoin(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => communityToJoin && handleJoinCommunity(communityToJoin)}
            >
              Join Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
