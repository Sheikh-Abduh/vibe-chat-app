"use client";

import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import Image from 'next/image';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, SmilePlus, Trash2, Pin, PinOff, Star, Reply, Share2, CornerUpRight, MessageSquareReply, Crown, Shield, UserCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/app';
import type { Member } from '@/app/(app)/communities/page';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';
import { detectAndFormatLinks } from '@/lib/link-utils';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
    ssr: false,
    loading: () => <p className="p-2 text-sm text-muted-foreground">Loading emojis...</p>
  });
  

const formatChatMessage = (text?: string): string => {
    if (!text) return '';
    let formattedText = text;
    
    // First apply link detection and formatting (includes HTML escaping)
    formattedText = detectAndFormatLinks(formattedText, {
        className: 'text-blue-500 hover:text-blue-600 underline break-words transition-colors'
    });
    
    // Format mentions (after link detection to avoid conflicts)
    formattedText = formattedText.replace(
        /@([\w.-]+)/g, 
        '<span class="bg-accent/20 text-accent font-medium px-0.5 rounded-sm">@$1</span>'
    );
    
    // Format text styling
    formattedText = formattedText.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
    formattedText = formattedText.replace(/~~(.*?)~~/g, '<del>$1</del>');
    formattedText = formattedText.replace(/\+\+(.*?)\+\+/g, '<u>$1</u>');
    formattedText = formattedText.replace(/\^\^(.*?)\^\^/g, '<sup>$1</sup>');
    formattedText = formattedText.replace(/vv(.*?)vv/g, '<sub>$1</sub>');
    
    return formattedText;
};


interface ChatMessageDisplayProps {
    message: ChatMessage;
    previousMessage: ChatMessage | null;
    currentUser: User | null;
    communityMembers: Member[];
    currentThemeMode: 'light' | 'dark';
    onToggleReaction: (messageId: string, emoji: string) => void;
    onReplyClick: (message: ChatMessage) => void;
    onTogglePin: (messageId: string, isPinned: boolean) => void;
    onDelete: (messageId: string) => void;
    onFavoriteGif: (message: ChatMessage) => void;
    isGifFavorited: (gifId: string) => boolean;
    onForward: (message: ChatMessage) => void;
    selectedCommunity: {
        ownerId?: string;
        admins?: string[];
        moderators?: string[];
        members?: string[];
    } | null;
}


const TIMESTAMP_GROUPING_THRESHOLD_MS = 60 * 1000;

const shouldShowFullMessageHeader = (currentMessage: ChatMessage, previousMessage: ChatMessage | null) => {
    if (!previousMessage) return true;
    if (currentMessage.senderId !== previousMessage.senderId) return true;
    if (currentMessage.timestamp.getTime() - previousMessage.timestamp.getTime() > TIMESTAMP_GROUPING_THRESHOLD_MS) return true;
    if (currentMessage.replyToMessageId !== previousMessage.replyToMessageId) return true;
    if (currentMessage.isForwarded !== previousMessage.isForwarded) return true;
    return false;
};


