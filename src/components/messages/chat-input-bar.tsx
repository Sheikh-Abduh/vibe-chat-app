"use client";

import React, { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import type { User } from 'firebase/auth';
import type { ChatMessage, TenorGif } from '@/types/app';
import dynamic from 'next/dynamic';
import { Theme as EmojiTheme, EmojiStyle, type EmojiClickData } from 'emoji-picker-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paperclip, Smile, Film, Send, Loader2, StopCircle, Mic, AlertTriangle, X, Star, Phone, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <p className="p-2 text-sm text-muted-foreground">Loading emojis...</p>
});

interface ChatInputBarProps {
  conversationId: string | null;
  currentUser: User | null;
  otherUserId: string | null;
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (e: FormEvent) => Promise<void>;
  replyingToMessage: ChatMessage | null;
  setReplyingToMessage: (message: ChatMessage | null) => void;
  handleCancelReply: () => void;
  selectedConversation: any;
  attachmentInputRef: React.RefObject<HTMLInputElement>;
  handleAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleToggleRecording: () => void;
  isRecording: boolean;
  isUploadingFile: boolean;
  handleStopRecording: () => void;
  handleStartCall: (type: 'voice' | 'video') => void;
  handleSendGif: (gif: TenorGif) => Promise<void>;
  setShowGifPicker: (show: boolean) => void;
  showGifPicker: boolean;
  gifs: TenorGif[];
  gifSearchTerm: string;
  setGifSearchTerm: (term: string) => void;
  gifPickerView: 'search' | 'favorites';
  setGifPickerView: (view: 'search' | 'favorites') => void;
  favoritedGifs: TenorGif[];
  setFavoritedGifs: (gifs: TenorGif[]) => void;
  handleToggleFavoriteGif: (gif: TenorGif) => void;
  chatEmojiPickerOpen: boolean;
  setChatEmojiPickerOpen: (open: boolean) => void;
  chatInputRef: React.RefObject<HTMLInputElement>;
  handleMentionInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleMentionSelect: (memberName: string) => void;
  mentionSuggestionsRef: React.RefObject<HTMLDivElement>;
  showMentionSuggestions: boolean;
  setShowMentionSuggestions: (show: boolean) => void;
  restrictedWords: Array<{ word: string; convertTo: string }>;
  censorRestrictedWords: (text: string) => string;
  currentThemeMode: 'light' | 'dark';
  loadTenorTrendingGifs: () => Promise<void>;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  isChatSearchOpen: boolean;
  chatSearchTerm: string;
  setChatSearchTerm: (term: string) => void;
  setIsChatSearchOpen: (open: boolean) => void;
  handleChatSearchToggle: () => void;
}

export default function ChatInputBar({
  conversationId,
  currentUser,
  otherUserId,
  newMessage,
  setNewMessage,
  handleSendMessage,
  replyingToMessage,
  handleCancelReply,
  selectedConversation,
  attachmentInputRef,
  handleAttachmentChange,
  handleToggleRecording,
  isRecording,
  isUploadingFile,
  handleStopRecording,
  handleStartCall,
  handleSendGif,
  setShowGifPicker,
  showGifPicker,
  gifs,
  gifSearchTerm,
  setGifSearchTerm,
  gifPickerView,
  setGifPickerView,
  favoritedGifs,
  setFavoritedGifs,
  handleToggleFavoriteGif,
  chatEmojiPickerOpen,
  setChatEmojiPickerOpen,
  chatInputRef,
  handleMentionInputChange,
  handleMentionSelect,
  mentionSuggestionsRef,
  showMentionSuggestions,
  setShowMentionSuggestions,
  restrictedWords,
  censorRestrictedWords,
  currentThemeMode,
  loadTenorTrendingGifs,
  selectedCategory,
  setSelectedCategory,
  isChatSearchOpen,
  chatSearchTerm,
  setChatSearchTerm,
  setIsChatSearchOpen,
  handleChatSearchToggle
}: ChatInputBarProps) {
  const { toast } = useToast();
  const [showMentionSuggestionsInternal, setShowMentionSuggestionsInternal] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setChatEmojiPickerOpen(false);
    chatInputRef.current?.focus();
  };

  const handleSendClick = async (e: FormEvent) => {
    if (newMessage.trim()) {
      await handleSendMessage(e);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick(e as any);
    }
  };

  const isBlocked = !!(otherUserId && (restrictedWords.length > 0));
  const canCall = !!(conversationId && otherUserId && currentUser && !isBlocked);

  return (
    <div className="border-t border-border/40 bg-card/50 p-2 sm:p-3 shrink-0">
      {/* Reply to message indicator */}
      {replyingToMessage && (
        <div className="mb-2 p-2 bg-muted/50 rounded-md border-l-2 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Replying to {replyingToMessage.senderName}</p>
              <p className="text-sm truncate">
                {censorRestrictedWords(replyingToMessage.text || '')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleCancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Chat input */}
      <div className="flex items-end space-x-2">
        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-9 w-9"
          onClick={() => attachmentInputRef.current?.click()}
          disabled={isUploadingFile || isRecording}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Call buttons */}
        {canCall && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9"
              onClick={() => handleStartCall('voice')}
              title="Start voice call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9"
              onClick={() => handleStartCall('video')}
              title="Start video call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Recording button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-foreground h-9 w-9",
            isRecording && "text-red-500 bg-red-500/10"
          )}
          onClick={handleToggleRecording}
          disabled={isUploadingFile}
        >
          {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* GIF picker button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-foreground h-9 w-9",
            showGifPicker && "text-primary bg-primary/10"
          )}
          onClick={() => setShowGifPicker(!showGifPicker)}
        >
          <Film className="h-4 w-4" />
        </Button>

        {/* Emoji picker */}
        <Popover open={chatEmojiPickerOpen} onOpenChange={setChatEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme={currentThemeMode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
              emojiStyle={EmojiStyle.NATIVE}
            />
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 relative">
          <Input
            ref={chatInputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleMentionInputChange}
            onKeyDown={handleKeyPress}
            disabled={isUploadingFile || isRecording}
            className="min-h-[36px] resize-none"
          />
        </div>

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9"
          onClick={handleSendClick}
          disabled={!newMessage.trim() || isUploadingFile || isRecording}
        >
          {isUploadingFile ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={attachmentInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleAttachmentChange}
        className="hidden"
      />
    </div>
  );
}
