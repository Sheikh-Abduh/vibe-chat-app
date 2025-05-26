
"use client";

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Hash, Mic, Video, Users, Settings, UserCircle, MessageSquare, ChevronDown, Paperclip, Smile, Film, Send, Trash2, Pin, PinOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";


// Placeholder Data
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
  text?: string; // Optional for non-text messages
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'gif' | 'voice_message';
  fileUrl?: string;
  fileName?: string;
  gifUrl?: string; // For GIF messages
  isPinned?: boolean;
};

/**
 * =============================================================================
 * HOW TO IMPLEMENT CHAT FUNCTIONALITY (Detailed Guide)
 * =============================================================================
 *
 * This page currently simulates chat with client-side state. To make it fully functional,
 * integrate a backend (like Firebase Firestore) and implement several frontend features.
 *
 * 1. Backend Setup (Firebase Firestore - Partially Implemented Below for Text Messages):
 *    - Database Schema:
 *      - `/communities/{communityId}`: Stores community details.
 *      - `/communities/{communityId}/channels/{channelId}`: Stores channel details.
 *      - `/communities/{communityId}/members/{memberUserId}`: Stores member info.
 *      - `/communities/{communityId}/channels/{channelId}/messages/{messageId}`:
 *        Each message document includes:
 *          - `text`: string (for text messages)
 *          - `senderId`: string (Firebase User ID)
 *          - `senderName`: string
 *          - `senderAvatarUrl`: string | null
 *          - `timestamp`: Firebase Server Timestamp (for ordering)
 *          - `type`: 'text' | 'image' | 'file' | 'gif' | 'voice_message'
 *          - `fileUrl`: string (URL from Cloudinary/Storage for image, file, voice)
 *          - `fileName`: string (for file uploads)
 *          - `gifUrl`: string (URL from Tenor for GIFs)
 *          - `isPinned`: boolean (optional, for pinning messages)
 *          - Optional: `reactions`, `editedTimestamp`
 *    - Firestore Security Rules: Crucial for access control.
 *      - Users can only write messages to channels they are members of.
 *      - Reading messages restricted to members.
 *      - Community/channel management restricted.
 *      - Deleting messages restricted to the sender or moderators.
 *      - Updating `isPinned` might be restricted to moderators/admins or specific roles.
 *
 * 2. Real-time Message Listening (Frontend - Firebase SDK - Implemented Below for Text):
 *    - When a text channel is selected (`selectedChannel` changes):
 *      - If there's an existing listener, `unsubscribe()` from it.
 *      - Use Firestore's `onSnapshot` for the channel's `messages` subcollection.
 *      - Convert Firestore Timestamps to JS Date objects when setting state.
 *
 * 3. Sending Text Messages (Frontend - Implemented Below for Text):
 *    - In `handleSendMessage`:
 *      - If `newMessage.trim()` is empty, return.
 *      - If `!currentUser || !selectedCommunity || !selectedChannel`, return.
 *      - Create a message object with `serverTimestamp()`.
 *      - Add the document to the Firestore `messages` subcollection.
 *      - Clear `newMessage`.
 *      - Handle potential errors with try/catch and `toast`.
 *
 * 4. File/Image Upload (Frontend - Cloudinary):
 *    - When Paperclip icon is clicked, trigger `<input type="file" accept="image/*,application/pdf,...">`.
 *    - On file selection:
 *      - Upload to Cloudinary (reuse logic from avatar upload, but don't update user profile).
 *      - Get `secure_url` and `original_filename`.
 *      - Create a message object (type: 'image' or 'file', `fileUrl`, `fileName`).
 *      - Save to Firestore (similar to text messages).
 *    - Display: Render `<img>` for images, or a link/icon for files in `MessageItem`.
 *
 * 5. GIF Send (Frontend - Tenor API via Backend Proxy - Partially Implemented Below for UI):
 *    - **SECURITY WARNING: DO NOT EXPOSE YOUR TENOR API KEY (e.g., AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw) IN CLIENT-SIDE CODE.**
 *      Create a Firebase Cloud Function to act as a proxy. The frontend calls this function, which then calls the Tenor API with your secret key.
 *      The implementation below uses the API key directly for prototyping only and includes a strong warning.
 *    - When Film icon is clicked, open a GIF picker modal/popover.
 *    - Fetch trending GIFs or search (via your Cloud Function proxy in production, or directly for prototype).
 *    - On GIF selection, get its URL.
 *    - Create message object (type: 'gif', `gifUrl`).
 *    - Save to Firestore.
 *    - Display: Render `<img>` for the GIF in `MessageItem`.
 *
 * 6. Emoji Send (Frontend):
 *    - When Smile icon clicked, show an emoji picker (e.g., 'emoji-picker-react').
 *    - Append selected emoji (Unicode character) to the `newMessage` state.
 *
 * 7. Voice Message Send (Frontend - MediaRecorder API):
 *    - When Mic icon (chat input) clicked:
 *      - Request audio permission: `navigator.mediaDevices.getUserMedia({ audio: true })`.
 *      - Initialize `MediaRecorder`. Start recording. Store audio chunks.
 *      - Update UI (e.g., show stop button, timer).
 *    - On stop:
 *      - Create an audio `Blob` from chunks.
 *      - Upload Blob to Cloudinary (or other storage).
 *      - Get public URL.
 *      - Create message object (type: 'voice_message', `fileUrl`).
 *      - Save to Firestore.
 *    - Display: Render an HTML5 `<audio>` player in `MessageItem`.
 *
 * 8. Delete & Pin Message Features (Implemented Below for UI & Firestore interaction):
 *    - Delete: User can delete their own messages. Requires Firestore rule `allow delete: if request.auth.uid == resource.data.senderId;`.
 *    - Pin: Any user (or mods - rule dependent) can toggle `isPinned` on a message. Requires Firestore rule.
 *
 * 9. UI/UX Enhancements:
 *    - **Loading States:** For message sending, file uploads, GIF fetching.
 *    - **Error Handling:** Robust `toast` messages for all operations.
 *    - **MessageItem Component:** A dedicated component to render different message types and actions.
 *    - **Optimistic UI Updates (Advanced):** Add message to local state immediately for perceived speed, then confirm/update from backend.
 *    - **Typing Indicators, Read Receipts, Replies/Threads (Advanced):** Significant complexity.
 *
 * 10. Voice & Video Channels (Advanced - WebRTC):
 *    - Integrate a WebRTC service (Agora, Twilio Video) or a library with Firebase.
 *    - Manage connections, streams, participants, mute/unmute, camera on/off.
 *    - UI for video feeds, participant lists, voice activity.
 * =============================================================================
 */

