
"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import dynamic from 'next/dynamic';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Hash, Mic, Video, Users, Settings, UserCircle, ChevronDown, Loader2, Pin, PinOff, Search, X, MicOff, VideoOff, Monitor, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Palette, MusicIcon, BookOpen, Code, Plane, Gamepad2, Bike, ChefHat, Film } from 'lucide-react';

import { useWebRTC, type WebRTCUser } from '@/lib/webrtc';
import type { ChatMessage, TenorGif } from '@/types/app';
import ChatMessageDisplay from '@/components/communities/chat-message';
import ChatInput from '@/components/communities/chat-input';
import CommunityInfoPanel from '@/components/communities/community-info-panel';


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

const placeholderChannels: Record<string, Array<{ id: string; name: string; type: 'text' | 'voice' | 'video'; icon: React.ElementType }>> = {
  'vibe-community-main': [
    { id: 'vibe-general', name: 'general-chat', type: 'text', icon: Hash },
    { id: 'vibe-announcements', name: 'announcements', type: 'text', icon: ShieldCheck },
    ...passionChannelOptions.map((p) => ({
      id: `vibe-passion-${p.value}`,
      name: p.label.toLowerCase().replace(/\s&?\s/g, '-').replace(/[^a-z0-9-]/g, ''),
      type: 'text' as 'text',
      icon: p.icon || Hash
    })),
    { id: 'vibe-lounge-voice', name: 'lounge-voice', type: 'voice', icon: Mic },
    { id: 'vibe-hangout-video', name: 'hangout-video', type: 'video', icon: Video },
  ],
};

type Community = Omit<typeof placeholderCommunities[0], 'iconUrl' | 'bannerUrl'> & { iconUrl?: string; bannerUrl?: string; };
type Channel = { id: string; name: string; type: 'text' | 'voice' | 'video'; icon: React.ElementType };
export type Member = { id: string; name: string; avatarUrl?: string; dataAiHint: string };


// WebRTC signaling server URL
const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 'https://us-central1-vibe-app.cloudfunctions.net';

// Dynamic import for AgoraRTC (for backward compatibility during migration)
const AgoraRTC = dynamic(() => import('agora-rtc-sdk-ng'), { ssr: false });
const AGORA_APP_ID = "530ba273ad0847019e4e48e70135e345";

// Token server URL for Agora (for backward compatibility during migration)
const TOKEN_SERVER_URL_PLACEHOLDER = 'https://your-token-server.com/generate-agora-token';
const TOKEN_SERVER_API_KEY = "ACo4e06ba0f991d4bc1891d6c8ae0d71b0a";

// Function to fetch Agora token (for backward compatibility during migration)
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
      throw new Error(errorDetails);
    }

    const data = await response.json();
    if (data.token) {
      return data.token;
    } else {
      throw new Error('Token not found in server response.');
    }
  } catch (error: any) {
    console.error('Error fetching Agora token:', error.message);
    throw error;
  }
}



