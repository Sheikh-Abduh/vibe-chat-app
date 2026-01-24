import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, User as UserIcon, Bookmark } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ChatMessage } from '@/types/app';
import type { TenorGif } from '@/types/tenor';

interface DmConversation {
    id: string;
    name: string;
    avatarUrl?: string;
    dataAiHint?: string;
    partnerId: string;
    unreadCount?: number;
}

interface CallConfirmationDialogsProps {
    isForwardDialogOpen: boolean;
    setIsForwardDialogOpen: (open: boolean) => void;
    forwardingMessage: ChatMessage | null;
    handleForwardMessage: (conversation: DmConversation) => void;
    forwardSearchTerm: string;
    setForwardSearchTerm: (term: string) => void;
    connectedUsers: DmConversation[];
    currentUser: User | null;
    handleSelectConversationForForward: (conversation: DmConversation) => void;
    savedMessagesConversation: DmConversation;
    setForwardingMessage: (message: ChatMessage | null) => void;
    currentMuteSettings: any; // Replace with specific type if available
    handleToggleMuteConversation: () => void;
    currentUserId: string;
    isRecording: boolean;
    handleStopRecording: () => void;
    setReactionPickerOpenForMessageId: (id: string | null) => void;
    handleDeleteMessage: (messageId: string) => void;
    deletingMessageId: string | null;
    setDeletingMessageId: (id: string | null) => void;
    favoriteGifs: TenorGif[];
    handleToggleFavoriteGif: (gif: TenorGif) => void;
    handleFavoriteGifFromChat: (url: string) => void;
    handleSendGif: (gif: TenorGif) => void;
}

export function CallConfirmationDialogs({
    isForwardDialogOpen,
    setIsForwardDialogOpen,
    forwardingMessage,
    handleForwardMessage,
    forwardSearchTerm,
    setForwardSearchTerm,
    connectedUsers,
    currentUser,
    handleSelectConversationForForward,
    savedMessagesConversation,
    setForwardingMessage,
    currentMuteSettings,
    handleToggleMuteConversation,
    currentUserId,
    isRecording,
    handleStopRecording,
    setReactionPickerOpenForMessageId,
    handleDeleteMessage,
    deletingMessageId,
    setDeletingMessageId,
    favoriteGifs,
    handleToggleFavoriteGif,
    handleFavoriteGifFromChat,
    handleSendGif
}: CallConfirmationDialogsProps) {

    const filteredForwardUsers = connectedUsers.filter(user =>
        user.name.toLowerCase().includes(forwardSearchTerm.toLowerCase())
    );

    return (
        <>
            {/* Forward Message Dialog */}
            <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Forward Message</DialogTitle>
                        <DialogDescription>
                            Select a conversation to forward this message to.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search people..."
                            className="pl-8"
                            value={forwardSearchTerm}
                            onChange={(e) => setForwardSearchTerm(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-2">
                            {/* Saved Messages Option */}
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-auto py-3 px-4"
                                onClick={() => handleSelectConversationForForward(savedMessagesConversation)}
                            >
                                <Avatar className="h-10 w-10 mr-3">
                                    <AvatarFallback><Bookmark className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <p className="font-medium">Saved Messages</p>
                                    <p className="text-xs text-muted-foreground">Forward to yourself</p>
                                </div>
                            </Button>

                            {filteredForwardUsers.length > 0 ? (
                                filteredForwardUsers.map((user) => (
                                    <Button
                                        key={user.id}
                                        variant="ghost"
                                        className="w-full justify-start h-auto py-3 px-4"
                                        onClick={() => handleSelectConversationForForward(user)}
                                    >
                                        <Avatar className="h-10 w-10 mr-3">
                                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                                            <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">{user.name}</p>
                                        </div>
                                    </Button>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No users found matching "{forwardSearchTerm}"
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Delete Message Confirmation Dialog */}
            <AlertDialog open={!!deletingMessageId} onOpenChange={(open) => !open && setDeletingMessageId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Message</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this message? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingMessageId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deletingMessageId) {
                                    handleDeleteMessage(deletingMessageId);
                                    setDeletingMessageId(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
