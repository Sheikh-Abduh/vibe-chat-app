import React, { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Pin, PinOff, Star, SmilePlus, Reply, Share2, CornerUpRight, MoreHorizontal, Play, Pause, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import type { ChatMessage } from '@/types/app';
import type { TenorGif } from '@/types/tenor';
import { UserTag } from '@/components/user/user-tag';
import type { VibeUserTag } from '@/components/user/user-tag';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle } from 'emoji-picker-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react').then(mod => mod.default), {
    ssr: false,
    loading: () => <p className="p-2 text-sm text-muted-foreground">Loading emojis...</p>
});

interface DmConversation {
    id: string;
    name: string;
    avatarUrl?: string;
    dataAiHint?: string;
    partnerId: string;
    unreadCount?: number;
}

interface MessageBubbleProps {
    showHeader: boolean;
    message: ChatMessage;
    currentUser: User | null;
    conversationId: string | null;
    selectedConversation: DmConversation | null;
    dmPartnerProfile: any;
    isConversationMuted: boolean;
    isMessagesRightBarOpen: boolean;
    onTogglePin: (messageId: string, isPinned: boolean) => void;
    onDelete: (messageId: string, event: React.MouseEvent) => void;
    onReply: (message: ChatMessage) => void;
    onForward: (message: ChatMessage) => void;
    onToggleReaction: (messageId: string, emoji: string) => void;
    reactionPickerOpenForMessageId: string | null;
    setReactionPickerOpenForMessageId: (id: string | null) => void;
    gifSearchTerm: string;
    setGifSearchTerm: (term: string) => void;
    setGifPickerView: (view: 'search' | 'favorites') => void;
    gifPickerView: 'search' | 'favorites';
    setShowGifPicker: (show: boolean) => void;
    showPinnedMessages: boolean;
    replyHighlightId?: string;
    filteredMessages: ChatMessage[];
    handleFavoriteGifFromChat: (message: ChatMessage) => void;
    handleStartCall: (withVideo: boolean) => void;
    handleToggleRecording: () => void;
    handleSendGif: (gif: TenorGif) => void;
    handleStartVoiceCall: () => void;
    handleStartVideoCall: () => void;
    handleMentionSelect: (memberName: string) => void;
    mentionSuggestionsRef: React.RefObject<HTMLDivElement>;
    censorRestrictedWords: (text: string) => string;
}

