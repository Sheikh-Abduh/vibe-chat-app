
"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc, runTransaction, setDoc, getDoc } from 'firebase/firestore';
import type { TenorGif as TenorGifType } from '@/types/tenor';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paperclip, Smile, Film, Send, Trash2, Pin, PinOff, Loader2, Star, StopCircle, AlertTriangle, SmilePlus, User as UserIcon, Mic, Bookmark, Reply, Share2, X, Search, MessageSquareReply, CornerUpRight, AtSign, Phone, VideoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { Badge } from '@/components/ui/badge';
import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type ILocalVideoTrack, type IAgoraRTCRemoteUser, type UID } from 'agora-rtc-sdk-ng';

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


// SECURITY WARNING: DO NOT USE YOUR TENOR API KEY DIRECTLY IN PRODUCTION CLIENT-SIDE CODE.
// This key is included for prototyping purposes only.
// For production, proxy requests through a backend (e.g., Firebase Cloud Function).
const TENOR_API_KEY = "AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw";
const TENOR_CLIENT_KEY = "vibe_app_prototype"; // This might need to be a registered key for reliable API access.

// Agora Configuration
const AGORA_APP_ID = "31ecd1d8c6224b6583e4de451ece7a48";


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
  reactions?: Record<string, string[]>;
  replyToMessageId?: string;
  replyToSenderName?: string;
  replyToSenderId?: string;
  replyToTextSnippet?: string;
  isForwarded?: boolean;
  forwardedFromSenderName?: string;
  mentionedUserIds?: string[];
};

interface DmConversation {
  id: string;
  name: string;
  avatarUrl?: string;
  dataAiHint?: string;
  partnerId: string;
}

