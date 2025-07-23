
"use client";

import React, { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, Timestamp, updateDoc, runTransaction, doc } from 'firebase/firestore';
import type { ChatMessage, TenorGif } from '@/types/app';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';
import type { Member } from '@/app/(app)/communities/page';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paperclip, Smile, Film, Send, Loader2, StopCircle, Mic, AlertTriangle, X, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
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
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
  'text/plain',
  'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac',
];
const TENOR_API_KEY = "AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw";


interface ChatInputProps {
    currentUser: User | null;
    selectedChannel: { id: string; name: string; type: string };
    selectedCommunity: { id: string };
    communityMembers: Member[];
    currentThemeMode: 'light' | 'dark';
    hasMicPermission: boolean | null;
    requestMicPermission: () => Promise<boolean>;
}

export default function ChatInput({
    currentUser,
    selectedChannel,
    selectedCommunity,
    communityMembers,
    currentThemeMode,
    hasMicPermission,
    requestMicPermission
}: ChatInputProps) {
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState("");
    const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const mentionSuggestionsRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [chatEmojiPickerOpen, setChatEmojiPickerOpen] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifSearchTerm, setGifSearchTerm] = useState("");
    const [gifs, setGifs] = useState<TenorGif[]>([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    const gifSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [gifPickerView, setGifPickerView] = useState<'search' | 'favorites'>('search');
    const [favoritedGifs, setFavoritedGifs] = useState<TenorGif[]>([]);

    useEffect(() => {
        if(currentUser) {
            const storedFavorites = localStorage.getItem(`favorited_gifs_${currentUser.uid}`);
            setFavoritedGifs(storedFavorites ? JSON.parse(storedFavorites) : []);
        }
    }, [currentUser]);


    const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
        if (e && 'preventDefault' in e) {
          e.preventDefault();
        }
    
        if (newMessage.trim() === "" || !currentUser || !selectedCommunity || !selectedChannel || selectedChannel.type !== 'text') {
          return;
        }
    
        const messageText = newMessage.trim();
        const mentionRegex = /@([\w.-]+)/g;
        let match;
        const mentionedUserDisplayNames: string[] = [];
        while ((match = mentionRegex.exec(messageText)) !== null) {
          mentionedUserDisplayNames.push(match[1]);
        }
        const resolvedMentionedUserIds = communityMembers
            .filter(member => mentionedUserDisplayNames.includes(member.name))
            .map(member => member.id);
    
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
    
    
      const handleSendGif = async (gif: TenorGif) => {
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

    const fetchTrendingGifs = async () => {
        if (!TENOR_API_KEY) {
            toast({ variant: "destructive", title: "Tenor API Key Missing", description: "A Tenor API key is required for GIFs."});
            setLoadingGifs(false);
            return;
        }
        setLoadingGifs(true);
        try {
          const response = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif`);
          if (!response.ok) {
            let errorBodyText = await response.text();
            try {
                const errorJson = JSON.parse(errorBodyText);
                errorBodyText = errorJson.error?.message || errorBodyText;
                console.error("Tenor API Error (Trending):", response.status, errorJson);
            } catch (e) {
                console.error("Tenor API Error (Trending):", response.status, `Failed to parse error body as JSON: ${errorBodyText}`, e);
            }
            throw new Error(`Failed to fetch trending GIFs. Status: ${response.status}. Body: ${errorBodyText}`);
          }
          const data = await response.json();
          setGifs(data.results || []);
        } catch (error) {
          console.error("Error fetching trending GIFs:", error);
          toast({ variant: "destructive", title: "Error Fetching GIFs", description: (error as Error).message || "Could not load trending GIFs." });
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
          const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif`);
          if (!response.ok) {
            let errorBodyText = await response.text();
            try {
                const errorJson = JSON.parse(errorBodyText);
                errorBodyText = errorJson.error?.message || errorBodyText;
                console.error("Tenor API Error (Search):", response.status, errorJson);
            } catch (e) {
                console.error("Tenor API Error (Search):", response.status, `Failed to parse error body as JSON: ${errorBodyText}`, e);
            }
            throw new Error(`Failed to fetch GIFs. Status: ${response.status}. Body: ${errorBodyText}`);
          }
          const data = await response.json();
          setGifs(data.results || []);
        } catch (error) {
          console.error("Error searching GIFs:", error);
          toast({ variant: "destructive", title: "Error Fetching GIFs", description: (error as Error).message || "Could not load GIFs for your search." });
          setGifs([]);
        } finally {
          setLoadingGifs(false);
        }
      };

      const getFavoriteStorageKey = () => {
        if (!currentUser) return null;
        return `favorited_gifs_${currentUser.uid}`;
      }
    
      const handleToggleFavoriteGif = (gif: TenorGif) => {
        if (!currentUser) return;
        const key = getFavoriteStorageKey();
        if (!key) return;
    
        let updatedFavorites;
        if (favoritedGifs.some(fav => fav.id === gif.id)) { 
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

      const handleMentionInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);
        const mentionMatch = value.match(/@(\S*)$/);
        if (mentionMatch && selectedChannel?.type === 'text') {
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
                    {communityMembers.filter(member => 
                        member.name.toLowerCase().startsWith(newMessage.substring(newMessage.lastIndexOf('@') + 1).toLowerCase()) &&
                        member.id !== currentUser?.uid 
                    ).length > 0 ? (
                        communityMembers
                            .filter(member => 
                                member.name.toLowerCase().startsWith(newMessage.substring(newMessage.lastIndexOf('@') + 1).toLowerCase()) &&
                                member.id !== currentUser?.uid
                            )
                            .slice(0, 5) // Limit suggestions
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
                        <p className="p-2 text-xs text-muted-foreground">No matching members found.</p>
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
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="search" onValueChange={(value) => setGifPickerView(value as 'search' | 'favorites')} className="mt-2 flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2 shrink-0">
                        <TabsTrigger value="search">Search/Trending</TabsTrigger>
                        <TabsTrigger value="favorites">Favorites</TabsTrigger>
                    </TabsList>
                    <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden min-h-0 mt-2">
                        <Input
                            type="text"
                            placeholder="Search Tenor GIFs..."
                            value={gifSearchTerm}
                            onChange={handleGifSearchChange}
                            className="my-2 shrink-0"
                        />
                        <ScrollArea className="flex-1 min-h-0">
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
                                                className="object-contain transition-transform group-hover:scale-105"
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
                    <TabsContent value="favorites" className="flex-1 flex flex-col overflow-hidden min-h-0 mt-2">
                        <ScrollArea className="flex-1 min-h-0">
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
                                            className="object-contain transition-transform group-hover:scale-105"
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
                <DialogFooter className="mt-auto pt-2 shrink-0">
                    <p className="text-xs text-muted-foreground">Powered by Tenor</p>
                </DialogFooter>
            </DialogContent>
            </Dialog>

            <Button type="submit" variant="ghost" size="icon" className="text-primary hover:text-primary/80 shrink-0 h-8 w-8 sm:h-9 sm:w-9" title="Send Message" disabled={!newMessage.trim() || !currentUser || selectedChannel.type !== 'text' || isRecording || isUploadingFile}>
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
        </form>
      </div>
    )
}
