import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, X } from 'lucide-react';

interface CallWaitingRoomProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onAccept?: () => void;
  callType: 'voice' | 'video';
  callerName: string;
  callerAvatar?: string;
}

export const CallWaitingRoom: React.FC<CallWaitingRoomProps> = ({
  isOpen,
  onClose,
  onCancel,
  onAccept,
  callType,
  callerName,
  callerAvatar,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback>
                {callerName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            {callType === 'video' && (
              <div className="absolute -right-2 -top-2 rounded-full bg-primary p-2">
                <Video className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-medium">{callerName}</h3>
            <p className="text-muted-foreground">
              {callType === 'video' ? 'Video' : 'Voice'} call...
            </p>
          </div>
          
          <div className="flex w-full justify-center space-x-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full p-3"
              onClick={onCancel}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Decline</span>
            </Button>
            
            <Button
              variant="default"
              size="lg"
              className="rounded-full bg-green-500 text-white hover:bg-green-600 p-3"
              onClick={() => {
                onClose();
                if (onAccept) {
                  onAccept();
                }
              }}
            >
              <Phone className="h-6 w-6" />
              <span className="ml-2">Answer</span>
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full p-3"
              onClick={() => {
                onClose();
                onCancel();
              }}
            >
              <X className="h-6 w-6" />
              <span className="ml-2">Decline</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallWaitingRoom;