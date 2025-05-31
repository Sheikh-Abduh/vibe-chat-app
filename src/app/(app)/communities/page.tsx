
"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc, runTransaction } from 'firebase/firestore';
import type { TenorGif as TenorGifType } from '@/types/tenor';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShieldCheck, Hash, Mic, Video, Users, Settings, UserCircle, MessageSquare, ChevronDown, Paperclip, Smile, Film, Send, Trash2, Pin, PinOff, Loader2, Star, StopCircle, AlertTriangle, SmilePlus, Reply, Share2, X, Search, MessageSquareReply, CornerUpRight, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type ILocalVideoTrack, type IAgoraRTCRemoteUser, type UID } from 'agora-rtc-sdk-ng';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <p className="p-2 text-sm text-muted-foreground">Loading emojis...</p>
});

const placeholderCommunities = [
  { id: '1', name: 'Gamers Unite', iconUrl: 'https://placehold.co/64x64.png', dataAiHint: 'controller abstract', description: 'A community for all things gaming, from retro to modern.', bannerUrl: 'https://placehold.co/600x200.png', dataAiHintBanner: 'gaming landscape', tags: ['Gaming', 'PC', 'Consoles', 'Retro', 'eSports'] },
  { id: '2', name: 'Bookworms Corner', iconUrl: 'https://placehold.co/64x64.png', dataAiHint: 'book open', description: 'Discuss your favorite books, authors, and genres.', bannerUrl: 'https://placehold.co/600x200.png', dataAiHintBanner: 'library shelf', tags: ['Books', 'Reading', 'Fiction', 'Non-Fiction', 'Literature'] },
  { id: '3', name: 'Art Collective', iconUrl: 'https://placehold.co/64x64.png', dataAiHint: 'palette brush', description: 'Share your art, get feedback, and collaborate.', bannerUrl: 'https://placehold.co/600x200.png', dataAiHintBanner: 'abstract paint', tags: ['Art', 'Design', 'Illustration', 'Digital Art', 'Painting'] },
  { id: '4', name: 'Tech Hub', iconUrl: 'https://placehold.co/64x64.png', dataAiHint: 'circuit board', description: 'For developers, enthusiasts, and tech news.', bannerUrl: 'https://placehold.co/600x200.png', dataAiHintBanner: 'futuristic city', tags: ['Technology', 'Software', 'Hardware', 'AI', 'Coding'] },
  { id: '5', name: 'Musicians\' Hangout', iconUrl: 'https://placehold.co/64x64.png', dataAiHint: 'guitar music', description: 'Collaborate, share music, and discuss gear.', bannerUrl: 'https://placehold.co/600x200.png', dataAiHintBanner: 'stage concert', tags: ['Music', 'Instruments', 'Production', 'Songwriting', 'Collaboration'] },
  { id: '6', name: 'Coders\' Corner', iconUrl: 'https://placehold.co/64x64.png', dataAiHint: 'code screen', description: 'Talk code, share projects, and learn together.', bannerUrl: 'https://placehold.co/600x200.png', dataAiHintBanner: 'binary code', tags: ['Coding', 'WebDev', 'OpenSource', 'Software', 'Projects'] },
];

const placeholderChannels: Record<string, Array<{ id: string; name: string; type: 'text' | 'voice' | 'video'; icon: React.ElementType }>> = {
  '1': [
    { id: 'c1-1', name: 'general-chat', type: 'text', icon: Hash },
    { id: 'c1-2', name: 'announcements', type: 'text', icon: ShieldCheck },
    { id: 'c1-3', name: 'squad-voice', type: 'voice', icon: Mic },
    { id: 'c1-4', name: 'game-night-stream', type: 'video', icon: Video },
  ],
  '2': [
    { id: 'c2-1', name: 'book-discussions', type: 'text', icon: Hash },
    { id: 'c2-2', name: 'reading-club-voice', type: 'voice', icon: Mic },
  ],
  '3': [
    { id: 'c3-1', name: 'showcase', type: 'text', icon: Hash },
    { id: 'c3-2', name: 'critique-corner', type: 'text', icon: Hash },
    { id: 'c3-3', name: 'live-drawing-video', type: 'video', icon: Video },
  ],
  '4': [
    { id: 'c4-1', name: 'dev-talk', type: 'text', icon: Hash },
    { id: 'c4-2', name: 'code-help', type: 'text', icon: Hash },
    { id: 'c4-3', name: 'tech-news-voice', type: 'voice', icon: Mic },
  ],
  '5': [
    { id: 'c5-1', name: 'general-jam', type: 'text', icon: Hash },
    { id: 'c5-2', name: 'gear-talk', type: 'text', icon: Hash },
    { id: 'c5-3', name: 'collab-voice', type: 'voice', icon: Mic },
    { id: 'c5-4', name: 'live-performance', type: 'video', icon: Video },
  ],
   '6': [
    { id: 'c6-1', name: 'project-showcase', type: 'text', icon: Hash },
    { id: 'c6-2', name: 'ask-for-help', type: 'text', icon: Hash },
    { id: 'c6-3', name: 'pair-programming-voice', type: 'voice', icon: Mic },
  ],
};

