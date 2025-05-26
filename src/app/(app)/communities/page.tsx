
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Hash, Mic, Video, Users, Settings, UserCircle, MessageSquare, ChevronDown, Paperclip, Smile, Film } from 'lucide-react';
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


export default function CommunitiesPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(placeholderCommunities[0]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    selectedCommunity ? placeholderChannels[selectedCommunity.id]?.[0] || null : null
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    setSelectedChannel(placeholderChannels[community.id]?.[0] || null);
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
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
      <ScrollArea className="h-full w-20 bg-muted/20 border-r border-border/30">
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

      {/* Column 2: Channel List */}
      <div className="h-full w-64 bg-card flex flex-col border-r border-border/40">
        {selectedCommunity ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm">
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
                      selectedChannel?.id === channel.id && 'bg-accent/20 text-accent-foreground'
                    )}
                  >
                    <channel.icon className="mr-2 h-4 w-4" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border/40">
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
      <div className="h-full flex-1 bg-background flex flex-col">
        {selectedCommunity && selectedChannel ? (
          <>
            <div className="p-3 border-b border-border/40 shadow-sm flex items-center justify-between">
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
                {/* Example messages */}
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png?text=U1" data-ai-hint="person thinking" />
                    <AvatarFallback>U1</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      UserOne <span className="text-xs text-muted-foreground ml-1">10:00 AM</span>
                    </p>
                    <p className="text-sm text-foreground">Welcome to {selectedChannel.name} in {selectedCommunity.name}! This is a placeholder message.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                   <Avatar>
                    <AvatarImage src={userAvatar || "https://placehold.co/40x40.png?text=Me"} data-ai-hint="person happy" />
                    <AvatarFallback>{userName.substring(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm text-primary">
                      {userName} <span className="text-xs text-muted-foreground ml-1">10:01 AM</span>
                    </p>
                    <p className="text-sm text-foreground">Hi there! Chat functionality is currently a placeholder.</p>
                  </div>
                </div>
                {selectedChannel.type === 'voice' && <p className="text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md text-center">Voice chat UI placeholder. Controls and participant list would go here.</p>}
                {selectedChannel.type === 'video' && <p className="text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md text-center">Video chat UI placeholder. Video feeds and controls would go here.</p>}
              </div>
            </ScrollArea>

            {/* Chat input area */}
            <div className="p-3 border-t border-border/40">
                <div className="flex items-center p-1.5 rounded-lg bg-muted space-x-1.5">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Attach File/Image" disabled>
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <Input 
                        type="text" 
                        placeholder={`Message #${selectedChannel.name}`} 
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70 text-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2"
                        disabled // Enable when chat is functional
                    />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Send Voice Message" disabled>
                        <Mic className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Open Emoji Picker" disabled>
                        <Smile className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Send GIF (Tenor)" disabled>
                        {/* Using Film as a generic media icon for GIF */}
                        <Film className="h-5 w-5" /> 
                    </Button>
                     {/* 
                        Tenor API Key Note: For actual GIF functionality, you would integrate the Tenor API.
                        The API key should be handled securely, preferably via a backend proxy,
                        not directly exposed in client-side code for production.
                        The provided key AIzaSyBuP5qDIEskM04JSKNyrdWKMVj5IXvLLtw seems like a Google API key, not a Tenor key.
                        Ensure you use a valid Tenor API key if implementing this feature.
                     */}
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-lg p-4">
            {selectedCommunity ? "Select a channel to start." : "Select a community to see its channels."}
          </div>
        )}
      </div>

      {/* Column 4: Right-Hand Info Bar (Restructured for scrollable members) */}
      <div className="h-full w-72 bg-card border-l border-border/40 hidden lg:flex flex-col">
        {selectedCommunity ? (
          <>
            {/* Fixed content: Banner */}
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
            {/* Fixed content: Community Details */}
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
            
            {/* Scrollable content: Members List */}
            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 pt-0">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide sticky top-0 bg-card py-1">Members ({currentMembers.length})</h4>
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

            {/* Fixed content: Settings Button */}
             <div className="p-3 border-t border-border/40 mt-auto shrink-0">
                <Button variant="outline" className="w-full text-muted-foreground">
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
