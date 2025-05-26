
"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Hash, Mic, Video, Users, Settings, UserCircle, MessageSquare, ChevronDown, Paperclip, Smile, Film, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  '1': [ // Gamers Unite
    { id: 'c1-1', name: 'general-chat', type: 'text', icon: Hash },
    { id: 'c1-2', name: 'announcements', type: 'text', icon: ShieldCheck },
    { id: 'c1-3', name: 'squad-voice', type: 'voice', icon: Mic },
    { id: 'c1-4', name: 'game-night-stream', type: 'video', icon: Video },
  ],
  '2': [ // Bookworms Corner
    { id: 'c2-1', name: 'book-discussions', type: 'text', icon: Hash },
    { id: 'c2-2', name: 'reading-club-voice', type: 'voice', icon: Mic },
  ],
  '3': [ // Art Collective
    { id: 'c3-1', name: 'showcase', type: 'text', icon: Hash },
    { id: 'c3-2', name: 'critique-corner', type: 'text', icon: Hash },
    { id: 'c3-3', name: 'live-drawing-video', type: 'video', icon: Video },
  ],
  '4': [ // Tech Hub
    { id: 'c4-1', name: 'dev-talk', type: 'text', icon: Hash },
    { id: 'c4-2', name: 'code-help', type: 'text', icon: Hash },
    { id: 'c4-3', name: 'tech-news-voice', type: 'voice', icon: Mic },
  ],
  '5': [ // Musicians' Hangout
    { id: 'c5-1', name: 'general-jam', type: 'text', icon: Hash },
    { id: 'c5-2', name: 'gear-talk', type: 'text', icon: Hash },
    { id: 'c5-3', name: 'collab-voice', type: 'voice', icon: Mic },
    { id: 'c5-4', name: 'live-performance', type: 'video', icon: Video },
  ],
  '6': [ // Coders' Corner
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
  text: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'gif' | 'voice_message';
  fileUrl?: string;
  fileName?: string;
  gifUrl?: string;
};