const placeholderMembers: Record<string, Array<{ id: string; name: string; avatarUrl: string; dataAiHint: string }>> = {
  '1': [
    { id: 'm1', name: 'PlayerOne', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'person cool' },
    { id: 'm2', name: 'GamerGirl', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'woman gaming' },
    { id: 'm3', name: 'RetroFan', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'man pixel' },
    { id: 'm1a', name: 'NoobSlayer', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'warrior helmet' },
    { id: 'm1b', name: 'PixelWizard', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'wizard hat' },
    { id: 'm1c', name: 'QuestQueen', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'queen crown' },
  ],
  '2': [
    { id: 'm4', name: 'ReaderRiley', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'person books' },
    { id: 'm5', name: 'NovelNerd', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'woman library' },
  ],
   '3': [
    { id: 'm6', name: 'ArtfulAlex', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'artist painting' },
    { id: 'm7', name: 'CreativeCasey', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'designer thinking' },
    { id: 'm7a', name: 'SketchySam', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'person drawing' },
  ],
  '4': [
    { id: 'm8', name: 'CodeWizard', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'man code' },
    { id: 'm9', name: 'TechieTom', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'person computer' },
  ],
  '5': [
    { id: 'm10', name: 'MusicMaestro', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'musician stage' },
    { id: 'm11', name: 'BeatMaker', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'dj deck' },
    { id: 'm12', name: 'SingerStar', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'woman microphone' },
    { id: 'm12a', name: 'DrumDynamo', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'drummer silhouette' },
    { id: 'm12b', name: 'GuitarHero', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'guitar fire' },
    { id: 'm12c', name: 'BassBoss', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'bass player' },
    { id: 'm12d', name: 'KeyboardKing', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'keyboard music' },
    { id: 'm12e', name: 'VinylVictor', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'vinyl record' },
  ],
  '6': [
    { id: 'm13', name: 'DevDynamo', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'coder focus' },
    { id: 'm14', name: 'ScriptKid', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'person laptop' },
    { id: 'm14a', name: 'AlgorithmAna', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'woman tech' },
  ],
};

type Community = typeof placeholderCommunities[0];
type Channel = { id: string; name: string; type: 'text' | 'voice' | 'video'; icon: React.ElementType };
type Member = typeof placeholderMembers['1'][0];

type ChatMessage = {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'gif' | 'voice_message';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  gifUrl?: string;
  gifId?: string; // For favoriting
  gifTinyUrl?: string; // For favoriting
  gifContentDescription?: string; // For favoriting & alt text
  isPinned?: boolean;
  reactions?: Record<string, string[]>; // emoji: [userId1, userId2]
  replyToMessageId?: string;
  replyToSenderName?: string;
  replyToSenderId?: string;
  replyToTextSnippet?: string;
  isForwarded?: boolean;
  forwardedFromSenderName?: string;
  mentionedUserIds?: string[]; // For backend notification processing (currently stores @username strings)
};

/**
 * =============================================================================
 * CHAT FUNCTIONALITY GUIDE (Communities & Direct Messages)
 * =============================================================================
 * This app uses Firebase Firestore for real-time chat.
 *
 * 1. Backend Setup (Firebase Firestore):
 *    - Database Schema:
 *      - `/communities/{communityId}/channels/{channelId}/messages/{messageId}`
 *        Each message document includes fields defined in the `ChatMessage` type.
 *    - Firestore Security Rules: Crucial for access control. (See firestore.rules.md).
 *
 * 2. Real-time Message Listening (Frontend - Firebase SDK):
 *    - `onSnapshot` listener on `communities/.../messages` collection, ordered by `timestamp`.
 *    - Updates local `messages` state.
 *
 * 3. Sending Messages (Frontend - Firestore SDK):
 *    - `addDoc` creates new message documents. Uses `serverTimestamp()`.
 *    - Includes reply context (`replyTo...` fields) and basic mention strings.
 *
 * 4. File/Image Upload (Frontend - Cloudinary):
 *    - Uploads to Cloudinary (unsigned preset).
 *    - Message of type 'image' or 'file' created in Firestore with Cloudinary `secure_url`.
 *
 * 5. GIF Send (Frontend - Tenor API):
 *    - **SECURITY WARNING: TENOR API KEY IS CLIENT-SIDE (PROTOTYPE ONLY).** Proxy for production.
 *    - Fetches GIFs from Tenor. Message type 'gif' with URLs/metadata.
 *    - GIF favoriting uses `localStorage`.
 *
 * 6. Emoji Send (Frontend - `emoji-picker-react`):
 *    - `EmojiPicker` component for selecting and appending emojis to text input or for reactions.
 *
 * 7. Voice Message Send (Frontend - MediaRecorder & Cloudinary Upload):
 *    - Captures audio, uploads blob to Cloudinary (as 'video' resource type).
 *    - Message type 'voice_message' with Cloudinary `fileUrl`.
 *
 * 8. Message Features (Frontend - Firestore updates):
 *    - Delete: Deletes message doc (sender only).
 *    - Pin: Updates `isPinned` boolean on message doc.
 *    - Reactions: Updates `reactions` map on message doc using Firestore transaction.
 *
 * 9. UI/UX Enhancements:
 *    - Loading states, error toasts, timestamp grouping, pinned messages toggle, reply context, etc.
 *    - Client-side search (filters currently loaded messages).
 *    - Rudimentary @mention suggestions (from current community members).
 *    - Basic Markdown-style text formatting.
 *
 * 10. Voice & Video Channels (Agora Integration):
 *     - SDK: `agora-rtc-sdk-ng`. AGORA_APP_ID is set.
 *     - Token Generation: **NOT IMPLEMENTED (USING APP ID ONLY FOR TESTING - INSECURE FOR PRODUCTION)**.
 *       A backend token server is required for production Agora apps.
 *     - Channel Join/Leave: Logic for joining/leaving Agora channels.
 *     - Stream Publishing/Subscription: Handles local/remote audio/video tracks.
 *     - UI: Basic `<video>` elements for displaying streams.
 * =============================================================================
 */

const TIMESTAMP_GROUPING_THRESHOLD_MS = 60 * 1000; // 1 minute

interface TenorGif extends TenorGifType {}

// SECURITY WARNING: DO NOT USE YOUR TENOR API KEY DIRECTLY IN PRODUCTION CLIENT-SIDE CODE.
// This key is included for prototyping purposes only.
// For production, proxy requests through a backend (e.g., Firebase Cloud Function).
const TENOR_API_KEY = "LIVDSRZULELA"; // Standard Tenor SDK key for testing - limited requests
const TENOR_CLIENT_KEY = "vibe_app_prototype"; // Replace with your actual client key if you have one

