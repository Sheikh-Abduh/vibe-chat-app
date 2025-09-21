
"use client";

import React from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { X, Settings, Loader2, Crown, Shield, UserCheck, LogOut, Link, Copy, Check, UserPlus, MessageSquare, UserMinus, Ban, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { Member } from '@/app/(app)/communities/page';
import { detectAndFormatLinks } from '@/lib/link-utils';


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
        ownerId?: string;
        logoUrl?: string;
        admins?: string[];
        moderators?: string[];
        members?: string[];
    } | null;
    dynamicVibeCommunityBanner: string;
    dynamicVibeCommunityIcon: string;
    isLoadingMembers: boolean;
    communityMembers: Member[];
    onCommunitySettingsClick: () => void;
    onLeaveCommunity: () => void;
    currentUser: any;
    onConnectUser?: (userId: string) => void;
    onMessageUser?: (userId: string) => void;
    onDisconnectUser?: (userId: string) => void;
    onKickUser?: (userId: string) => void;
    onBanUser?: (userId: string) => void;
    userConnections?: string[]; // Array of user IDs that current user is connected to
}

export default function CommunityInfoPanel({
    isOpen,
    setIsOpen,
    selectedCommunity,
    dynamicVibeCommunityBanner,
    dynamicVibeCommunityIcon,
    isLoadingMembers,
    communityMembers,
    onCommunitySettingsClick,
    onLeaveCommunity,
    currentUser,
    onConnectUser,
    onMessageUser,
    onDisconnectUser,
    onKickUser,
    onBanUser,
    userConnections
}: CommunityInfoPanelProps) {
    const { toast } = useToast();
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    const [memberFilter, setMemberFilter] = useState<'all' | 'owner' | 'admins' | 'moderators' | 'members'>('all');
    
    // Generate invite link
    const generateInviteLink = () => {
        if (!selectedCommunity) return '';
        const baseUrl = window.location.origin;
        return `${baseUrl}/communities?communityId=${selectedCommunity.id}`;
    };
    
    // Handle invite link copy
    const handleCopyInviteLink = async () => {
        const inviteLink = generateInviteLink();
        try {
            await navigator.clipboard.writeText(inviteLink);
            setInviteLinkCopied(true);
            toast({
                title: "Invite Link Copied!",
                description: "Share this link to invite others to join the community.",
            });
            setTimeout(() => setInviteLinkCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy invite link:', error);
            toast({
                variant: "destructive",
                title: "Failed to Copy",
                description: "Could not copy the invite link to clipboard.",
            });
        }
    };
    
    // Check if user has admin/moderator permissions for settings
    const hasSettingsPermission = currentUser && selectedCommunity && (
        selectedCommunity.ownerId === currentUser.uid ||
        selectedCommunity.admins?.includes(currentUser.uid) ||
        selectedCommunity.moderators?.includes(currentUser.uid) ||
        // For VIBE community, check if user is the designated owner (sheikh's email)
        (selectedCommunity.id === 'vibe-community-main' && currentUser.email === 'sheikhabduh6@gmail.com')
    );
    
    // Check if user is a member (for leave button)
    const isMember = currentUser && selectedCommunity && (
        selectedCommunity.members?.includes(currentUser.uid) ||
        selectedCommunity.moderators?.includes(currentUser.uid) ||
        selectedCommunity.admins?.includes(currentUser.uid)
    ) && selectedCommunity.ownerId !== currentUser.uid; // Owner can't leave
    
    // Organize members by roles
    const organizedMembers = useMemo(() => {
        if (!selectedCommunity || !communityMembers.length) {
            return { owner: null, admins: [], moderators: [], members: [] };
        }
        
        // For vibe community, show all users as members (except owner)
        if (selectedCommunity.id === 'vibe-community-main') {
            const owner = communityMembers.find(member => member.id === selectedCommunity.ownerId) || null;
            const allOtherMembers = communityMembers.filter(member => member.id !== selectedCommunity.ownerId);
            
            console.log(`Vibe community - Owner: ${owner?.name}, Members: ${allOtherMembers.length}`);
            
            return { 
                owner, 
                admins: [], 
                moderators: [], 
                members: allOtherMembers 
            };
        }
        
        // For other communities, organize by actual roles
        const owner = communityMembers.find(member => member.id === selectedCommunity.ownerId) || null;
        const admins = communityMembers.filter(member => 
            selectedCommunity.admins?.includes(member.id) && member.id !== selectedCommunity.ownerId
        );
        const moderators = communityMembers.filter(member => 
            selectedCommunity.moderators?.includes(member.id) && 
            member.id !== selectedCommunity.ownerId &&
            !selectedCommunity.admins?.includes(member.id)
        );
        const members = communityMembers.filter(member => 
            selectedCommunity.members?.includes(member.id) &&
            member.id !== selectedCommunity.ownerId &&
            !selectedCommunity.admins?.includes(member.id) &&
            !selectedCommunity.moderators?.includes(member.id)
        );
        
        console.log(`${selectedCommunity.name} - Owner: ${owner?.name}, Admins: ${admins.length}, Moderators: ${moderators.length}, Members: ${members.length}`);
        
        return { owner, admins, moderators, members };
    }, [selectedCommunity, communityMembers]);
    
    // Filter members based on current filter
    const filteredMembers = useMemo(() => {
        switch (memberFilter) {
            case 'owner':
                return organizedMembers.owner ? [organizedMembers.owner] : [];
            case 'admins':
                return organizedMembers.admins;
            case 'moderators':
                return organizedMembers.moderators;
            case 'members':
                return organizedMembers.members;
            default:
                // Show all members organized by hierarchy
                const allMembers = [];
                if (organizedMembers.owner) allMembers.push(organizedMembers.owner);
                allMembers.push(...organizedMembers.admins);
                allMembers.push(...organizedMembers.moderators);
                allMembers.push(...organizedMembers.members);
                return allMembers;
        }
    }, [memberFilter, organizedMembers]);
    
    // Handle filter toggle
    const handleFilterToggle = (filter: typeof memberFilter) => {
        setMemberFilter(memberFilter === filter ? 'all' : filter);
    };

    if (!isOpen) {
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
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <Image
                          src={selectedCommunity.id === 'vibe-community-main' 
                              ? dynamicVibeCommunityBanner 
                              : (selectedCommunity.bannerUrl || dynamicVibeCommunityBanner)
                          }
                          alt={`${selectedCommunity.name} banner`}
                          fill
                          className="object-cover"
                          data-ai-hint={selectedCommunity.dataAiHintBanner || 'community banner'}
                          priority
                          quality={95}
                          sizes="(max-width: 768px) 256px, 288px"
                        />
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {selectedCommunity && 
                         selectedCommunity.id !== 'vibe-community-main' &&
                         currentUser && 
                         (selectedCommunity.ownerId !== currentUser.uid) &&
                         (selectedCommunity.admins?.includes(currentUser.uid) || 
                          selectedCommunity.moderators?.includes(currentUser.uid) || 
                          selectedCommunity.members?.includes(currentUser.uid)) && (
                          <ContextMenuItem onClick={onLeaveCommunity}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Leave Community</span>
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                    </div>

                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 border-b border-border/40 shrink-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <ContextMenu>
                              <ContextMenuTrigger>
                                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-background shadow-md">
                                  <AvatarImage 
                                      src={selectedCommunity.id === 'vibe-community-main' 
                                          ? dynamicVibeCommunityIcon 
                                          : (selectedCommunity.logoUrl || selectedCommunity.iconUrl || dynamicVibeCommunityIcon)
                                      } 
                                      alt={selectedCommunity.name} 
                                      data-ai-hint={selectedCommunity.dataAiHint || 'abstract logo'}
                                  />
                                  <AvatarFallback>{selectedCommunity.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                {selectedCommunity && 
                                 selectedCommunity.id !== 'vibe-community-main' &&
                                 currentUser && 
                                 (selectedCommunity.ownerId !== currentUser.uid) &&
                                 (selectedCommunity.admins?.includes(currentUser.uid) || 
                                  selectedCommunity.moderators?.includes(currentUser.uid) || 
                                  selectedCommunity.members?.includes(currentUser.uid)) && (
                                  <ContextMenuItem onClick={onLeaveCommunity}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Leave Community</span>
                                  </ContextMenuItem>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>
                            <div>
                            <CardTitle className="text-lg sm:text-xl">{selectedCommunity.name}</CardTitle>
                            </div>
                        </div>
                        <CardDescription className="text-xs sm:text-sm">
                            <span 
                                dangerouslySetInnerHTML={{ 
                                    __html: detectAndFormatLinks(selectedCommunity.description, {
                                        className: "text-blue-500 hover:text-blue-600 underline break-words transition-colors"
                                    })
                                }}
                            />
                        </CardDescription>
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
                        <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide py-1">
                                    Members ({isLoadingMembers ? "..." : communityMembers.length})
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                    {communityMembers.length} total
                                </Badge>
                            </div>
                            {/* Show member usernames prominently */}
                            {communityMembers.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Active members:</span>{' '}
                                    {communityMembers.slice(0, 3).map(member => member.name).join(', ')}
                                    {communityMembers.length > 3 && ` and ${communityMembers.length - 3} more`}
                                </div>
                            )}
                        </div>
                        
                        {isLoadingMembers ? (
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                            </div>
                        ) : communityMembers.length > 0 ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Role Filter Buttons */}
                                <div className="space-y-1 mb-3">
                                    {/* Owner Section */}
                                    {organizedMembers.owner && (
                                        <button
                                            onClick={() => handleFilterToggle('owner')}
                                            className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                memberFilter === 'owner'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Crown className="h-3 w-3" />
                                                <span>OWNER (1)</span>
                                            </div>
                                        </button>
                                    )}
                                    
                                    {/* Admins Section */}
                                    {organizedMembers.admins.length > 0 && (
                                        <button
                                            onClick={() => handleFilterToggle('admins')}
                                            className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                memberFilter === 'admins'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Shield className="h-3 w-3" />
                                                <span>ADMINS ({organizedMembers.admins.length})</span>
                                            </div>
                                        </button>
                                    )}
                                    
                                    {/* Moderators Section */}
                                    {organizedMembers.moderators.length > 0 && (
                                        <button
                                            onClick={() => handleFilterToggle('moderators')}
                                            className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                memberFilter === 'moderators'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <UserCheck className="h-3 w-3" />
                                                <span>MODERATORS ({organizedMembers.moderators.length})</span>
                                            </div>
                                        </button>
                                    )}
                                    
                                    {/* Members Section - Always show, even if 0 members */}
                                    <button
                                        onClick={() => handleFilterToggle('members')}
                                        className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${
                                            memberFilter === 'members'
                                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Users className="h-3 w-3" />
                                            <span>MEMBERS ({organizedMembers.members.length})</span>
                                        </div>
                                    </button>
                                </div>
                                
                                {/* Members List */}
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="space-y-2">
                                    {filteredMembers.map((member) => {
                                        const isOwner = selectedCommunity?.ownerId === member.id;
                                        const isAdmin = selectedCommunity?.admins?.includes(member.id);
                                        const isModerator = selectedCommunity?.moderators?.includes(member.id);
                                        const isCurrentUser = currentUser?.uid === member.id;
                                        const isConnected = userConnections?.includes(member.id) || false;
                                        
                                        // Check if current user has permission to moderate this member
                                        const canModerate = currentUser && selectedCommunity && !isCurrentUser && (
                                            // Owners can moderate everyone except themselves
                                            (selectedCommunity.ownerId === currentUser.uid && !isOwner) ||
                                            // Admins can moderate moderators and members, but not owners or other admins
                                            (selectedCommunity.admins?.includes(currentUser.uid) && !isOwner && !isAdmin) ||
                                            // Moderators can moderate members, but not owners, admins, or other moderators
                                            (selectedCommunity.moderators?.includes(currentUser.uid) && !isOwner && !isAdmin && !isModerator)
                                        );
                                        
                                        return (
                                        <ContextMenu key={member.id}>
                                            <ContextMenuTrigger>
                                                <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/50 cursor-pointer">
                                                    <div className="flex items-center space-x-2">
                                                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                                            <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint={member.dataAiHint} />
                                                            <AvatarFallback className="text-xs bg-muted-foreground/20">
                                                            {member.name.substring(0, 1).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm text-foreground truncate">{member.name}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        {isOwner && (
                                                            <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                        )}
                                                        {isAdmin && (
                                                            <Shield className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                        )}
                                                        {isModerator && (
                                                            <UserCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                        )}
                                                        {!isOwner && !isAdmin && !isModerator && (
                                                            <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </div>
                                            </ContextMenuTrigger>
                                            
                                            {/* Context Menu Options */}
                                            {!isCurrentUser && (
                                                <ContextMenuContent>
                                                    {/* Social Actions */}
                                                    {!isConnected && onConnectUser && (
                                                        <ContextMenuItem onClick={() => onConnectUser(member.id)}>
                                                            <UserPlus className="mr-2 h-4 w-4" />
                                                            <span>Connect</span>
                                                        </ContextMenuItem>
                                                    )}
                                                    {isConnected && onMessageUser && (
                                                        <ContextMenuItem onClick={() => onMessageUser(member.id)}>
                                                            <MessageSquare className="mr-2 h-4 w-4" />
                                                            <span>Message</span>
                                                        </ContextMenuItem>
                                                    )}
                                                    {isConnected && onDisconnectUser && (
                                                        <ContextMenuItem onClick={() => onDisconnectUser(member.id)}>
                                                            <UserMinus className="mr-2 h-4 w-4" />
                                                            <span>Disconnect</span>
                                                        </ContextMenuItem>
                                                    )}
                                                    
                                                    {/* Moderation Actions - Only show if user has permission */}
                                                    {canModerate && (
                                                        <>
                                                            {(isConnected || !isConnected) && (
                                                                <div className="border-t border-border/40 my-1" />
                                                            )}
                                                            {onKickUser && (
                                                                <ContextMenuItem 
                                                                    onClick={() => onKickUser(member.id)}
                                                                    className="text-orange-600 hover:text-orange-700"
                                                                >
                                                                    <UserMinus className="mr-2 h-4 w-4" />
                                                                    <span>Kick Member</span>
                                                                </ContextMenuItem>
                                                            )}
                                                            {onBanUser && (
                                                                <ContextMenuItem 
                                                                    onClick={() => onBanUser(member.id)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Ban className="mr-2 h-4 w-4" />
                                                                    <span>Ban Member</span>
                                                                </ContextMenuItem>
                                                            )}
                                                        </>
                                                    )}
                                                </ContextMenuContent>
                                            )}
                                        </ContextMenu>
                                        );
                                    })}
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No members found or error loading members.</p>
                        )}
                    </div>
                    
                    <div className="p-3 border-t border-border/40 shrink-0 mt-auto space-y-2">
                        {selectedCommunity && (
                            <>
                                {/* Leave Community Button - for members (not owners) - Not available for VIBE community */}
                                {selectedCommunity.id !== 'vibe-community-main' && isMember && (
                                    <Button 
                                        variant="outline" 
                                        className="w-full text-muted-foreground text-xs sm:text-sm"
                                        onClick={onLeaveCommunity}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" /> Leave Community
                                    </Button>
                                )}
                                
                                {/* Invite Link Button - for all members (including VIBE community) */}
                                {currentUser && (selectedCommunity.ownerId === currentUser.uid ||
                                 selectedCommunity.admins?.includes(currentUser.uid) ||
                                 selectedCommunity.moderators?.includes(currentUser.uid) ||
                                 selectedCommunity.members?.includes(currentUser.uid) ||
                                 // For VIBE community, all authenticated users can invite
                                 selectedCommunity.id === 'vibe-community-main') && (
                                    <Button 
                                        variant="outline" 
                                        className="w-full text-muted-foreground text-xs sm:text-sm"
                                        onClick={handleCopyInviteLink}
                                    >
                                        {inviteLinkCopied ? (
                                            <><Check className="mr-2 h-4 w-4 text-green-500" /> Link Copied!</>
                                        ) : (
                                            <><Copy className="mr-2 h-4 w-4" /> Copy Invite Link</>
                                        )}
                                    </Button>
                                )}
                                
                                {/* Community Settings Button - for admins/moderators/owners (including VIBE community) */}
                                {hasSettingsPermission && (
                                    <Button 
                                        variant="outline" 
                                        className="w-full text-muted-foreground text-xs sm:text-sm" 
                                        onClick={onCommunitySettingsClick}
                                    >
                                        <Settings className="mr-2 h-4 w-4" /> Community Settings
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
