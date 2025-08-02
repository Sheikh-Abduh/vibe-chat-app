
import type { TenorGif as TenorGifType } from '@/types/tenor';

export interface TenorGif extends TenorGifType {}

export type ChatMessage = {
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
    replyToSenderId?: string;
    replyToTextSnippet?: string;
    isForwarded?: boolean;
    forwardedFromSenderName?: string;
    mentionedUserIds?: string[];
    readBy?: string[];
  };