const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
  'text/plain',
  'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac',
];

// Agora Configuration
const AGORA_APP_ID = "31ecd1d8c6224b6583e4de451ece7a48"; // Your Agora App ID

const formatChatMessage = (text?: string): string => {
  if (!text) return '';
  let formattedText = text;
  // Escape HTML to prevent XSS before applying markdown
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


export default function CommunitiesPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(placeholderCommunities[0]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    selectedCommunity ? placeholderChannels[selectedCommunity.id]?.[0] || null : null
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isRightBarOpen, setIsRightBarOpen] = useState(true);

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifs, setGifs] = useState<TenorGifType[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const gifSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [gifPickerView, setGifPickerView] = useState<'search' | 'favorites'>('search');
  const [favoritedGifs, setFavoritedGifs] = useState<TenorGifType[]>([]);

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

  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const mentionSuggestionsRef = useRef<HTMLDivElement>(null);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);

  // Agora state variables
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const localVideoPlayerContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoPlayersContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
        const modeFromStorage = localStorage.getItem(`appSettings_${currentUser.uid}`);
        if (modeFromStorage) {
            const settings = JSON.parse(modeFromStorage);
            setCurrentThemeMode(settings.themeMode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        } else {
             setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
    }
  }, [currentUser]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, showPinnedMessages, chatSearchTerm]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        const storedFavorites = localStorage.getItem(`favorited_gifs_${user.uid}`);
        if (storedFavorites) {
          setFavoritedGifs(JSON.parse(storedFavorites));
        } else {
          setFavoritedGifs([]);
        }
      } else {
        setFavoritedGifs([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const getFavoriteStorageKey = () => {
    if (!currentUser) return null;
    return `favorited_gifs_${currentUser.uid}`;
  }

  const handleToggleFavoriteGif = (gif: TenorGifType) => {
    if (!currentUser) return;
    const key = getFavoriteStorageKey();
    if (!key) return;

    let updatedFavorites;
    if (favoritedGifs.some(fav => fav.id === gif.id)) { // Use .some for checking existence
      updatedFavorites = favoritedGifs.filter(fav => fav.id !== gif.id);
      toast({ title: "GIF Unfavorited", description: "Removed from your favorites." });
    } else {
      updatedFavorites = [...favoritedGifs, gif];
      toast({ title: "GIF Favorited!", description: "Added to your favorites." });
    }
    setFavoritedGifs(updatedFavorites);
    localStorage.setItem(key, JSON.stringify(updatedFavorites));
  };

  const isGifFavorited = (gifId: string): boolean => {
    return !!favoritedGifs.find(fav => fav.id === gifId);
  };


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
        setMessages([]); // Clear previous text messages
    } else {
      setMessages([]);
    }
  }, [selectedChannel, selectedCommunity, currentUser, toast]);


  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    const firstChannel = placeholderChannels[community.id]?.[0] || null;
    setSelectedChannel(firstChannel);
    setShowPinnedMessages(false);
    setReplyingToMessage(null);
    setIsChatSearchOpen(false);
    setChatSearchTerm("");
  };

  const handleSelectChannel = (channel: Channel) => {
    if (agoraClientRef.current) {
        handleLeaveVoiceChannel();
    }
    setSelectedChannel(channel);
    setShowPinnedMessages(false);
    setReplyingToMessage(null);
    setIsChatSearchOpen(false);
    setChatSearchTerm("");
    if (channel.type === 'text' && chatInputRef.current) {
        setTimeout(() => chatInputRef.current?.focus(), 0);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }

    if (newMessage.trim() === "" || !currentUser || !selectedCommunity || !selectedChannel || selectedChannel.type !== 'text') {
      return;
    }

    const messageText = newMessage.trim();

    // Resolve @mentions to UIDs - placeholder for actual UID resolution
    const mentionRegex = /@([\w.-]+)/g;
    let match;
    const mentionedUserDisplayNames: string[] = [];
    while ((match = mentionRegex.exec(messageText)) !== null) {
      mentionedUserDisplayNames.push(match[1]);
    }
    // In a real app, you'd resolve these display names to UIDs.
    // For this prototype, we'll store the display names which the backend function would need to resolve.
    const resolvedMentionedUserIds = mentionedUserDisplayNames; 

    const messageData: Partial<ChatMessage> = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      senderAvatarUrl: currentUser.photoURL || undefined,
      timestamp: serverTimestamp() as Timestamp,
      type: 'text' as const,
      text: messageText,
      reactions: {},
      isPinned: false,
    };

    if (resolvedMentionedUserIds.length > 0) {
        messageData.mentionedUserIds = resolvedMentionedUserIds;
    }

    if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        messageData.replyToSenderId = replyingToMessage.senderId;
        messageData.replyToTextSnippet = (replyingToMessage.text || (replyingToMessage.type === 'image' ? 'Image' : replyingToMessage.type === 'file' ? `File: ${replyingToMessage.fileName || 'attachment'}` : replyingToMessage.type === 'gif' ? 'GIF' : replyingToMessage.type === 'voice_message' ? 'Voice Message' : '')).substring(0, 75) + ((replyingToMessage.text && replyingToMessage.text.length > 75) || (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : '');
    }

    try {
      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      await addDoc(messagesRef, messageData);
      setNewMessage("");
      setReplyingToMessage(null);
      setShowMentionSuggestions(false);
    } catch (error) {
        console.error("Error sending message:", error);
        toast({
            variant: "destructive",
            title: "Message Not Sent",
            description: "Could not send your message. Please try again.",
        });
    }
  };

  const sendAttachmentMessageToFirestore = async (fileUrl: string, fileName: string, fileType: string) => {
    if (!currentUser || !selectedCommunity || !selectedChannel) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send attachment." });
      return;
    }

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
        reactions: {},
        isPinned: false,
    };

    if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        messageData.replyToSenderId = replyingToMessage.senderId;
        messageData.replyToTextSnippet = (replyingToMessage.text || (replyingToMessage.type === 'image' ? 'Image' : replyingToMessage.type === 'file' ? `File: ${replyingToMessage.fileName || 'attachment'}` : replyingToMessage.type === 'gif' ? 'GIF' : replyingToMessage.type === 'voice_message' ? 'Voice Message' : '')).substring(0, 75) + ((replyingToMessage.text && replyingToMessage.text.length > 75) || (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : '');
    }

    try {
      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      await addDoc(messagesRef, messageData);
      setReplyingToMessage(null);
      toast({ title: `${messageType.charAt(0).toUpperCase() + messageType.slice(1).replace('_', ' ')} Sent!`, description: `${fileName} has been sent.` });
    } catch (error) {
      console.error(`Error sending ${messageType}:`, error);
      toast({
        variant: "destructive",
        title: `${messageType.charAt(0).toUpperCase() + messageType.slice(1).replace('_', ' ')} Not Sent`,
        description: `Could not send your ${messageType}. Please try again.`,
      });
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


  const handleSendGif = async (gif: TenorGifType) => {
    if (!currentUser || !selectedCommunity || !selectedChannel || selectedChannel.type !== 'text') {
      return;
    }

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
      reactions: {},
      isPinned: false,
    };
    if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        messageData.replyToSenderId = replyingToMessage.senderId;
        messageData.replyToTextSnippet = (replyingToMessage.text || (replyingToMessage.type === 'image' ? 'Image' : replyingToMessage.type === 'file' ? `File: ${replyingToMessage.fileName || 'attachment'}` : replyingToMessage.type === 'gif' ? 'GIF' : replyingToMessage.type === 'voice_message' ? 'Voice Message' : '')).substring(0, 75) + ((replyingToMessage.text && replyingToMessage.text.length > 75) || (replyingToMessage.fileName && replyingToMessage.fileName.length > 30) ? '...' : '');
    }

    try {
      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      await addDoc(messagesRef, messageData);
      setShowGifPicker(false);
      setGifSearchTerm("");
      setGifs([]);
      setReplyingToMessage(null);
    } catch (error) {
        console.error("Error sending GIF message:", error);
        toast({
            variant: "destructive",
            title: "GIF Not Sent",
            description: "Could not send your GIF. Please try again.",
        });
    }
  };

  const handleFavoriteGifFromChat = (message: ChatMessage) => {
    if (!message.gifId || !message.gifTinyUrl || !message.gifContentDescription) {
        toast({ variant: "destructive", title: "Cannot Favorite", description: "GIF information missing."});
        return;
    }
    const gifToFavorite: TenorGifType = {
        id: message.gifId,
        media_formats: {
            tinygif: { url: message.gifTinyUrl, dims: [0,0], preview: '', duration: 0, size:0 }, // Dims and other details are placeholders
            gif: { url: message.gifUrl || '', dims: [0,0], preview: '', duration: 0, size:0 }
        },
        content_description: message.gifContentDescription,
        created: 0, hasaudio: false, itemurl: '', shares: 0, source_id: '', tags: [], url: '', composite: null, hascaption: false, title: '', flags: []
    };
    handleToggleFavoriteGif(gifToFavorite);
  };


  const handleCommunityProfileEdit = () => {
    toast({
      title: "Coming Soon!",
      description: "Editing your community-specific profile is a future feature.",
    });
  };

  const handleDeleteMessage = async () => {
    if (!deletingMessageId || !selectedCommunity || !selectedChannel || !currentUser) {
        toast({ variant: "destructive", title: "Error", description: "Cannot delete message." });
        setDeletingMessageId(null);
        return;
    }
    try {
        const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${deletingMessageId}`);
        const msgDoc = messages.find(m => m.id === deletingMessageId);
        if (msgDoc && msgDoc.senderId !== currentUser.uid) {
            toast({ variant: "destructive", title: "Error", description: "You can only delete your own messages." });
            setDeletingMessageId(null);
            return;
        }
        await deleteDoc(messageRef);
        toast({ title: "Message Deleted", description: "The message has been removed." });
    } catch (error) {
        console.error("Error deleting message: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete message." });
    } finally {
        setDeletingMessageId(null);
    }
  };

  const handleTogglePinMessage = async (messageId: string, currentPinnedStatus: boolean) => {
    if (!selectedCommunity || !selectedChannel || !currentUser) return;
    try {
        const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${messageId}`);
        await updateDoc(messageRef, {
            isPinned: !currentPinnedStatus
        });
        toast({ title: `Message ${!currentPinnedStatus ? 'Pinned' : 'Unpinned'}`, description: `The message has been ${!currentPinnedStatus ? 'pinned' : 'unpinned'}.` });
    } catch (error) {
        console.error("Error pinning/unpinning message: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not update pin status." });
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !selectedCommunity || !selectedChannel) return;

    const messageRef = doc(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages/${messageId}`);
    try {
      await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) {
          throw new Error("Document does not exist!");
        }

        const currentReactions = (messageDoc.data().reactions || {}) as Record<string, string[]>;
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
    if (!forwardingMessage || !currentUser || !selectedCommunity) {
        toast({ variant: "destructive", title: "Forward Error", description: "Cannot forward message." });
        setIsForwardDialogOpen(false);
        setForwardingMessage(null);
        return;
    }

    const targetChannel = currentChannels.find(ch => ch.type === 'text');
    if (!targetChannel) {
        toast({ variant: "destructive", title: "Forward Error", description: "No text channel found in this community to forward to." });
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
        reactions: {},
        isPinned: false,
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
        const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${targetChannel.id}/messages`);
        await addDoc(messagesRef, messageData);
        toast({ title: "Message Forwarded", description: `Message forwarded to #${targetChannel.name}.` });
    } catch (error) {
        console.error("Error forwarding message:", error);
        toast({ variant: "destructive", title: "Forward Failed", description: "Could not forward the message." });
    } finally {
        setIsForwardDialogOpen(false);
        setForwardingMessage(null);
        setForwardSearchTerm("");
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

  const fetchTrendingGifs = async () => {
    if (!TENOR_API_KEY) {
        toast({ variant: "destructive", title: "Tenor API Key Missing", description: "A Tenor API key is required for GIFs."});
        setLoadingGifs(false);
        return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20&media_filter=tinygif,gif`);
      if (!response.ok) throw new Error('Failed to fetch trending GIFs');
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error fetching trending GIFs:", error);
      toast({ variant: "destructive", title: "Error Fetching GIFs", description: "Could not load trending GIFs." });
      setGifs([]);
    } finally {
      setLoadingGifs(false);
    }
  };

  const searchTenorGifs = async (term: string) => {
    if (!term.trim()) {
      fetchTrendingGifs();
      return;
    }
     if (!TENOR_API_KEY) {
      toast({ variant: "destructive", title: "Tenor API Key Missing", description: "A Tenor API key is required for GIFs."});
      setLoadingGifs(false);
      return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20&media_filter=tinygif,gif`);
      if (!response.ok) throw new Error('Failed to fetch GIFs');
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error searching GIFs:", error);
      toast({ variant: "destructive", title: "Error Fetching GIFs", description: "Could not load GIFs for your search." });
      setGifs([]);
    } finally {
      setLoadingGifs(false);
    }
  };

  useEffect(() => {
    if (showGifPicker && gifPickerView === 'search' && gifs.length === 0 && !gifSearchTerm) {
      fetchTrendingGifs();
    }
  }, [showGifPicker, gifs.length, gifSearchTerm, gifPickerView]);

  const handleGifSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setGifSearchTerm(term);
    if (gifSearchTimeoutRef.current) {
      clearTimeout(gifSearchTimeoutRef.current);
    }
    gifSearchTimeoutRef.current = setTimeout(() => {
      searchTenorGifs(term);
    }, 500);
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


  const handleToggleRecording = async () => {
    if (!currentUser || !selectedCommunity || !selectedChannel || selectedChannel.type !== 'text' || isUploadingFile) return;

    const permissionGranted = await requestMicPermission();
    if (!permissionGranted) return;

    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });

                toast({ title: "Voice Message Recorded", description: "Uploading..." });
                await uploadFileToCloudinaryAndSend(audioFile, true);

                stream.getTracks().forEach(track => track.stop());
                setReplyingToMessage(null);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error starting recording:", error);
            toast({ variant: "destructive", title: "Recording Error", description: "Could not start voice recording." });
            setIsRecording(false);
        }
    }
  };

  const handleJoinVoiceChannel = async () => {
    if (!selectedChannel || (selectedChannel.type !== 'voice' && selectedChannel.type !== 'video') || isJoiningVoice || !currentUser || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") {
        if (!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER") {
            toast({ variant: "destructive", title: "Agora App ID Missing", description: "Agora App ID is not configured. Voice/video chat disabled."});
        } else if (!AGORA_APP_ID) {
             toast({ variant: "destructive", title: "Agora App ID Not Set", description: "Voice/video functionality requires an Agora App ID configuration." });
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
            videoStream.getTracks().forEach(track => track.stop()); // Stop after permission check
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

        // IMPORTANT: Token Generation for Production
        // For production, fetch a token from your backend.
        // const token = await fetchTokenFromServer(currentUser.uid, selectedChannel.id);
        const token = null; // Using null for testing (only if your Agora project allows it without token)

        const uid: UID = currentUser.uid;
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

    } catch (error) {
        console.error("Agora connection error:", error);
        toast({ variant: "destructive", title: "Connection Failed", description: "Could not connect to voice/video channel." });
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
        agoraClientRef.current = null; // Reset client
        setRemoteUsers([]); // Clear remote users
        if(remoteVideoPlayersContainerRef.current) remoteVideoPlayersContainerRef.current.innerHTML = ''; // Clear remote video players
        if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = ''; // Clear local video player
        toast({ title: "Disconnected", description: "You have left the channel."});
    }
    setIsJoiningVoice(false);
  };

  useEffect(() => {
    return () => {
        handleLeaveVoiceChannel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]); // Trigger on channel change


  const handleChatSearchToggle = () => {
    setIsChatSearchOpen(!isChatSearchOpen);
    if (!isChatSearchOpen && chatSearchInputRef.current) {
        setTimeout(() => chatSearchInputRef.current?.focus(), 0);
    } else {
        setChatSearchTerm("");
    }
  };

  const currentChannels = selectedCommunity ? placeholderChannels[selectedCommunity.id] || [] : [];
  const currentMembers = selectedCommunity ? placeholderMembers[selectedCommunity.id] || [] : [];

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const userAvatar = currentUser?.photoURL;

  const filteredMessages = messages.filter(msg => {
    if (!chatSearchTerm.trim()) return true; // Show all if search is empty
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

  const handleMentionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    if (value.match(/@\S*$/) && selectedChannel?.type === 'text') {
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
                <Image src={community.iconUrl} alt={community.name} width={56} height={56} className="object-cover w-full h-full" data-ai-hint={community.dataAiHint} />
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
                          className={cn("text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 md:hidden", isRightBarOpen && "bg-accent/20 text-accent")}
                          onClick={() => setIsRightBarOpen(!isRightBarOpen)}
                          title={isRightBarOpen ? "Hide Server Info" : "Show Server Info"}
                        >
                          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </>
                )}
              </div>
            </div>

            {/* Main content: Text chat or Voice/Video UI */}
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
                  {displayedMessages.map((msg, index) => {
                    const previousMessage = index > 0 ? displayedMessages[index - 1] : null;
                    const showHeader = shouldShowFullMessageHeader(msg, previousMessage);
                    const isCurrentUserMsg = currentUser?.uid === msg.senderId;
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

                        <div className={cn("flex-1 min-w-0 text-left", isCurrentUserMsg ? "pr-10 sm:pr-12" : "pl-0", showHeader ? "" : (isCurrentUserMsg ? "" : ""))}>
                          {showHeader && (
                            <div className={cn("flex items-baseline space-x-1.5")}>
                              <p className="font-semibold text-sm text-foreground">
                                {msg.senderName}
                              </p>
                              <div className="flex items-baseline text-xs text-muted-foreground">
                                  <p title={msg.timestamp ? format(msg.timestamp, 'PPpp') : undefined}>
                                  {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp, { addSuffix: true }) : 'Sending...'}
                                  </p>
                                  {msg.timestamp && (
                                  <p className="ml-1.5 mr-0.5">
                                      ({format(msg.timestamp, 'p')})
                                  </p>
                                  )}
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
                                    <span className="italic ml-1 truncate">"{msg.replyToTextSnippet}"</span></span>
                                  </div>
                              </div>
                          )}
                          {msg.isForwarded && msg.forwardedFromSenderName && (
                            <div className={cn("text-xs text-muted-foreground italic mb-0.5 flex items-center", isCurrentUserMsg ? "justify-end" : "justify-start")}>
                              <Share2 className="h-3 w-3 mr-1.5 text-muted-foreground/80" />
                              Forwarded from {msg.forwardedFromSenderName}
                            </div>
                          )}
                          {msg.type === 'text' && msg.text && (
                            <p
                              className={cn("text-sm text-foreground/90 whitespace-pre-wrap break-words text-left")}
                              dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text) }}
                            />
                          )}
                          {msg.type === 'gif' && msg.gifUrl && (
                            <div className="relative max-w-[250px] sm:max-w-[300px] mt-1 group/gif">
                                  <Image
                                      src={msg.gifUrl}
                                      alt={msg.gifContentDescription || "GIF"}
                                      width={0}
                                      height={0}
                                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '200px', borderRadius: '0.375rem' }}
                                      unoptimized
                                      priority={false}
                                      data-ai-hint="animated gif"
                                  />
                                  {currentUser && msg.gifId && (
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover/gif:opacity-100 transition-opacity"
                                          onClick={() => handleFavoriteGifFromChat(msg)}
                                          title={isGifFavorited(msg.gifId || "") ? "Unfavorite" : "Favorite"}
                                      >
                                          <Star className={cn("h-4 w-4", isGifFavorited(msg.gifId || "") ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/>
                                      </Button>
                                  )}
                            </div>
                          )}
                          {msg.type === 'voice_message' && msg.fileUrl && (
                              <audio controls src={msg.fileUrl} className="my-2 w-full max-w-xs h-10 rounded-md shadow-sm bg-muted invert-[5%] dark:invert-0" data-ai-hint="audio player">
                                  Your browser does not support the audio element.
                              </audio>
                          )}
                          {msg.type === 'image' && msg.fileUrl && (
                              <Image
                                  src={msg.fileUrl}
                                  alt={msg.fileName || "Uploaded image"}
                                  width={300}
                                  height={300}
                                  style={{
                                    width: 'auto',
                                    height: 'auto',
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    objectFit: 'contain',
                                    borderRadius: '0.375rem',
                                    marginTop: '0.25rem',
                                  }}
                                  data-ai-hint="user uploaded image"
                              />
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
                                          <Button
                                              key={emoji}
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleToggleReaction(msg.id, emoji)}
                                              className={cn(
                                                  "h-auto px-2 py-0.5 text-xs rounded-full bg-muted/50 hover:bg-muted/80 border-border/50",
                                                  currentUser && userIds.includes(currentUser.uid) && "bg-primary/20 border-primary text-primary hover:bg-primary/30"
                                              )}
                                              title={userIds.map(uid => placeholderMembers[selectedCommunity?.id || '']?.find(m => m.id === uid)?.name || uid).join(', ')}
                                          >
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
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground" title="React to message">
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" title={msg.isPinned ? "Unpin Message" : "Pin Message"} onClick={() => handleTogglePinMessage(msg.id, !!msg.isPinned)}>
                            {msg.isPinned ? <PinOff className="h-4 w-4 text-amber-500" /> : <Pin className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
                          </Button>
                          {currentUser?.uid === msg.senderId && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive/80" title="Delete Message" onClick={() => setDeletingMessageId(msg.id)}>
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
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 bg-card/30">
                <selectedChannel.icon className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/70"/>
                <p className="text-base sm:text-lg font-medium">This is a {selectedChannel.type} channel.</p>
                <p className="text-xs sm:text-sm mt-1">Voice and video features use Agora SDK.</p>

                {agoraClientRef.current ? (
                     <div className="mt-4 w-full max-w-md sm:max-w-2xl flex flex-col items-center">
                        {/* Local Video Player Container */}
                        {localVideoTrack && selectedChannel.type === 'video' && (
                            <div id="local-video-player-container" ref={localVideoPlayerContainerRef} className="w-36 h-28 sm:w-48 sm:h-36 bg-black my-2 rounded-md shadow relative self-start">
                                <p className="text-white text-xs p-1 absolute top-0 left-0 bg-black/50 rounded-br-md">You</p>
                            </div>
                        )}
                        {/* Remote Video Players Container */}
                        <div id="remote-video-players-container" ref={remoteVideoPlayersContainerRef} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {/* Remote video players will be dynamically added here */}
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
                            disabled={isJoiningVoice || !AGORA_APP_ID}
                            className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isJoiningVoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <selectedChannel.icon className="mr-2 h-4 w-4"/>}
                            {isJoiningVoice ? "Connecting..." : `Join ${selectedChannel.type.charAt(0).toUpperCase() + selectedChannel.type.slice(1)} Channel`}
                        </Button>
                         {!AGORA_APP_ID && (
                             <p className="text-xs text-destructive mt-2">Agora App ID not configured. Voice/Video chat is disabled.</p>
                         )}
                    </>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Note: For production, use a token server for Agora authentication.
                </p>
              </div>
            )}


            {/* Chat Input Area for Text Channels */}
            {selectedChannel.type === 'text' ? (
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
                            {currentMembers.filter(member => member.name.toLowerCase().startsWith(newMessage.substring(newMessage.lastIndexOf('@') + 1).toLowerCase())).length > 0 ? (
                                currentMembers
                                    .filter(member => member.name.toLowerCase().startsWith(newMessage.substring(newMessage.lastIndexOf('@') + 1).toLowerCase()))
                                    .map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => handleMentionSelect(member.name)}
                                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                                        >
                                            {member.name}
                                        </button>
                                ))
                            ) : (
                                <p className="p-2 text-xs text-muted-foreground">No members match. Search not available yet.</p>
                            )}
                        </PopoverContent>
                    </Popover>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center p-1.5 rounded-lg bg-muted space-x-1 sm:space-x-1.5">
                    <input
                        type="file"
                        ref={attachmentInputRef}
                        onChange={handleFileSelected}
                        className="hidden"
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        disabled={isUploadingFile || !currentUser || selectedChannel.type !== 'text' || isRecording}
                    />
                    {isUploadingFile ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary shrink-0" />
                    ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                        title="Attach File/Image"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={isUploadingFile || !currentUser || selectedChannel.type !== 'text' || isRecording}
                    >
                        <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    )}
                    <Input
                        ref={chatInputRef}
                        type="text"
                        placeholder={isRecording ? "Recording voice message..." : `Message #${selectedChannel.name} (@mention, **bold**, etc.)`}
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70 text-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 sm:h-9 px-2"
                        value={newMessage}
                        onChange={handleMentionInputChange}
                        onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isUploadingFile) {
                            handleSendMessage(e);
                        }
                        }}
                        disabled={!currentUser || selectedChannel.type !== 'text' || isRecording || isUploadingFile}
                    />
                    <Button
                        type="button"
                        variant={isRecording ? "destructive" : "ghost"}
                        size="icon"
                        className={cn("shrink-0 h-8 w-8 sm:h-9 sm:w-9", isRecording ? "text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:text-foreground")}
                        title={isRecording ? "Stop Recording" : "Send Voice Message"}
                        onClick={handleToggleRecording}
                        disabled={hasMicPermission === false || isUploadingFile || !currentUser || selectedChannel.type !== 'text'}
                    >
                        {isRecording ? <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </Button>
                    {hasMicPermission === false && (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" title="Microphone permission denied"/>
                    )}

                    <Popover open={chatEmojiPickerOpen} onOpenChange={setChatEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Open Emoji Picker" disabled={isRecording || isUploadingFile || !currentUser || selectedChannel.type !== 'text'}>
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
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Send GIF (Tenor)" disabled={isRecording || isUploadingFile || !currentUser || selectedChannel.type !== 'text'}>
                            <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] h-[70vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Send a GIF</DialogTitle>
                            <DialogDescription>
                                Search for GIFs from Tenor or browse your favorites.
                                <span className="block text-xs text-destructive/80 mt-1">
                                    SECURITY WARNING: For production, the Tenor API key must be proxied via a backend.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                            <Tabs defaultValue="search" onValueChange={(value) => setGifPickerView(value as 'search' | 'favorites')} className="mt-2">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="search">Search/Trending</TabsTrigger>
                                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                            </TabsList>
                            <TabsContent value="search">
                                <Input
                                    type="text"
                                    placeholder="Search Tenor GIFs..."
                                    value={gifSearchTerm}
                                    onChange={handleGifSearchChange}
                                    className="my-2"
                                />
                                <ScrollArea className="flex-1 max-h-[calc(70vh-200px)]">
                                    <div className="p-1">
                                    {loadingGifs ? (
                                        <div className="flex justify-center items-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : gifs.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {gifs.map((gif) => (
                                            <div key={gif.id} className="relative group aspect-square">
                                                <button
                                                    onClick={() => handleSendGif(gif)}
                                                    className="w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary ring-offset-2 ring-offset-background"
                                                >
                                                    <Image
                                                        src={gif.media_formats.tinygif.url}
                                                        alt={gif.content_description || "GIF"}
                                                        fill
                                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                                        className="object-cover transition-transform group-hover:scale-105"
                                                        unoptimized
                                                    />
                                                </button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white"
                                                    onClick={() => handleToggleFavoriteGif(gif)}
                                                    title={isGifFavorited(gif.id) ? "Unfavorite" : "Favorite"}
                                                >
                                                    <Star className={cn("h-4 w-4", isGifFavorited(gif.id) ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/>
                                                </Button>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-4">
                                            {gifSearchTerm ? "No GIFs found for your search." : "No trending GIFs found."}
                                        </p>
                                    )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="favorites">
                                <ScrollArea className="flex-1 max-h-[calc(70vh-150px)]">
                                    <div className="p-1">
                                    {favoritedGifs.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {favoritedGifs.map((gif) => (
                                            <div key={gif.id} className="relative group aspect-square">
                                            <button
                                                onClick={() => handleSendGif(gif)}
                                                className="w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary ring-offset-2 ring-offset-background"
                                            >
                                                <Image
                                                    src={gif.media_formats.tinygif.url}
                                                    alt={gif.content_description || "GIF"}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    unoptimized
                                                />
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white"
                                                onClick={() => handleToggleFavoriteGif(gif)}
                                                title="Unfavorite"
                                            >
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                                            </Button>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-4">
                                            You haven't favorited any GIFs yet.
                                        </p>
                                    )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter className="mt-auto pt-2">
                            <p className="text-xs text-muted-foreground">Powered by Tenor</p>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>

                    <Button type="submit" variant="ghost" size="icon" className="text-primary hover:text-primary/80 shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Send Message" disabled={!newMessage.trim() || !currentUser || selectedChannel.type !== 'text' || isRecording || isUploadingFile}>
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                </form>
              </div>
            ) : (
              <div className="p-2 sm:p-3 border-t border-border/40 shrink-0 flex items-center justify-center h-14 sm:h-16">
                 {/* Placeholder for non-text channel footers, e.g., voice/video controls */}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-base sm:text-lg p-4">
            {selectedCommunity ? "Select a channel to start." : "Select a community to see its channels."}
          </div>
        )}
      </div>

      {/* Column 4: Right-Hand Info Bar */}
      {isRightBarOpen && selectedCommunity && (
        <div className="h-full w-64 sm:w-72 bg-card border-l border-border/40 flex-col overflow-hidden hidden md:flex relative"> 
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-20 h-8 w-8"
              onClick={() => setIsRightBarOpen(false)}
              title="Close Server Info"
              aria-label="Close server info panel"
            >
              <X className="h-5 w-5"/>
            </Button>
            <div className="relative h-24 sm:h-32 w-full shrink-0">
               <Image
                src={selectedCommunity.bannerUrl}
                alt={`${selectedCommunity.name} banner`}
                fill
                className="object-cover"
                data-ai-hint={selectedCommunity.dataAiHintBanner}
                priority
              />
            </div>

            <div className="flex flex-col flex-1 min-h-0">
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 shrink-0 border-b border-border/40">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-background shadow-md">
                        <AvatarImage src={selectedCommunity.iconUrl} alt={selectedCommunity.name} data-ai-hint={selectedCommunity.dataAiHint}/>
                        <AvatarFallback>{selectedCommunity.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                        <CardTitle className="text-lg sm:text-xl">{selectedCommunity.name}</CardTitle>
                        </div>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">{selectedCommunity.description}</CardDescription>
                    {selectedCommunity.tags && selectedCommunity.tags.length > 0 && (
                        <div className="mt-2 sm:mt-3">
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1 sm:mb-1.5 uppercase tracking-wide">Tags</h5>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {selectedCommunity.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                        </div>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 min-h-0">
                   <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide sticky top-0 bg-card py-2 z-10 border-b border-border/40 -mx-3 sm:-mx-4 px-3 sm:px-4">
                        Members ({currentMembers.length})
                        </h4>
                        <div className="space-y-1.5 sm:space-y-2 pt-2">
                        {currentMembers.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2 p-1 sm:p-1.5 rounded-md hover:bg-muted/50">
                            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint={member.dataAiHint}/>
                                <AvatarFallback>{member.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs sm:text-sm text-foreground truncate">{member.name}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>

             <div className="p-3 border-t border-border/40 mt-auto shrink-0">
                <Button variant="outline" className="w-full text-muted-foreground text-xs sm:text-sm" onClick={() => toast({title: "Feature Coming Soon", description: "Community settings will be implemented."})}>
                    <Settings className="mr-2 h-4 w-4" /> Community Settings
                </Button>
            </div>
        </div>
      )}
      {!selectedCommunity && isRightBarOpen && (
        <div className="h-full w-64 sm:w-72 bg-card border-l border-border/40 flex-col items-center justify-center text-muted-foreground p-4 text-center overflow-hidden hidden md:flex">
            No community selected.
        </div>
      )}


      <AlertDialog open={!!deletingMessageId} onOpenChange={(open) => !open && setDeletingMessageId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the message.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingMessageId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteMessage}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Forward Message</DialogTitle>
                <DialogDescription>
                    Forward this message to the first text channel of this community.
                </DialogDescription>
            </DialogHeader>
            {forwardingMessage && (
                 <div className="mt-2 p-2 border rounded-md bg-muted/50 text-sm">
                    <p className="font-medium text-foreground mb-1">Message from: {forwardingMessage.senderName}</p>
                    {forwardingMessage.type === 'text' && forwardingMessage.text && <p className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formatChatMessage(forwardingMessage.text) }} />}
                    {forwardingMessage.type === 'image' && forwardingMessage.fileUrl && <Image src={forwardingMessage.fileUrl} alt="Forwarded Image" width={100} height={100} className="rounded-md mt-1 max-w-full h-auto object-contain" data-ai-hint="forwarded content" />}
                    {forwardingMessage.type === 'gif' && forwardingMessage.gifUrl && <Image src={forwardingMessage.gifUrl} alt="Forwarded GIF" width={100} height={100} className="rounded-md mt-1 max-w-full h-auto object-contain" unoptimized data-ai-hint="forwarded content"/>}
                    {forwardingMessage.type === 'voice_message' && forwardingMessage.fileUrl && <audio controls src={forwardingMessage.fileUrl} className="my-1 w-full max-w-xs h-10 rounded-md shadow-sm bg-muted invert-[5%] dark:invert-0" data-ai-hint="audio player"/>}
                    {forwardingMessage.type === 'file' && forwardingMessage.fileUrl && <a href={forwardingMessage.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center"><Paperclip className="h-4 w-4 mr-2 shrink-0" /><span className="truncate">{forwardingMessage.fileName || "Attached File"}</span></a>}
                 </div>
            )}
            <div className="grid gap-4 py-4">
                <Input
                    placeholder="Search channels or users (coming soon)..."
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => {setIsForwardDialogOpen(false); setForwardingMessage(null); setForwardSearchTerm("");}}>Cancel</Button>
                <Button onClick={handleForwardMessage} >
                    Forward
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