export default function CommunitiesPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(placeholderCommunities[0]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    selectedCommunity ? placeholderChannels[selectedCommunity.id]?.[0] || null : null
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [communityMembers, setCommunityMembers] = useState<Member[]>([]); 
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isRightBarOpen, setIsRightBarOpen] = useState(true);

  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [currentThemeMode, setCurrentThemeMode] = useState<'light' | 'dark'>('dark');

  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [channelJoinTime, setChannelJoinTime] = useState<Date | null>(null);
  const [channelDuration, setChannelDuration] = useState(0);
  
  // Restricted words functionality
  const [restrictedWords, setRestrictedWords] = useState<Array<{word: string, convertTo: string}>>([]);
  const [newRestrictedWord, setNewRestrictedWord] = useState("");
  const [newRestrictedWordConvertTo, setNewRestrictedWordConvertTo] = useState("*");
  const [isRestrictedWordsDialogOpen, setIsRestrictedWordsDialogOpen] = useState(false);
  
  // WebRTC hook
  const {
    localStream,
    remoteUsers,
    isConnected: isInVoiceChannel,
    isConnecting,
    isMuted,
    isCameraOff,
    isScreenSharing,
    error: webRTCError,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleCamera,
    toggleScreenShare
  } = useWebRTC();
  
  // Agora-related state variables (for backward compatibility during migration)
  const agoraClientRef = useRef<any>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<any>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [localScreenTrack, setLocalScreenTrack] = useState<any>(null);
  const [remoteAgoraUsers, setRemoteAgoraUsers] = useState<any[]>([]);
  
  const localVideoPlayerContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoPlayersContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
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
            const usersSnapshot = await getDocs(collection(db, "users"));
            const fetchedMembers: Member[] = [];
            usersSnapshot.forEach((docSnap) => {
              const userData = docSnap.data();
              fetchedMembers.push({
                id: docSnap.id,
                name: userData.profileDetails?.displayName || userData.email?.split('@')[0] || "User",
                avatarUrl: userData.profileDetails?.photoURL || undefined,
                dataAiHint: "person face", 
              });
            });
            console.log("Fetched community members:", fetchedMembers);
            setCommunityMembers(fetchedMembers);
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
  }, [currentUser, toast]);

  const dynamicVibeCommunityIcon = currentThemeMode === 'dark' ? '/pfd.png' : '/pfl.png';
  const dynamicVibeCommunityBanner = currentThemeMode === 'dark' ? '/bannerd.png' : '/bannerl.png';


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, showPinnedMessages, chatSearchTerm]);


  useEffect(() => {
    if (selectedChannel && selectedCommunity && currentUser && selectedChannel.type === 'text') {
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

    } else if (selectedChannel && (selectedChannel.type === 'voice' || selectedChannel.type === 'video')) {
        setMessages([]); 
    } else {
      setMessages([]);
    }
  }, [selectedChannel, selectedCommunity, currentUser, toast]);


  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    const firstChannel = placeholderChannels[community.id]?.[0] || null;
    setSelectedChannel(firstChannel);
    setShowPinnedMessages(false);
    setIsChatSearchOpen(false);
    setChatSearchTerm("");
  };

  const handleSelectChannel = (channel: Channel) => {
    // Handle WebRTC channel leaving
    if (isInVoiceChannel) {
      leaveChannel();
    }
    
    // Handle Agora channel leaving (for backward compatibility during migration)
    if (agoraClientRef.current) {
      handleLeaveVoiceChannel();
    }
    
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

  const requestMicPermission = async (): Promise<boolean> => {
    if (hasMicPermission === true) return true;
    if (hasMicPermission === false) {
        toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings to use this feature." });
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error("Error requesting mic permission:", error);
        setHasMicPermission(false);
        toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please allow microphone access in your browser settings." });
        return false;
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
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


  const handleJoinVoiceChannel = async () => {
    if (!selectedChannel || (selectedChannel.type !== 'voice' && selectedChannel.type !== 'video') || isJoiningVoice || !currentUser) {
        setIsJoiningVoice(false);
        return;
    }
    setIsJoiningVoice(true);

    const micPermission = await requestMicPermission();
    if (!micPermission) {
      toast({ variant: "destructive", title: "Microphone Required", description: "Please allow microphone access to join voice/video." });
      setIsJoiningVoice(false);
      return;
    }

    let cameraPermission = true;
    if (selectedChannel.type === 'video') {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream.getTracks().forEach(track => track.stop()); 
        } catch (error) {
            toast({ variant: "destructive", title: "Camera Access Denied", description: "Proceeding with audio-only. Please allow camera access for video." });
            cameraPermission = false;
        }
    }

    toast({
        title: `Joining ${selectedChannel.type} channel...`,
        description: `Attempting to join ${selectedChannel.name}.`,
    });

    try {
        // Use WebRTC for voice/video channels
        await joinChannel({
            channelId: selectedChannel.id,
            enableVideo: selectedChannel.type === 'video' && cameraPermission,
            enableAudio: true
        });
        
        setChannelJoinTime(new Date());
        setChannelDuration(0);
        toast({ title: "Connected!", description: `Joined ${selectedChannel.name}.`});
        return;
    } catch (webRTCError) {
        console.error("WebRTC connection error:", webRTCError);
        toast({ variant: "destructive", title: "WebRTC Connection Failed", description: "Falling back to Agora..." });
    }
    
    // Fallback to Agora if WebRTC fails or is not available
    if (!AGORA_APP_ID) {
        toast({ variant: "destructive", title: "Agora App ID Missing", description: "Agora App ID is not configured. Voice/video chat disabled."});
        setIsJoiningVoice(false);
        return;
    }
    
    try {
        agoraClientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        const client = agoraClientRef.current;

        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            console.log("subscribe success", user, mediaType);
            setRemoteAgoraUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);

            if (mediaType === "video" && user.videoTrack) {
                if (remoteVideoPlayersContainerRef.current) {
                     const playerContainer = document.getElementById(`remote-player-${user.uid}`) || document.createElement('div');
                     playerContainer.id = `remote-player-${user.uid}`;
                     playerContainer.className = 'w-full max-w-xs aspect-video bg-black my-2 rounded-md shadow';
                     if(!document.getElementById(playerContainer.id)) remoteVideoPlayersContainerRef.current.appendChild(playerContainer);
                     user.videoTrack.play(playerContainer);
                }
            }
            if (mediaType === "audio" && user.audioTrack) {
                user.audioTrack.play();
            }
        });

        client.on("user-unpublished", (user, mediaType) => {
            console.log("user-unpublished", user, mediaType);
             if (mediaType === "video") {
                const playerContainer = document.getElementById(`remote-player-${user.uid}`);
                if (playerContainer) {
                    playerContainer.remove();
                }
            }
        });

        client.on("user-left", (user) => {
           setRemoteAgoraUsers(prev => prev.filter(u => u.uid !== user.uid));
           const playerContainer = document.getElementById(`remote-player-${user.uid}`);
           if (playerContainer) {
               playerContainer.remove();
           }
        });

        const uid: UID = currentUser.uid;
        const token = await fetchAgoraToken(selectedChannel.id, uid); 
        
        if (!token) {
            throw new Error("Failed to fetch Agora token for joining channel.");
        }
        
        await client.join(AGORA_APP_ID, selectedChannel.id, token, uid);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);

        let videoTrack: ILocalVideoTrack | null = null;
        if (selectedChannel.type === 'video' && cameraPermission) {
            videoTrack = await AgoraRTC.createCameraVideoTrack();
            setLocalVideoTrack(videoTrack);
            if (localVideoPlayerContainerRef.current) {
                 videoTrack.play(localVideoPlayerContainerRef.current);
            }
        }

        const tracksToPublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [audioTrack];
        if (videoTrack) {
            tracksToPublish.push(videoTrack);
        }
        await client.publish(tracksToPublish);
        setIsInVoiceChannel(true);
        setChannelJoinTime(new Date());
        setChannelDuration(0);
        setIsMuted(false);
        setIsCameraOff(!cameraPermission);
        toast({ title: "Connected!", description: `Joined ${selectedChannel.name}.`});

    } catch (error: any) {
        console.error("Agora connection error:", error);
        toast({ variant: "destructive", title: "Connection Failed", description: error.message || "Could not connect to voice/video channel." });
        if (localAudioTrack) { localAudioTrack.close(); setLocalAudioTrack(null); }
        if (localVideoTrack) { localVideoTrack.close(); setLocalVideoTrack(null); }
        if (agoraClientRef.current) { await agoraClientRef.current.leave(); agoraClientRef.current = null; }
        setRemoteAgoraUsers([]);
        if(remoteVideoPlayersContainerRef.current) remoteVideoPlayersContainerRef.current.innerHTML = '';
        if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = '';
    } finally {
      setIsJoiningVoice(false);
    }
  };

  const handleLeaveVoiceChannel = async () => {
    try {
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
          setRemoteAgoraUsers([]); 
          if(remoteVideoPlayersContainerRef.current) remoteVideoPlayersContainerRef.current.innerHTML = ''; 
          if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = ''; 
          toast({ title: "Disconnected", description: `Left the channel. Duration: ${formatChannelDuration(channelDuration)}`});
      }
    } catch (error) {
      console.error("Error leaving Agora voice channel:", error);
      // Reset state even if there's an error
      setLocalAudioTrack(null);
      setLocalVideoTrack(null);
      setLocalScreenTrack(null);
      agoraClientRef.current = null;
      setRemoteAgoraUsers([]);
    }
    }
    setIsJoiningVoice(false);
    setIsInVoiceChannel(false);
    setChannelJoinTime(null);
    setChannelDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  };

  useEffect(() => {
    return () => {
        handleLeaveVoiceChannel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]); 

  // Channel duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInVoiceChannel && channelJoinTime) {
      interval = setInterval(() => {
        setChannelDuration(Math.floor((Date.now() - channelJoinTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInVoiceChannel, channelJoinTime]);

  // Format channel duration
  const formatChannelDuration = (seconds: number): string => {
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
    // Use WebRTC toggle mute if connected via WebRTC
    if (isInVoiceChannel) {
      toggleMute();
      toast({ 
        title: isMuted ? "Microphone On" : "Microphone Off", 
        description: isMuted ? "Your microphone is now active." : "Your microphone is now muted." 
      });
      return;
    }
    
    // Fallback to Agora (for backward compatibility during migration)
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
    // Use WebRTC toggle camera if connected via WebRTC
    if (isInVoiceChannel) {
      toggleCamera();
      toast({ 
        title: isCameraOff ? "Camera On" : "Camera Off", 
        description: isCameraOff ? "Your camera is now active." : "Your camera is now disabled." 
      });
      return;
    }
    
    // Fallback to Agora (for backward compatibility during migration)
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
    // Use WebRTC toggle screen share if connected via WebRTC
    if (isInVoiceChannel) {
      try {
        toggleScreenShare();
        toast({ 
          title: isScreenSharing ? "Screen Share Stopped" : "Screen Share Started", 
          description: isScreenSharing ? "Screen sharing has been disabled." : "You are now sharing your screen." 
        });
        return;
      } catch (error: any) {
        console.error("WebRTC screen sharing error:", error);
        toast({ 
          variant: "destructive", 
          title: "Screen Share Error", 
          description: error.message || "Could not toggle screen sharing with WebRTC." 
        });
      }
    }
    
    // Fallback to Agora (for backward compatibility during migration)
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
      console.error("Agora screen sharing error:", error);
      toast({ 
        variant: "destructive", 
        title: "Screen Share Error", 
        description: error.message || "Could not toggle screen sharing with Agora." 
      });
    }
  };


  const handleChatSearchToggle = () => {
    setIsChatSearchOpen(!isChatSearchOpen);
    if (!isChatSearchOpen && chatSearchInputRef.current) {
        setTimeout(() => chatSearchInputRef.current?.focus(), 0);
    } else {
        setChatSearchTerm("");
    }
  };

  const handleReplyClick = (message: ChatMessage) => {
    setReplyingToMessage(message);
  };

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
      console.error('Error toggling reaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update reaction."
      });
    }
  };

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
      console.error('Error toggling pin:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update message pin status."
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser || !selectedCommunity || !selectedChannel) return;
    
    try {
      const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${messageId}`);
      await deleteDoc(messageRef);
      
      toast({
        title: "Message Deleted",
        description: "Message has been deleted."
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete message."
      });
    }
  };

  const handleFavoriteGif = (message: ChatMessage) => {
    if (!currentUser || !message.gifId) return;
    
    const key = `favorited_gifs_${currentUser.uid}`;
    const storedFavorites = localStorage.getItem(key);
    const favoritedGifs = storedFavorites ? JSON.parse(storedFavorites) : [];
    
    if (favoritedGifs.some((gif: any) => gif.id === message.gifId)) {
      // Remove from favorites
      const updatedFavorites = favoritedGifs.filter((gif: any) => gif.id !== message.gifId);
      localStorage.setItem(key, JSON.stringify(updatedFavorites));
      toast({ title: "GIF Unfavorited", description: "Removed from your favorites." });
    } else {
      // Add to favorites
      const gifToFavorite = {
        id: message.gifId,
        media_formats: {
          tinygif: { url: message.gifTinyUrl || '', dims: [0,0], preview: '', duration: 0, size:0 },
          gif: { url: message.gifUrl || '', dims: [0,0], preview: '', duration: 0, size:0 }
        },
        content_description: message.gifContentDescription || '',
        created: 0, hasaudio: false, itemurl: '', shares: 0, source_id: '', tags: [], url: '', composite: null, hascaption: false, title: '', flags: []
      };
      const updatedFavorites = [...favoritedGifs, gifToFavorite];
      localStorage.setItem(key, JSON.stringify(updatedFavorites));
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

  const currentChannels = selectedCommunity ? placeholderChannels[selectedCommunity.id] || [] : [];
  
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
    <div className="flex h-full overflow-hidden bg-background">
      {/* Column 1: Community Server List */}
      <div className="h-full w-16 sm:w-20 bg-muted/20 border-r border-border/30 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-3">
            {placeholderCommunities.map((community) => (
              <button
                key={community.id}
                onClick={() => handleSelectCommunity(community)}
                className={cn(
                  "block w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden focus:outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring transition-all duration-150 ease-in-out",
                  selectedCommunity?.id === community.id ? 'ring-2 ring-primary scale-110 rounded-xl' : 'hover:rounded-xl hover:scale-105'
                )}
                title={community.name}
              >
                <Image 
                    src={community.id === 'vibe-community-main' ? dynamicVibeCommunityIcon : (community.iconUrl || '/pfd.png')} 
                    alt={community.name} 
                    width={56} height={56} 
                    className="object-cover w-full h-full" 
                    data-ai-hint={community.dataAiHint || 'abstract logo'}
                    priority={community.id === 'vibe-community-main'}
                />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Channel List */}
      <div className="h-full w-56 sm:w-64 bg-card flex flex-col border-r border-border/40 overflow-hidden">
        {selectedCommunity ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">{selectedCommunity.name}</h2>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 sm:p-3 space-y-1">
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
                    <channel.icon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border/40 shrink-0">
              {currentUser ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs sm:text-sm text-foreground hover:bg-muted py-1.5 sm:py-2 h-auto"
                  onClick={handleCommunityProfileEdit}
                >
                  <Avatar className="mr-2 h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={userAvatar || undefined} alt={userName} />
                    <AvatarFallback className="bg-muted-foreground/30 text-xs">
                      {userName.substring(0,1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1">{userName}</span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </Button>
              ) : (
                <div className="flex items-center p-2 text-xs text-muted-foreground">
                  <UserCircle className="mr-1.5 h-4 w-4" /> Loading user...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground flex-1 flex items-center justify-center text-sm sm:text-base">Select a community</div>
        )}
      </div>

      {/* Column 3: Main Content Area (Chat UI / Voice UI) */}
      <div className="h-full flex-1 bg-background flex flex-col overflow-hidden">
        {selectedCommunity && selectedChannel ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm flex items-center justify-between shrink-0">
              <div className="flex items-center min-w-0">
                <selectedChannel.icon className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{selectedChannel.name}</h3>
              </div>
              <div className={cn("flex items-center space-x-1", isChatSearchOpen && "w-full sm:max-w-xs")}>
                {isChatSearchOpen && selectedChannel.type === 'text' ? (
                    <div className="flex items-center w-full bg-muted rounded-md px-2">
                        <Search className="h-4 w-4 text-muted-foreground mr-2"/>
                        <Input
                            ref={chatSearchInputRef}
                            type="text"
                            placeholder={`Search in #${selectedChannel.name}...`}
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

            {selectedChannel.type === 'text' ? (
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
                     />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 bg-card/30">
                <selectedChannel.icon className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/70"/>
                <p className="text-base sm:text-lg font-medium">This is a {selectedChannel.type} channel.</p>
                <p className="text-xs sm:text-sm mt-1">Voice and video features use Agora SDK.</p>

                {agoraClientRef.current ? (
                     <div className="mt-4 w-full max-w-md sm:max-w-2xl flex flex-col items-center">
                        {/* Channel Duration */}
                        {isInVoiceChannel && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                                <Clock className="h-4 w-4" />
                                <span>{formatChannelDuration(channelDuration)}</span>
                            </div>
                        )}
                        
                        {/* Video Display */}
                        <div className="w-full flex flex-col items-center gap-2">
                            {localVideoTrack && selectedChannel.type === 'video' && (
                                <div id="local-video-player-container" ref={localVideoPlayerContainerRef} className="w-36 h-28 sm:w-48 sm:h-36 bg-black my-2 rounded-md shadow relative self-start">
                                    <p className="text-white text-xs p-1 absolute top-0 left-0 bg-black/50 rounded-br-md">You</p>
                                    {isCameraOff && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-md">
                                            <VideoOff className="h-8 w-8 text-white/70" />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div id="remote-video-players-container" ref={remoteVideoPlayersContainerRef} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            </div>
                            {isInVoiceChannel ? (
                                <p className="text-xs mt-2">{remoteUsers.length} other participant(s) in the call.</p>
                            ) : remoteAgoraUsers.length > 0 && selectedChannel.type === 'video' ? (
                                <p className="text-xs mt-2">{remoteAgoraUsers.length} other participant(s) in the call.</p>
                            ) : null}
                            {((isInVoiceChannel && remoteUsers.length === 0) || (!isInVoiceChannel && remoteAgoraUsers.length === 0 && localVideoTrack)) && (
                                <p className="text-sm text-muted-foreground mt-2">Waiting for others to join...</p>
                            )}
                        </div>

                        {/* Call Controls */}
                        {isInVoiceChannel && (
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
                                        {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
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
                                    onClick={handleLeaveVoiceChannel}
                                    title="Leave Channel"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <Button
                            onClick={handleJoinVoiceChannel}
                            disabled={isJoiningVoice || !AGORA_APP_ID}
                            className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isJoiningVoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <selectedChannel.icon className="mr-2 h-4 w-4"/>}
                            {isJoiningVoice ? "Connecting..." : `Join ${selectedChannel.type.charAt(0).toUpperCase() + selectedChannel.type.slice(1)} Channel`}
                        </Button>
                         {(!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") && (
                             <p className="text-xs text-destructive mt-2">Agora App ID not configured. Voice/Video chat is disabled.</p>
                         )}

                    </>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Note: For production, use a token server for Agora authentication.
                </p>
              </div>
            )}
            
            {selectedChannel.type === 'text' && (
                <ChatInput
                    currentUser={currentUser}
                    selectedChannel={selectedChannel}
                    selectedCommunity={selectedCommunity}
                    communityMembers={communityMembers}
                    currentThemeMode={currentThemeMode}
                    hasMicPermission={hasMicPermission}
                    requestMicPermission={requestMicPermission}
                    replyingToMessage={replyingToMessage}
                    onClearReply={() => setReplyingToMessage(null)}
                    restrictedWords={restrictedWords}
                    censorRestrictedWords={censorRestrictedWords}
                />
            )}

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
          onCommunitySettingsClick={() => toast({title: "Feature Coming Soon", description: "Community settings will be implemented."})}
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
    </div>
  );
}
