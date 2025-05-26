
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Hash, Mic, Video, Users, Settings, ChevronDown, UserCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

// Placeholder Data
const placeholderCommunities = [
  { id: '1', name: 'Gamers Unite', iconUrl: 'https://placehold.co/64x64.png?text=GU', dataAiHint: 'controller abstract', description: 'A community for all things gaming, from retro to modern.', bannerUrl: 'https://placehold.co/600x200.png?text=Gaming+Banner', dataAiHintBanner: 'gaming landscape' },
  { id: '2', name: 'Bookworms Corner', iconUrl: 'https://placehold.co/64x64.png?text=BC', dataAiHint: 'book open', description: 'Discuss your favorite books, authors, and genres.', bannerUrl: 'https://placehold.co/600x200.png?text=Books+Banner', dataAiHintBanner: 'library shelf' },
  { id: '3', name: 'Art Collective', iconUrl: 'https://placehold.co/64x64.png?text=AC', dataAiHint: 'palette brush', description: 'Share your art, get feedback, and collaborate.', bannerUrl: 'https://placehold.co/600x200.png?text=Art+Banner', dataAiHintBanner: 'abstract paint' },
  { id: '4', name: 'Tech Hub', iconUrl: 'https://placehold.co/64x64.png?text=TH', dataAiHint: 'circuit board', description: 'For developers, enthusiasts, and tech news.', bannerUrl: 'https://placehold.co/600x200.png?text=Tech+Banner', dataAiHintBanner: 'futuristic city' },
];

const placeholderChannels = {
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
};

const placeholderMembers = {
  '1': [{ id: 'm1', name: 'PlayerOne', avatarUrl: 'https://placehold.co/40x40.png?text=P1', dataAiHint: 'person cool' }, { id: 'm2', name: 'GamerGirl', avatarUrl: 'https://placehold.co/40x40.png?text=GG', dataAiHint: 'woman gaming' }],
  '2': [{ id: 'm3', name: 'ReaderRiley', avatarUrl: 'https://placehold.co/40x40.png?text=RR', dataAiHint: 'person books' }],
  '3': [{ id: 'm4', name: 'ArtfulAlex', avatarUrl: 'https://placehold.co/40x40.png?text=AA', dataAiHint: 'artist painting' }, { id: 'm5', name: 'CreativeCasey', avatarUrl: 'https://placehold.co/40x40.png?text=CC', dataAiHint: 'designer thinking' }],
  '4': [{ id: 'm6', name: 'CodeWizard', avatarUrl: 'https://placehold.co/40x40.png?text=CW', dataAiHint: 'man code' }],
};

type Community = typeof placeholderCommunities[0];
type Channel = { id: string; name: string; type: 'text' | 'voice' | 'video'; icon: React.ElementType };
type Member = typeof placeholderMembers['1'][0];


export default function CommunitiesPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(placeholderCommunities[0]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    selectedCommunity ? placeholderChannels[selectedCommunity.id]?.[0] || null : null
  );

  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    setSelectedChannel(placeholderChannels[community.id]?.[0] || null);
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const currentChannels = selectedCommunity ? placeholderChannels[selectedCommunity.id] || [] : [];
  const currentMembers = selectedCommunity ? placeholderMembers[selectedCommunity.id] || [] : [];

  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem))] overflow-hidden"> {/* Adjust for header height */}
      {/* Column 1: Community Server List */}
      <ScrollArea className="h-full w-20 bg-muted/20 p-2 border-r border-border/30">
        <div className="space-y-3">
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
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-1">
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
            {/* Placeholder for user panel at bottom of channel list */}
            <div className="p-2 border-t border-border/40">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground">
                <UserCircle className="mr-1.5 h-4 w-4" /> My User (Placeholder)
              </Button>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">Select a community</div>
        )}
      </div>

      {/* Column 3: Main Content Area */}
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
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Placeholder chat messages or content */}
              <p className="text-muted-foreground">Welcome to {selectedChannel.name} in {selectedCommunity.name}!</p>
              <p className="text-muted-foreground mt-2">Chat functionality is a future enhancement.</p>
              {selectedChannel.type === 'voice' && <p className="text-muted-foreground mt-2">Voice chat UI would go here.</p>}
              {selectedChannel.type === 'video' && <p className="text-muted-foreground mt-2">Video chat UI would go here.</p>}
            </div>
            {/* Placeholder message input */}
            <div className="p-3 border-t border-border/40">
                <div className="flex items-center p-2 rounded-lg bg-muted">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/70 mr-2"/>
                    <input 
                        type="text" 
                        placeholder={`Message #${selectedChannel.name}`} 
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70 text-foreground"
                        disabled
                    />
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-lg">
            {selectedCommunity ? "Select a channel to start." : "Select a community to see its channels."}
          </div>
        )}
      </div>

      {/* Column 4: Right-Hand Info Bar */}
      <ScrollArea className="h-full w-72 bg-card border-l border-border/40 hidden lg:block">
        {selectedCommunity ? (
          <div className="flex flex-col h-full">
            <div className="relative h-32 w-full">
               <Image 
                src={selectedCommunity.bannerUrl} 
                alt={`${selectedCommunity.name} banner`} 
                layout="fill" 
                objectFit="cover" 
                className="rounded-t-lg" 
                data-ai-hint={selectedCommunity.dataAiHintBanner}
              />
            </div>
            <div className="p-4 space-y-3">
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
            </div>
            <Separator className="my-2 bg-border/40" />
            <div className="p-4 flex-1">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Members ({currentMembers.length})</h4>
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
             <div className="p-3 border-t border-border/40">
                <Button variant="outline" className="w-full text-muted-foreground">
                    <Settings className="mr-2 h-4 w-4" /> Community Settings
                </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">No community selected.</div>
        )}
      </ScrollArea>
    </div>
  );
}
