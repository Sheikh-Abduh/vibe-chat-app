
"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, getDocs, doc } from 'firebase/firestore';
import dynamic from 'next/dynamic';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Hash, Mic, Video, Users, Settings, UserCircle, ChevronDown, Loader2, Pin, PinOff, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Palette, MusicIcon, BookOpen, Code, Plane, Gamepad2, Bike, ChefHat, Film } from 'lucide-react';

import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type ILocalVideoTrack, type IAgoraRTCRemoteUser, type UID } from 'agora-rtc-sdk-ng';
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


const AGORA_APP_ID = "530ba273ad0847019e4e48e70135e345";
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
      throw new Error(errorDetails); 
    }

    const data = await response.json();
    if (data.token) {
      return data.token;
    } else {
      throw new Error('Token not found in server response.');
    }
  } catch (error: any) {
    if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        const specificErrorMessage = `Network error fetching Agora token. Please ensure the token server URL ('${TOKEN_SERVER_URL}') is correct, reachable, and has CORS configured if necessary. Original error: ${error.message}`;
        console.error(specificErrorMessage);
        throw new Error(specificErrorMessage);
    }
    const generalErrorMessage = `Error fetching Agora token: ${error.message || 'Unknown error'}. Check server response and network.`;
    console.error(generalErrorMessage, error);
    throw new Error(generalErrorMessage);
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

  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
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
    if (!selectedChannel || (selectedChannel.type !== 'voice' && selectedChannel.type !== 'video') || isJoiningVoice || !currentUser || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") {
        if (!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") {
            toast({ variant: "destructive", title: "Agora App ID Missing", description: "Agora App ID is not configured. Voice/video chat disabled."});
        } else if (TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token') {
            toast({ variant: "destructive", title: "Token Server URL Missing", description: "Token server URL not configured. Voice/Video chat disabled."});
        }
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
        agoraClientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        const client = agoraClientRef.current;

        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            console.log("subscribe success", user, mediaType);
            setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);

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
           setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
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

        toast({ title: "Connected!", description: `Joined ${selectedChannel.name}.`});

    } catch (error: any) {
        console.error("Agora connection error:", error);
        toast({ variant: "destructive", title: "Connection Failed", description: error.message || "Could not connect to voice/video channel." });
        if (localAudioTrack) { localAudioTrack.close(); setLocalAudioTrack(null); }
        if (localVideoTrack) { localVideoTrack.close(); setLocalVideoTrack(null); }
        if (agoraClientRef.current) { await agoraClientRef.current.leave(); agoraClientRef.current = null; }
         setRemoteUsers([]);
         if(remoteVideoPlayersContainerRef.current) remoteVideoPlayersContainerRef.current.innerHTML = '';
         if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = '';
    } finally {
      setIsJoiningVoice(false);
    }
  };

  const handleLeaveVoiceChannel = async () => {
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
    if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null; 
        setRemoteUsers([]); 
        if(remoteVideoPlayersContainerRef.current) remoteVideoPlayersContainerRef.current.innerHTML = ''; 
        if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = ''; 
        toast({ title: "Disconnected", description: "You have left the channel."});
    }
    setIsJoiningVoice(false);
  };

  useEffect(() => {
    return () => {
        handleLeaveVoiceChannel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]); 


  const handleChatSearchToggle = () => {
    setIsChatSearchOpen(!isChatSearchOpen);
    if (!isChatSearchOpen && chatSearchInputRef.current) {
        setTimeout(() => chatSearchInputRef.current?.focus(), 0);
    } else {
        setChatSearchTerm("");
    }
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
                        onToggleReaction={() => {}}
                        onReplyClick={() => {}}
                        onTogglePin={() => {}}
                        onDelete={() => {}}
                        onFavoriteGif={() => {}}
                        isGifFavorited={() => false}
                        onForward={() => {}}
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
                        {localVideoTrack && selectedChannel.type === 'video' && (
                            <div id="local-video-player-container" ref={localVideoPlayerContainerRef} className="w-36 h-28 sm:w-48 sm:h-36 bg-black my-2 rounded-md shadow relative self-start">
                                <p className="text-white text-xs p-1 absolute top-0 left-0 bg-black/50 rounded-br-md">You</p>
                            </div>
                        )}
                        <div id="remote-video-players-container" ref={remoteVideoPlayersContainerRef} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        </div>
                        {remoteUsers.length > 0 && selectedChannel.type === 'video' && (
                            <p className="text-xs mt-2">{remoteUsers.length} other participant(s) in the call.</p>
                        )}
                         {remoteUsers.length === 0 && localVideoTrack && (
                            <p className="text-sm text-muted-foreground mt-2">Waiting for others to join...</p>
                        )}

                        <Button
                            onClick={handleLeaveVoiceChannel}
                            variant="destructive"
                            className="mt-6"
                        >
                            <X className="mr-2 h-4 w-4"/> Leave Channel
                        </Button>
                    </div>
                ) : (
                    <>
                        <Button
                            onClick={handleJoinVoiceChannel}
                            disabled={isJoiningVoice || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER" || TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token'}
                            className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isJoiningVoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <selectedChannel.icon className="mr-2 h-4 w-4"/>}
                            {isJoiningVoice ? "Connecting..." : `Join ${selectedChannel.type.charAt(0).toUpperCase() + selectedChannel.type.slice(1)} Channel`}
                        </Button>
                         {(!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") && (
                             <p className="text-xs text-destructive mt-2">Agora App ID not configured. Voice/Video chat is disabled.</p>
                         )}
                         {(TOKEN_SERVER_URL_PLACEHOLDER === 'https://your-token-server.com/generate-agora-token') && (
                            <p className="text-xs text-destructive mt-1">Token server URL not configured.</p>
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
    </div>
  );
}