/**
 * =============================================================================
 * HOW TO IMPLEMENT CHAT FUNCTIONALITY (Detailed Guide)
 * =============================================================================
 *
 * This page currently simulates chat with client-side state. To make it fully functional,
 * integrate a backend (like Firebase Firestore) and implement several frontend features.
 *
 * 1. Backend Setup (e.g., Firebase Firestore):
 *    - Database Schema:
 *      - `/communities/{communityId}`: Stores community details.
 *      - `/communities/{communityId}/channels/{channelId}`: Stores channel details.
 *      - `/communities/{communityId}/members/{memberUserId}`: Stores member info.
 *      - `/communities/{communityId}/channels/{channelId}/messages/{messageId}`:
 *        Each message document should include:
 *          - `text`: string (for text messages)
 *          - `senderId`: string (Firebase User ID)
 *          - `senderName`: string
 *          - `senderAvatarUrl`: string | null
 *          - `timestamp`: Firebase Server Timestamp (for ordering)
 *          - `type`: 'text' | 'image' | 'file' | 'gif' | 'voice_message'
 *          - `fileUrl`: string (URL from Cloudinary/Storage for image, file, voice)
 *          - `fileName`: string (for file uploads)
 *          - `gifUrl`: string (URL from Tenor for GIFs)
 *          - Optional: `reactions`, `editedTimestamp`, `isPinned`
 *    - Firestore Security Rules: Crucial for access control.
 *      - Users can only write messages to channels they are members of.
 *      - Reading messages restricted to members.
 *      - Community/channel management restricted.
 *
 * 2. Real-time Message Listening (Frontend - Firebase SDK):
 *    - When a text channel is selected (`selectedChannel` changes):
 *      - If there's an existing listener, `unsubscribe()` from it.
 *      - Use Firestore's `onSnapshot` for the channel's `messages` subcollection.
 *        `import { collection, query, orderBy, onSnapshot, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';`
 *        `import { db } from '@/lib/firebase'; // Assuming db is exported from your firebase config`
 *        `const messagesRef = collection(db, \`communities/\${selectedCommunity.id}/channels/\${selectedChannel.id}/messages\`);`
 *        `const q = query(messagesRef, orderBy('timestamp', 'asc'));`
 *        `const unsubscribe = onSnapshot(q, (querySnapshot) => {`
 *          `const fetchedMessages = querySnapshot.docs.map(doc => {`
 *            `const data = doc.data();`
 *            `return { id: doc.id, ...data, timestamp: (data.timestamp as Timestamp)?.toDate() || new Date() } as ChatMessage;`
 *          `});`
 *          `setMessages(fetchedMessages);`
 *        `});`
 *      - Store the `unsubscribe` function to call on component unmount or channel change.
 *      - Convert Firestore Timestamps to JS Date objects when setting state.
 *
 * 3. Sending Text Messages (Frontend):
 *    - In `handleSendMessage`:
 *      - If `newMessage.trim()` is empty, return.
 *      - If `!currentUser || !selectedCommunity || !selectedChannel`, return.
 *      - Create a message object:
 *        `const messageData = {`
 *          `text: newMessage.trim(),`
 *          `senderId: currentUser.uid,`
 *          `senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",`
 *          `senderAvatarUrl: currentUser.photoURL || null,`
 *          `timestamp: serverTimestamp(), // Use Firebase server timestamp`
 *          `type: 'text' as const,`
 *        `};`
 *      - Get the Firestore collection reference:
 *        `const messagesRef = collection(db, \`communities/\${selectedCommunity.id}/channels/\${selectedChannel.id}/messages\`);`
 *      - Add the document: `await addDoc(messagesRef, messageData);`
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
 * 5. GIF Send (Frontend - Tenor API via Backend Proxy):
 *    - **Security Warning:** Do NOT expose your Tenor API key (AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw) in client-side code.
 *      Create a Firebase Cloud Function to act as a proxy. The frontend calls this function, which then calls the Tenor API.
 *    - When Film icon is clicked, open a GIF picker modal/popover.
 *    - Fetch trending GIFs or search (via your Cloud Function proxy).
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
 * 8. UI/UX Enhancements:
 *    - **Loading States:** For message sending, file uploads.
 *    - **Error Handling:** Robust `toast` messages for all operations.
 *    - **Timestamps:** Format nicely (e.g., `formatDistanceToNowStrict` from `date-fns`).
 *    - **MessageItem Component:** Create a dedicated component to render different message types.
 *    - **Optimistic UI Updates (Advanced):** Add message to local state immediately for perceived speed, then confirm/update from backend.
 *    - **Typing Indicators, Read Receipts, Replies/Threads (Advanced):** Significant complexity.
 *
 * 9. Voice & Video Channels (Advanced - WebRTC):
 *    - Integrate a WebRTC service (Agora, Twilio Video) or a library with Firebase.
 *    - Manage connections, streams, participants, mute/unmute, camera on/off.
 *    - UI for video feeds, participant lists, voice activity.
 * =============================================================================
 */

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Effect for handling channel selection and fetching/simulating messages
  useEffect(() => {
    if (selectedChannel && selectedCommunity && currentUser) {
      setMessages([]); // Clear messages when channel changes

      // TODO: Replace with actual Firestore listener
      // Simulating initial messages for the selected channel
      const initialMessages: ChatMessage[] = [
        {
          id: 'msg1-' + selectedChannel.id,
          text: `Welcome to #${selectedChannel.name} in ${selectedCommunity.name}! This is a placeholder message.`,
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          type: 'text',
        },
        {
          id: 'msg2-' + selectedChannel.id,
          text: 'Feel free to start chatting.',
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 minutes ago
          type: 'text',
        },
      ];
      if (selectedChannel.type === 'text') {
        setMessages(initialMessages);
      } else {
         setMessages([{
          id: 'voice-video-placeholder-' + selectedChannel.id,
          text: `This is a ${selectedChannel.type} channel. Chat functionality is for text channels.`,
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date(),
          type: 'text',
        }]);
      }
      // Focus chat input when channel changes to a text channel
      if (selectedChannel.type === 'text') {
        chatInputRef.current?.focus();
      }
    } else {
      setMessages([]); // Clear messages if no channel or community selected
    }
    // This is where you would set up your Firestore onSnapshot listener
    // and return the unsubscribe function.
    // Example:
    // const unsubscribe = listenToMessages(selectedCommunity?.id, selectedChannel?.id, setMessages);
    // return () => unsubscribe?.();
  }, [selectedChannel, selectedCommunity, currentUser]);


  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    const firstChannel = placeholderChannels[community.id]?.[0] || null;
    setSelectedChannel(firstChannel);
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const handleSendMessage = (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }

    if (newMessage.trim() === "" || !currentUser || !selectedChannel || selectedChannel.type !== 'text') {
      return;
    }

    const messageToSend: ChatMessage = {
      id: Date.now().toString(), // Temporary ID, replace with Firestore ID
      text: newMessage.trim(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      senderAvatarUrl: currentUser.photoURL,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prevMessages => [...prevMessages, messageToSend]);
    setNewMessage("");

    // TODO: Replace with addDoc to Firestore
    console.log("Sending message to backend:", messageToSend);
  };

  const handleCommunityProfileEdit = () => {
    toast({
      title: "Coming Soon!",
      description: "Editing your community-specific profile is a future feature.",
    });
  };

  const currentChannels = selectedCommunity ? placeholderChannels[selectedCommunity.id] || [] : [];
  const currentMembers = selectedCommunity ? placeholderMembers[selectedCommunity.id] || [] : [];

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const userAvatar = currentUser?.photoURL;

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
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {currentChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant="ghost"
                    onClick={() => handleSelectChannel(channel)}
                    className={cn(
                      "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted",
                      selectedChannel?.id === channel.id && 'bg-accent text-accent-foreground' // Updated for better contrast
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
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Users className="h-5 w-5" />
              </Button>
            </div>

            {/* Message display area */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start space-x-3",
                      msg.senderId === currentUser?.uid && "justify-end"
                    )}
                  >
                    {msg.senderId !== currentUser?.uid && (
                       <Avatar className="mt-1">
                        <AvatarImage src={msg.senderAvatarUrl || "https://placehold.co/40x40.png?text=U"} data-ai-hint="person default" />
                        <AvatarFallback>{msg.senderName.substring(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                        "max-w-xs lg:max-w-md p-2.5 rounded-lg shadow",
                        msg.senderId === currentUser?.uid 
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-card text-card-foreground rounded-bl-none"
                      )}
                    >
                      {msg.senderId !== currentUser?.uid && (
                        <p className="font-semibold text-xs mb-0.5 text-accent">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className={cn(
                          "text-xs mt-1",
                          msg.senderId === currentUser?.uid ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
                        )}
                      >
                        {formatDistanceToNowStrict(msg.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                     {msg.senderId === currentUser?.uid && (
                       <Avatar className="mt-1">
                        <AvatarImage src={msg.senderAvatarUrl || undefined} data-ai-hint="person happy" />
                        <AvatarFallback>{msg.senderName.substring(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat input area */}
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
                      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Send GIF (Tenor)" onClick={() => toast({title: "Feature Coming Soon", description: "GIF sending will be implemented."})}>
                          <Film className="h-5 w-5" />
                      </Button>
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
            <div className="p-4 space-y-3 shrink-0">
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
            <Separator className="my-2 bg-border/40 shrink-0" />
            
            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 pt-0">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide sticky top-0 bg-card py-1 z-10">Members ({currentMembers.length})</h4>
                <div className="space-y-2">
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
    </div>
  );
}

    