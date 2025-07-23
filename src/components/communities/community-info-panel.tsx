
"use client";

import React from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { X, Settings, Loader2 } from 'lucide-react';
import type { Member } from '@/app/(app)/communities/page';

interface CommunityInfoPanelProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    selectedCommunity: {
        id: string;
        name: string;
        description: string;
        tags: string[];
        dataAiHintBanner?: string;
        dataAiHint?: string;
        iconUrl?: string;
        bannerUrl?: string;
    } | null;
    dynamicVibeCommunityBanner: string;
    dynamicVibeCommunityIcon: string;
    isLoadingMembers: boolean;
    communityMembers: Member[];
    onCommunitySettingsClick: () => void;
}

export default function CommunityInfoPanel({
    isOpen,
    setIsOpen,
    selectedCommunity,
    dynamicVibeCommunityBanner,
    dynamicVibeCommunityIcon,
    isLoadingMembers,
    communityMembers,
    onCommunitySettingsClick
}: CommunityInfoPanelProps) {
    if (!isOpen) {
        return null;
    }
    
    if (!selectedCommunity) {
        return (
            <div className="h-full w-64 sm:w-72 bg-card border-l border-border/40 flex flex-col items-center justify-center text-muted-foreground p-4 text-center overflow-hidden">
                No community selected.
            </div>
        )
    }

    return (
        <div className="h-full w-64 sm:w-72 bg-card border-l border-border/40 flex flex-col overflow-hidden relative"> 
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-20 h-8 w-8"
              onClick={() => setIsOpen(false)}
              title="Close Server Info"
              aria-label="Close server info panel"
            >
              <X className="h-5 w-5"/>
            </Button>
            <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col h-full">
                    <div className="relative h-24 sm:h-32 w-full shrink-0">
                    <Image
                        src={selectedCommunity.id === 'vibe-community-main' ? dynamicVibeCommunityBanner : (selectedCommunity.bannerUrl || '/bannerd.png')}
                        alt={`${selectedCommunity.name} banner`}
                        fill
                        className="object-cover"
                        data-ai-hint={selectedCommunity.dataAiHintBanner || 'community banner'}
                        priority
                    />
                    </div>

                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 border-b border-border/40 shrink-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-background shadow-md">
                            <AvatarImage src={selectedCommunity.id === 'vibe-community-main' ? dynamicVibeCommunityIcon : (selectedCommunity.iconUrl || '/pfd.png')} alt={selectedCommunity.name} data-ai-hint={selectedCommunity.dataAiHint || 'abstract logo'}/>
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
                    
                    <div className="px-3 sm:px-4 pt-2 pb-3 sm:pb-4 flex-1 flex flex-col min-h-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide py-1 z-10">
                             Members ({isLoadingMembers ? "..." : communityMembers.length})
                        </h4>
                        {isLoadingMembers ? (
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                            </div>
                        ) : communityMembers.length > 0 ? (
                             <ScrollArea className="flex-1 min-h-0">
                                <div className="space-y-2">
                                {communityMembers.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted/50">
                                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                        <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint={member.dataAiHint} />
                                        <AvatarFallback className="text-xs bg-muted-foreground/20">
                                        {member.name.substring(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-foreground truncate">{member.name}</span>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No members found or error loading members.</p>
                        )}
                    </div>
                    
                    <div className="p-3 border-t border-border/40 shrink-0 mt-auto">
                        <Button variant="outline" className="w-full text-muted-foreground text-xs sm:text-sm" onClick={onCommunitySettingsClick}>
                            <Settings className="mr-2 h-4 w-4" /> Community Settings
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
