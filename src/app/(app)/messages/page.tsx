
"use client";

import React, { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc, runTransaction, setDoc, getDoc } from 'firebase/firestore';
import type { TenorGif as TenorGifType } from '@/types/tenor';

import EmojiPicker, { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paperclip, Smile, Film, Send, Trash2, Pin, PinOff, Loader2, Star, StopCircle, AlertTriangle, SmilePlus, User as UserIcon, Mic, Bookmark, Reply, Share2, X, Search, MessageSquareReply, CornerUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { Badge } from '@/components/ui/badge';


const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mpeg',
];

const TIMESTAMP_GROUPING_THRESHOLD_MS = 60 * 1000; // 1 minute

interface TenorGif extends TenorGifType {}


// SECURITY WARNING: DO NOT USE YOUR TENOR API KEY DIRECTLY IN PRODUCTION CLIENT-SIDE CODE.
// This key is included for prototyping purposes only.
// For production, proxy requests through a backend (e.g., Firebase Cloud Function).
const TENOR_API_KEY = "AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw"; // THIS IS A SECURITY RISK FOR PRODUCTION
const TENOR_CLIENT_KEY = "vibe_app_prototype";


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
  replyToTextSnippet?: string;
  isForwarded?: boolean;
  forwardedFromSenderName?: string;
};

interface DmConversation {
  id: string; 
  name: string;
  avatarUrl?: string;
  dataAiHint?: string;
  partnerId: string; 
}