export default function ChatMessageDisplay({
    message: msg,
    previousMessage,
    currentUser,
    communityMembers,
    currentThemeMode,
    onToggleReaction,
    onReplyClick,
    onTogglePin,
    onDelete,
    onFavoriteGif,
    isGifFavorited,
    onForward,
    selectedCommunity
}: ChatMessageDisplayProps) {
    const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
    
    const showHeader = shouldShowFullMessageHeader(msg, previousMessage);
    const isCurrentUserMsg = currentUser?.uid === msg.senderId;

    // Determine user role for displaying role symbols
    let userRoleIcon = null;
    if (selectedCommunity && msg.senderId) {
        if (selectedCommunity.ownerId === msg.senderId) {
            userRoleIcon = <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 ml-1" />;
        } else if (selectedCommunity.admins?.includes(msg.senderId)) {
            userRoleIcon = <Shield className="h-3.5 w-3.5 text-red-500 flex-shrink-0 ml-1" />;
        } else if (selectedCommunity.moderators?.includes(msg.senderId)) {
            userRoleIcon = <UserCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 ml-1" />;
        } else if (selectedCommunity.members?.includes(msg.senderId)) {
            userRoleIcon = <Users className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 ml-1" />;
        }
    }

    let hasBeenRepliedTo = false;
    if (currentUser) {
        // This is a simplification. For full accuracy, you'd need the full message list.
        // For now, we assume this prop isn't passed and rely on other indicators.
    }

    return (
        <div
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

            <div className={cn("flex-1 min-w-0 text-left", isCurrentUserMsg ? "pr-10 sm:pr-12" : "pl-0")}>
                {showHeader && (
                    <div className={cn("flex items-baseline space-x-1.5")}>
                        <div className="flex items-center">
                            <p className="font-semibold text-sm text-foreground">
                            {msg.senderName}
                            </p>
                            {userRoleIcon}
                        </div>
                        <div className="flex items-baseline text-xs text-muted-foreground">
                            <p title={msg.timestamp ? format(msg.timestamp, 'PPpp') : undefined}>
                            {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp, { addSuffix: true }) : 'Sending...'}
                            </p>
                            {msg.timestamp && (
                            <p className="ml-1.5 mr-0.5">
                                ({format(msg.timestamp, 'p')})
                            </p>
                            )}
                        </div>
                        {msg.isPinned && <Pin className="h-3 w-3 text-amber-400 ml-1" />}
                        {hasBeenRepliedTo && <MessageSquareReply className="h-3 w-3 text-blue-400 ml-1" />}
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
                <p
                    className={cn("text-sm text-foreground/90 whitespace-pre-wrap break-words text-left")}
                    dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text) }}
                />
                )}
                {msg.type === 'gif' && msg.gifUrl && (
                <div className="relative max-w-[250px] sm:max-w-[300px] mt-1 group/gif">
                        <Image
                            src={msg.gifUrl}
                            alt={msg.gifContentDescription || "GIF"}
                            width={0}
                            height={0}
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '200px', borderRadius: '0.375rem', objectFit: 'contain' }}
                            unoptimized
                            priority={false}
                            data-ai-hint="animated gif"
                        />
                        {currentUser && msg.gifId && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover/gif:opacity-100 transition-opacity"
                                onClick={() => onFavoriteGif(msg)}
                                title={isGifFavorited(msg.gifId || "") ? "Unfavorite" : "Favorite"}
                            >
                                <Star className={cn("h-4 w-4", isGifFavorited(msg.gifId || "") ? "fill-yellow-400 text-yellow-400" : "text-white/70")}/>
                            </Button>
                        )}
                </div>
                )}
                {msg.type === 'voice_message' && msg.fileUrl && (
                    <audio controls src={msg.fileUrl} className="my-2 w-full max-w-xs h-10 rounded-md shadow-sm bg-muted invert-[5%] dark:invert-0" data-ai-hint="audio player">
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
                    <div className={cn("mt-1.5 flex flex-wrap gap-1.5", isCurrentUserMsg && "justify-end")}>
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                            userIds.length > 0 && (
                                <Button
                                    key={emoji}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onToggleReaction(msg.id, emoji)}
                                    className={cn(
                                        "h-auto px-2 py-0.5 text-xs rounded-full bg-muted/50 hover:bg-muted/80 border-border/50",
                                        currentUser && userIds.includes(currentUser.uid) && "bg-primary/20 border-primary text-primary hover:bg-primary/30"
                                    )}
                                    title={userIds.map(uid => communityMembers.find(m => m.id === uid)?.name || uid).join(', ')}
                                >
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
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground" title=  );
}</div>
         
 iv>  </d              )}
 
           Button>   </         " />
    4e="h-4 w-Nam2 class <Trash               d)}>
    g.ie(msDelet=> onck={() " onClisage"Delete Mes title=80"structive/er:text-de0 hovestructive/1hover:bg-dtive structext-de-7 w-7 lassName="h" conize="icost" sant="ghri  <Button va            && (
   Idsender== msg.tUser?.uid =     {curren      n>
     </Butto           " />}
     -foregrounder:textd hoved-foregrount-mut"h-4 w-4 texlassName=Pin c : <r-500" />-4 text-ambeme="h-4 wlassNa ? <PinOff ced {msg.isPinn          >
     g.isPinned)}.id, !!msgglePin(msg> onTolick={() =} onC"Messagein " : "P Messagepininned ? "Untle={msg.isPted" tir:bg-mu w-7 hoveame="h-7on" classNsize="ic" ghostn variant="tto   <Bu        >
     </Popover      
          ntent></PopoverCo                    />
            
    lse}} faPreview:ig={{showreviewConf          p             on..."
 rch reactilder="SeaarchPlaceho        se              }
  ATIVE.NjiStyleiStyle={Emomoj   e               HT}
      me.LIG: EmojiThe.DARK  EmojiTheme' ?e === 'darkentThemeModrrheme={cu       t               }}
                        lse);
  faerOpen(tionPickac setRe                       ;
    emoji), emojiData.sg.idaction(m  onToggleRe                   {
       => ) tackData: EmojiCli={(emojiDaick onEmojiCl                    er
   Pick     <Emoji          -0">
     ="w-auto psNamet clasoverConten   <Pop      
       overTrigger>  </Pop     
         /Button>        <       />
      w-4" e="h-4 classNamusSmilePl   <                ">
 sagect to mestitle="Reaound" oregrext-fnd hover:toud-foregrt-muteexr:bg-muted tw-7 hoveName="h-7 lass"icon" ct" size=ant="ghosButton vari     <            
   sChild>erTrigger aPopov    <    }>
        kerOpenactionPicsetReChange={enpen} onOpnPickerOctioopen={rea<Popover             >
      </Button             " />
 "h-4 w-4sName=y clas    <Repl           ck(msg)}>
 onReplyCli=> lick={() "Reply" onCd" title=oregrounver:text-fground ho-muted-fore-muted textver:bgh-7 w-7 hoe="" className="icon sizhost"riant="g va  <Button           
   utton>       </B        />
 4 w-4" me="h-2 classNa<Share            }>
    ward(msg) => onFork={()   onClic             
    "Forward"