export function MessageBubble({
    showHeader,
    message,
    currentUser,
    conversationId,
    selectedConversation,
    dmPartnerProfile,
    isConversationMuted,
    isMessagesRightBarOpen,
    onTogglePin,
    onDelete,
    onReply,
    onForward,
    onToggleReaction,
    reactionPickerOpenForMessageId,
    setReactionPickerOpenForMessageId,
    handleFavoriteGifFromChat,
    replyHighlightId,
    censorRestrictedWords
}: MessageBubbleProps) {
    const isMe = message.senderId === currentUser?.uid;
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const handlePlayAudio = () => {
        if (audioRef.current) {
            if (isPlayingAudio) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlayingAudio(!isPlayingAudio);
        }
    };

    return (
        <div className={cn("group flex flex-col mb-1", showHeader ? "mt-4" : "")}>
            {showHeader && (
                <div className={cn("flex items-center mb-1 px-4", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                        <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={message.senderAvatarUrl || undefined} />
                            <AvatarFallback>{message.senderName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                    )}
                    <span className="text-xs text-muted-foreground font-medium">
                        {isMe ? 'You' : message.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                        {format(message.timestamp, 'h:mm a')}
                    </span>
                </div>
            )}

            <div className={cn("flex px-4 relative", isMe ? "justify-end" : "justify-start")}>
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div
                            id={`message-${message.id}`}
                            className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm relative",
                                isMe
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-muted text-foreground rounded-tl-sm",
                                message.isPinned && "ring-2 ring-yellow-500/50",
                                replyHighlightId === message.id && "ring-2 ring-blue-500/50 animate-pulse"
                            )}
                        >
                            {/* Reply Context */}
                            {message.replyToMessageId && (
                                <div className="mb-2 pl-2 border-l-2 border-white/30 text-xs opacity-80 cursor-pointer hover:opacity-100 text-left" onClick={() => {
                                    const el = document.getElementById(`message-${message.replyToMessageId}`);
                                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}>
                                    <div className="font-semibold">{message.replyToSenderName}</div>
                                    <div className="truncate">{message.replyToTextSnippet || 'Original message'}</div>
                                </div>
                            )}

                            {/* Forward Context */}
                            {message.isForwarded && (
                                <div className="mb-1 text-[10px] italic opacity-70 flex items-center">
                                    <CornerUpRight className="h-3 w-3 mr-1" />
                                    Forwarded {message.forwardedFromSenderName ? `from ${message.forwardedFromSenderName}` : ''}
                                </div>
                            )}

                            {/* Message Content */}
                            {message.type === 'text' && (
                                <div dangerouslySetInnerHTML={{ __html: censorRestrictedWords(message.text || '') }} />
                            )}

                            {message.type === 'image' && message.fileUrl && (
                                <div className="relative">
                                    <Image
                                        src={message.fileUrl}
                                        alt="Shared image"
                                        width={300}
                                        height={200}
                                        className="rounded-lg object-cover max-h-[300px] w-auto"
                                    />
                                </div>
                            )}

                            {message.type === 'gif' && message.gifUrl && (
                                <div className="relative">
                                    <img
                                        src={message.gifUrl}
                                        alt={message.gifContentDescription || "GIF"}
                                        className="rounded-lg max-h-[200px] w-auto"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFavoriteGifFromChat(message);
                                        }}
                                    >
                                        <Star className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}

                            {message.type === 'voice_message' && message.fileUrl && (
                                <div className="flex items-center gap-2 min-w-[200px]">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={handlePlayAudio}
                                    >
                                        {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </Button>
                                    <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                        <div className={cn("h-full bg-white transition-all duration-200", isPlayingAudio ? "w-full animate-[progress_10s_linear]" : "w-0")} />
                                    </div>
                                    <audio
                                        ref={audioRef}
                                        src={message.fileUrl}
                                        onEnded={() => setIsPlayingAudio(false)}
                                        className="hidden"
                                    />
                                </div>
                            )}

                            {message.type === 'file' && message.fileUrl && (
                                <a
                                    href={message.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 hover:underline"
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="truncate max-w-[150px]">{message.fileName || 'Download File'}</span>
                                </a>
                            )}

                            {/* Reactions */}
                            {message.reactions && Object.keys(message.reactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 justify-start">
                                    {Object.entries(message.reactions).map(([emoji, userIds]) => (
                                        <button
                                            key={emoji}
                                            onClick={() => onToggleReaction(message.id, emoji)}
                                            className={cn(
                                                "text-xs px-1.5 py-0.5 rounded-full bg-background/50 hover:bg-background/70 border border-border/20 transition-colors",
                                                userIds.includes(currentUser?.uid || '') && "bg-primary/20 border-primary/30"
                                            )}
                                        >
                                            {emoji} <span className="ml-0.5 text-[10px]">{userIds.length}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem onClick={() => onReply(message)}>
                            <Reply className="mr-2 h-4 w-4" /> Reply
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => onForward(message)}>
                            <Share2 className="mr-2 h-4 w-4" /> Forward
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => onTogglePin(message.id, !!message.isPinned)}>
                            {message.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                            {message.isPinned ? 'Unpin' : 'Pin'}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={(e) => onDelete(message.id, e)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                {/* Hover Actions */}
                <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1",
                    isMe ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                )}>
                    <Popover open={reactionPickerOpenForMessageId === message.id} onOpenChange={(open) => setReactionPickerOpenForMessageId(open ? message.id : null)}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm border">
                                <SmilePlus className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 border-none shadow-none bg-transparent" side="top">
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    onToggleReaction(message.id, emojiData.emoji);
                                    setReactionPickerOpenForMessageId(null);
                                }}
                                theme={EmojiTheme.AUTO}
                                emojiStyle={EmojiStyle.NATIVE}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm border" onClick={() => onReply(message)}>
                        <Reply className="h-3 w-3 text-muted-foreground" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