// =============================================================================
// TENOR API KEY WARNING - FOR PROTOTYPING ONLY
// The API key AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw should NOT be used directly in client-side code
// in a production application. It must be proxied through a secure backend (e.g., Firebase Cloud Function)
// to protect it from abuse.
// =============================================================================
const TENOR_API_KEY = "AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw"; // <<< YOUR API KEY - PROTOTYPE ONLY
const TENOR_CLIENT_KEY = "vibe_app_prototype"; // Your client key for Tenor analytics


const TIMESTAMP_GROUPING_THRESHOLD_MS = 60 * 1000; // 1 minute

interface TenorGif {
  id: string;
  media_formats: {
    tinygif: { url: string; dims: number[] };
    gif: { url: string; dims: number[] };
  };
  content_description: string;
}

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

  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  // GIF Picker State
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const gifSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, showPinnedMessages]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (selectedChannel && selectedCommunity && currentUser && selectedChannel.type === 'text') {
      setMessages([]); 

      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            isPinned: data.isPinned || false,
          } as ChatMessage;
        });
        setMessages(fetchedMessages);
        if (chatInputRef.current && fetchedMessages.length > 0) { // Only focus if messages loaded
            chatInputRef.current?.focus();
        }
      }, (error) => {
        console.error("Error fetching messages: ", error);
        toast({
            variant: "destructive",
            title: "Error loading messages",
            description: "Could not load messages for this channel.",
        });
        setMessages([{
            id: 'system-error-' + selectedChannel.id,
            text: `Error loading messages for #${selectedChannel.name}. Please try again later.`,
            senderId: 'system',
            senderName: 'System',
            timestamp: new Date(),
            type: 'text',
        }]);
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
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowPinnedMessages(false); 
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
    };

    try {
      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      await addDoc(messagesRef, messageData);
      setNewMessage("");
    } catch (error) {
        console.error("Error sending message:", error);
        toast({
            variant: "destructive",
            title: "Message Not Sent",
            description: "Could not send your message. Please try again.",
        });
    }
  };

  const handleSendGif = async (gif: TenorGif) => {
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
      isPinned: false,
    };

    try {
      const messagesRef = collection(db, `communities/${selectedCommunity.id}/channels/${selectedChannel.id}/messages`);
      await addDoc(messagesRef, messageData);
      setShowGifPicker(false); // Close picker on send
      setGifSearchTerm(""); // Reset search
      setGifs([]); // Clear GIFs
    } catch (error) {
        console.error("Error sending GIF message:", error);
        toast({
            variant: "destructive",
            title: "GIF Not Sent",
            description: "Could not send your GIF. Please try again.",
        });
    }
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

  const shouldShowFullMessageHeader = (currentMessage: ChatMessage, previousMessage: ChatMessage | null) => {
    if (!previousMessage) return true;
    if (currentMessage.senderId !== previousMessage.senderId) return true;
    if (currentMessage.timestamp.getTime() - previousMessage.timestamp.getTime() > TIMESTAMP_GROUPING_THRESHOLD_MS) return true;
    return false;
  };

  const fetchTrendingGifs = async () => {
    if (!TENOR_API_KEY.startsWith("AIza")) {
        toast({ variant: "destructive", title: "Tenor API Key Missing", description: "A valid Tenor API key is required for GIFs."});
        return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch trending GIFs');
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error fetching trending GIFs:", error);
      toast({ variant: "destructive", title: "Error Fetching GIFs", description: "Could not load trending GIFs." });
    } finally {
      setLoadingGifs(false);
    }
  };

  const searchTenorGifs = async (term: string) => {
    if (!term.trim()) {
      fetchTrendingGifs(); // Fetch trending if search term is cleared
      return;
    }
    if (!TENOR_API_KEY.startsWith("AIza")) {
      toast({ variant: "destructive", title: "Tenor API Key Missing", description: "A valid Tenor API key is required for GIFs."});
      return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(term)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch GIFs');
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("Error searching GIFs:", error);
      toast({ variant: "destructive", title: "Error Fetching GIFs", description: "Could not load GIFs for your search." });
    } finally {
      setLoadingGifs(false);
    }
  };

  useEffect(() => {
    if (showGifPicker && gifs.length === 0 && !gifSearchTerm) {
      fetchTrendingGifs();
    }
  }, [showGifPicker, gifs.length, gifSearchTerm]);

  const handleGifSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setGifSearchTerm(term);
    if (gifSearchTimeoutRef.current) {
      clearTimeout(gifSearchTimeoutRef.current);
    }
    gifSearchTimeoutRef.current = setTimeout(() => {
      searchTenorGifs(term);
    }, 500); // Debounce search by 500ms
  };

  const currentChannels = selectedCommunity ? placeholderChannels[selectedCommunity.id] || [] : [];
  const currentMembers = selectedCommunity ? placeholderMembers[selectedCommunity.id] || [] : [];

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const userAvatar = currentUser?.photoURL;

  const displayedMessages = showPinnedMessages 
    ? messages.filter(msg => msg.isPinned).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    : messages;

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
            <ScrollArea className="h-full">
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
              <div className="flex items-center space-x-2">
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
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Users className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 bg-card/30">
              <div className="p-4 space-y-0.5">
                {displayedMessages.length === 0 && selectedChannel.type === 'text' && (
                  <div className="text-center text-muted-foreground py-4">
                    {showPinnedMessages ? "No pinned messages in this channel." : 
                     (messages.length === 0 && !currentUser ? "Loading messages..." : "No messages yet. Be the first to say something!")}
                  </div>
                )}
                {displayedMessages.map((msg, index) => {
                  const previousMessage = index > 0 ? displayedMessages[index - 1] : null;
                  const showHeader = shouldShowFullMessageHeader(msg, previousMessage);

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-start space-x-3 group relative hover:bg-muted/30 px-2 rounded-md",
                        showHeader ? "pt-3 pb-0.5" : "py-0.5"
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
                      <div className="flex-1">
                        {showHeader && (
                          <div className="flex items-baseline space-x-1.5">
                            <p className="font-semibold text-sm text-foreground">
                              {msg.senderName}
                            </p>
                            <div className="flex items-baseline text-xs text-muted-foreground">
                                <p>
                                {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp, { addSuffix: true }) : 'Sending...'}
                                </p>
                                {msg.timestamp && (
                                <p className="ml-1.5">
                                    ({format(msg.timestamp, 'p')})
                                </p>
                                )}
                            </div>
                            {msg.isPinned && <Pin className="h-3 w-3 text-amber-400 ml-1" title="Pinned Message"/>}
                          </div>
                        )}
                        {msg.type === 'text' && msg.text && (
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                        {msg.type === 'gif' && msg.gifUrl && (
                            <Image 
                                src={msg.gifUrl} 
                                alt="GIF" 
                                width={0} // Will be overridden by style or intrinsic size
                                height={0}
                                style={{ width: 'auto', height: 'auto', maxWidth: '300px', maxHeight: '200px', borderRadius: '0.375rem', marginTop: '0.25rem' }}
                                unoptimized // GIF optimization can be tricky with next/image
                                priority={false}
                                data-ai-hint="animated gif"
                            />
                        )}
                        {/* Add rendering for other message types (image, file, voice_message) here */}
                      </div>
                      <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border/40 shrink-0">
                  <div className="flex items-center p-1.5 rounded-lg bg-muted space-x-1.5">
                      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Attach File/Image" onClick={() => toast({title: "Feature Coming Soon", description: "File/Image upload will be implemented."})}>
                          <Paperclip className="h-5 w-5" />
                      </Button>
                      <Input
                          ref={chatInputRef}
                          type="text"
                          placeholder={`Message #${selectedChannel.name}`}
                          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70 text-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              handleSendMessage(e);
                            }
                          }}
                          disabled={!currentUser || selectedChannel.type !== 'text'}
                      />
                      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Send Voice Message" onClick={() => toast({title: "Feature Coming Soon", description: "Voice messages will be implemented."})}>
                          <Mic className="h-5 w-5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Open Emoji Picker" onClick={() => toast({title: "Feature Coming Soon", description: "Emoji picker will be implemented."})}>
                          <Smile className="h-5 w-5" />
                      </Button>
                      
                      <Dialog open={showGifPicker} onOpenChange={setShowGifPicker}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Send GIF (Tenor)">
                              <Film className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] h-[70vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Send a GIF</DialogTitle>
                                <DialogDescription>
                                    Search for GIFs from Tenor.
                                    <span className="block text-xs text-destructive/80 mt-1">
                                        SECURITY WARNING: For production, the Tenor API key must be proxied via a backend.
                                    </span>
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                type="text"
                                placeholder="Search Tenor GIFs..."
                                value={gifSearchTerm}
                                onChange={handleGifSearchChange}
                                className="my-2"
                            />
                            <ScrollArea className="flex-1">
                                {loadingGifs ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : gifs.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
                                    {gifs.map((gif) => (
                                        <button
                                        key={gif.id}
                                        onClick={() => handleSendGif(gif)}
                                        className="aspect-square relative overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary ring-offset-2 ring-offset-background group"
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
                                    ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">
                                        {gifSearchTerm ? "No GIFs found for your search." : "No trending GIFs found."}
                                    </p>
                                )}
                            </ScrollArea>
                            <DialogFooter className="mt-2">
                                <p className="text-xs text-muted-foreground">Powered by Tenor</p>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>

                       <Button type="submit" variant="ghost" size="icon" className="text-primary hover:text-primary/80 shrink-0" title="Send Message" disabled={!newMessage.trim() || !currentUser || selectedChannel.type !== 'text'}>
                          <Send className="h-5 w-5" />
                      </Button>
                  </div>
              </form>
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
      <div className="h-full w-72 bg-card border-l border-border/40 hidden lg:flex flex-col overflow-hidden">
        {selectedCommunity ? (
          <>
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

            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 pt-2">
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

             <div className="p-3 border-t border-border/40 mt-auto shrink-0">
                <Button variant="outline" className="w-full text-muted-foreground" onClick={() => toast({title: "Feature Coming Soon", description: "Community settings will be implemented."})}>
                    <Settings className="mr-2 h-4 w-4" /> Community Settings
                </Button>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground flex-1 flex items-center justify-center">No community selected.</div>
        )}
      </div>

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
    </div>
  );
}

    