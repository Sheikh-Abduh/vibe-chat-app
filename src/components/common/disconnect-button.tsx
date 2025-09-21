import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserX, Loader2 } from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface BlockButtonProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  onBlock?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const BlockButton: React.FC<BlockButtonProps> = ({
  currentUserId,
  targetUserId,
  targetUserName,
  onBlock,
  variant = 'ghost',
  size = 'sm',
  className = ''
}) => {
  const [isBlocking, setIsBlocking] = useState(false);
  const { toast } = useToast();

  const handleBlock = async () => {
    if (!currentUserId || !targetUserId) return;

    setIsBlocking(true);
    try {
      // Add to both users' blocked and disconnected lists
      await Promise.all([
        updateDoc(doc(db, 'users', currentUserId), {
          blockedUsers: arrayUnion(targetUserId),
          disconnectedUsers: arrayUnion(targetUserId)
        }),
        updateDoc(doc(db, 'users', targetUserId), {
          blockedUsers: arrayUnion(currentUserId),
          disconnectedUsers: arrayUnion(currentUserId)
        })
      ]);

      toast({
        title: "User Blocked",
        description: `${targetUserName} has been blocked. You cannot interact with them anywhere.`
      });

      // Dispatch event to notify other components after a small delay to ensure DB changes propagate
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('interactionStatusChanged', {
          detail: { userId: targetUserId, action: 'blocked' }
        }));
      }, 100);

      onBlock?.();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to block user"
      });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${className}`}
          disabled={isBlocking}
        >
          {isBlocking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UserX className="h-4 w-4 mr-2" />
          )}
          Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {targetUserName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will prevent you from interacting with each other in direct messages and calls. This action affects both users.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBlock}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isBlocking}
          >
            {isBlocking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Blocking...
              </>
            ) : (
              'Block'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockButton;

// Keep the old export for backward compatibility
export const DisconnectButton = BlockButton;