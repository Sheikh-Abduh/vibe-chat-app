
"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc, runTransaction } from 'firebase/firestore';
import type { TenorGif as TenorGifType } from '@/types/tenor'; 

import EmojiPicker, { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';


// Cloudinary configuration (API Key is safe for client-side with unsigned uploads)
const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
  'text/plain',
  'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mpeg', // Added mpeg for mp3
];


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
  gifId?: string; 
  gifTinyUrl?: string; 
  gifContentDescription?: string; 
  isPinned?: boolean;
  reactions?: Record<string, string[]>; // Emoji as key, array of user UIDs as value
  replyToMessageId?: string;
  replyToSenderName?: string;
  replyToTextSnippet?: string;
  isForwarded?: boolean;
  forwardedFromSenderName?: string;
  mentionedUserIds?: string[]; // For potential backend processing of mentions
};

/**
 * =============================================================================
 * HOW TO IMPLEMENT CHAT FUNCTIONALITY (Detailed Guide)
 * =============================================================================
 * This section provides a high-level overview for building out the full chat features.
 *
 * 1. Backend Setup (Firebase Firestore - Partially Implemented for text messages):
 *    - Database Schema:
 *      - `/communities/{communityId}`
 *      - `/communities/{communityId}/channels/{channelId}`
 *      - `/communities/{communityId}/members/{memberUserId}`
 *      - `/communities/{communityId}/channels/{channelId}/messages/{messageId}`:
 *        Each message document includes:
 *          - `text`: string (for text messages)
 *          - `senderId`: string (Firebase User ID)
 *          - `senderName`: string
 *          - `senderAvatarUrl`: string | null
 *          - `timestamp`: Firebase Server Timestamp (for ordering)
 *          - `type`: 'text' | 'image' | 'file' | 'gif' | 'voice_message'
 *          - `fileUrl`: string (URL for image, file, voice message from Cloudinary)
 *          - `fileName`: string (for file uploads)
 *          - `fileType`: string (MIME type, e.g., 'audio/webm' for voice messages)
 *          - `gifUrl`: string (URL from Tenor for GIFs)
 *          - `gifId`: string (original ID from Tenor, for favoriting)
 *          - `gifTinyUrl`: string (tiny GIF URL from Tenor, for favoriting)
 *          - `gifContentDescription`: string (description from Tenor, for favoriting)
 *          - `isPinned`: boolean (optional)
 *          - `reactions`: object (e.g., {"👍": ["uid1", "uid2"], "❤️": ["uid1"]})
 *          - `replyToMessageId`: string (optional, ID of the message being replied to)
 *          - `replyToSenderName`: string (optional, name of the original sender)
 *          - `replyToTextSnippet`: string (optional, a short snippet of the original message text)
 *          - `isForwarded`: boolean (optional)
 *          - `forwardedFromSenderName`: string (optional, name of the original sender of the forwarded message)
 *          - `mentionedUserIds`: string[] (optional, array of UIDs for users mentioned)
 *    - Firestore Security Rules: Crucial for access control.
 *      - Users can only write messages to channels they are members of.
 *      - Restrict reading messages to members.
 *      - Community/channel management restrictions.
 *      - Deleting messages restricted to sender or moderators.
 *      - Updating `isPinned` and `reactions` might have specific role-based logic.
 *      - See the "Updated Firestore Security Rules" section in the assistant's previous response.
 *
 * 2. Real-time Message Listening (Frontend - Firebase SDK - Implemented for text):
 *    - `onSnapshot` listener for channel messages is active.
 *
 * 3. Sending Text Messages (Frontend - Implemented with Firestore):
 *    - Saves to Firestore. Now includes reply context if applicable.
 *    - Includes basic Markdown formatting for bold, italic, strikethrough, underline, superscript, subscript.
 *
 * 4. File/Image Upload (Frontend - Implemented with Cloudinary):
 *    - Uploads to Cloudinary, then saves message details (URL, filename, fileType) to Firestore.
 *    - Includes 20MB file size limit and basic type validation.
 *
 * 5. GIF Send (Frontend - Implemented with direct Tenor API for prototype):
 *    - **SECURITY WARNING: DO NOT EXPOSE YOUR TENOR API KEY IN CLIENT-SIDE CODE.**
 *      Proxy Tenor API requests through a Firebase Cloud Function in production.
 *    - Fetches GIFs, saves GIF details (including id, tinyUrl, contentDescription) to Firestore.
 *    - Implemented GIF favoriting using localStorage.
 *
 * 6. Emoji Send (Frontend - Implemented with emoji-picker-react):
 *    - Uses `emoji-picker-react` Picker component to append emojis to the text input and for reactions.
 *
 * 7. Voice Message Send (Frontend - Implemented with MediaRecorder & Cloudinary Upload):
 *    - Captures audio. Uploads the audio Blob to Cloudinary and saves the public URL and fileType to Firestore.
 *    - Messages of type 'voice_message' are rendered with an HTML5 <audio> player.
 *
 * 8. Delete & Pin Message Features (Frontend - Implemented):
 *    - Interacts with Firestore to delete or update `isPinned` status.
 *
 * 9. Message Reactions (Frontend - Implemented with emoji-picker-react picker):
 *    - Users can add/remove reactions. Stored in the `reactions` field of the message in Firestore.
 *
 * 10. Reply to Message (Frontend - UI and data model implemented):
 *     - UI indicator for message being replied to.
 *     - Saves reply context (`replyToMessageId`, `replyToSenderName`, `replyToTextSnippet`) to Firestore.
 *     - Renders replied-to message snippet above the reply.
 *
 * 11. Forward Message (Frontend - Basic UI & hardcoded forward to first text channel implemented):
 *     - Opens a dialog to show the message to forward.
 *     - "Forwards" by creating a new message from the current user to the first text channel of the current community.
 *     - Includes `isForwarded` and `forwardedFromSenderName` fields in Firestore.
 * 
 * 12. @Mentions (Frontend - Basic visual styling & rudimentary suggestions implemented):
 *     - Typing "@" in chat input triggers a popover with members of the current channel.
 *     - Selecting a member inserts "@username" into input.
 *     - Messages containing "@username" patterns are styled.
 *     - Backend for notifications or structured mention storage is not implemented.
 *
 * 13. Client-Side Message Search (Frontend - Basic filtering of loaded messages implemented):
 *     - Search icon in chat header toggles a search input.
 *     - Filters currently displayed messages; does not search full history in Firestore.
 *
 * 14. UI/UX Enhancements:
 *     - Loading states for file uploads and GIF fetching.
 *     - Error handling with toasts.
 *     - Timestamp grouping for messages from the same sender within a short interval.
 *     - Pinned messages toggle.
 *
 * 15. Voice & Video Channels (Advanced - WebRTC):
 *     - Requires a WebRTC service (e.g., Agora, Twilio Video) or a library with Firebase.
 * =============================================================================
 */