const formatChatMessage = (text: string): string => {
  if (!text) return '';
  let formattedText = text;
  formattedText = formattedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  formattedText = formattedText.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
  formattedText = formattedText.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
  formattedText = formattedText.replace(/~~(.*?)~~/g, '<del>$1</del>');
  formattedText = formattedText.replace(/\+\+(.*?)\+\+/g, '<u>$1</u>');
  formattedText = formattedText.replace(/\^\^(.*?)\^\^/g, '<sup>$1</sup>');
  formattedText = formattedText.replace(/vv(.*?)vv/g, '<sub>$1</sub>');
  return formattedText;
};

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const [selectedConversation, setSelectedConversation] = useState<DmConversation | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null); 
  const [otherUserName, setOtherUserName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dmPartnerProfile, setDmPartnerProfile] = useState<Partial<User> | null>(null);


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
        setDmPartnerProfile({ 
            uid: user.uid,
            displayName: user.displayName || "You",
            photoURL: user.photoURL,
            email: user.email,
        });

        const mode = localStorage.getItem(`theme_mode_${user.uid}`) as 'light' | 'dark';
        setCurrentThemeMode(mode || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        
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


  useEffect(() => {
    if (conversationId && currentUser) {
      setMessages([]);
      const messagesQueryRef = collection(db, `direct_messages/${conversationId}/messages`);
      const q = query(messagesQueryRef, orderBy('timestamp', 'asc'));

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
        console.error("Error fetching DM messages: ", error);
        toast({ variant: "destructive", title: "Error loading messages", description: "Could not load DMs." });
      });
      return () => unsubscribeFirestore();
    } else {
      setMessages([]);
    }
  }, [conversationId, currentUser, toast]);
  

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages, showPinnedMessages]);
  
  const getFavoriteStorageKey = () => currentUser ? `favorited_gifs_${currentUser.uid}` : null;

  const handleToggleFavoriteGif = (gif: TenorGif) => {
    if (!currentUser) return;
    const key = getFavoriteStorageKey();
    if (!key) return;
    let updatedFavorites;
    if (favoritedGifs.find(fav => fav.id === gif.id)) {
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

  const ensureConversationDocument = async (): Promise<boolean> => {
    if (!currentUser || !otherUserId || !conversationId) {
        toast({ variant: "destructive", title: "Error", description: "User or conversation not identified." });
        return false;
    }
    const convoDocRef = doc(db, `direct_messages/${conversationId}`);
    try {
        const convoSnap = await getDoc(convoDocRef);
        if (!convoSnap.exists()) {
            let participants = [currentUser.uid, otherUserId].sort();
             if (currentUser.uid === otherUserId && participants.length === 1 && participants[0] === currentUser.uid) { 
                 participants.push(currentUser.uid); 
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
        toast({ variant: "destructive", title: "Conversation Error", description: "Could not initiate or verify conversation." });
        return false;
    }
  };


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (newMessage.trim() === "" || !currentUser || !conversationId || !otherUserId) return;

    const conversationReady = await ensureConversationDocument();
    if (!conversationReady) return;

    const messageData: Partial<ChatMessage> & { senderId: string; senderName: string; timestamp: any; type: 'text'; isPinned: boolean; reactions: Record<string, string[]> } = {
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
      const messagesColRef = collection(db, `direct_messages/${conversationId}/messages`);
      await addDoc(messagesColRef, messageData);
      
      const convoDocRef = doc(db, `direct_messages/${conversationId}`);
      await updateDoc(convoDocRef, { 
        lastMessage: messageData.text,
        lastMessageTimestamp: serverTimestamp(),
        [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
      });

      setNewMessage("");
      setReplyingToMessage(null);
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

    const messageData: Partial<ChatMessage> & { senderId: string; senderName: string; timestamp: any; type: ChatMessage['type']; fileUrl: string; fileName: string; fileType: string; isPinned: boolean; reactions: Record<string, string[]>} = {
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
      const messagesColRef = collection(db, `direct_messages/${conversationId}/messages`);
      await addDoc(messagesColRef, messageData);

       const convoDocRef = doc(db, `direct_messages/${conversationId}`);
        await updateDoc(convoDocRef, { 
            lastMessage: messageType === 'image' ? 'Sent an image' : (messageType === 'voice_message' ? 'Sent a voice message' : `Sent a file: ${fileName}`),
            lastMessageTimestamp: serverTimestamp(),
            [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
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
      if (!response.ok) throw new Error((await response.json()).error?.message || 'Cloudinary upload failed.');
      const data = await response.json();
      const fileTypeFromCloudinary = isVoiceMessage ? file.type : (data.resource_type === 'video' && data.format === 'webm' ? 'audio/webm' : (data.format ? `${data.resource_type}/${data.format}` : file.type));
      if (data.secure_url) {
        await sendAttachmentMessageToFirestore(data.secure_url, data.original_filename || file.name, fileTypeFromCloudinary);
      } else throw new Error('Cloudinary did not return a URL.');
    } catch (error: any) {
      console.error("Upload Failed:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setIsUploadingFile(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };
  
  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ variant: 'destructive', title: 'File Too Large', description: `Max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` });
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
      toast({ variant: 'destructive', title: 'Invalid File Type' });
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      return;
    }
    uploadFileToCloudinaryAndSend(file);
  };

  const handleSendGif = async (gif: TenorGif) => {
    if (!currentUser || !conversationId || !otherUserId) return;

    const conversationReady = await ensureConversationDocument();
    if (!conversationReady) return;

    const messageData: Partial<ChatMessage> & { senderId: string; senderName: string; timestamp: any; type: 'gif'; gifUrl: string; gifId: string; gifTinyUrl: string; gifContentDescription: string; isPinned: boolean; reactions: Record<string, string[]> } = {
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
      const messagesColRef = collection(db, `direct_messages/${conversationId}/messages`);
      await addDoc(messagesColRef, messageData);
        const convoDocRef = doc(db, `direct_messages/${conversationId}`);
        await updateDoc(convoDocRef, { 
            lastMessage: 'Sent a GIF',
            lastMessageTimestamp: serverTimestamp(),
            [`user_${currentUser.uid}_name`]: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            [`user_${currentUser.uid}_avatar`]: currentUser.photoURL || null,
        });
      setShowGifPicker(false); setGifSearchTerm(""); setGifs([]);
      setReplyingToMessage(null);
    } catch (error) {
      console.error("Error sending GIF:", error);
      toast({ variant: "destructive", title: "GIF Not Sent", description: "Could not send GIF." });
    }
  };

  const handleFavoriteGifFromChat = (message: ChatMessage) => {
    if (!message.gifId || !message.gifTinyUrl || !message.gifContentDescription) return;
    const gifToFavorite: TenorGif = {
        id: message.gifId,
        media_formats: { tinygif: { url: message.gifTinyUrl, dims: [] }, gif: { url: message.gifUrl || '', dims: []}},
        content_description: message.gifContentDescription
    };
    handleToggleFavoriteGif(gifToFavorite);
  };

  const handleDeleteMessage = async () => {
    if (!deletingMessageId || !conversationId || !currentUser) return;
    const msgDoc = messages.find(m => m.id === deletingMessageId);
    if (msgDoc && msgDoc.senderId !== currentUser.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot delete others' messages." });
      setDeletingMessageId(null); return;
    }
    try {
      await deleteDoc(doc(db, `direct_messages/${conversationId}/messages/${deletingMessageId}`));
      toast({ title: "Message Deleted" });
    } catch (error) {
      console.error("Error deleting DM:", error);
      toast({ variant: "destructive", title: "Error deleting message." });
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
      toast({ variant: "destructive", title: "Error pinning message." });
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !conversationId) return;
    const messageRef = doc(db, `direct_messages/${conversationId}/messages/${messageId}`);
    try {
      await runTransaction(db, async (transaction) => {
        const messageDocSnap = await transaction.get(messageRef);
        if (!messageDocSnap.exists()) throw new Error("Message not found");
        const currentReactions = (messageDocSnap.data().reactions || {}) as Record<string, string[]>;
        const usersReacted = currentReactions[emoji] || [];
        const newUsersReacted = usersReacted.includes(currentUser.uid)
          ? usersReacted.filter(uid => uid !== currentUser.uid)
          : [...usersReacted, currentUser.uid];
        const newReactionsData = { ...currentReactions };
        if (newUsersReacted.length === 0) delete newReactionsData[emoji];
        else newReactionsData[emoji] = newUsersReacted;
        transaction.update(messageRef, { reactions: newReactionsData });
      });
      setReactionPickerOpenForMessageId(null);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({ variant: "destructive", title: "Reaction Failed" });
    }
  };

  const handleReplyClick = (message: ChatMessage) => {
    setReplyingToMessage(message);
    chatInputRef.current?.focus();
  };

  const handleForwardMessage = async () => {
    if (!forwardingMessage || !currentUser ) {
        toast({ variant: "destructive", title: "Forward Error", description: "Cannot forward message." });
        return;
    }
  
    const targetConversationId = [currentUser.uid, currentUser.uid].sort().join('_'); 

    const savedMessagesConvoDocRef = doc(db, `direct_messages/${targetConversationId}`);
    try {
        const savedMessagesConvoSnap = await getDoc(savedMessagesConvoDocRef);
        if (!savedMessagesConvoSnap.exists()) {
            await setDoc(savedMessagesConvoDocRef, {
                participants: [currentUser.uid, currentUser.uid],
                createdAt: serverTimestamp(),
                lastMessageTimestamp: serverTimestamp(),
                [`user_${currentUser.uid}_name`]: currentUser.displayName || "You",
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

    const forwardedMessageData: Partial<ChatMessage> & { senderId: string; senderName: string; timestamp: any; type: ChatMessage['type']; isPinned: boolean; reactions: Record<string, string[]>} = {
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
    };
  
    try {
      const messagesColRef = collection(db, `direct_messages/${targetConversationId}/messages`);
      await addDoc(messagesColRef, forwardedMessageData);
  
      const convoDocRef = doc(db, `direct_messages/${targetConversationId}`);
      let lastMessageText = "Forwarded message";
      if (forwardedMessageData.type === 'text' && forwardedMessageData.text) lastMessageText = forwardedMessageData.text; 
      else if (forwardedMessageData.type === 'image') lastMessageText = "Forwarded an image";
      else if (forwardedMessageData.type === 'gif') lastMessageText = "Forwarded a GIF";
      else if (forwardedMessageData.type === 'file') lastMessageText = "Forwarded a file";
      else if (forwardedMessageData.type === 'voice_message') lastMessageText = "Forwarded a voice message";
      
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
    if (!TENOR_API_KEY.startsWith("AIza")) { 
        toast({ variant: "destructive", title: "Tenor API Key Invalid" }); setLoadingGifs(false); return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20&media_filter=tinygif,gif`);
      if (!response.ok) throw new Error('Failed to fetch trending GIFs');
      const data = await response.json(); setGifs(data.results || []);
    } catch (error) { console.error("Error fetching trending GIFs:", error); setGifs([]); } 
    finally { setLoadingGifs(false); }
  };

  const searchTenorGifs = async (term: string) => {
    if (!term.trim()) { fetchTrendingGifs(); return; }
    if (!TENOR_API_KEY.startsWith("AIza")) { setLoadingGifs(false); return; }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20&media_filter=tinygif,gif`);
      if (!response.ok) throw new Error('Failed to search GIFs');
      const data = await response.json(); setGifs(data.results || []);
    } catch (error) { console.error("Error searching GIFs:", error); setGifs([]); } 
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

  const requestMicPermission = async () => {
    if (hasMicPermission !== null) return hasMicPermission;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true); stream.getTracks().forEach(track => track.stop()); return true;
    } catch (error) {
      setHasMicPermission(false);
      toast({ variant: "destructive", title: "Microphone Access Denied" }); return false;
    }
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(status => {
        if (status.state === 'granted') setHasMicPermission(true);
        else if (status.state === 'denied') setHasMicPermission(false);
      });
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
        toast({ variant: "destructive", title: "Recording Error" }); setIsRecording(false);
      }
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
  
  const displayedMessages = showPinnedMessages
    ? messages.filter(msg => msg.isPinned).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    : messages;


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
      <div className="h-full w-72 bg-card border-r border-border/40 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/40 shadow-sm shrink-0">
          <Input placeholder="Search DMs..." className="bg-muted border-border/60"/>
        </div>
        <ScrollArea className="flex-1 min-h-0"> 
          <div className="p-2 space-y-1">
             <Button 
                key={savedMessagesConversation.id} 
                variant="ghost" 
                className={cn(
                    "w-full justify-start h-auto py-2.5",
                    selectedConversation?.id === savedMessagesConversation.id && "bg-accent text-accent-foreground" 
                )}
                onClick={() => {
                    setSelectedConversation(savedMessagesConversation);
                    setOtherUserId(savedMessagesConversation.partnerId);
                    setOtherUserName(savedMessagesConversation.name);
                    setDmPartnerProfile({
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || "You",
                        photoURL: currentUser.photoURL,
                        email: currentUser.email,
                    });
                    setReplyingToMessage(null);
                    setShowPinnedMessages(false);
                }}
             >
                <Avatar className="h-10 w-10 mr-3">
                    {savedMessagesConversation.avatarUrl ? (
                         <AvatarImage src={savedMessagesConversation.avatarUrl} alt={savedMessagesConversation.name} data-ai-hint={savedMessagesConversation.dataAiHint}/>
                    ) : (
                        <Bookmark className="h-5 w-5 text-muted-foreground" />
                    )}
                    <AvatarFallback><Bookmark /></AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate text-left">
                    <p className="font-semibold text-sm">{savedMessagesConversation.name}</p>
                    <p className="text-xs text-muted-foreground truncate">Messages you save for later</p>
                </div>
            </Button>
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Chat Area */}
      <div className="h-full flex-1 bg-background flex flex-col overflow-hidden">
        {selectedConversation && otherUserId && conversationId ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm flex items-center justify-between shrink-0">
              <div className="flex items-center">
                 <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={selectedConversation.avatarUrl || dmPartnerProfile?.photoURL || undefined} alt={otherUserName || ''} data-ai-hint={selectedConversation.dataAiHint}/>
                    <AvatarFallback>{(otherUserName || 'U').substring(0,1)}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold text-foreground">{otherUserName || 'Direct Message'}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => toast({ title: "Message Search", description: "DM search coming soon!"})}
                    title="Search Messages in DM"
                >
                    <Search className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("text-muted-foreground hover:text-foreground", showPinnedMessages && "text-primary bg-primary/10")}
                    onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                    title={showPinnedMessages ? "Show All Messages" : "Show Pinned Messages"}
                >
                    {showPinnedMessages ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("text-muted-foreground hover:text-foreground", isMessagesRightBarOpen && "bg-accent/20 text-accent")}
                  onClick={() => setIsMessagesRightBarOpen(!isMessagesRightBarOpen)}
                  title={isMessagesRightBarOpen ? "Hide User Info" : "Show User Info"}
                >
                  <UserIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 bg-card/30"> 
              <div className="p-4 space-y-0.5">
                {displayedMessages.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    {showPinnedMessages ? "No pinned DMs in this conversation." : "No messages yet. Start the conversation!"}
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
                        "flex items-start space-x-3 group relative hover:bg-muted/30 px-2 py-1 rounded-md",
                         isCurrentUserMsg && "justify-end"
                      )}
                    >
                      {!isCurrentUserMsg && showHeader && (
                        <Avatar className="mt-1 h-8 w-8 shrink-0">
                          <AvatarImage src={msg.senderAvatarUrl || undefined} data-ai-hint="person default" />
                          <AvatarFallback>{msg.senderName.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                       {!isCurrentUserMsg && !showHeader && <div className="w-8 shrink-0" /> }

                      <div className={cn("flex-1 min-w-0 max-w-[75%]", isCurrentUserMsg && "text-right")}>
                        {showHeader && (
                          <div className={cn("flex items-baseline space-x-1.5", isCurrentUserMsg && "justify-end")}>
                            <p className="font-semibold text-sm text-foreground">{isCurrentUserMsg ? "You" : msg.senderName}</p>
                            <div className="flex items-baseline text-xs text-muted-foreground">
                              <p title={msg.timestamp ? format(msg.timestamp, 'PPpp') : undefined}>
                                {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp, { addSuffix: true }) : 'Sending...'}
                              </p>
                              {msg.timestamp && <p className="ml-1.5">({format(msg.timestamp, 'p')})</p>}
                            </div>
                            {msg.isPinned && <Pin className="h-3 w-3 text-amber-400 ml-1" title="Pinned Message"/>}
                            {hasBeenRepliedTo && <MessageSquareReply className="h-3 w-3 text-blue-400 ml-1" title="Someone replied to this" />}
                          </div>
                        )}
                         {msg.replyToMessageId && (
                            <div className={cn("mb-1 p-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md border-l-2 border-primary/50 max-w-max", isCurrentUserMsg ? "ml-auto" : "mr-auto")}>
                                 <div className="flex items-center">
                                  <CornerUpRight className="h-3 w-3 mr-1.5 text-primary/70" />
                                  <span>Replying to <span className="font-medium text-foreground/80">{msg.replyToSenderName}</span>: 
                                  <span className="italic ml-1 truncate">"{msg.replyToTextSnippet}"</span></span>
                                </div>
                            </div>
                        )}
                        {msg.isForwarded && (
                          <div className={cn("text-xs text-muted-foreground italic mb-0.5 flex items-center", isCurrentUserMsg ? "justify-end" : "justify-start")}>
                            <Share2 className="h-3 w-3 mr-1.5 text-muted-foreground/80" />
                            Forwarded {msg.forwardedFromSenderName && `from ${msg.forwardedFromSenderName}`}
                          </div>
                        )}
                         <div className={cn("mt-0.5 p-2 rounded-lg inline-block", 
                            isCurrentUserMsg ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                            showHeader ? "mt-0.5" : "mt-0"
                        )}>
                            {msg.type === 'text' && msg.text && (
                                <p className="text-sm whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text) }} />
                            )}
                            {msg.type === 'gif' && msg.gifUrl && (
                               <div className="relative max-w-[300px] mt-1 group/gif">
                                    <Image src={msg.gifUrl} alt={msg.gifContentDescription || "GIF"} width={0} height={0} style={{ width: 'auto', height: 'auto', maxWidth: '300px', maxHeight: '200px', borderRadius: '0.375rem' }} unoptimized priority={false} data-ai-hint="animated gif" />
                                    {currentUser && msg.gifId && (
                                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white" onClick={() => handleFavoriteGifFromChat(msg)} title={isGifFavorited(msg.gifId) ? "Unfavorite" : "Favorite"}>
                                            <Star className={cn("h-4 w-4", isGifFavorited(msg.gifId) ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/>
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
                                <div className="mt-1 p-2 border rounded-md bg-background/30 max-w-xs">
                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center">
                                        <Paperclip className="h-4 w-4 mr-2 shrink-0" />
                                        <span className="truncate">{msg.fileName || "Attached File"}</span>
                                    </a>
                                </div>
                            )}
                        </div>
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
                        <Avatar className="mt-1 h-8 w-8 shrink-0 ml-3">
                          <AvatarImage src={msg.senderAvatarUrl || undefined} data-ai-hint="person default" />
                          <AvatarFallback>{msg.senderName.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      {isCurrentUserMsg && !showHeader && <div className="w-8 shrink-0 ml-3" />}

                       <div className={cn("absolute top-0 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card p-0.5 rounded-md shadow-sm border border-border/50", isCurrentUserMsg ? "left-2" : "right-2")}>
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
                                searchPlaceholder="Search emoji..."
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
            <div className="p-3 border-t border-border/40 shrink-0">
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
                <form onSubmit={handleSendMessage} className="flex items-center p-1.5 rounded-lg bg-muted space-x-1.5">
                    <input type="file" ref={attachmentInputRef} onChange={handleFileSelected} className="hidden" accept={ALLOWED_FILE_TYPES.join(',')} disabled={isUploadingFile || isRecording} />
                    {isUploadingFile ? <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" /> : (
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Attach File" onClick={() => attachmentInputRef.current?.click()} disabled={isUploadingFile || isRecording}>
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    )}
                    <Input ref={chatInputRef} type="text" placeholder={isRecording ? "Recording..." : `Message ${otherUserName || 'User'}... (use **bold**, *italic*, etc.)`}
                        className="flex-1 bg-transparent text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2"
                        value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isUploadingFile) handleSendMessage(e); }}
                        disabled={isRecording || isUploadingFile}
                    />
                    <Button type="button" variant={isRecording ? "destructive" : "ghost"} size="icon"
                        className={cn("shrink-0", isRecording ? "text-destructive-foreground hover:bg-destructive/90" : "text-muted-foreground hover:text-foreground")}
                        title={isRecording ? "Stop Recording" : "Send Voice Message"} onClick={handleToggleRecording} disabled={hasMicPermission === false || isUploadingFile}>
                        {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    {hasMicPermission === false && <AlertTriangle className="h-5 w-5 text-destructive" title="Mic permission denied"/>}
                    <Popover open={chatEmojiPickerOpen} onOpenChange={setChatEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Emoji" disabled={isRecording || isUploadingFile}>
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
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="GIF" disabled={isRecording || isUploadingFile}>
                            <Film className="h-5 w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] h-[70vh] flex flex-col">
                        <DialogHeader><DialogTitle>Send a GIF</DialogTitle><DialogDescription>Search Tenor or browse favorites. <span className="block text-xs text-destructive/80 mt-1">SECURITY WARNING: Tenor API key is client-side.</span></DialogDescription></DialogHeader>
                        <Tabs defaultValue="search" onValueChange={(value) => setGifPickerView(value as 'search' | 'favorites')} className="mt-2">
                        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="search">Search</TabsTrigger><TabsTrigger value="favorites">Favorites</TabsTrigger></TabsList>
                        <TabsContent value="search">
                            <Input type="text" placeholder="Search Tenor GIFs..." value={gifSearchTerm} onChange={handleGifSearchChange} className="my-2"/>
                            <ScrollArea className="flex-1 min-h-0 max-h-[calc(70vh-200px)]"> 
                            {loadingGifs ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                : gifs.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
                                {gifs.map((gif) => (<div key={gif.id} className="relative group aspect-square">
                                    <button onClick={() => handleSendGif(gif)} className="w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary"><Image src={gif.media_formats.tinygif.url} alt={gif.content_description || "GIF"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover group-hover:scale-105" unoptimized/></button>
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white" onClick={() => handleToggleFavoriteGif(gif)} title={isGifFavorited(gif.id) ? "Unfavorite" : "Favorite"}><Star className={cn("h-4 w-4", isGifFavorited(gif.id) ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/></Button>
                                </div>))}</div>)
                                : <p className="text-center text-muted-foreground py-4">{gifSearchTerm ? "No GIFs found." : "No trending GIFs."}</p>}
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="favorites">
                            <ScrollArea className="flex-1 min-h-0 max-h-[calc(70vh-150px)]"> 
                            {favoritedGifs.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
                                {favoritedGifs.map((gif) => (<div key={gif.id} className="relative group aspect-square">
                                <button onClick={() => handleSendGif(gif)} className="w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary"><Image src={gif.media_formats.tinygif.url} alt={gif.content_description || "GIF"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover group-hover:scale-105" unoptimized/></button>
                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white" onClick={() => handleToggleFavoriteGif(gif)} title="Unfavorite"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/></Button>
                                </div>))}</div>)
                                : <p className="text-center text-muted-foreground py-4">No favorited GIFs.</p>}
                            </ScrollArea>
                        </TabsContent>
                        </Tabs>
                        <DialogFooter className="mt-auto pt-2"><p className="text-xs text-muted-foreground">Powered by Tenor</p></DialogFooter>
                    </DialogContent>
                    </Dialog>
                    <Button type="submit" variant="ghost" size="icon" className="text-primary hover:text-primary/80 shrink-0" title="Send" disabled={!newMessage.trim() || isRecording || isUploadingFile}>
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            {currentUser ? "Select 'Saved Messages' to start." : <SplashScreenDisplay />}
          </div>
        )}
      </div>

      {/* Column 3: DM Partner Info Bar */}
      {isMessagesRightBarOpen && selectedConversation && dmPartnerProfile && (
          <div className="h-full w-72 bg-card border-l border-border/40 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border/40 shadow-sm shrink-0">
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-3 border-2 border-primary shadow-md">
                            <AvatarImage src={dmPartnerProfile.photoURL || undefined} alt={dmPartnerProfile.displayName || 'User'} data-ai-hint="person portrait"/>
                            <AvatarFallback className="text-3xl">
                                {(dmPartnerProfile.displayName || 'U').substring(0,1).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-semibold text-foreground">{dmPartnerProfile.displayName || 'User'}</h3>
                        {dmPartnerProfile.email && selectedConversation.id === `${currentUser?.uid}_self` && (
                            <p className="text-sm text-muted-foreground">{dmPartnerProfile.email}</p>
                        )}
                         <p className="text-xs text-muted-foreground mt-1 italic">Status: Away (placeholder)</p>
                    </div>
                </div>
                <ScrollArea className="flex-1 min-h-0"> 
                    <div className="p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h4>
                        <p className="text-sm text-foreground/90">User bio placeholder. This is where a short description about the user would go.</p>
                        
                        {selectedConversation.id !== `${currentUser?.uid}_self` && (
                            <>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-3">Mutual Interests</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="secondary">#Placeholder</Badge>
                                    <Badge variant="secondary">#Tags</Badge>
                                </div>
                            </>
                        )}
                         <Button variant="outline" className="w-full mt-4" onClick={() => toast({title: "Coming Soon", description: "Viewing full profiles will be available later."})}>View Full Profile</Button>
                    </div>
                </ScrollArea>
            </div>
      )}
      {!selectedConversation && isMessagesRightBarOpen && (
         <div className="h-full w-72 bg-card border-l border-border/40 flex flex-col items-center justify-center text-muted-foreground p-4 text-center overflow-hidden">
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
                    placeholder="Search channels or users..." 
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                    disabled // Re-disable until search is functional
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

