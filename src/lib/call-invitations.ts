import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  where,
  getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type CallInvitation = {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  recipientId: string;
  callType: 'voice' | 'video';
  conversationId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  expiresAt: any;
};

// Send a call invitation
export async function sendCallInvitation(
  callerId: string,
  callerName: string,
  recipientId: string,
  callType: 'voice' | 'video',
  conversationId: string,
  callerAvatar?: string | null
): Promise<string> {
  const invitationId = `${callerId}_${recipientId}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 60000); // 60 seconds
  
  const invitation: any = {
    callerId,
    callerName,
    recipientId,
    callType,
    conversationId,
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: serverTimestamp()
  };

  // Only include callerAvatar if it's not undefined or null
  if (callerAvatar) {
    invitation.callerAvatar = callerAvatar;
  }

  await setDoc(doc(db, 'callInvitations', invitationId), invitation);
  
  window.location.href = `/call/${invitationId}`;
  
  // Auto-expire the invitation after 60 seconds
  setTimeout(async () => {
    try {
      await deleteDoc(doc(db, 'callInvitations', invitationId));
    } catch (error) {
      console.warn('Failed to auto-expire invitation:', error);
    }
  }, 60000);
  
  return invitationId;
}

// Accept a call invitation
export async function acceptCallInvitation(invitationId: string): Promise<void> {
  await setDoc(doc(db, 'callInvitations', invitationId), {
    status: 'accepted'
  }, { merge: true });
}

// Decline a call invitation
export async function declineCallInvitation(invitationId: string): Promise<void> {
  await setDoc(doc(db, 'callInvitations', invitationId), {
    status: 'declined'
  }, { merge: true });
  
  // Clean up after a short delay
  setTimeout(async () => {
    try {
      await deleteDoc(doc(db, 'callInvitations', invitationId));
    } catch (error) {
      console.warn('Failed to clean up declined invitation:', error);
    }
  }, 5000);
}

// Cancel a call invitation (caller cancels)
export async function cancelCallInvitation(invitationId: string): Promise<void> {
  await deleteDoc(doc(db, 'callInvitations', invitationId));
}

// Listen for incoming call invitations
export function listenForIncomingCalls(
  userId: string,
  onInvitation: (invitation: CallInvitation) => void,
  onInvitationUpdate: (invitation: CallInvitation) => void
) {
  const q = query(
    collection(db, 'callInvitations'),
    where('recipientId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const invitation = {
        id: change.doc.id,
        ...change.doc.data()
      } as CallInvitation;

      if (change.type === 'added') {
        window.location.href = `/invitation/${invitation.id}`;
        onInvitation(invitation);
      } else if (change.type === 'modified') {
        onInvitationUpdate(invitation);
      }
    });
  });
}

// Listen for call invitation status changes (for caller)
export function listenForInvitationStatus(
  invitationId: string,
  onStatusChange: (status: CallInvitation['status']) => void
) {
  return onSnapshot(doc(db, 'callInvitations', invitationId), (doc) => {
    if (doc.exists()) {
      const invitation = doc.data() as CallInvitation;
      onStatusChange(invitation.status);
    } else {
      onStatusChange('expired');
    }
  });
}

// Clean up expired invitations (utility function)
export async function cleanupExpiredInvitations(): Promise<void> {
  const now = new Date();
  const q = query(
    collection(db, 'callInvitations'),
    where('expiresAt', '<', now)
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}