const TIMESTAMP_GROUPING_THRESHOLD_MS = 60 * 1000; // 1 minute

interface TenorGif extends TenorGifType {} // Use the imported type

// SECURITY WARNING: DO NOT USE YOUR TENOR API KEY DIRECTLY IN PRODUCTION CLIENT-SIDE CODE.
// This key is included for prototyping purposes only.
// For production, proxy requests through a backend (e.g., Firebase Cloud Function).
const TENOR_API_KEY = "AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw"; // THIS IS A SECURITY RISK FOR PRODUCTION
const TENOR_CLIENT_KEY = "vibe_app_prototype";

const formatChatMessage = (text: string): string => {
  if (!text) return '';
  let formattedText = text;
  // Escape HTML to prevent XSS before applying markdown
  formattedText = formattedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
  // @Mentions: @username (basic styling)
  formattedText = formattedText.replace(/@([\w.-]+)/g, '<span class="bg-accent/20 text-accent font-medium px-1 rounded">@$1</span>');
  
  // IMPORTANT: In a production app, use a proper Markdown library and sanitizer (e.g., DOMPurify + marked)
  // to prevent XSS vulnerabilities if the text can come from untrusted sources or if more complex Markdown is needed.
  // This basic regex approach is for simple styling only.
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


  useEffect(() => {
    if (currentUser) {
        const mode = localStorage.getItem(`theme_mode_${currentUser.uid}`) as 'light' | 'dark';
        if (mode) {
            setCurrentThemeMode(mode);
        } else {
            const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setCurrentThemeMode(systemPrefersDark ? 'dark' : 'light');
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
    if (favoritedGifs.find(fav => fav.id === gif.id)) {
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
            text: data.text || undefined,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatarUrl: data.senderAvatarUrl || null,
            timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            type: data.type || 'text', 
            fileUrl: data.fileUrl || undefined,
            fileName: data.fileName || undefined,
            fileType: data.fileType || undefined,
            gifUrl: data.gifUrl || undefined,
            gifId: data.gifId || undefined,
            gifTinyUrl: data.gifTinyUrl || undefined,
            gifContentDescription: data.gifContentDescription || undefined,
            isPinned: data.isPinned || false,
            reactions: data.reactions || {},
            replyToMessageId: data.replyToMessageId || undefined,
            replyToSenderName: data.replyToSenderName || undefined,
            replyToTextSnippet: data.replyToTextSnippet || undefined,
            isForwarded: data.isForwarded || false,
            forwardedFromSenderName: data.forwardedFromSenderName || undefined,
          } as ChatMessage;
        });
        setMessages(fetchedMessages);
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
                reactions: {},
            }]);
        }
      });

      return () => unsubscribeFirestore();

    } else if (selectedChannel) {
      setMessages([{
        id: 'channel-info-' + selectedChannel.id,
        text: `This is a ${selectedChannel.type} channel. Chat functionality is for text channels.`,
        senderId: 'system',
        senderName: 'System',
        timestamp: new Date(),
        type: 'text',
        reactions: {},
      }]);
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
    setSelectedChannel(channel);
    setShowPinnedMessages(false);
    setReplyingToMessage(null);
    setIsChatSearchOpen(false);
    setChatSearchTerm("");
    if (channel.type === 'text' && chatInputRef.current) {
        chatInputRef.current.focus();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }

    if (newMessage.trim() === "" || !currentUser || !selectedCommunity || !selectedChannel || selectedChannel.type !== 'text') {
      return;
    }

    const messageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
      text: newMessage.trim(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      senderAvatarUrl: currentUser.photoURL || null,
      timestamp: serverTimestamp(), 
      type: 'text' as const,
      isPinned: false,
      reactions: {},
      fileUrl: undefined,
      fileName: undefined,
      fileType: undefined,
      gifUrl: undefined,
      gifId: undefined,
      gifTinyUrl: undefined,
      gifContentDescription: undefined,
      isForwarded: false,
      forwardedFromSenderName: undefined,
      mentionedUserIds: [], // Add mentionedUserIds for future backend processing
      replyToMessageId: undefined,
      replyToSenderName: undefined,
      replyToTextSnippet: undefined,
    };

    if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        let snippet = replyingToMessage.text || '';
        if (replyingToMessage.type === 'image') snippet = 'Image';
        else if (replyingToMessage.type === 'file') snippet = `File: ${replyingToMessage.fileName || 'attachment'}`;
        else if (replyingToMessage.type === 'gif') snippet = 'GIF';
        else if (replyingToMessage.type === 'voice_message') snippet = 'Voice Message';
        messageData.replyToTextSnippet = snippet.substring(0, 75) + (snippet.length > 75 ? '...' : '');
    }

    // Basic @mention detection for potential future structured storage
    const mentions = newMessage.match(/@([\w.-]+)/g);
    if (mentions) {
        // In a real app, you'd resolve these usernames to UIDs
        // For now, just storing usernames.
        // messageData.mentionedUserIds = mentions.map(m => m.substring(1)); 
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

    const messageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      senderAvatarUrl: currentUser.photoURL || null,
      timestamp: serverTimestamp(), 
      type: messageType,
      fileUrl: fileUrl,
      fileName: fileName,
      fileType: fileType, 
      isPinned: false,
      reactions: {},
      text: undefined,
      gifUrl: undefined,
      gifId: undefined,
      gifTinyUrl: undefined,
      gifContentDescription: undefined,
      isForwarded: false,
      forwardedFromSenderName: undefined,
      mentionedUserIds: [],
      replyToMessageId: undefined,
      replyToSenderName: undefined,
      replyToTextSnippet: undefined,
    };

     if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        let snippet = replyingToMessage.text || '';
        if (replyingToMessage.type === 'image') snippet = 'Image';
        else if (replyingToMessage.type === 'file') snippet = `File: ${replyingToMessage.fileName || 'attachment'}`;
        else if (replyingToMessage.type === 'gif') snippet = 'GIF';
        else if (replyingToMessage.type === 'voice_message') snippet = 'Voice Message';
        messageData.replyToTextSnippet = snippet.substring(0, 75) + (snippet.length > 75 ? '...' : '');
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
    formData.append('resource_type', isVoiceMessage ? 'video' : 'auto'); // Cloudinary often handles audio under 'video' resource type

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

    const messageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      senderAvatarUrl: currentUser.photoURL || null,
      timestamp: serverTimestamp(), 
      type: 'gif' as const,
      gifUrl: gif.media_formats.gif.url,
      gifId: gif.id,
      gifTinyUrl: gif.media_formats.tinygif.url,
      gifContentDescription: gif.content_description,
      isPinned: false,
      reactions: {},
      text: undefined,
      fileUrl: undefined,
      fileName: undefined,
      fileType: undefined,
      isForwarded: false,
      forwardedFromSenderName: undefined,
      mentionedUserIds: [],
      replyToMessageId: undefined,
      replyToSenderName: undefined,
      replyToTextSnippet: undefined,
    };
     if (replyingToMessage) {
        messageData.replyToMessageId = replyingToMessage.id;
        messageData.replyToSenderName = replyingToMessage.senderName;
        let snippet = replyingToMessage.text || '';
        if (replyingToMessage.type === 'image') snippet = 'Image';
        else if (replyingToMessage.type === 'file') snippet = `File: ${replyingToMessage.fileName || 'attachment'}`;
        else if (replyingToMessage.type === 'gif') snippet = 'GIF';
        else if (replyingToMessage.type === 'voice_message') snippet = 'Voice Message';
        messageData.replyToTextSnippet = snippet.substring(0, 75) + (snippet.length > 75 ? '...' : '');
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
            tinygif: { url: message.gifTinyUrl, dims: [] }, 
            gif: { url: message.gifUrl || '', dims: []}
        },
        content_description: message.gifContentDescription
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
        return;
    }

    const targetChannel = currentChannels.find(ch => ch.type === 'text');
    if (!targetChannel) {
        toast({ variant: "destructive", title: "Forward Error", description: "No text channel found in this community to forward to." });
        setIsForwardDialogOpen(false);
        setForwardingMessage(null);
        return;
    }

    const forwardedMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        senderAvatarUrl: currentUser.photoURL || null,
        timestamp: serverTimestamp(),
        type: forwardingMessage.type,
        isPinned: false,
        reactions: {},
        text: forwardingMessage.text, // Original text
        fileUrl: forwardingMessage.fileUrl,
        fileName: forwardingMessage.fileName,
        fileType: forwardingMessage.fileType,
        gifUrl: forwardingMessage.gifUrl,
        gifId: forwardingMessage.gifId,
        gifTinyUrl: forwardingMessage.gifTinyUrl,
        gifContentDescription: forwardingMessage.gifContentDescription,
        isForwarded: true,
        forwardedFromSenderName: forwardingMessage.senderName,
        replyToMessageId: undefined, // Forwarded messages don't carry over reply context
        replyToSenderName: undefined,
        replyToTextSnippet: undefined,
        mentionedUserIds: [], // Clear mentions on forward
    };
    
    try {
        const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${targetChannel.id}/messages`);
        await addDoc(messagesRef, forwardedMessageData); 
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
    if (currentMessage.replyToMessageId !== previousMessage.replyToMessageId) return true; // Show header if reply context changes
    if (currentMessage.isForwarded !== previousMessage.isForwarded) return true; // Show header if forwarding state changes
    return false;
  };

  const fetchTrendingGifs = async () => {
    if (!TENOR_API_KEY || !TENOR_API_KEY.startsWith("AIza")) { 
        toast({ variant: "destructive", title: "Tenor API Key Invalid", description: "A valid Tenor API key is required for GIFs. Please check the key configuration."});
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
     if (!TENOR_API_KEY || !TENOR_API_KEY.startsWith("AIza")) {
      toast({ variant: "destructive", title: "Tenor API Key Invalid", description: "A valid Tenor API key is required for GIFs. Please check the key."});
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


  const requestMicPermission = async () => {
    if (hasMicPermission === true) return true; 
    if (hasMicPermission === false) return false; 

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
            // If 'prompt', we'll ask when needed.
        });
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
                setReplyingToMessage(null); // Cancel reply after sending voice message
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

  const handleChatSearchToggle = () => {
    setIsChatSearchOpen(!isChatSearchOpen);
    if (!isChatSearchOpen && chatSearchInputRef.current) {
        setTimeout(() => chatSearchInputRef.current?.focus(), 0);
    } else {
        setChatSearchTerm(""); // Clear search when closing
    }
  };
  
  const currentChannels = selectedCommunity ? placeholderChannels[selectedCommunity.id] || [] : [];
  const currentMembers = selectedCommunity ? placeholderMembers[selectedCommunity.id] || [] : [];

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const userAvatar = currentUser?.photoURL;

  const filteredMessages = messages.filter(msg => {
    if (!chatSearchTerm.trim()) return true;
    if (msg.text?.toLowerCase().includes(chatSearchTerm.toLowerCase())) return true;
    if (msg.fileName?.toLowerCase().includes(chatSearchTerm.toLowerCase())) return true;
    if (msg.senderName?.toLowerCase().includes(chatSearchTerm.toLowerCase())) return true;
    if (msg.gifContentDescription?.toLowerCase().includes(chatSearchTerm.toLowerCase())) return true;
    return false;
  });

  const displayedMessages = showPinnedMessages
    ? filteredMessages.filter(msg => msg.isPinned).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    : filteredMessages;

  const handleMentionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    if (value.endsWith('@') && selectedChannel?.type === 'text') {
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
      <div className="h-full w-20 bg-muted/20 border-r border-border/30 overflow-hidden">
        <ScrollArea className="h-full"> 
          <div className="p-2 space-y-3">
            {placeholderCommunities.map((community) => (
              <button
                key={community.id}
                onClick={() => handleSelectCommunity(community)}
                className={cn(
                  "block w-14 h-14 rounded-full overflow-hidden focus:outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring transition-all duration-150 ease-in-out",
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
      <div className="h-full w-64 bg-card flex flex-col border-r border-border/40 overflow-hidden">
        {selectedCommunity ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm shrink-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{selectedCommunity.name}</h2>
            </div>
            <ScrollArea className="flex-1 min-h-0"> 
              <div className="p-3 space-y-1">
                {currentChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant="ghost"
                    onClick={() => handleSelectChannel(channel)}
                    className={cn(
                      "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted",
                      selectedChannel?.id === channel.id && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <channel.icon className="mr-2 h-4 w-4" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border/40 shrink-0">
              {currentUser ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-foreground hover:bg-muted py-2 h-auto"
                  onClick={handleCommunityProfileEdit}
                >
                  <Avatar className="mr-2 h-8 w-8">
                    <AvatarImage src={userAvatar || undefined} alt={userName} />
                    <AvatarFallback className="bg-muted-foreground/30 text-xs">
                      {userName.substring(0,1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1">{userName}</span>
                  <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
                </Button>
              ) : (
                <div className="flex items-center p-2 text-xs text-muted-foreground">
                  <UserCircle className="mr-1.5 h-4 w-4" /> Loading user...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground flex-1 flex items-center justify-center">Select a community</div>
        )}
      </div>

      {/* Column 3: Main Content Area (Chat UI) */}
      <div className="h-full flex-1 bg-background flex flex-col overflow-hidden">
        {selectedCommunity && selectedChannel ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm flex items-center justify-between shrink-0">
              <div className="flex items-center">
                <selectedChannel.icon className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">{selectedChannel.name}</h3>
              </div>
              <div className={cn("flex items-center space-x-2", isChatSearchOpen && "w-full")}>
                {isChatSearchOpen ? (
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={handleChatSearchToggle}
                            title="Search Messages in Channel"
                        >
                            <Search className="h-5 w-5" />
                        </Button>
                        {selectedChannel.type === 'text' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "text-muted-foreground hover:text-foreground",
                                    showPinnedMessages && "text-primary bg-primary/10 hover:text-primary/90 hover:bg-primary/20"
                                )}
                                onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                                title={showPinnedMessages ? "Show All Messages" : "Show Pinned Messages"}
                            >
                                {showPinnedMessages ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                            </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("text-muted-foreground hover:text-foreground", isRightBarOpen && "bg-accent/20 text-accent")}
                          onClick={() => setIsRightBarOpen(!isRightBarOpen)}
                          title={isRightBarOpen ? "Hide Server Info" : "Show Server Info"}
                        >
                          <Users className="h-5 w-5" />
                        </Button>
                    </>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 bg-card/30"> 
              <div className="p-4 space-y-0.5">
                {displayedMessages.length === 0 && selectedChannel.type === 'text' && (
                   <div className="text-center text-muted-foreground py-4">
                    {chatSearchTerm.trim() ? "No messages found matching your search." : 
                     (showPinnedMessages ? "No pinned messages in this channel." :
                     (messages.length === 0 && !currentUser ? "Loading messages..." : "No messages yet. Be the first to say something!"))}
                  </div>
                )}
                {displayedMessages.map((msg, index) => {
                  const previousMessage = index > 0 ? displayedMessages[index - 1] : null;
                  const showHeader = shouldShowFullMessageHeader(msg, previousMessage);
                  const isMyMessage = currentUser?.uid === msg.senderId;
                  let hasBeenRepliedTo = false;
                  if (isMyMessage && currentUser) { 
                    hasBeenRepliedTo = displayedMessages.some(
                      (replyCandidate) => replyCandidate.replyToMessageId === msg.id && replyCandidate.senderId !== currentUser?.uid
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-start space-x-3 group relative hover:bg-muted/30 px-2 py-1 rounded-md",
                      )}
                    >
                      {showHeader ? (
                        <Avatar className="mt-1 h-8 w-8 shrink-0">
                          <AvatarImage src={msg.senderAvatarUrl || undefined} data-ai-hint="person default" />
                          <AvatarFallback>{msg.senderName.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" /> 
                      )}
                      <div className="flex-1 min-w-0"> 
                        {showHeader && (
                          <div className="flex items-baseline space-x-1.5">
                            <p className="font-semibold text-sm text-foreground">
                              {msg.senderName}
                            </p>
                            <div className="flex items-baseline text-xs text-muted-foreground">
                                <p title={msg.timestamp ? format(msg.timestamp, 'PPpp') : undefined}>
                                {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp, { addSuffix: true }) : 'Sending...'}
                                </p>
                                {msg.timestamp && (
                                <p className="ml-1.5">
                                    ({format(msg.timestamp, 'p')})
                                </p>
                                )}
                            </div>
                            {msg.isPinned && <Pin className="h-3 w-3 text-amber-400 ml-1" title="Pinned Message"/>}
                            {hasBeenRepliedTo && <MessageSquareReply className="h-3 w-3 text-blue-400 ml-1" title="Someone replied to this" />}
                          </div>
                        )}
                        {msg.replyToMessageId && (
                            <div className="mb-1 p-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md border-l-2 border-primary/50 max-w-max">
                                <div className="flex items-center">
                                  <CornerUpRight className="h-3 w-3 mr-1.5 text-primary/70" />
                                  <span>Replying to <span className="font-medium text-foreground/80">{msg.replyToSenderName}</span>: 
                                  <span className="italic ml-1 truncate">"{msg.replyToTextSnippet}"</span></span>
                                </div>
                            </div>
                        )}
                        {msg.isForwarded && (
                          <div className="text-xs text-muted-foreground italic mb-0.5 flex items-center">
                            <Share2 className="h-3 w-3 mr-1.5 text-muted-foreground/80" />
                            Forwarded {msg.forwardedFromSenderName && `from ${msg.forwardedFromSenderName}`}
                          </div>
                        )}
                        {msg.type === 'text' && msg.text && (
                           <p
                             className="text-sm text-foreground/90 whitespace-pre-wrap break-words"
                             dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text) }}
                           />
                        )}
                        {msg.type === 'gif' && msg.gifUrl && (
                           <div className="relative max-w-[300px] mt-1 group/gif">
                                <Image
                                    src={msg.gifUrl}
                                    alt={msg.gifContentDescription || "GIF"}
                                    width={0}
                                    height={0}
                                    style={{ width: 'auto', height: 'auto', maxWidth: '300px', maxHeight: '200px', borderRadius: '0.375rem' }}
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
                                        title={isGifFavorited(msg.gifId) ? "Unfavorite" : "Favorite"}
                                    >
                                        <Star className={cn("h-4 w-4", isGifFavorited(msg.gifId) ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/>
                                    </Button>
                                )}
                           </div>
                        )}
                        {msg.type === 'voice_message' && msg.fileUrl && (
                            <audio controls src={msg.fileUrl} className="my-2 w-full max-w-xs h-10 rounded-md shadow-sm bg-muted" data-ai-hint="audio player">
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
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                                            title={userIds.join(', ')} 
                                        >
                                            {emoji} <span className="ml-1 text-muted-foreground">{userIds.length}</span>
                                        </Button>
                                    )
                                ))}
                            </div>
                        )}
                      </div>
                       <div className="absolute top-0 right-2 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card p-0.5 rounded-md shadow-sm border border-border/50">
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
                                searchPlaceholder="Search emoji..."
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

            {selectedChannel.type === 'text' ? (
              <div className="p-3 border-t border-border/40 shrink-0 relative">
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
                    <div 
                        ref={mentionSuggestionsRef}
                        className="absolute bottom-full left-0 mb-1 w-full max-w-sm bg-popover border border-border shadow-lg rounded-md max-h-48 overflow-y-auto z-20"
                    >
                        {currentMembers.length > 0 ? (
                            currentMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleMentionSelect(member.name)}
                                    className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                                >
                                    {member.name}
                                </button>
                            ))
                        ) : (
                            <p className="p-2 text-xs text-muted-foreground">No members to mention.</p>
                        )}
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center p-1.5 rounded-lg bg-muted space-x-1.5">
                    <input
                        type="file"
                        ref={attachmentInputRef}
                        onChange={handleFileSelected}
                        className="hidden"
                        accept={ALLOWED_FILE_TYPES.join(',')}
                        disabled={isUploadingFile || !currentUser || selectedChannel.type !== 'text' || isRecording}
                    />
                    {isUploadingFile ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                    ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        title="Attach File/Image"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={isUploadingFile || !currentUser || selectedChannel.type !== 'text' || isRecording}
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    )}
                    <Input
                        ref={chatInputRef}
                        type="text"
                        placeholder={isRecording ? "Recording voice message..." : `Message #${selectedChannel.name} (use **bold**, @mention, etc.)`}
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70 text-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2"
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
                        className={cn("shrink-0", isRecording ? "text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:text-foreground")}
                        title={isRecording ? "Stop Recording" : "Send Voice Message"}
                        onClick={handleToggleRecording}
                        disabled={hasMicPermission === false || isUploadingFile || !currentUser || selectedChannel.type !== 'text'}
                    >
                        {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    {hasMicPermission === false && (
                        <AlertTriangle className="h-5 w-5 text-destructive" title="Microphone permission denied"/>
                    )}

                    <Popover open={chatEmojiPickerOpen} onOpenChange={setChatEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Open Emoji Picker" disabled={isRecording || isUploadingFile || !currentUser || selectedChannel.type !== 'text'}>
                            <Smile className="h-5 w-5" />
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
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Send GIF (Tenor)" disabled={isRecording || isUploadingFile || !currentUser || selectedChannel.type !== 'text'}>
                            <Film className="h-5 w-5" />
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
                                    {loadingGifs ? (
                                        <div className="flex justify-center items-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : gifs.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
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
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="favorites">
                                    <ScrollArea className="flex-1 max-h-[calc(70vh-150px)]"> 
                                    {favoritedGifs.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
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
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter className="mt-auto pt-2">
                            <p className="text-xs text-muted-foreground">Powered by Tenor</p>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>

                    <Button type="submit" variant="ghost" size="icon" className="text-primary hover:text-primary/80 shrink-0" title="Send Message" disabled={!newMessage.trim() || !currentUser || selectedChannel.type !== 'text' || isRecording || isUploadingFile}>
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
              </div>
            ) : (
              <div className="p-3 border-t border-border/40 shrink-0">
                <p className="text-sm text-muted-foreground text-center">
                  Voice and video channel interactions are not yet implemented.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-lg p-4">
            {selectedCommunity ? "Select a channel to start." : "Select a community to see its channels."}
          </div>
        )}
      </div>

      {/* Column 4: Right-Hand Info Bar */}
      {isRightBarOpen && selectedCommunity && (
        <div className="h-full w-72 bg-card border-l border-border/40 flex flex-col overflow-hidden">
            <div className="relative h-32 w-full shrink-0">
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
                <div className="p-4 space-y-3 shrink-0 border-b border-border/40">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                        <AvatarImage src={selectedCommunity.iconUrl} alt={selectedCommunity.name} data-ai-hint={selectedCommunity.dataAiHint}/>
                        <AvatarFallback>{selectedCommunity.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                        <CardTitle className="text-xl">{selectedCommunity.name}</CardTitle>
                        </div>
                    </div>
                    <CardDescription className="text-sm">{selectedCommunity.description}</CardDescription>
                    {selectedCommunity.tags && selectedCommunity.tags.length > 0 && (
                        <div className="mt-3">
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Tags</h5>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedCommunity.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                        </div>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 min-h-0"> 
                   <div className="px-4 pb-4 pt-0">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide sticky top-0 bg-card py-2 z-10 border-b border-border/40 -mx-4 px-4">
                        Members ({currentMembers.length})
                        </h4>
                        <div className="space-y-2 pt-2">
                        {currentMembers.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted/50">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint={member.dataAiHint}/>
                                <AvatarFallback>{member.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground truncate">{member.name}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>

             <div className="p-3 border-t border-border/40 mt-auto shrink-0">
                <Button variant="outline" className="w-full text-muted-foreground" onClick={() => toast({title: "Feature Coming Soon", description: "Community settings will be implemented."})}>
                    <Settings className="mr-2 h-4 w-4" /> Community Settings
                </Button>
            </div>
        </div>
      )}
      {!selectedCommunity && isRightBarOpen && (
        <div className="h-full w-72 bg-card border-l border-border/40 flex flex-col items-center justify-center text-muted-foreground p-4 text-center overflow-hidden">
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

      {/* Forward Message Dialog */}
      <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Forward Message</DialogTitle>
                <DialogDescription>
                    Select a channel or user to forward this message to. (Recipient selection coming soon)
                </DialogDescription>
            </DialogHeader>
            {forwardingMessage && (
                 <div className="mt-2 p-2 border rounded-md bg-muted/50 text-sm">
                    <p className="font-medium text-foreground mb-1">Message from: {forwardingMessage.senderName}</p>
                    {forwardingMessage.type === 'text' && <p className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formatChatMessage(forwardingMessage.text!) }} />}
                    {forwardingMessage.type === 'image' && <Image src={forwardingMessage.fileUrl!} alt="Forwarded Image" width={100} height={100} className="rounded-md mt-1 max-w-full h-auto object-contain" data-ai-hint="forwarded content" />}
                    {forwardingMessage.type === 'gif' && <Image src={forwardingMessage.gifUrl!} alt="Forwarded GIF" width={100} height={100} className="rounded-md mt-1 max-w-full h-auto object-contain" unoptimized data-ai-hint="forwarded content"/>}
                    {/* Add more previews for other types if needed */}
                 </div>
            )}
            <div className="grid gap-4 py-4">
                <Input 
                    placeholder="Search channels or users (coming soon)..." 
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                />
                {/* Placeholder for recipient list */}
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

    