const formatChatMessage = (text?: string): string => {
  if (!text) return '';
  let formattedText = text;
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(isCheckingAuth);
  const { toast } = useToast();
  const router = useRouter();

  const [selectedConversation, setSelectedConversation] = useState<DmConversation | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dmPartnerProfile, setDmPartnerProfile] = useState<Partial<User> & {bio?: string; mutualInterests?: string[]} | null>(null);


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
  const [isStartingCall, setIsStartingCall] = useState(false);

  // Agora state variables
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]); // For DMs, this will likely be one user
  const localVideoPlayerContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoPlayerContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
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
            mutualInterests: ["Notes", "Reminders"]
        });

        const modeFromStorage = localStorage.getItem(`appSettings_${user.uid}`);
        if (modeFromStorage) {
            const settings = JSON.parse(modeFromStorage);
            setCurrentThemeMode(settings.themeMode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        } else {
             setCurrentThemeMode(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }

        const storedFavorites = localStorage.getItem(`favorited_gifs_${user.uid}`);
        setFavoritedGifs(storedFavorites ? JSON.parse(storedFavorites) : []);
        setIsCheckingAuth(false);
      } else {
        setIsCheckingAuth(false);
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);


  useEffect(() => {
    if (currentUser && otherUserId) {
      const ids = [currentUser.uid, otherUserId].sort();
      setConversationId(`${ids[0]}_${ids[1]}`);
    } else {
        setConversationId(null);
    }
  }, [currentUser, otherUserId]);

  const ensureConversationDocument = useCallback(async (): Promise<boolean> => {
    if (!currentUser || !otherUserId || !conversationId) {
        // Don't toast here, might be called preemptively
        // toast({ variant: "destructive", title: "Error", description: "User or conversation not identified for ensuring doc." });
        return false;
    }
    const convoDocRef = doc(db, `direct_messages/${conversationId}`);
    try {
        const convoSnap = await getDoc(convoDocRef);
        if (!convoSnap.exists()) {
            let participants = [currentUser.uid, otherUserId].sort();
             if (currentUser.uid === otherUserId) { 
                 participants = [currentUser.uid, currentUser.uid];
             }

            await setDoc(convoDocRef, {
                participants: participants,
                createdAt: serverTimestamp(),
                lastMessageTimestamp: serverTimestamp(),
                [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
                [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
                [`user_${otherUserId}_name`]: dmPartnerProfile?.displayName || (otherUserId === currentUser.uid ? (currentUser.displayName || "You") : "User"),
                [`user_${otherUserId}_avatar`]: dmPartnerProfile?.photoURL || (otherUserId === currentUser.uid ? currentUser.photoURL : null),
            });
        }
        return true;
    } catch (error) {
        console.error("Error ensuring conversation document:", error);
        toast({ variant: "destructive", title: "Conversation Setup Error", description: "Could not initiate or verify conversation structure." });
        return false;
    }
  }, [currentUser, otherUserId, conversationId, dmPartnerProfile, toast]);


  useEffect(() => {
    if (conversationId && currentUser && otherUserId && dmPartnerProfile) {
      if (currentUser.uid === otherUserId && conversationId === `${currentUser.uid}_${currentUser.uid}`) {
        ensureConversationDocument(); 
      }
      
      setMessages([]);
      const messagesQueryRef = collection(db, `direct_messages/${conversationId}/messages`);
      const q = query(messagesQueryRef, orderBy('timestamp', 'asc'));

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
        console.error("Error fetching DM messages: ", error);
        toast({ variant: "destructive", title: "Error loading messages", description: "Could not load DMs." });
         setMessages([{
            id: 'system-error-dm',
            text: 'Error loading messages. Please check your connection and try again.',
            senderId: 'system',
            senderName: 'System',
            timestamp: new Date(),
            type: 'text',
        } as ChatMessage]);
      });
      return () => unsubscribeFirestore();
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
    if (newMessage.trim() === "" || !currentUser || !conversationId || !otherUserId) return;

    const conversationReady = await ensureConversationDocument();
    if (!conversationReady) return;

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


    try {
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
    } catch (error) {
      console.error("Error sending DM:", error);
      toast({ variant: "destructive", title: "Message Not Sent", description: "Could not send your message." });
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
    if (!deletingMessageId || !conversationId || !currentUser) {
        toast({ variant: "destructive", title: "Error", description: "Cannot delete message." });
        setDeletingMessageId(null);
        return;
    }
    const msgDoc = messages.find(m => m.id === deletingMessageId);
    if (msgDoc && msgDoc.senderId !== currentUser.uid) {
      toast({ variant: "destructive", title: "Error", description: "You can only delete your own messages." });
      setDeletingMessageId(null); return;
    }
    try {
      await deleteDoc(doc(db, `direct_messages/${conversationId}/messages/${deletingMessageId}`));
      toast({ title: "Message Deleted" });
    } catch (error) {
      console.error("Error deleting DM:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete the message." });
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleTogglePinMessage = async (messageId: string, currentPinnedStatus: boolean) => {
    if (!conversationId || !currentUser) return;
    try {
      await updateDoc(doc(db, `direct_messages/${conversationId}/messages/${messageId}`), { isPinned: !currentPinnedStatus });
      toast({ title: `Message ${!currentPinnedStatus ? 'Pinned' : 'Unpinned'}` });
    } catch (error) {
      console.error("Error pinning DM:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update pin status." });
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
    if (!TENOR_API_KEY) {
        toast({ variant: "destructive", title: "Tenor API Key Missing", description: "Please check configuration."}); setLoadingGifs(false); return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif`);
      if (!response.ok) {
        let errorBodyText = "Could not read error body.";
        try {
            const errorJson = await response.json();
            errorBodyText = errorJson.error?.message || JSON.stringify(errorJson);
            console.error("Tenor API Error (Trending):", response.status, errorJson);
        } catch (e) {
            errorBodyText = await response.text();
            console.error("Tenor API Error (Trending):", response.status, `Failed to parse error body as JSON: ${errorBodyText}`, e);
        }
        throw new Error(`Failed to fetch trending GIFs. Status: ${response.status}. Body: ${errorBodyText}`);
      }
      const data = await response.json(); setGifs(data.results || []);
    } catch (error) { console.error("Error fetching trending GIFs:", error); setGifs([]); toast({ variant: "destructive", title: "GIF Error", description: (error as Error).message || "Could not load trending GIFs." });}
    finally { setLoadingGifs(false); }
  };

  const searchTenorGifs = async (term: string) => {
    if (!term.trim()) { fetchTrendingGifs(); return; }
    if (!TENOR_API_KEY) { toast({ variant: "destructive", title: "Tenor API Key Missing", description: "Please check configuration."}); setLoadingGifs(false); return; }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif`);
      if (!response.ok) {
        let errorBodyText = "Could not read error body.";
        try {
            const errorJson = await response.json();
            errorBodyText = errorJson.error?.message || JSON.stringify(errorJson);
            console.error("Tenor API Error (Search):", response.status, errorJson);
        } catch (e) {
            errorBodyText = await response.text();
            console.error("Tenor API Error (Search):", response.status, `Failed to parse error body as JSON: ${errorBodyText}`, e);
        }
        throw new Error(`Failed to search GIFs. Status: ${response.status}. Body: ${errorBodyText}`);
      }
      const data = await response.json(); setGifs(data.results || []);
    } catch (error) { console.error("Error searching GIFs:", error); setGifs([]); toast({ variant: "destructive", title: "GIF Error", description: (error as Error).message || "Could not search GIFs." });}
    finally { setLoadingGifs(false); }
  };

  useEffect(() => {
    if (showGifPicker && gifPickerView === 'search' && gifs.length === 0 && !gifSearchTerm) fetchTrendingGifs();
  }, [showGifPicker, gifs.length, gifSearchTerm, gifPickerView]);

  const handleGifSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value; setGifSearchTerm(term);
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
    if (!otherUserId || (currentUser && currentUser.uid === otherUserId) || isStartingCall || AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER" || !AGORA_APP_ID) {
        if (AGORA_APP_ID === "YOUR_AGORA_APP_ID_PLACEHOLDER" || !AGORA_APP_ID) {
            toast({ variant: "destructive", title: "Agora App ID Missing", description: "Agora App ID is not configured for DM calls." });
        } else if (currentUser && currentUser.uid === otherUserId) {
            toast({ title: "Cannot Call Yourself", description: "This feature is for calling other users." });
        } else if (!AGORA_APP_ID){
             toast({ variant: "destructive", title: "Agora App ID Not Set", description: "Voice/video functionality requires an Agora App ID configuration." });
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
        description: `Attempting to call ${otherUserName || 'User'}. (Third-party service like Agora/Twilio needed for full function)`,
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

        const token = null;

        const uid: UID = currentUser!.uid;
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
        toast({ title: `${isVideoCall && cameraPermission ? 'Video' : 'Voice'} Call Active`, description: `Connected with ${otherUserName || 'User'}.` });
    } catch (error) {
        console.error("Agora DM call error:", error);
        toast({ variant: "destructive", title: "Call Failed", description: "Could not start or connect to the call." });
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
    if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
        setRemoteUsers([]);
        if(localVideoPlayerContainerRef.current) localVideoPlayerContainerRef.current.innerHTML = '';
        if(remoteVideoPlayerContainerRef.current) remoteVideoPlayerContainerRef.current.innerHTML = '';
        toast({ title: "Call Ended", description: "You have left the call."});
    }
    setIsStartingCall(false);
  };
  useEffect(() => {
    return () => {
        if (agoraClientRef.current) {
            handleLeaveDmCall();
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);


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

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Column 1: Conversation List */}
      <div className="h-full w-64 sm:w-72 bg-card border-r border-border/40 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/40 shadow-sm shrink-0">
          <Input placeholder="Search DMs..." className="bg-muted border-border/60 text-sm"/>
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
                        mutualInterests: ["Self-Care", "Productivity"]
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
            <div className="p-4 text-center text-xs text-muted-foreground">
                DM list coming soon.
            </div>
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
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{otherUserName || 'Direct Message'}</h3>
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
                                    disabled={isStartingCall || (!AGORA_APP_ID && !agoraClientRef.current) }
                                >
                                    {isStartingCall && !agoraClientRef.current ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin"/> : (agoraClientRef.current ? <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive"/> : <Phone className="h-4 w-4 sm:h-5 sm:w-5"/>)}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
                                    title={agoraClientRef.current && localVideoTrack ? "End Video Call" : "Start Video Call"}
                                    onClick={!agoraClientRef.current ? () => handleStartCall(true) : handleLeaveDmCall}
                                    disabled={isStartingCall || (!AGORA_APP_ID && !agoraClientRef.current)}
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
                    {localVideoTrack && (
                        <div id="local-dm-video-player-container" ref={localVideoPlayerContainerRef} className="w-32 h-24 sm:w-40 sm:h-30 md:w-48 md:h-36 bg-black rounded-md shadow self-start mb-2 relative">
                             <p className="text-white text-xs p-1 absolute top-0 left-0 bg-black/50 rounded-br-md">You</p>
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

                      <div className={cn("flex-1 min-w-0 text-left", isCurrentUserMsg ? "pr-10 sm:pr-12" : "pl-0", showHeader ? "" : (isCurrentUserMsg ? "" : ""))}>
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
                                  <span className="italic ml-1 truncate">"{msg.replyToTextSnippet}"</span></span>
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
                            dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text) }} />
                        )}
                        {msg.type === 'gif' && msg.gifUrl && (
                           <div className="relative max-w-[250px] sm:max-w-[300px] mt-1 group/gif">
                                <Image src={msg.gifUrl} alt={msg.gifContentDescription || "GIF"} width={0} height={0} style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '200px', borderRadius: '0.375rem' }} unoptimized priority={false} data-ai-hint="animated gif" />
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => setDeletingMessageId(msg.id)}>
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
                    <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] h-[70vh] flex flex-col">
                        <DialogHeader><DialogTitle>Send a GIF</DialogTitle><DialogDescription>Search Tenor or browse favorites. <span className="block text-xs text-destructive/80 mt-1">SECURITY WARNING: Tenor API key is client-side.</span></DialogDescription></DialogHeader>
                        <Tabs defaultValue="search" onValueChange={(value) => setGifPickerView(value as 'search' | 'favorites')} className="mt-2 flex-1 flex flex-col min-h-0">
                            <TabsList className="grid w-full grid-cols-2 shrink-0"><TabsTrigger value="search">Search</TabsTrigger><TabsTrigger value="favorites">Favorites</TabsTrigger></TabsList>
                            <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden min-h-0 mt-2">
                                <Input type="text" placeholder="Search Tenor GIFs..." value={gifSearchTerm} onChange={handleGifSearchChange} className="my-2 shrink-0"/>
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-1">
                                    {loadingGifs ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                        : gifs.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {gifs.map((gif) => (<div key={gif.id} className="relative group aspect-square">
                                            <button onClick={() => handleSendGif(gif)} className="w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary"><Image src={gif.media_formats.tinygif.url} alt={gif.content_description || "GIF"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover group-hover:scale-105" unoptimized/></button>
                                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white" onClick={() => handleToggleFavoriteGif(gif)} title={isGifFavorited(gif.id) ? "Unfavorite" : "Favorite"}><Star className={cn("h-4 w-4", isGifFavorited(gif.id) ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/></Button>
                                        </div>))}</div>)
                                        : <p className="text-center text-muted-foreground py-4">{gifSearchTerm ? "No GIFs found." : "No trending GIFs."}</p>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="favorites" className="flex-1 flex flex-col overflow-hidden min-h-0 mt-2">
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-1">
                                    {favoritedGifs.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {favoritedGifs.map((gif) => (<div key={gif.id} className="relative group aspect-square">
                                        <button onClick={() => handleSendGif(gif)} className="w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary"><Image src={gif.media_formats.tinygif.url} alt={gif.content_description || "GIF"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover group-hover:scale-105" unoptimized/></button>
                                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white" onClick={() => handleToggleFavoriteGif(gif)} title="Unfavorite"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/></Button>
                                        </div>))}</div>)
                                        : <p className="text-center text-muted-foreground py-4">No favorited GIFs.</p>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter className="mt-auto pt-2 shrink-0"><p className="text-xs text-muted-foreground">Powered by Tenor</p></DialogFooter>
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
                    {forwardingMessage.type === 'text' && forwardingMessage.text && <p className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formatChatMessage(forwardingMessage.text) }} />}
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
    </div>
  );
}
